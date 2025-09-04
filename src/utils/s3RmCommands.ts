import { validateS3Bucket, buildSitemapPath, buildS3BucketPath, initializeReport, fetchPathsFromSitemap, generateKeys, checkS3Objects } from "./s3CommandUtils";
import logger from "./logger";
import { S3Report } from '../types/S3Report';
import { S3Command } from "../types/S3Command";

/**
 * Generate AWS S3 commands to optimize Nuxt Static Sites html page bucket objects 
 * hosted in an Amazon AWS S3 bucket for S3 web site hosting. This function is meant to be 
 * used second, after successful copy, and removes redudant content.  It will check that an
 * html page at the path exists and that there is a flat or index html page to remove.
 * See:
 * https://pennockprojects/projects/cicd/nuxtssfix
 * and
 * https://nuxtjs.org/docs/deployment/deployment#static-hosting-with-aws-s3
 * 
 * AWS S3 Permissions accessing the bucket URL uses the local configured AWS CLI context.
 *  
 * @param s3Bucket - An S3 bucket path. Examples: 's3://bucket-name' or 's3://bucket-name/key'
 * @param options - Options
 * @param options.specificRegion - Specify the AWS region for the S3 bucket (e.g., 'us-west-2')
 * @param options.sitemapFile - Local Path, URL, or S3 bucket sitemap.xml file to fetch paths from and must end in '.xml. Defaults to '<s3Bucket>/sitemap.xml'. '
 * Note: If 'options.sitemapFile' references an AWS S3 bucket, it does not use the 'options.specificRegion` option if provided.
 *  Instead append ':region://<region-string>' (e.g., 's3://bucket-name/keyname/sitemap.xml:region://us-west-2'
 *  The inherited AWS CLI credentials must provide permissions for S3 bucket access in both regions if different
 * @returns An object containing the generated AWS S3 commands and related information
 *  paths parsed from the sitemap, keys checked in S3, and their existence status.
 * @throws Will throw an error if the S3 bucket path is invalid or if there are issues fetching or processing the sitemap
 * @example
 * const s3Report = await s3RmCommands('s3://my-bucket', { specificRegion: 'us-west-2', sitemapFile: './sitemap.xml' });
 * // reads local './sitemap.xml' file for paths
 * console.log(s3Report.awsS3Commands);
 * // [
 * //   'aws s3 rm s3://my-bucket/path/to/page.html',
 * //   'aws s3 rm s3://my-bucket/another/page.html',
 * //   ...
 * // ]
  * */
export async function s3RmCommands(
  s3Bucket: string,
  options: {
    specificRegion?: string;
    sitemapFile?: string;
  }
): Promise<S3Report> {
  validateS3Bucket(s3Bucket);

  const { specificRegion, sitemapFile } = options;
  const sitemapPath = buildSitemapPath(s3Bucket, sitemapFile, specificRegion);
  const s3BucketPath = buildS3BucketPath(s3Bucket, specificRegion);

  const s3Report: S3Report = initializeReport(s3Bucket, s3BucketPath, sitemapPath, options);

  try {
    const paths = await fetchPathsFromSitemap(sitemapPath);
    if (paths.length === 0) {
      logger.warn(`No paths found in the sitemap at ${sitemapPath}`);
      return s3Report;
    }
    logger.info(`Paths found at ${sitemapPath}: ${paths.length}`);
    logger.debug(`Result ==> Paths found and parsed from sitemap: ${sitemapPath}:`, paths);

    generateKeys(paths, s3Report);
    if (s3Report.keysAll.length === 0) {
      logger.warn('No valid paths found in the sitemap for S3 objects keys.');
      return s3Report;
    }

    const objectKeysFound = await checkS3Objects(s3BucketPath, s3Report.keysAll);

    generateRmCommands(objectKeysFound, s3Report);
   
    return s3Report;
  } catch (error) {
    logger.error('Error processing S3 commands:', error);
    throw error;
  }
}

