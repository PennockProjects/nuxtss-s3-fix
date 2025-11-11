import { checkS3Objects, createS3KeysFromSitemap, keysToLayoutString } from "./s3CommandUtils";
import { removeS3Object } from "./awsS3Utils";
import logger from "./logger";
import { S3Report } from '../types/S3Report';
import { S3Command, S3CommandStatus, S3Layout, S3CommandType } from "../types/S3Command";

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

export function createRmActions(objectKeysFound: Record<string, boolean>, s3Report: S3Report): void {
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
      const sameHTMLKey = s3Report.keysAll[i];
      const flatHTMLKey = s3Report.keysAll[i + 1];
      const indexHTMLKey = s3Report.keysAll[i + 2];

      const rmFlatKeyCmd: S3Command = {
        command: '',
        commandType: S3CommandType.REMOVE,
        commandStatus: S3CommandStatus.NOT_CHECKED,
        targetKey: flatHTMLKey,
        targetLayout: S3Layout.UNKNOWN,
        isTarget: false,
        sourceKey: sameHTMLKey,
        sourceLayout: S3Layout.UNKNOWN,
        isSource: false
      };

      const rmIndexKeyCmd: S3Command = {
        command: '',
        commandType: S3CommandType.REMOVE,
        commandStatus: S3CommandStatus.NOT_CHECKED,
        targetKey: indexHTMLKey,
        targetLayout: S3Layout.UNKNOWN,
        isTarget: false,
        sourceKey: sameHTMLKey,
        sourceLayout: S3Layout.UNKNOWN,
        isSource: false
      };


      if (sameHTMLKey == undefined || flatHTMLKey == undefined || indexHTMLKey == undefined) {
        logger.error(`Error processing remove keys (index ${i}):`, { sameKey: sameHTMLKey, flatKey: flatHTMLKey, indexKey: indexHTMLKey });
        rmFlatKeyCmd.commandStatus = S3CommandStatus.ERROR_KEYS_UNDEFINED;
        s3Report.s3RemoveKeysSkipped.push(rmFlatKeyCmd);
      } else {
        let isFlatKey = objectKeysFound[flatHTMLKey];
        let isIndexKey = objectKeysFound[indexHTMLKey];
        let isSameKey = objectKeysFound[sameHTMLKey];
        let postMessage = "";

        if (!isSameKey) {
            let targetKeys = "";
            if(isIndexKey && isFlatKey) {
              targetKeys = "FLAT and INDEX keys";
            } else if(isFlatKey) {
              targetKeys = "FLAT key";
            } else if(isIndexKey) {
              targetKeys = "INDEX key";
            } else {
              targetKeys = "error: no target keys";
            }

            if(isFlatKey) {
              rmFlatKeyCmd.commandStatus = S3CommandStatus.NO_SOURCE;
              rmFlatKeyCmd.isSource = false;
              s3Report.s3RemoveKeysSkipped.push(rmFlatKeyCmd);
            }
            if(isIndexKey && isTargetSingle) {
              rmIndexKeyCmd.commandStatus = S3CommandStatus.NO_SOURCE;
              rmIndexKeyCmd.isSource = false;
              s3Report.s3RemoveKeysSkipped.push(rmIndexKeyCmd);
            }
            postMessage = `SAME key not found. For safety not removing ${targetKeys}.`;
        } else {
          rmFlatKeyCmd.isSource = true;
          rmIndexKeyCmd.isSource = true;

          // if flat key exists remove flat key
          if(isFlatKey) {
            rmFlatKeyCmd.isTarget = true;
            rmFlatKeyCmd.sourceLayout = S3Layout.MIXED;
            rmFlatKeyCmd.commandStatus = S3CommandStatus.GENERATED;
            rmFlatKeyCmd.command = `aws s3 rm ${s3Report.bucketUriRegion}/${flatHTMLKey}`;
            s3Report.s3RemoveCommands.push(rmFlatKeyCmd);
            postMessage += `FLAT key '${flatHTMLKey}' can be removed. `;
          }

          // if target is single and index exists, remove index too
          if(isIndexKey && isTargetSingle) {
            rmIndexKeyCmd.isTarget = true;
            rmIndexKeyCmd.sourceLayout = S3Layout.MIXED;
            rmIndexKeyCmd.commandStatus = S3CommandStatus.GENERATED;
            rmIndexKeyCmd.command = `aws s3 rm ${s3Report.bucketUriRegion}/${indexHTMLKey}`;
            s3Report.s3RemoveCommands.push(rmIndexKeyCmd);
            postMessage += `INDEX key '${indexHTMLKey}' can be removed. `;
          }

          if(isIndexKey && isTargetDouble) {
            postMessage += `already in DOUBLE layout. skipping `;
            rmIndexKeyCmd.commandStatus = S3CommandStatus.LAYOUT_OPTIMIZED;
            s3Report.s3RemoveKeysSkipped.push(rmIndexKeyCmd);
          }

          if(rmIndexKeyCmd.commandStatus !== S3CommandStatus.GENERATED && rmFlatKeyCmd.commandStatus !== S3CommandStatus.GENERATED && isTargetSingle) {
            postMessage += `already in SINGLE layout. skipping `;
            rmFlatKeyCmd.commandStatus = S3CommandStatus.LAYOUT_OPTIMIZED;
            s3Report.s3RemoveKeysSkipped.push(rmFlatKeyCmd);
          }
        }
        logger.debug(`${sameHTMLKey} ${keysToLayoutString(isSameKey, isFlatKey, isIndexKey).toUpperCase()} layout. ${postMessage}`);
      }
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
