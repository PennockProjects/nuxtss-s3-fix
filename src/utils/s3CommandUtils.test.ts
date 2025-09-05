import { describe, it, expect, vi } from 'vitest';
import {
  fetchPathsFromSitemap,
  validateS3Bucket,
  buildSitemapPath,
  buildS3BucketPath,
  initializeReport,
  generateKeys,
  checkS3Objects,
} from './s3CommandUtils';
import logger from './logger';
import { S3Report } from '../types/S3Report';

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
      expect(() => validateS3Bucket('')).toThrow('S3 bucket path is required.');
      expect(() => validateS3Bucket('invalid-path')).toThrow('S3 bucket path must start with "s3://".');
    });

    it('should not throw an error for a valid S3 bucket', () => {
      expect(() => validateS3Bucket('s3://bucket-name')).not.toThrow();
    });
  });

  describe('buildSitemapPath', () => {
    it('should build the correct sitemap path', () => {
      expect(buildSitemapPath('s3://bucket', undefined, 'us-west-2')).toBe('s3://bucket/sitemap.xml:region://us-west-2');
      expect(buildSitemapPath('s3://bucket', 'custom-sitemap.xml')).toBe('custom-sitemap.xml');
    });

    it('should throw an error if the sitemap file path does not end with ".xml"', () => {
      expect(() => buildSitemapPath('s3://bucket', 'invalid-sitemap')).toThrow('Sitemap file path must end with ".xml".');
    });
  });

  describe('buildS3BucketPath', () => {
    it('should build the correct S3 bucket path with a region', () => {
      expect(buildS3BucketPath('s3://bucket', 'us-west-2')).toBe('s3://bucket:region://us-west-2');
    });

    it('should return the S3 bucket path without a region', () => {
      expect(buildS3BucketPath('s3://bucket')).toBe('s3://bucket');
    });
  });

  describe('initializeReport', () => {
    it('should initialize an S3Report object', () => {
      const report = initializeReport('s3://bucket', 's3://bucket', 's3://bucket/sitemap.xml', { specificRegion: '::/specific_region' });
      expect(report).toEqual({
        s3Bucket: 's3://bucket',
        s3BucketPath: 's3://bucket',
        sitemapPath: 's3://bucket/sitemap.xml',
        options: { specificRegion: '::/specific_region' },
        paths: [],
        pathsExcluded: [],
        keysAll: [],
        keysStatus: {},
        validS3Commands: [],
        skippedS3Commands: [],
      });
    });
  });

  describe('generateKeys', () => {
    it('should generate keys from paths', () => {
      const report: S3Report = initializeReport('s3://bucket', 's3://bucket', 's3://bucket/sitemap.xml', {});
      generateKeys(['/path1', '/path/to2/', '/path3.html'], report);
      expect(report.keysAll).toEqual([
        'path1',
        'path1.html',
        'path1/index.html',
        'path/to2',
        'path/to2.html',
        'path/to2/index.html',
      ]);
      expect(report.pathsExcluded).toEqual(['/path3.html']);
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
