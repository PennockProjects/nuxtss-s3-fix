import fs from 'fs';

/**
 * Read a local file
 * @param {string} filePath - The path to the local file as utf8 string
 * @returns {string|null} - The content of the file as a utf8 string, or null if an error occurs
 */
export function readLocalFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return fileContent;
  } catch (error) {
    console.error(`Error while reading ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Write a JSON object to a local file
 * @param {string} outputFile - The name of the output file
 * @param {Object} jsonData - The JSON object to write to the file
 */
export function writeJsonToFile(outputFile, jsonData) {
  if (!isValidFilePath(outputFile) || !outputFile.endsWith('.json')) {
    console.error('Invalid output file name. Must be a valid JSON file (e.g., "output.json").');
    return false; // Indicate failure
  }

  try {
    const jsonString = JSON.stringify(jsonData, null, 2); // Pretty-print JSON with 2 spaces
    fs.writeFileSync(outputFile, jsonString, 'utf8');
    return true; // Indicate success
  } catch (error) {
    console.error(`Error writing JSON to file: ${error.message}`);
    return false; // Indicate failure
  }
}

/**
 * Check if a string is a valid filename
 * @param {string} filename - The string to validate as a filename
 * @returns {boolean} - Returns true if the string is a valid filename, otherwise false
 */
export function isValidFilename(filename) {
  // Regular expression to match valid filenames
  const validFilenameRegex = /^[^<>:"/\\|?*\x00-\x1F]+$/; // Disallows invalid characters
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];

  // Check if the filename matches the regex and is not a reserved name
  return validFilenameRegex.test(filename) && !reservedNames.includes(filename.toUpperCase());
}

/**
 * Check if a string is a valid file path (Windows or Linux)
 * @param {string} filePath - The string to validate as a file path
 * @returns {boolean} - Returns true if the string is a valid file path, otherwise false
 */
export function isValidFilePath(filePath) {
  // Regular expression to match valid file paths (allows both `/` and `\`)
  const validLinuxFilePathRegex = /^[^<>:"|?*\x00-\x1F]+$/; // Disallows invalid characters
  const validWindowsFilePathRegex = /^(?:[a-zA-Z]:)?(?:[\\/][^<>:"|?*\x00-\x1F]+)+$/; // Matches valid Windows paths
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];

  // Check if the file path matches the regex
  if (!validLinuxFilePathRegex.test(filePath) && !validWindowsFilePathRegex.test(filePath)) {
    return false;
  }

  // Normalize Windows-style paths to handle backslashes
  const intWindowsPath = filePath.replace(/\\\\/g, '/'); // Replace double backslash with forward slashes
  const normalizedPath = intWindowsPath.replace(/\\/g, '/'); // Replace backslashes with forward slashes

  // Extract the filename from the normalized path
  const fileName = normalizedPath.split('/').pop(); // Handles both `/` and `\` as path separators

  // Check if the filename is not a reserved name
  return !reservedNames.includes(fileName.toUpperCase());
}