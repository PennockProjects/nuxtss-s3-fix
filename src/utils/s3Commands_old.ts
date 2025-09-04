import { fetchParsePaths } from "@pennockprojects/sitemap-diff"
import logger from "./logger";
import { checkObjects } from "./awsS3Utils";
import { S3Report } from '../types/S3Report';

/**
 * Generate AWS S3 commands to optimize a Nuxt Static Sites html page bucket objects for Amazon AWS S3 static web site hosting. 
 * AWS S3 Permissions accessing the bucket URL uses the local configured AWS CLI context.
 *  
 * @param s3Bucket - An S3 bucket path. Examples: 's3://bucket-name' or 's3://bucket-name/key'
 * @param options - Options
 * @param options.specificRegion - Specify the AWS region for the S3 bucket (e.g., 'us-west-2')
 * @param options.removeCommands - True to generate remove commands instead of copy commands
 * @param options.sitemapFile - Local Path, URL, or S3 bucket sitemap.xml file to fetch paths from. Defaults to 's3Bucket/sitemap.xml'. must end in '.xml'
 * @returns An object containing the generated AWS S3 commands and related information
 *  paths parsed from the sitemap, keys checked in S3, and their existence status.
 * @throws Will throw an error if the S3 bucket path is invalid or if there are issues fetching or processing the sitemap
 * @example
 * const s3Report = await s3Commands('s3://my-bucket', { specificRegion: 'us-west-2', removeCommands: false, sitemapFile: './sitemap.xml' });
 * // reads local './sitemap.xml' file for paths
 * console.log(s3Report.awsS3Commands);
 * // [
 * //   'aws s3 cp s3://my-bucket/path/to/page.html s3://my-bucket/path/to/page',
 * //   'aws s3 cp s3://my-bucket/another/page.html s3://my-bucket/another/page',
 * //   ...
 * // ]
  * */
