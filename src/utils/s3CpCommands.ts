import { checkS3Objects, createS3KeysFromSitemap, keysToLayoutString } from "./s3CommandUtils";
import { copyS3Object } from "./awsS3Utils";
import logger from "./logger";
import { S3Report } from '../types/S3Report';
import { S3Command, S3CommandStatus, S3CommandType, S3Layout } from "../types/S3Command";

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

export function createCpActions(objectKeysFound: Record<string, boolean>, s3Report: S3Report): void {

  // Filter paths based on existence in S3
  s3Report.keysStatus = objectKeysFound;
  logger.debug('Result S3 object keys status:', s3Report.keysStatus);

  const isTargetDouble = s3Report.s3PathLayoutNew === S3Layout.DOUBLE;
  const isTargetSingle = s3Report.s3PathLayoutNew === S3Layout.SINGLE;

  if(!isTargetSingle && !isTargetDouble) {
    logger.warn(`Unsupported target layout ${s3Report.s3PathLayoutNew}, not examining for remove actions.`);
    return;
  } else {
    for (let i = 0; i < s3Report.keysAll.length; i = i + 3) {
      const sameHTMLKey = s3Report.keysAll[i];      // same
      const flatHTMLKey = s3Report.keysAll[i + 1];  // flat
      const indexHTMLKey = s3Report.keysAll[i + 2]; // index

      const sameCopyCommand: S3Command = {
        command: '',
        commandType: S3CommandType.COPY,
        commandStatus: S3CommandStatus.NOT_CHECKED,
        targetKey: sameHTMLKey,
        targetLayout: S3Layout.UNKNOWN,
        isTarget: false,
        sourceKey: '',
        sourceLayout: S3Layout.UNKNOWN,
        isSource: false
      };

      const indexCopyCommand: S3Command = {
        command: '',
        commandType: S3CommandType.COPY,
        commandStatus: S3CommandStatus.NOT_CHECKED,
        targetKey: indexHTMLKey,
        targetLayout: S3Layout.UNKNOWN,
        isTarget: false,
        sourceKey: '',
        sourceLayout: S3Layout.UNKNOWN,
        isSource: false
      };

      // Check for undefined keys
      if (sameHTMLKey == undefined || flatHTMLKey == undefined || indexHTMLKey == undefined) {
        logger.error(`Error processing copy keys (index ${i}):`, { sameKey: sameHTMLKey, flatHTMLKey, indexHTMLKey });
        sameCopyCommand.commandStatus = S3CommandStatus.ERROR_KEYS_UNDEFINED;
        s3Report.s3CopyCommandsSkipped.push(sameCopyCommand);
      } else {
        let isFlatKey = objectKeysFound[flatHTMLKey];
        let isIndexKey = objectKeysFound[indexHTMLKey];
        let isSameKey = objectKeysFound[sameHTMLKey];
        let postMessage = "";

        if(isFlatKey || isIndexKey || isSameKey) {
          if(isTargetSingle) {
            sameCopyCommand.targetLayout = S3Layout.SINGLE;
            if(isSameKey) {
              if(!isIndexKey && !isFlatKey) {
                sameCopyCommand.commandStatus = S3CommandStatus.LAYOUT_OPTIMIZED;
                postMessage = `already in SINGLE layout. skipping`;
              } else {
                sameCopyCommand.commandStatus = S3CommandStatus.TARGET_EXISTS;
                postMessage = `already have SAME key. skipping`;
              }
              sameCopyCommand.isTarget = true;
            } else if(isIndexKey) {
              if(isFlatKey) {
                sameCopyCommand.sourceLayout = S3Layout.MIXED;
                postMessage = `Using INDEX key over FLAT key as source.`;
              } else {
                sameCopyCommand.sourceLayout = S3Layout.INDEX;
                postMessage = `Using INDEX key as source.`;
              }
              sameCopyCommand.sourceKey = indexHTMLKey;
              sameCopyCommand.isSource = true;
              sameCopyCommand.commandStatus = S3CommandStatus.GENERATED;
              sameCopyCommand.command = `aws s3 cp ${s3Report.bucketUriRegion}/${indexHTMLKey} ${s3Report.bucketUriRegion}/${sameHTMLKey}`;
            } else if(isFlatKey) {
              sameCopyCommand.sourceKey = flatHTMLKey;
              sameCopyCommand.sourceLayout = S3Layout.FLAT;
              sameCopyCommand.isSource = true;
              sameCopyCommand.commandStatus = S3CommandStatus.GENERATED;
              sameCopyCommand.command = `aws s3 cp ${s3Report.bucketUriRegion}/${flatHTMLKey} ${s3Report.bucketUriRegion}/${sameHTMLKey}`;
              postMessage = `Using FLAT key as source.`;
            }
          }  else if (isTargetDouble) {       
            // Double layout target
            sameCopyCommand.targetLayout = S3Layout.DOUBLE;
            indexCopyCommand.targetLayout = S3Layout.DOUBLE;
            if(isSameKey && isIndexKey) {
              if(!isFlatKey) {
                sameCopyCommand.isTarget = true;
                sameCopyCommand.commandStatus = S3CommandStatus.LAYOUT_OPTIMIZED;
                postMessage = `already in DOUBLE layout. skipping`;
              } else {
                sameCopyCommand.commandStatus = S3CommandStatus.TARGET_EXISTS;
                postMessage = `already have SAME and INDEX keys. skipping`;
              }
            } else if (!isSameKey && isIndexKey) {
              sameCopyCommand.sourceLayout = S3Layout.INDEX;
              sameCopyCommand.sourceKey = indexHTMLKey;
              sameCopyCommand.isSource = true;
              sameCopyCommand.commandStatus = S3CommandStatus.GENERATED;
              sameCopyCommand.command = `aws s3 cp ${s3Report.bucketUriRegion}/${indexHTMLKey} ${s3Report.bucketUriRegion}/${sameHTMLKey}`;
              indexCopyCommand.commandStatus = S3CommandStatus.TARGET_EXISTS;
              postMessage = `Using INDEX key as source for SAME key.`;
            } else if (isSameKey && !isIndexKey) {
              indexCopyCommand.sourceLayout = isFlatKey ? S3Layout.MIXED : S3Layout.SINGLE;
              indexCopyCommand.sourceKey = sameHTMLKey;
              indexCopyCommand.isSource = true;
              indexCopyCommand.commandStatus = S3CommandStatus.GENERATED;
              indexCopyCommand.command = `aws s3 cp ${s3Report.bucketUriRegion}/${sameHTMLKey} ${s3Report.bucketUriRegion}/${indexHTMLKey}`;
              sameCopyCommand.commandStatus = S3CommandStatus.TARGET_EXISTS;
              postMessage = `Using SAME key as source for INDEX key.`;
            } else if (!isSameKey && !isIndexKey && isFlatKey) {
                // Note !isSameKey && !isIndexKey && !isFlatKey is handled above with no sources found
                sameCopyCommand.sourceLayout = S3Layout.FLAT;
                sameCopyCommand.sourceKey = flatHTMLKey;
                sameCopyCommand.isSource = true;
                sameCopyCommand.commandStatus = S3CommandStatus.GENERATED;
                sameCopyCommand.command = `aws s3 cp ${s3Report.bucketUriRegion}/${flatHTMLKey} ${s3Report.bucketUriRegion}/${sameHTMLKey}`;

                indexCopyCommand.sourceLayout = S3Layout.FLAT;
                indexCopyCommand.sourceKey = flatHTMLKey;
                indexCopyCommand.isSource = true;
                indexCopyCommand.commandStatus = S3CommandStatus.GENERATED;
                indexCopyCommand.command = `aws s3 cp ${s3Report.bucketUriRegion}/${flatHTMLKey} ${s3Report.bucketUriRegion}/${indexHTMLKey}`;
                postMessage = `Using FLAT key as source.`;
            } else {
              // This should not be possible due to the outer if condition
              logger.error(`'${sameHTMLKey}' UNKNOWN Case ERROR.`);
            }
          } else {
            logger.warn(`Desired layout is UNKNOWN, skipping copy actions for keys at index ${i}:`, { sameKey: sameHTMLKey, isSameKey, flatHTMLKey, isFlatKey, indexHTMLKey, isIndexKey });
            sameCopyCommand.commandStatus = S3CommandStatus.SKIPPED;
          }
        } else {
          logger.warn(`No sources or targets found, skipping`);
          sameCopyCommand.commandStatus = S3CommandStatus.NO_SOURCE;
        }

        if (sameCopyCommand.commandStatus === S3CommandStatus.GENERATED) {
          s3Report.s3CopyCommands.push(sameCopyCommand);
        } else if(sameCopyCommand.commandStatus === S3CommandStatus.TARGET_EXISTS || sameCopyCommand.commandStatus === S3CommandStatus.LAYOUT_OPTIMIZED) {
          s3Report.s3CopyCommandsSkipped.push(sameCopyCommand);
        }

        if (indexCopyCommand.commandStatus === S3CommandStatus.GENERATED) {
          s3Report.s3CopyCommands.push(indexCopyCommand);
        } else if(indexCopyCommand.commandStatus === S3CommandStatus.TARGET_EXISTS || indexCopyCommand.commandStatus === S3CommandStatus.LAYOUT_OPTIMIZED) {
          s3Report.s3CopyCommandsSkipped.push(indexCopyCommand);
        }

        logger.debug(`${sameHTMLKey} layout is ${keysToLayoutString(isSameKey, isFlatKey, isIndexKey).toUpperCase()}. ${postMessage}`);

      }
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