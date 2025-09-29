import { checkS3Objects, createS3KeysFromSitemap } from "./s3CommandUtils";
import { removeS3Object } from "./awsS3Utils";
import logger from "./logger";
import { S3Report } from '../types/S3Report';
import { S3Command, S3CommandStatus, S3Layout } from "../types/S3Command";

/**
 * Process the S3 report by checking object existence and creating remove actions.
 * @param s3Report - The S3 report with generated keys.
 * @returns The updated S3Report with actions created.
 */
export async function processKeysRmActions(s3Report: S3Report): Promise<S3Report> {
  try {
    const objectKeysFound = await checkS3Objects(s3Report.bucketUriRegion, s3Report.keysAll);

    createRmActions(objectKeysFound, s3Report);

    return s3Report;
  } catch (error) {
    logger.error('Error processing S3 report actions:', error);
    throw error;
  }
}

function createRmActions(objectKeysFound: Record<string, boolean>, s3Report: S3Report): void {
  // Filter paths based on existence in S3
  s3Report.keysStatus = objectKeysFound;

  for (let i = 0; i < s3Report.keysAll.length; i = i + 3) {
    const sameAsDirKey = s3Report.keysAll[i];     // sameAsDir
    const flatHTMLKey = s3Report.keysAll[i + 1];  // flat
    const indexHTMLKey = s3Report.keysAll[i + 2]; // index

    const command: S3Command = {
      command: '',
      commandType: "rm",
      commandStatus: S3CommandStatus.NOT_CHECKED,
      targetKey: '',
      targetLayout: S3Layout.UNKNOWN,
      isTarget: false,
      sourceKey: '',
      sourceLayout: S3Layout.UNKNOWN,
      isSource: false
    };

    if (sameAsDirKey === undefined || flatHTMLKey === undefined || indexHTMLKey === undefined) {
      logger.error(`Error remove keys at index ${i}:`, { sameAsDirKey, flatHTMLKey, indexHTMLKey });
      command.commandStatus = S3CommandStatus.ERROR_KEYS_UNDEFINED;
    } else if (!sameAsDirKey || !objectKeysFound[sameAsDirKey]) {
      command.commandStatus = S3CommandStatus.NO_SOURCE;
    } else {
      command.sourceKey = sameAsDirKey;
      command.sourceLayout = S3Layout.SAME_AS_DIRECTORY;
      command.isSource = true;

      if (!objectKeysFound[flatHTMLKey] && !objectKeysFound[indexHTMLKey]) {
        logger.debug(`Target keys not found:\n\t flat: ${flatHTMLKey} or \n\t index: ${indexHTMLKey} - skipping`);
        command.commandStatus = S3CommandStatus.NO_TARGET;
      } else if (objectKeysFound[flatHTMLKey] && objectKeysFound[indexHTMLKey]) {
        logger.warn(`Duplicate target found flat: ${flatHTMLKey} and index: ${indexHTMLKey} for target: ${sameAsDirKey} skipping`);
        command.commandStatus = S3CommandStatus.DUPLICATE_TARGETS;
        command.sourceLayout = S3Layout.UNKNOWN;
        command.isSource = false;
      } else {
        if (objectKeysFound[sameAsDirKey]) {
          if (objectKeysFound[flatHTMLKey] && !objectKeysFound[indexHTMLKey]) {
            command.sourceLayout = S3Layout.SAME_AND_FLAT;
            command.targetKey = flatHTMLKey;
            command.targetLayout = S3Layout.SAME_AS_DIRECTORY;
            command.isTarget = true;
            command.commandStatus = S3CommandStatus.GENERATED;
            command.command = `aws s3 rm ${s3Report.bucketUriRegion}/${flatHTMLKey}`;
            s3Report.s3RemoveFlats++;
          } else if (objectKeysFound[indexHTMLKey] && !objectKeysFound[flatHTMLKey]) {
            command.sourceLayout = S3Layout.SAME_AND_INDEX;
            command.targetKey = indexHTMLKey;
            command.targetLayout = S3Layout.SAME_AS_DIRECTORY;
            command.isTarget = true;
            command.commandStatus = S3CommandStatus.GENERATED;
            command.command = `aws s3 rm ${s3Report.bucketUriRegion}/${indexHTMLKey}`;
            s3Report.s3RemoveIndexes++;
          } else {
            // catch all error
            command.commandStatus = S3CommandStatus.ERROR;
            logger.error(`Error UNKNOWN processing keys at index ${i}: ${sameAsDirKey}: ${objectKeysFound[sameAsDirKey]}, ${flatHTMLKey}: ${objectKeysFound[flatHTMLKey]} ${indexHTMLKey}: ${objectKeysFound[indexHTMLKey]}`, 'skipping');
          }
        } else {
          logger.warn(`Source key not found in S3: ${sameAsDirKey} skipping`);
          command.commandStatus = S3CommandStatus.SKIPPED;
          command.sourceLayout = S3Layout.UNKNOWN;
          command.isSource = false;
        }
      } 
    }

    if (command.commandStatus === S3CommandStatus.GENERATED) {
      s3Report.s3RemoveCommands.push(command);
    } else {
      s3Report.s3RemoveCommandsSkipped.push(command);
    }
  }
}

/**
 * Generate AWS S3 commands to remove redundant Nuxt Static Sites html page bucket objects.
 * @param s3Bucket - The S3 bucket path.
 * @param options - Options for specific region and sitemap file.
 * @returns The final S3Report with generated remove commands and actions.
 */
export async function s3RmCommands(
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

  return await processKeysRmActions(s3Report);
}

/**
 * Execute the S3 remove command to delete an object from the specified S3 bucket.
 * @param s3Bucket - The S3 bucket name.
 * @param sourceKey - The key of the object to remove.
 * @returns The result of the remove operation.
 */
export async function executeS3Remove(s3Bucket: string, sourceKey: string): Promise<any> {
  logger.info(`Executing remove in bucket ${s3Bucket} from ${sourceKey}`);
  return removeS3Object(s3Bucket, sourceKey);
}
