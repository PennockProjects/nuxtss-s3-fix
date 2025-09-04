import { XMLParser } from 'fast-xml-parser';
import { readLocalFile } from './fileUtils.js';
import { fetchTextFromUrlFile } from './urlUtils.js';
import { fetchFromS3 } from './awsS3Utils.js';

/**
 * Parse the sitemap XML string into a JavaScript object
 * @param {string} xmlString - The XML string to parse
 * @returns {Object|null} - The parsed XML object, or null if parsing fails
 */
export function parseSitemapXmlFast(xmlString) {
  const parser = new XMLParser();
  const result = parser.parse(xmlString);
  return result;
}

/**
 * Extract routes from the parsed sitemap object
 * @param {string} sitemapXML - The content of the sitemap file
 * @returns {Array|null} - An array of routes found in the sitemap, or null if parsing fails
 */
export function sitemapRoutes(sitemapXML) {
  if (sitemapXML) {
    const parsedFile = parseSitemapXmlFast(sitemapXML);
    if (!parsedFile || !parsedFile.urlset || !parsedFile.urlset.url) {
      console.error('Invalid sitemap structure');
      return null;
    }
    const routesFound = parsedFile.urlset.url.map(item => item.loc);
    return routesFound;
  }
  return null;
}

/**
 * Extract paths from the sitemap XML, optionally filtering out specific paths
 * @param {string} sitemapXML - The content of the sitemap file in XML format
 * @param {Array<string>} excludePaths - An array of paths to exclude from the result
 * @returns {Array<string>|null} - An array of paths found in the sitemap, or null if parsing fails
 */
export function sitemapPaths(sitemapXML, excludePaths) {
  const routes = sitemapRoutes(sitemapXML);
  if (!routes) {
    console.error('No routes found in the sitemap');
    return null;
  }
  const pathsFound = routes.map(route => {
    try {
      const urlObj = new URL(route);
      return urlObj.pathname; // return path
    } catch (error) {
      console.error(`Invalid URL: ${route}`);
      return null;
    }
  });

  if (excludePaths && excludePaths.length > 0) {
    // Filter out paths that match any of the excludePaths
    return pathsFound.filter(element => !excludePaths.includes(element));
  } else {
    return pathsFound;
  }
}

/**
 * Get the XML content from a sitemap file, which can be a local file, a URL, or an S3 bucket.
 * @param {string} sitemapFile - The path to the sitemap file, which can be a local file, a URL, or an S3 bucket.
 * @returns {string|null} - The XML content of the sitemap file, or null if an error occurs.
 */
export async function getXML(sitemapFile) {
  if (sitemapFile.startsWith('http://') || sitemapFile.startsWith('https://')) {
    return await fetchTextFromUrlFile(sitemapFile);
  } else if (sitemapFile.startsWith('s3://')) {
    return await fetchFromS3(sitemapFile);
  } else {
    console.log("\tReading local file", sitemapFile);
    return readLocalFile(sitemapFile);
  }
}

/**
 * Process a sitemap file: read, parse, and extract paths
 * @param {string} sitemapFile - The path to the sitemap file (local, URL, or S3)
 * @returns {Array<string>} - An array of paths extracted from the sitemap
 */
export async function processSitemap(sitemapFile) {
  console.log(`\tGetting sitemap file: ${sitemapFile}`);
  
  const sitemapXML = await getXML(sitemapFile);
  if (!sitemapXML) {
    throw new Error(`Could not read sitemap file: ${sitemapFile}`);
  }

  console.log(`\tParsing XML from sitemap file: ${sitemapFile}`);
  const paths = sitemapPaths(sitemapXML);
  if (!paths) {
    throw new Error(`Could not extract paths from sitemap file: ${sitemapFile}`);
  }

  console.log(`\tPaths extracted from sitemap file: ${sitemapFile}`);
  return paths;
}