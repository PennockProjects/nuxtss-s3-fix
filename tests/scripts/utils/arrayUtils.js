/**
 * Strip a prefix from each string element in an array
 * @param {Array<string>} array - The array of strings
 * @param {string} prefix - The prefix to strip
 * @returns {Array<string>} - A new array with the prefix removed from each element
 */
export function stripPrefixFromArray(array, prefix) {
  return array.map(element => {
    if (element.startsWith(prefix)) {
      return element.slice(prefix.length); // Remove the prefix
    }
    return element; // Return the element unchanged if it doesn't start with the prefix
  });
}

/**
 * Compare two arrays and return their differences and common elements
 * @param {Array<any>} arrayOne - The first array to compare
 * @param {Array<any>} arrayTwo - The second array to compare
 * @returns {Object|null} - An object containing `commonElements`, `elements1NotIn2`, and `elements2NotIn1`,
 *                          or null if either input is not an array
 */
export function diffArrays(arrayOne, arrayTwo) {

  if( Array.isArray(arrayOne) && Array.isArray(arrayTwo) ) {
    const elements1NotIn2 = arrayOne.filter(element => !arrayTwo.includes(element));
    const elements2NotIn1 = arrayTwo.filter(element => !arrayOne.includes(element));
    const commonElements = arrayOne.filter(element => arrayTwo.includes(element));

    return {
      commonElements,
      elements1NotIn2,
      elements2NotIn1,
    }
  } else {
    return null;
  }
}