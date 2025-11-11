import { fetchParsePaths } from "@pennockprojects/sitemap-diff";
import { checkObjects } from "./awsS3Utils";
import logger from "./logger";
import { S3Report } from '../types/S3Report';
import { S3Layout } from "../types/S3Command";

export async function fetchPathsFromSitemap(
  sitemapFileLocator: string,
): Promise<string[]> {
  logger.info(`Fetching sitemap from: ${sitemapFileLocator}`);
  return fetchParsePaths(sitemapFileLocator, {logLevel: logger.getLogLevel()});
}

export function validateS3Bucket(bucketUri: string): void {
  if (!bucketUri) {
    logger.error('S3 bucket uri is required.');
    throw new Error('S3 bucket uri is required.');
  }
  if (!bucketUri.startsWith('s3://')) {
    logger.error('S3 bucket uri must start with "s3://".');
    throw new Error('S3 bucket uri must start with "s3://".');
  }
}

export function buildSitemapFileLocator(
  bucketUri: string, 
  specificSitemapFileLocator?: string, 
  specificBucketRegion?: string,
  options: {
    defaultSitemapName?: string
  } = { defaultSitemapName: 'sitemap.xml' }
  ): string {
  let sitemapFileLocator = ""
  if (specificSitemapFileLocator) {
    if(specificSitemapFileLocator.endsWith('.xml')) {
      sitemapFileLocator = specificSitemapFileLocator;
    } else {
      logger.error('Sitemap file locator must end with ".xml".');
      throw new Error('Sitemap file locator must end with ".xml".');
    }
  } else if (bucketUri) {
    if(!bucketUri.startsWith('s3://')) {
      logger.error('S3 bucket uri must start with "s3://".');
      throw new Error('S3 bucket uri must start with "s3://".');
    }
    if(bucketUri.endsWith('.xml')) {
      logger.error('S3 bucket uri must not include the .xml file name.');
      throw new Error('S3 bucket uri must not include the .xml file name');
    }
    if(bucketUri.endsWith('/')) {
      sitemapFileLocator = `${bucketUri}${options.defaultSitemapName}`;
    } else {
      sitemapFileLocator = `${bucketUri}/${options.defaultSitemapName}`;
    }
    if (specificBucketRegion) {
      sitemapFileLocator += `:region://${specificBucketRegion}`;
    }
  } else {
    logger.error('Either bucketUri or specificSitemapFileLocator must be provided to determine the sitemap path.');
    throw new Error('Either bucketUri or specificSitemapFileLocator must be provided to determine the sitemap path.');
  }
  return sitemapFileLocator;
}

export function buildBucketUriRegionString(bucketUri: string, bucketRegion?: string): string {
  return bucketRegion ? `${bucketUri}:region://${bucketRegion}` : bucketUri;
}

export function initializeReport({
  bucketUri,
  bucketUriRegion,
  isExecute = false,
  sitemapFileLocator,
  s3PathLayoutNew = S3Layout.UNKNOWN,
}: {
  bucketUri: string;
  bucketUriRegion: string;
  isExecute?: boolean;
  sitemapFileLocator: string;
  s3PathLayoutNew?: S3Layout;
}): S3Report {
  return {
    bucketUri,
    bucketUriRegion,
    sitemapFileLocator,
    s3PathLayoutNew,
    isExecute,
    paths: [],
    pathsExcluded: [],
    keysAll: [],
    keysStatus: {},
    s3CopyCommands: [],
    s3RemoveCommands: [],
    s3CopyCommandsSkipped: [],
    s3RemoveKeysSkipped: [],
  };
}

export function generateKeys(paths: string[], s3Report: S3Report): void {
  logger.debug('Generating S3 object keys from sitemap paths');
  paths.forEach((path) => {
    if(path) {
      if (!path || path.endsWith('.html') || path.endsWith('/')) {
        s3Report.pathsExcluded.push(path);
      } else {
        s3Report.paths.push(path);
        const key = path.replace(/^\//, '');          // Remove leading slash object key
        s3Report.keysAll.push(`${key}`, `${key}.html`, `${key}/index.html`); // same, flat, index
      }
    } else {
      logger.error(`Excluding invalid sitemap path from paths and S3 object key generation: "${path}"`);
    }
  });
  if(s3Report.pathsExcluded.length > 0) {
    logger.info(`Sitemap paths used: ${s3Report.paths.length} excluded: ${s3Report.pathsExcluded.length}`);
    logger.debug('Sitemap paths excluded, ', s3Report.pathsExcluded);
  }
}

export function keysToLayoutString(isSameKeyKey, isFlatKey, isIndexKey): string {
  if (isSameKeyKey) {
    if(isIndexKey) return S3Layout.DOUBLE;
    else if(isFlatKey) return S3Layout.MIXED;
    else return S3Layout.SINGLE;
  }
  if (isFlatKey) {
    if (!isIndexKey && !isSameKeyKey) return S3Layout.FLAT;
    else return S3Layout.MIXED;
  }
  if (isIndexKey) {
    if(!isSameKeyKey && !isFlatKey) return S3Layout.INDEX;
    else return S3Layout.MIXED;
  }
  return S3Layout.UNKNOWN;
}


export async function checkS3Objects(bucketUriRegion: string, allKeys: string[]): Promise<Record<string, boolean>> {
  logger.debug(`Checking S3 objects keys (3 for each path): ${allKeys.length}`);
  return checkObjects(bucketUriRegion, allKeys);
}

/**
 * Generate S3 bucket keys based on the sitemap paths.
 * @param bucketUri - The S3 bucket uri.
 * @param options - Options for specific region and sitemap file.
 * @returns A partially initialized S3Report with generated keys.
 */
export async function createS3KeysFromSitemap(
  bucketUri: string,
  options: {
    isExecute?: boolean;
    specificRegion?: string;
    sitemapFile?: string;
  }
): Promise<S3Report> {
  validateS3Bucket(bucketUri);

  const { specificRegion, sitemapFile } = options;
  const sitemapPath = buildSitemapFileLocator(bucketUri, sitemapFile, specificRegion);
  const bucketUriRegion = buildBucketUriRegionString(bucketUri, specificRegion);

  const s3Report: S3Report = initializeReport({
    bucketUri,
    bucketUriRegion,
    sitemapFileLocator: sitemapPath,
    isExecute: options.isExecute || false,
  });

  try {
    const paths = await fetchPathsFromSitemap(sitemapPath);
    if (paths.length === 0) {
      logger.warn(`No paths found in the sitemap at ${sitemapPath}`);
      return s3Report;
    }
    logger.info(`Sitemap paths found total: ${paths.length}`);
    logger.debug('Sitemap paths found', paths);

    generateKeys(paths, s3Report);
    if (s3Report.keysAll.length === 0) {
      logger.info('No valid paths found in the sitemap for S3 objects keys.');
    }

    return s3Report;
  } catch (error) {
    logger.error('Error generating S3 report keys:', error);
    throw error;
  }
}