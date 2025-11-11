import { describe, it, expect, vi } from 'vitest';
import {
  fetchPathsFromSitemap,
  validateS3Bucket,
  buildSitemapFileLocator,
  buildBucketUriRegionString,
  initializeReport,
  generateKeys,
  checkS3Objects,
} from './s3CommandUtils';

import { S3Report } from '../types/S3Report';
import { S3Layout } from '../types/S3Command';

vi.mock('./logger');
vi.mock('./awsS3Utils', () => ({
  checkObjects: vi.fn().mockResolvedValue({
    'key1.html': true,
    'key2.html': false,
  }),
}));
vi.mock('@pennockprojects/sitemap-diff', () => ({
  fetchParsePaths: vi.fn().mockResolvedValue(['/path1', '/path2']),
}));

describe('s3CommandUtils', () => {
  describe('fetchPathsFromSitemap', () => {
    it('should fetch and parse paths from a sitemap', async () => {
      const paths = await fetchPathsFromSitemap('s3://bucket/sitemap.xml');
      expect(paths).toEqual(['/path1', '/path2']);
    });
  });

  describe('validateS3Bucket', () => {
    it('should throw an error if the S3 bucket is invalid', () => {
      expect(() => validateS3Bucket('')).toThrow('S3 bucket uri is required.');
      expect(() => validateS3Bucket('invalid-path')).toThrow('S3 bucket uri must start with "s3://".');
    });

    it('should not throw an error for a valid S3 bucket', () => {
      expect(() => validateS3Bucket('s3://bucket-name')).not.toThrow();
    });
  });

  describe('buildSitemapFileLocator', () => {
    it('should build the correct sitemap path', () => {
      expect(buildSitemapFileLocator('s3://bucket', undefined, 'us-west-2')).toBe('s3://bucket/sitemap.xml:region://us-west-2');
      expect(buildSitemapFileLocator('s3://bucket', 'custom-sitemap.xml')).toBe('custom-sitemap.xml');
    });

    it('should throw an error if the sitemap file path does not end with ".xml"', () => {
      expect(() => buildSitemapFileLocator('s3://bucket', 'invalid-sitemap')).toThrow('Sitemap file locator must end with ".xml".');
    });
  });

  describe('buildBucketUriRegionString', () => {
    it('should build the correct S3 bucket path with a region', () => {
      expect(buildBucketUriRegionString('s3://bucket', 'us-west-2')).toBe('s3://bucket:region://us-west-2');
    });

    it('should return the S3 bucket path without a region', () => {
      expect(buildBucketUriRegionString('s3://bucket')).toBe('s3://bucket');
    });
  });

  describe('initializeReport', () => {
    it('should initialize an S3Report object', () => {
      const report = initializeReport({
        bucketUri: 's3://bucket',
        bucketUriRegion: 'region:string',
        sitemapFileLocator: './test./sitemap.xml',
        isExecute: true,
      });
      expect(report).toEqual({
        bucketUri: 's3://bucket',
        bucketUriRegion: 'region:string',
        sitemapFileLocator: './test./sitemap.xml',
        paths: [],
        pathsExcluded: [],
        keysAll: [],
        keysStatus: {},
        isExecute: true,
        s3PathLayoutNew: S3Layout.UNKNOWN,
        s3CopyCommands: [],
        s3RemoveCommands: [],
        s3CopyCommandsSkipped: [],
        s3RemoveKeysSkipped: [],
      });
    });

    it('should initialize an S3Report object with new path layout', () => {
      const report = initializeReport({
        bucketUri: 's3://bucket',
        bucketUriRegion: 'region:string',
        sitemapFileLocator: './test./sitemap.xml',
        s3PathLayoutNew: S3Layout.MIXED,
      });
      expect(report).toEqual({
        bucketUri: 's3://bucket',
        bucketUriRegion: 'region:string',
        sitemapFileLocator: './test./sitemap.xml',
        paths: [],
        pathsExcluded: [],
        keysAll: [],
        keysStatus: {},
        isExecute: false,
        s3PathLayoutNew: S3Layout.MIXED,
        s3CopyCommands: [],
        s3RemoveCommands: [],
        s3CopyCommandsSkipped: [],
        s3RemoveKeysSkipped: [],
      });
    });
  });


  describe('generateKeys', () => {
    it('should generate keys from paths', () => {
      const report: S3Report = initializeReport({bucketUri: 's3://bucket', bucketUriRegion: 'Antarctica-1', sitemapFileLocator: 's3://bucket/sitemap.xml'});
      generateKeys(['/path1', '/path/to2', '/path3.html', '', '/'], report);
      expect(report.paths).toEqual(['/path1', '/path/to2']);
      expect(report.keysAll).toEqual([
        'path1',
        'path1.html',
        'path1/index.html',
        'path/to2',
        'path/to2.html',
        'path/to2/index.html',
      ]);
      expect(report.pathsExcluded).toEqual(['/path3.html', '/']);
    });
  });

  describe('checkS3Objects', () => {
    it('should check the existence of S3 objects', async () => {
      const result = await checkS3Objects('s3://bucket', ['key1.html', 'key2.html']);
      expect(result).toEqual({
        'key1.html': true,
        'key2.html': false,
      });
    });
  });
});
