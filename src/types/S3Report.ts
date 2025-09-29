import { S3Command } from "./S3Command";

export interface S3Report {
  bucketUri: string;
  bucketUriRegion: string;
  sitemapFileLocator: string;
  paths: string[];
  pathsExcluded: string[];
  s3CopyFlats: number,
  s3CopyIndexes: number,
  s3CopyCommands: S3Command[];
  s3CopyCommandsSkipped: S3Command[];
  s3RemoveFlats: number,
  s3RemoveIndexes: number,
  s3RemoveCommands: S3Command[];
  s3RemoveCommandsSkipped: S3Command[];
  keysAll: string[];
  keysStatus: Record<string, boolean>;
}
