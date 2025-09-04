import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import logger from './logger';

/**
 * Check if multiple objects exist in an S3 bucket
 * @param s3Url - The S3 URL of the bucket (e.g., "s3://bucket-name:region://region-name")
 * @param keys - An array of object keys to check
 * @returns An object with the keys as properties and their existence as boolean values
 */
export async function checkObjects(s3Url: string, keys: string[]): Promise<Record<string, boolean>> {
  const s3Details = parseS3Url(s3Url);

  if (!s3Details) {
    console.error(`Failed to parse S3 URL: ${s3Url}`);
    return keys.reduce((acc, key) => ({ ...acc, [key]: false }), {}); // Return false for all keys
  }

  const { bucketName, region } = s3Details;

  const s3Client = new S3Client(region ? { region: region } : {});
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
    });
    const response = await s3Client.send(command);

    // Extract the list of existing keys from the response
    const existingKeys = response.Contents?.map((item) => item.Key) || [];

    // Check if each key exists in the list of existing keys
    const result: Record<string, boolean> = {};
    keys.forEach((key) => {
      result[key] = existingKeys.includes(key);
    });

    return result;
  } catch (error) {
    console.error(`Error checking S3 objects existence: ${error.message}`);
    return keys.reduce((acc, key) => ({ ...acc, [key]: false }), {}); // Return false for all keys
  }
}

/**
 * Extract the bucket name from an S3 URL
 * @param s3Url - The S3 URL to extract the bucket name from
 * @returns The bucket name, or null if the S3 URL is invalid
 */
export function getBucketNameFromS3Url(s3Url: string): string | null {
  const match = s3Url.match(/^s3:\/\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Extract the region from an S3 URL
 * @param s3Url - The S3 URL to extract the region from
 * @returns The region of the S3 bucket, or null if the S3 URL is invalid
 */
export function getRegionFromS3Url(s3Url: string): string | null {
  const match = s3Url.match(/:region:\/\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Extract the key (path) from an S3 URL
 * @param s3Url - The S3 URL to extract the key from
 * @returns The key (path) of the S3 object, or null if the S3 URL is invalid
 */
export function getKeyFromS3Url(s3Url: string): string | null {
  const match = s3Url.match(/^s3:\/\/[^/]+\/(.*?)(:region:\/\/|$)/);
  return match ? match[1] : null;
}

/**
 * Parse an S3 URL and extract the bucket name, key, and region
 * @param s3Url - The S3 URL to parse (e.g., "s3://bucket-name/key:region://region-name" or "s3://bucket-name/key")
 * @returns An object containing `bucketName`, `key`, and `region`, or null if the URL is invalid
 */
export function parseS3Url(s3Url: string): { bucketName: string; key: string; region: string | null } | null {
  const bucketName = getBucketNameFromS3Url(s3Url);
  const key = getKeyFromS3Url(s3Url);
  const region = getRegionFromS3Url(s3Url);
  logger.debug('parseS3Url called with:', { s3Url, bucketName, key, region });

  if (!bucketName) {
    console.error(`Invalid S3 URL format: ${s3Url}`);
    return null;
  }

  return {
    bucketName,
    key,
    region: region || null, // Use null if region is not specified
  };
}