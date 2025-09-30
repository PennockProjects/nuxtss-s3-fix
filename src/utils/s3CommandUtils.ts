import { fetchParsePaths } from "@pennockprojects/sitemap-diff";
import { checkObjects } from "./awsS3Utils";
import logger from "./logger";
import { S3Report } from '../types/S3Report';

export async function fetchPathsFromSitemap(sitemapFileLocator: string): Promise<string[]> {
  logger.info(`Fetching sitemap from: ${sitemapFileLocator}`);
  return fetchParsePaths(sitemapFileLocator);
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

export function initializeReport(
  bucketUri: string,
  bucketUriRegion: string,
  sitemapFileLocation: string,
): S3Report {
  return {
    bucketUri: bucketUri,
    bucketUriRegion: bucketUriRegion,
    sitemapFileLocator: sitemapFileLocation,
    paths: [],
    pathsExcluded: [],
    keysAll: [],
    keysStatus: {},
    s3CopyFlats: 0,
    s3CopyIndexes: 0,
    s3CopyCommands: [],
    s3RemoveFlats: 0,
    s3RemoveIndexes: 0,
    s3RemoveCommands: [],
    s3CopyCommandsSkipped: [],
    s3RemoveCommandsSkipped: [],
  };
}

export function generateKeys(paths: string[], s3Report: S3Report): void {
  logger.debug('Generating S3 object keys from sitemap paths');
  paths.forEach((path) => {
    if(path) {
      s3Report.paths.push(path);
      if (!path || path.endsWith('.html') || path.endsWith('/') || path === '') {
        s3Report.pathsExcluded.push(path);
      } else {
        const key = path.replace(/^\//, '');          // Remove leading slash object key
        s3Report.keysAll.push(`${key}`, `${key}.html`, `${key}/index.html`); // same, flat, index
      }
    } else {
      logger.error(`Excluding invalid sitemap path from paths and S3 object key generation: "${path}"`);
    }
  });
  if(s3Report.pathsExcluded.length > 0) {
    logger.info(`Sitemap paths used: ${s3Report.paths.length - s3Report.pathsExcluded.length} excluded: ${s3Report.pathsExcluded.length}`);
    logger.debug('Sitemap paths excluded, ', s3Report.pathsExcluded);
  }
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
    specificRegion?: string;
    sitemapFile?: string;
  }
): Promise<S3Report> {
  validateS3Bucket(bucketUri);

  const { specificRegion, sitemapFile } = options;
  const sitemapPath = buildSitemapFileLocator(bucketUri, sitemapFile, specificRegion);
  const bucketUriRegion = buildBucketUriRegionString(bucketUri, specificRegion);

  const s3Report: S3Report = initializeReport(bucketUri, bucketUriRegion, sitemapPath);

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