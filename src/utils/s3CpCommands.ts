import { checkS3Objects, createS3KeysFromSitemap } from "./s3CommandUtils";
import { copyS3Object } from "./awsS3Utils";
import logger from "./logger";
import { S3Report } from '../types/S3Report';
import { S3Command, S3CommandStatus, S3Layout } from "../types/S3Command";

/**
 * Process the S3 report by checking object existence and creating copy actions.
 * @param s3Report - The S3 report with generated keys.
 * @returns The updated S3Report with actions created.
 */
export async function processKeysCpActions(s3Report: S3Report): Promise<S3Report> {
  try {
    const objectKeysFound = await checkS3Objects(s3Report.bucketUriRegion, s3Report.keysAll);

    createCpActions(objectKeysFound, s3Report);

    return s3Report;
  } catch (error) {
    logger.error('Error processing S3 report actions:', error);
    throw error;
  }
}

function createCpActions(objectKeysFound: Record<string, boolean>, s3Report: S3Report): void {

  // Filter paths based on existence in S3
  s3Report.keysStatus = objectKeysFound;
  for (let i = 0; i < s3Report.keysAll.length; i = i + 3) {
    const sameAsDirKey = s3Report.keysAll[i];     // sameAsDir
    const flatHTMLKey = s3Report.keysAll[i + 1];  // flat
    const indexHTMLKey = s3Report.keysAll[i + 2]; // index

    const command: S3Command = {
      command: '',
      commandType: "cp",
      commandStatus: S3CommandStatus.NOT_CHECKED,
      targetKey: sameAsDirKey,
      targetLayout: S3Layout.UNKNOWN,
      isTarget: false,
      sourceKey: '',
      sourceLayout: S3Layout.UNKNOWN,
      isSource: false
    };

    if (!sameAsDirKey || !flatHTMLKey || !indexHTMLKey) {
      logger.error(`Error processing keys at index ${i}:`, { sameAsDirKey, flatHTMLKey, indexHTMLKey });
      command.commandStatus = S3CommandStatus.ERROR_NO_KEYS;
    } else if (objectKeysFound[sameAsDirKey]) {
      logger.debug(`Target key already exists: ${sameAsDirKey} skipping`);
      command.commandStatus = S3CommandStatus.TARGET_EXISTS;
      command.isTarget = true;
      command.targetLayout = S3Layout.SAME_AS_DIRECTORY;
    } else if (objectKeysFound[flatHTMLKey] && objectKeysFound[indexHTMLKey]) {
      logger.warn(`Duplicate sources found flat: ${flatHTMLKey} index: ${indexHTMLKey} for target: ${sameAsDirKey} skipping`);
      command.commandStatus = S3CommandStatus.DUPLICATE_SOURCES;
    } else if (!objectKeysFound[flatHTMLKey] && !objectKeysFound[indexHTMLKey]) {
      logger.warn(`No sources found for target: ${sameAsDirKey} skipping`);
      command.commandStatus = S3CommandStatus.NO_SOURCE;
    } else if (objectKeysFound[flatHTMLKey] && !objectKeysFound[sameAsDirKey]) {
      command.sourceKey = flatHTMLKey;
      command.sourceLayout = S3Layout.FLAT;
      command.targetLayout = S3Layout.SAME_AND_FLAT;
      command.isSource = true;
      command.commandStatus = S3CommandStatus.GENERATED;
      command.command = `aws s3 cp ${s3Report.bucketUriRegion}/${flatHTMLKey} ${s3Report.bucketUriRegion}/${sameAsDirKey}`;
      s3Report.s3CopyFlats++;
    } else if (objectKeysFound[indexHTMLKey] && !objectKeysFound[sameAsDirKey]) {
      command.sourceKey = indexHTMLKey;
      command.sourceLayout = S3Layout.INDEX;
      command.targetLayout = S3Layout.SAME_AND_INDEX;
      command.isSource = true;
      command.commandStatus = S3CommandStatus.GENERATED;
      command.command = `aws s3 cp ${s3Report.bucketUriRegion}/${indexHTMLKey} ${s3Report.bucketUriRegion}/${sameAsDirKey}`;
      s3Report.s3CopyIndexes++;
    } else {
      // catch all error
      command.commandStatus = S3CommandStatus.ERROR;
      logger.error(`Error processing keys at index ${i}:`, { sameAsDirKey, flatHTMLKey, indexHTMLKey }, 'skipping');
    }

    if (command.commandStatus === S3CommandStatus.GENERATED) {
      s3Report.s3CopyCommands.push(command);
    } else {
      s3Report.s3CopyCommandsSkipped.push(command);
    }
  }
}

/**
 * Generate AWS S3 commands to optimize Nuxt Static Sites html page bucket objects.
 * @param s3Bucket - The S3 bucket path.
 * @param options - Options for specific region and sitemap file.
 * @returns The final S3Report with generated commands and actions.
 */
export async function s3CpCommands(
  s3Bucket: string,
  options: {
    specificRegion?: string;
    sitemapFile?: string;
    defaultSitemapName?: string;
  }
): Promise<S3Report> {
  const s3Report = await createS3KeysFromSitemap(s3Bucket, options);

  if (s3Report.keysAll.length === 0) {
    return s3Report;
  }

  return await processKeysCpActions(s3Report);
}

/**
 * Execute the S3 copy command to copy an object within the same S3 bucket.
 * @param S3Bucket - The S3 bucket name.
 * @param sourceKey - The source key of the object to copy.
 * @param destinationKey - The destination key for the copied object.
 * @returns A promise that resolves when the copy operation is complete.
 */
export async function executeS3Copy(S3Bucket: string, sourceKey:string, destinationKey: string): Promise<any> {
  logger.info(`Executing copy in bucket ${S3Bucket} from ${sourceKey} to ${destinationKey}`);
  return copyS3Object(S3Bucket, sourceKey, destinationKey);
}