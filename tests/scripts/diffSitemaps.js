import { diffArrays } from './utils/arrayUtils.js';
import { isValidFilename, writeJsonToFile } from './utils/fileUtils.js';
import { processSitemap } from './utils/sitemapUtils.js';

// Main script execution
// Print the program title
printLogo();

// Get local sitemap and target Url sitemap from command-line arguments
const [sitemap1, sitemap2, outputFile] = process.argv.slice(2);

if(sitemap1 == '--help' || sitemap1 == '-h' || sitemap1 == '--h' || 
   sitemap2 == '--help' || sitemap2 == '-h' || sitemap2 == '--h') {
  printDescription();
  printUsage();
  printExamples();
  process.exit(0);
}

if (!sitemap1 || !sitemap1.endsWith('.xml') || !sitemap2 || !sitemap2.endsWith('.xml')){
  console.error('Invalid sitemap input parameters provided.');
  printUsage();
  process.exit(1);
}

if (outputFile && !isValidFilename(outputFile) && !outputFile.endsWith('.json')) {
  console.error('Invalid output file name. Must be a valid JSON file (e.g., "output.json").');
  printUsage();
  process.exit(1);
}

try {

  console.log(`${sitemap1}`);
  const sitemap1Paths = await processSitemap(sitemap1, ["/"]);
  console.log(`${sitemap2}`);
  const sitemap2Paths = await processSitemap(sitemap2, ["/"]);

  const pathsDiff = diffArrays(sitemap1Paths, sitemap2Paths);
  if (!pathsDiff) {
    console.error(`\nPaths from "${sitemap1Paths}" and "${sitemap2Paths}" are not valid arrays.`);
    process.exit(1);
  }

  let pathsDiffJSON = {
    "sitemap1": {
      location: sitemap1,
      paths: sitemap1Paths,
      sitemap1PathsNotInSitemap2: pathsDiff.elements1NotIn2 || [], // Ensure it's an array
    },
    "sitemap2": {
      location: sitemap2,
      paths: sitemap2Paths,
      sitemap2PathsNotInSitemap1: pathsDiff.elements2NotIn1 || [], // Ensure it's an array
    }
  }

  if (outputFile) {
    if(writeJsonToFile(outputFile, pathsDiffJSON)) {
      console.log(`Sitemap paths and differences successfully written to ${outputFile}`);
    }
  } else {
    console.log(`\nsitemap1 "${sitemap1}" paths:`, pathsDiffJSON.sitemap1.paths);
    console.log(`\nsitemap2 "${sitemap2}" paths:`, pathsDiffJSON.sitemap2.paths);
    if( pathsDiffJSON.sitemap1.sitemap1PathsNotInSitemap2.length === 0 && pathsDiffJSON.sitemap2.sitemap2PathsNotInSitemap1.length === 0) {
      console.log(`\nNo path differences found between the two sitemaps "${sitemap1}" and "${sitemap2}".`);
    } else {
      console.log(`\nDifferent paths in sitemaps "${sitemap1}" and "${sitemap2}":`);
      if( pathsDiffJSON.sitemap1.sitemap1PathsNotInSitemap2.length === 0) {
        console.log(`\nsitemap1 "${sitemap1}" paths are all in sitemap2 "${sitemap2}" paths.`);
      } else {
        console.log(`\nsitemap1 "${sitemap1}" paths not in sitemap2 "${sitemap2}" paths`, pathsDiffJSON.sitemap1.sitemap1PathsNotInSitemap2);
      }
      if( pathsDiffJSON.sitemap2.sitemap2PathsNotInSitemap1.length === 0) {
        console.log(`\nsitemap2 "${sitemap2}" paths are all in sitemap1 "${sitemap1}" paths.`);
      } else {
        console.log(`\nsitemap2 "${sitemap2}" paths not in sitemap1 "${sitemap1}" paths`, pathsDiffJSON.sitemap2.sitemap2PathsNotInSitemap1);  
      }
    }
  }
} catch (error) {
  console.error(`Error processing sitemaps: ${error.message}`);
  process.exit(1);
}


function printLogo() {
  console.log('*************************************************************************************************');
  console.log('siteCompare.js - Compare two sitemap.xml files by [Pennock Projects](https://pennockprojects.com)');
  console.log('*************************************************************************************************');
}

