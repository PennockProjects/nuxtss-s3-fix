import fs from 'fs';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * Upload a file to an S3 bucket
 * @param {string} bucketName - The name of the S3 bucket
 * @param {string} key - The key (path) for the file in the bucket
 * @param {string} filePath - The local file path to upload
 */
export async function uploadToS3(bucketName, key, filePath) {
  const s3Client = new S3Client({ region: 'us-west-2' }); // Replace with your region
  try {
    const fileContent = fs.readFileSync(filePath);
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileContent,
    });
    await s3Client.send(command);
    console.log(`File uploaded successfully to ${bucketName}/${key}`);
  } catch (error) {
    console.error(`Error uploading file to S3: ${error.message}`);
  }
}

/**
 * Download a file from an S3 bucket
 * @param {string} bucketName - The name of the S3 bucket
 * @param {string} key - The key (path) of the file in the bucket
 * @param {string} destinationPath - The local path to save the downloaded file
 */
export async function downloadFromS3(bucketName, key, destinationPath) {
  const s3Client = new S3Client({ region: 'us-west-2' }); // Replace with your region
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    const response = await s3Client.send(command);
    const fileStream = fs.createWriteStream(destinationPath);
    response.Body.pipe(fileStream);
    console.log(`File downloaded successfully to ${destinationPath}`);
  } catch (error) {
    console.error(`Error downloading file from S3: ${error.message}`);
  }
}

/**
 * Fetch a file from an S3 bucket using an S3 URL
 * @param {string} s3Url - The S3 URL to parse and fetch the file from (e.g., "s3://bucket-name/key:region://region-name")
 * @returns {Promise<string|null>} - The file content as a string, or null if an error occurs
 */
export async function fetchFromS3(s3Url) {
  const s3Details = parseS3Url(s3Url);

  if (!s3Details) {
    console.error(`Failed to parse S3 URL: ${s3Url}`);
    return null;
  }

  const { bucketName, key, region } = s3Details;

  const s3Client = new S3Client(region ? { region: region } : {});
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    const response = await s3Client.send(command);
    return response.Body.transformToString(); // Convert the stream to a string
  } catch (error) {
    console.error(`fetchFromS3 GetObject Error: ${error.message}`);
    return null;
  }
}

/**
 * Extract the bucket name from an S3 URL
 * @param {string} s3Url - The S3 URL to extract the bucket name from
 *    The form of the S3 URL is `s3://bucket-name/key` or `s3://bucket-name/key:region://region-name`
 * @returns {string|null} - The bucket name, or null if the S3 URL is invalid
 */
export function getBucketNameFromS3Url(s3Url) {
  const match = s3Url.match(/^s3:\/\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Extract the region from an S3 URL
 * @param {string} s3Url - The S3 URL to extract the region from
 *    The form of the S3 URL is `s3://bucket-name/key` or `s3://bucket-name/key:region://region-name`
 * @returns {string|null} - The region of the S3 bucket, or null if the S3 URL is invalid
 */
export function getRegionFromS3Url(s3Url) {
  const match = s3Url.match(/:region:\/\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Extract the key (path) from an S3 URL
 * @param {string} s3Url - The S3 URL to extract the key from
 *    The form of the S3 URL is `s3://bucket-name/key` or `s3://bucket-name/key:region://region-name`
 * @returns {string|null} - The key (path) of the S3 object, or null if the S3 URL is invalid
 */
export function getKeyFromS3Url(s3Url) {
  const match = s3Url.match(/^s3:\/\/[^/]+\/(.*?)(:region:\/\/|$)/);
  return match ? match[1] : null;
}

/**
 * Parse an S3 URL and extract the bucket name, key, and region
 * @param {string} s3Url - The S3 URL to parse (e.g., "s3://bucket-name/key:region://region-name" or "s3://bucket-name/key")
 * @returns {Object|null} - An object containing `bucketName`, `key`, and `region`, or null if the URL is invalid
 */
export function parseS3Url(s3Url) {
  const bucketName = getBucketNameFromS3Url(s3Url);
  const key = getKeyFromS3Url(s3Url);
  const region = getRegionFromS3Url(s3Url);

  if (!bucketName || !key) {
    console.error(`Invalid S3 URL format: ${s3Url}`);
    return null;
  }

  return {
    bucketName,
    key,
    region: region || null, // Use null if region is not specified
  };
}