import { S3Command } from "./S3Command";

export interface S3Report {
  s3Bucket: string;
  s3BucketPath: string;
  sitemapPath: string;
  options: {
    debug?: boolean;
    removeCommands?: boolean;
    sitemapFile?: string;
    specificRegion?: string;
  };
  paths: string[];
  pathsExcluded: string[];
  validS3Commands: S3Command[];
  skippedS3Commands: S3Command[];
  keysAll: string[];
  keysStatus: Record<string, boolean>;
}