function generateRmCommands(objectKeysFound: Record<string, boolean>, s3Report: S3Report): void {
  logger.debug(`Result ==> keys status:`, objectKeysFound);


  // Filter paths based on existence in S3
  s3Report.keysStatus = objectKeysFound;
  for(let i=0; i < s3Report.keysAll.length; i=i+3) {
    const sameAsDirKey = s3Report.keysAll[i];   // sameAsDir
    const flatHTMLKey = s3Report.keysAll[i+1];  // flat
    const indexHTMLKey = s3Report.keysAll[i+2]; // index

    const command:S3Command = {
      command: '',
      commandType: "rm",
      commandStatus: 'skipped',
      targetKey: '',
      targetLayout: "unknown", // "flat" | "index"
      isTarget: false,
      sourceKey: '',
      sourceLayout: 'sameAsDir',
      isSource: false
    };

    if(sameAsDirKey === undefined || flatHTMLKey === undefined || indexHTMLKey === undefined) {
      logger.error(`Error remove keys at index ${i}:`, { sameAsDirKey, flatHTMLKey, indexHTMLKey });
      command.commandStatus = 'error';
    } else if(!objectKeysFound[sameAsDirKey]) {
      logger.warn(`Source key: ${sameAsDirKey} not found, will not generate commands to remove flat or index keys, skipping`);
      command.commandStatus = 'source-not-found';
    } else {
      command.sourceKey = sameAsDirKey;
      command.sourceLayout = "sameAsDir";
      command.isSource = true;   
      
      if(!objectKeysFound[flatHTMLKey] && !objectKeysFound[indexHTMLKey]) {
        logger.warn(`Target keys not found:\n\t flat: ${flatHTMLKey} or \n\t index: ${indexHTMLKey} - skipping`);
        command.commandStatus = 'target-not-found';
      } else if(objectKeysFound[flatHTMLKey] && objectKeysFound[indexHTMLKey]) {
        logger.warn(`Duplicate target found flat: ${flatHTMLKey} and index: ${indexHTMLKey} for target: ${sameAsDirKey} skipping`);
        command.commandStatus = 'duplicate-targets';
      } else if(objectKeysFound[flatHTMLKey] && !objectKeysFound[indexHTMLKey]) {
        command.targetKey = flatHTMLKey;
        command.targetLayout = "flat";
        command.isTarget = true;
        command.commandStatus = 'generated';
        command.command = `aws s3 rm ${s3Report.s3BucketPath}/${flatHTMLKey}`;
        logger.debug(`Generated Flat remove command: ${command.command}`);
      } else if (objectKeysFound[indexHTMLKey] && !objectKeysFound[flatHTMLKey]) {
        command.targetKey = indexHTMLKey;
        command.targetLayout = "index";
        command.isTarget = true;
        command.commandStatus = 'generated';
        command.command = `aws s3 rm ${s3Report.s3BucketPath}/${indexHTMLKey}`;
        logger.debug(`Generated Index remove command: ${command.command}`);
      } else {
        // catch all error
        command.commandStatus = 'error-unknown';
        logger.error(`Error UNKNOWN processing keys at index ${i}:`, { sameAsDirKey, flatHTMLKey, indexHTMLKey }, 'skipping');
        // logger.error(`Error UNKNOWN processing keys at index, ${i}: sameAsDir: ${objectKeysFound[sameAsDirKey]}, flat: ${objectKeysFound[flatHTMLKey]} index: ${objectKeysFound[indexHTMLKey]} ... skipping`);
      }
  }

    if(command.commandStatus === 'generated') {
      s3Report.validS3Commands.push(command);
    } else {
      s3Report.skippedS3Commands.push(command);
    }
  }

  logger.info(`Total S3 remove commands checked: ${s3Report.validS3Commands.length + s3Report.skippedS3Commands.length}`);
  if(s3Report.validS3Commands.length === 0) {
    logger.warn('No S3 remove commands generated.');
  }
  logger.info(`S3 remove commands generated: ${s3Report.validS3Commands.length}`);
  if(s3Report.skippedS3Commands.length > 0) {
    logger.warn(`S3 remove commands skipped, invalid or with errors: ${s3Report.skippedS3Commands.length}`);
    logger.debug('S3 remove commands:', s3Report.skippedS3Commands);
  }
}  


