import { fetchParsePaths } from "@pennockprojects/sitemap-diff";
import { checkObjects } from "./awsS3Utils";
import logger from "./logger";
import { S3Report } from '../types/S3Report';

export async function fetchPathsFromSitemap(sitemapPath: string): Promise<string[]> {
  logger.info(`Fetching paths from sitemap: ${sitemapPath}`);
  logger.debug('Fetching and parsing paths from sitemap:', sitemapPath);
  return fetchParsePaths(sitemapPath);
}

export function validateS3Bucket(s3Bucket: string): void {
  if (!s3Bucket) {
    logger.error('S3 bucket path is required.');
    throw new Error('S3 bucket path is required.');
  }
  if (!s3Bucket.startsWith('s3://')) {
    logger.error('S3 bucket path must start with "s3://".');
    throw new Error('S3 bucket path must start with "s3://".');
  }
}

export function buildSitemapPath(s3Bucket: string, sitemapFilePath?: string, specificRegion?: string): string {
  let sitemapPath = sitemapFilePath || `${s3Bucket}/sitemap.xml`;
  if (sitemapFilePath) {
    if(!sitemapFilePath.endsWith('.xml')) {
      logger.error('Sitemap file path must end with ".xml".');
      throw new Error('Sitemap file path must end with ".xml".');
    }
    sitemapPath = sitemapFilePath;
  } else if (s3Bucket) {
    if(s3Bucket.endsWith('/')) {
      sitemapPath = `${s3Bucket}sitemap.xml`;
    } else {
      sitemapPath = `${s3Bucket}/sitemap.xml`;
    }
    if (specificRegion) {
      sitemapPath += `:region://${specificRegion}`;
    }
  } else {
    logger.error('Either sitemapFilePath or s3Bucket must be provided to determine the sitemap path.');
    throw new Error('Either sitemapFilePath or s3Bucket must be provided to determine the sitemap path.');
  }
  return sitemapPath;
}

export function buildS3BucketPath(s3Bucket: string, specificRegion?: string): string {
  return specificRegion ? `${s3Bucket}:region://${specificRegion}` : s3Bucket;
}

export function initializeReport(
  s3Bucket: string,
  s3BucketPath: string,
  sitemapPath: string,
  options: { specificRegion?: string; sitemapFile?: string }
): S3Report {
  return {
    s3Bucket,
    s3BucketPath,
    sitemapPath,
    options,
    paths: [],
    pathsExcluded: [],
    keysAll: [],
    keysStatus: {},
    validS3Commands: [],
    skippedS3Commands: [],
  };
}

export function generateKeys(paths: string[], s3Report: S3Report): void {
  logger.debug('Generating S3 object keys from sitemap paths');
  paths.forEach((path) => {
    s3Report.paths.push(path);
    if (path.endsWith('.html')) {
      s3Report.pathsExcluded.push(path);
    } else {

      const key = path.replace(/^\/|\/$/g, '');        // Remove leading slash object key and any trailing slash
      s3Report.keysAll.push(`${key}`, `${key}.html`, `${key}/index.html`); // same, flat, index
    }
  });
  if(s3Report.pathsExcluded.length > 0) {
    logger.info(`Paths excluded in generating S3 object keys: ${s3Report.pathsExcluded.length}`);
    logger.debug('Paths excluded:', s3Report.pathsExcluded);
  }
  logger.info(`Generated S3 object keys: ${s3Report.keysAll.length}`);
  logger.debug('Result ==> Generated S3 object keys:', {
    totalPaths: s3Report.paths.length,
    totalPathsExcluded: s3Report.pathsExcluded.length,
    totalKeys: s3Report.keysAll.length,
  });
}

export async function checkS3Objects(s3BucketPath: string, allKeys: string[]): Promise<Record<string, boolean>> {
  logger.info(`Checking S3 objects keys: ${allKeys.length}`);
  return checkObjects(s3BucketPath, allKeys);
}