function printDescription() {
  console.log('The script reads two sitemap files, extracts the paths, and compares them.');
  console.log('The script will output thes paths that are in one sitemap but not the other.\n');
  console.log('The protocol and hostname of the URL are not compared.');
  console.log('  e.g. "http://example1.com/about" and "https://example2.com/about" have the same path');
  console.log('The root path, "/", is ignored.');
  console.log('A sitemap file is standard [XML format and schema definition](https://www.sitemaps.org/protocol.html)');
  console.log('     except it does not support index sitemaps, only standard sitemaps with <urlset> and <url> elements.');
  console.log('The sitemap XML contains a <urlset> element with <url> children containing <loc> elements routes.');
}

function printUsage() {
  console.log('Usage: node diffSitemapPaths.js <sitemap1> <sitemap2> <outputfile>\n');
  console.log('Usage Parameters:');
  console.log(' - <sitemap1>,<sitemap2> - relative file path, URL, or S3 URL to the sitemap file (must end with .xml)');
  console.log('     a) A relative file path contains the relative location of file: "./some/dir/local-sitemap.xml"');
  console.log('     b) A URL with `http` or `https` and contains the full url: "https://www.example.com/sitemap.xml"');
  console.log('     c) An S3 URL:')
  console.log('       1) prefixed with "s3://"');
  console.log('       2) the middle contains the bucket name and key: "bucket-name/sitemap.xml"');
  console.log('       3) optionally, the end can contain a suffix region: ":region://us-west-2",');
  console.log('          where "us-west-2" is replaced by your specific region string of the bucket');
  console.log('       4) The AWS S3 bucket access credentials are inherited from the local configured AWS CLI context.');
  console.log('          Examples: \n\t\t"s3://bucket-name/sitemap.xml"\n\t\t"s3://bucket-name/sitemap.xml:region://us-west-2"');
  console.log(' - <outputfile> - optional, relative file path to the output file with ".json" extension');
  console.log('     a) A relative file path contains the relative location of file: "./some/dir/sitemap-diff.json"');
  console.log('     b) The diff information is written to a file in JSON format with the following structure:');
  console.log('       { "sitemap1": { "location": "<sitemap1>", "paths": [<paths>], "sitemap1PathsNotInSitemap2": [<paths>] },');
  console.log('         "sitemap2": { "location": "<sitemap2>", "paths": [<paths>], "sitemap2PathsNotInSitemap1": [<paths>] } }');
  console.log('       where <sitemap1> and <sitemap2> are the provided sitemap files, and <paths> are the extracted paths.');
  console.log('     c) If not provided, the URLs are not written to a file.\n');
  console.log('\nHelp: node diffSitemapPaths.js --h');
  console.log('  -h, --h, --help - Shows script description, usage, and examples and does not run the compare\n');
}

function printExamples() {
  console.log('Examples:');
  console.log('  node diffSitemapPaths.js ./sub/dir/local-sitemap.xml https://example.com/sitemap.xml');
  console.log('     => diffs the paths from "./sub/dir/local-sitemap.xml" and "https://example.com/sitemap.xml"');
  console.log('     =>  and outputs the difference information to the console.\n');
  console.log('  node diffSitemapPaths.js ./local-sitemap.xml https://example.com/sitemap.xml ./sitemap-diff.json');
  console.log('     => diffs the paths from "./local-sitemap.xml" and "https://example.com/sitemap.xml"');
  console.log('     =>  and writes the difference information to "./sitemap-diff.json" file.\n');
  console.log('  Examples that output to the console.\n');
  console.log('  node diffSitemapPaths.js s3://bucket-name/sitemap.xml https://example.com/sitemap.xml');
  console.log('     => diffs the paths from "s3://bucket-name" bucket "/sitemap.xml" key in the default bucket region');
  console.log('        and "https://example.com/sitemap.xml"\n');
  console.log('  node diffSitemapPaths.js ./local-sitemap.xml s3://bucket-name/sitemap.xml');
  console.log('     => diffs the paths form "./local-sitemap.xml" and ');
  console.log('       "s3://bucket-name" bucket "/sitemap.xml" key in the default bucket region\n');
  console.log('  node diffSitemapPaths.js s3://bucket-name/sitemap.xml s3://bucket-name2/test.xml:region://us-west-2');
  console.log('     => diffs the paths form "s3://bucket-name" bucket "/sitemap.xml" key in the default bucket region and');
  console.log('       "s3://bucket-name2" bucket "/text.xml" key in the "us-west-2" region\n');
}