export async function s3Commands(
  s3Bucket: string,
  options: {
    specificRegion?: string;
    removeCommands?: boolean;
    sitemapFile?: string;
  }
): Promise<S3Report> {
  const { specificRegion, removeCommands, sitemapFile } = options;

  logger.debug('s3Commands called with:', {
    s3Bucket,
    specificRegion,
    removeCommands,
    sitemapFile
  });
  
  if(!s3Bucket) {
    logger.error('S3 bucket path is required.');
    throw new Error('S3 bucket path is required.');
  }

  if(!s3Bucket.startsWith('s3://')) {
    logger.error('S3 bucket path must start with "s3://".');
    throw new Error('S3 bucket path must start with "s3://".');
  }

  // Determine the sitemap path
  let sitemapPath = sitemapFile || (s3Bucket + '/sitemap.xml');
  let s3BucketPath = s3Bucket;
  if(specificRegion) {
    // add region specifier to the s3 paths for 'fetchParsePaths' and 'checkObjects'
    sitemapPath = sitemapPath + `:region://${specificRegion}`;
    s3BucketPath = s3BucketPath + `:region://${specificRegion}`;
  }

  const s3Report: S3Report = {
    s3Bucket: s3Bucket,
    s3BucketPath: s3BucketPath,
    sitemapPath: sitemapPath,
    options: options,
    paths: [],
    pathsExcluded: [],
    keysFlat: [],
    keysIndex: [],
    keysStatus: {},
    awsS3Commands: [],
};

  // Fetch and parse the sitemap to get the paths
  logger.debug('1. Fetching and parsing paths from sitemap:', sitemapPath);

  return fetchParsePaths(sitemapPath)
    .then(paths => {
      if(paths.length === 0) {
        logger.warn(`No paths found in the sitemap at ${sitemapPath}`);
        return s3Report; // Return early with empty report
      }
      logger.debug(`1.==> Result: Paths parsed from sitemap: ${sitemapPath}:`, paths);

      logger.debug('2. Generating S3 object keys from paths and s3BucketPath:', s3Report.s3BucketPath);
      const keys = paths
        .filter(path => {
          s3Report.paths.push(path);          // Collect paths for s3Report
          if( path.endsWith('.html') || path.endsWith('/') ) {
            s3Report.pathsExcluded.push(path); // note excluded paths ending in html or '/' (inclucdes root path)
            return false;                    // exclude from 'keys' s3Report
          } else {
                                            // Nuxt static paths do not have .html suffix
            return true;                    // include the non-excluded paths in 'keys'
          }
        }) // Filter for HTML files or directories
        .map(cleanPaths => {
          const justPath = cleanPaths.replace(/^\//, '');   // Remove leading slash from key turning it into an object key
          s3Report.keysIndex.push(justPath + '/index.html');  // create a nuxt index object key
          s3Report.keysFlat.push(justPath + '.html');         // create a nuxt flat object keys
          return justPath                                   // return the 'keys' without slash prefix
        });

      if(keys.length === 0) {
        logger.warn(`${s3BucketPath} - No valid paths found in the sitemap to process.`);
        return s3Report; // No valid paths to process, return early
      }
      logger.info(`${s3BucketPath} - converted paths to Nuxt.js flat and index s3 html object keys`);
      logger.debug('2.==> Result: base key paths generated from sitemap paths:', keys, 'excludes paths', s3Report.pathsExcluded);

      // Check existence of the generated S3 object keys
      logger.debug('3. Checking existence of object keys in bucket:', s3BucketPath);
      logger.info(`${s3BucketPath} - checking ${s3Report.keysFlat.length} flat and ${s3Report.keysIndex.length} index S3 object keys.`);
      return checkObjects(s3BucketPath, s3Report.keysFlat.concat(s3Report.keysIndex))
        .then( objectKeysFound => {
          logger.debug(`3.==> Result: objects found in bucket: ${s3BucketPath} status:`, objectKeysFound);

          // Filter paths based on existence in S3
          s3Report.keysStatus = objectKeysFound;
          const flatObjectFound = s3Report.keysFlat.filter(key => objectKeysFound[key]);
          const flatObjectNotFound = s3Report.keysFlat.filter(key => !objectKeysFound[key]);
          const indexObjectsFound = s3Report.keysIndex.filter(key => objectKeysFound[key]);
          const indexObjectsNotFound = s3Report.keysIndex.filter(key => !objectKeysFound[key]);

          // Log out summary of found/not found objects
          logger.info(`${s3BucketPath} - found ${flatObjectFound.length} flat and ${indexObjectsFound.length} index S3 objects.`);
          if(flatObjectFound.length > 0 && flatObjectNotFound.length > 0) {
            logger.warn(`${s3BucketPath} - Not all flat S3 key objects found.`, 'Flat keys not found:\n\t', flatObjectNotFound.join('\n\t'));
          }
          if(indexObjectsFound.length > 0 && indexObjectsNotFound.length > 0) {
            logger.warn(`${s3BucketPath} - Not all index S3 key objects found.`, 'Index keys not found:\n\t', indexObjectsNotFound.join('\n\t'));
          }

          if(flatObjectFound.length === 0 && indexObjectsFound.length === 0) {
            logger.warn(`${s3BucketPath} - No matching S3 objects found for the paths in the sitemap.`);
            return s3Report; // No matching objects found, return early
          } else if (flatObjectFound.length > 0 && indexObjectsFound.length > 0) {
            logger.warn(`${s3BucketPath} - Both Nuxt static flat *and* static index S3 key objects found. This may indicate duplicate generative content.`);
          }
          const objectsFound = flatObjectFound.concat(indexObjectsFound);

          logger.debug('4. Generating AWS S3 CLI Commands')
          s3Report.awsS3Commands = objectsFound.map(key => {
            if(removeCommands) {
              return `aws s3 rm ${s3BucketPath}/${key}`;
            } else {
              return `aws s3 cp ${s3BucketPath}/${key} ${s3BucketPath}/${key.replace(/\.html$/, '')}`;
            }
          })
          logger.debug('4.==> Result: Generated AWS S3 CLI Commands', s3Report.awsS3Commands)

          // return the report
          return s3Report;
        })
        .catch(error => {
          logger.error('Error checking S3 objects:', error);
          throw error;
        });
    })
    .catch(error => {
      logger.error('Error fetching paths:', error);
      throw error;
    });
}
