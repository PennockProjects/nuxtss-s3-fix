import fetch from 'node-fetch';

/**
 * Fetch file from a URL
 * @param {string} url - The URL of the file which should include the extension, e.g., https://example.com/sitemap.xml
 * @returns {Promise<string|null>} - The file content as a string, or null if an error occurs
 */
export async function fetchTextFromUrlFile(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      return null;
    }

    const fileContent = await response.text();
    return fileContent;
  } catch (error) {
    console.error(`Error fetching file ${url} and converting to text: ${error.message}`);
    return null;
  }
}

/**
 * Check if a string is a valid URL
 * @param {string} url - The URL string to validate
 * @returns {boolean} - True if the string is a valid URL, false otherwise
 * */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}