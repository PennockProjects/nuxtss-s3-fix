import { S3Command, S3Layout } from "./S3Command";

export interface S3Report {
  bucketUri: string;
  bucketUriRegion: string;
  sitemapFileLocator: string;
  isExecute: boolean;
  paths: string[];
  pathsExcluded: string[];
  s3PathLayoutNew: S3Layout;
  s3CopyCommands: S3Command[];
  s3CopyCommandsSkipped: S3Command[];
  s3RemoveCommands: S3Command[];
  s3RemoveKeysSkipped: S3Command[];
  keysAll: string[];
  keysStatus: Record<string, boolean>;
}
