# `nuxtss-s3-fix`
A tool for updating a Nuxt Static Site hosted in an Amazon AWS S3 Bucket.  Can be used as a package library or as a CLI. It will convert a Nuxt.js static site in an AWS S3 bucket with a Flat or Index layout to a more optimal Double or Single layout. These optimizations only apply to AWS S3 buckets when a Nuxt.js static site with accurate sitemap.xml are hosted using the Amazon AWS S3 Static Website Hosting feature.

see [PennockProjects blog](https://pennockprojects.com/projects/cicd/nuxtsss3fix)

## How the Tool Works
The tool reads a `sitemap.xml` file in the root of the S3 bucket or specified location and parses it for for each path found, it will look for html objects in either the Flat or Index layout and arrange them to the more optimal Single or Double layout. The tool can execute the commands directly or can generate AWS S3 CLI commands that can be run by the user.  In order to use, it requires an accurate sitemap.xml describing all the legal paths for the site and a local AWS CLI context, that is configured with AWS S3 Bucket Permissions to get, list, and copy S3 objects.

### Command-Line
The command-line tool is `nuxtss-s3-fix` and can be run using `npx` or installed globally. 

### Installation
To install globally using npm:
```bash
npm install -g nuxtss-s3-fix
```
### Usage

For details about its parameters run:
`nuxtss-s3-fix -h`
For the version number run:
`nuxtss-s3-fix -v`


### General Tool Process
Generally, the tool follows this process:
1. PARSE SITEMAP.XML PHASE: Retrieves a sitemap.xml file (can be in the same S3 bucket as the Nuxt.js site or elsewhere), parses it for paths
1. SCAN S3 BUCKET PHASE: Using the paths found, scans the AWS S3 bucket for its current state of key objects in those paths.
1. COPY PHASE: It generates commands to __COPY__ the html objects to their new optimized _SINGLE_ or _DOUBLE_ layout
1. RE-SCAN S3 BUCKET PHASE: It re-scans the AWS S3 bucket for its new state, if any, after the copy phase
1. REMOVE PHASE: It generates commands to __REMOVE__ any old html objects that can be safely be deleted.

It has a _COPY_ phase and a _REMOVE_ phase with a _RE-SCAN_ phase in between because there is no __MOVE__ `mv` command in AWS S3 objects. For safety, the remove commands are only generated after the objects are successfully copied to their new locations.

This process allows the tool to be run again and again safely until no more commands are generated and the site is its optimal state.

The tool has two modes:
1. Generate Commands Mode (default) - generates AWS CLI commands for manual execution
2. Execute Action Mode (`--execute-commands`) - directly executes the AWS CLI commands to copy and delete the objects.

### Generate Commands Mode
When using command generation mode, the AWS CLI commands are written to a file or standard out. It is expected that the user will run the AWS CLI commands manually. Due to the two phase process, the user will need to run the tool at least twice to complete the process, as the first run will only generate _COPY_ commands as the _REMOVE_ commands can not be safely run without a successful _COPY_. The recommended process is as follows:

1) First run - generates commands to _COPY_ the objects to their new locations.
2) Run the commands manually
3) Second run generates commands to _REMOVE_ the old objects.
4) Run the commands manually
5) Third run to verify no more commands are generated or keep repeating until no more commands are generated.

### Execute Commands Mode
When using direct execution, the tool will copy the objects to their new locations and then delete the old objects.  If an error occurs during the copy phase, it will not delete any objects dependent on that copy. If there are no errors, it will complete in one run of the tool.  You can use the `--dry-run` option to see what it will do before it does it.

### Required AWS CLI Permissions
To use either mode, the tool must have access to AWS CLI installed and configured with the appropriate permissions to get, list, copy, and delete objects in the target S3 bucket. This is also true when run in a CI/CD pipeline, the pipeline phase executing the tool must have AWS CLI installed and the execution role with appropriate permissions to operate on the target S3 bucket.

## Background

### S3 Bucket Object Keys and Static Website Hosting
The Amazon AWS S3 bucket is an key object store and is not a traditional file system. It mimics a traditional file system by using object keys to represent paths. For example, for a file `dir/example.html`, on a file system the `dir` is a directory, the `/` is a separator, and `example.html` is the file.  Importantly the `/` is not part of the directory name or the file name. For a key object store system like AWS S3, the entire string `dir/example.html` is the key name.  There are no directories or files, just keys.  The `/` is just a character in the key name.  This has some implications when using AWS S3 Static Website Hosting.  For example, it is possible to have both a key named `dir` and a key named `dir/` in the same bucket.  This is not possible in a traditional file system.

### S3 Web Host Rules
The AWS S3 Static Website Hosting service has some rules ["AWS S3 website hosting documentation 'Configuring an index document'"](https://docs.aws.amazon.com/AmazonS3/latest/userguide/IndexDocumentSupport.html#IndexDocumentsandFolders){target=_blank} for how it handles requests for keys.  The rules summarized are as follows:
1. For a URL request for `<page>` which **does not have** a tailing slash, '/', the AWS S3 Web Server first looks for a bucket key `<page>`, and then `<page>/index.html` (but will return a 302 TEMPORARILY MOVED response to `<page>/` (not the trailing slash) if it finds the `index.html` key) or a 404 NOT FOUND if neither exist.
    - For example, for a URL request for `http://example.com/photos` the S3 Static Website Hosting will look for the following keys in order and return the corresponding response:
      1. `s3://example.com/photos` - 200 OK if found
      2. `s3://example.com/photos/index.html` - 302 Temporarily moved to `http:/example/photos/` if found 
      3. 404 Not Found
2. For a URL request for `<page>` **has** a trailing slash, '/', the AWS S3 Web Server will return `/<page>/index.html` object if it exists or 404 NOT FOUND if it doesn't.
    - For example, for a URL request for `http://example.com/photos/` the S3 Static Website Hosting will look for for the following keys.
        1. `s3://example.com/photos/index.html` 200 OK if found
        2. 404 Not Found if it doesn't exist.

## Nuxt.js Static Site Generated Layouts
Nuxt.js static site generation has two different layout options -- 1) Flat or 2) Index governed by 'autoSubfolderIndex' variable in the 'nuxt.config.js' file.

### Flat Layout
The Flat layout is enabled by setting `autoSubfolderIndex: false` or not setting it at all as it is the default. For each `<page>` url it finds in each `<directory>`, it will generate the html file at:
1. `<directory>/<page>.html`

### Index Layout
The Index layout is enabled by setting `autoSubfolderIndex: true`. For each `<page>` url it finds in each `<directory>`, it will generate the html file at: 
1. `<directory>/<page>/index.html` - the html file for the page in a directory

Two other files are also generated in both layouts and these are:
1. `<directory>/<page>/` - directory
2. `<directory>/<page>/_payload.json` - the api data needed to launch the Nuxt.js web app from that page.

Note, due to the directory with the payload.json files, an html file `<page>` (without the `.html` extension) can not be generated in a file system as it would conflict with the directory of the same name. But when the files are transferred to an AWS S3 Bucket, they can.

### Flat Layout S3 issues
When using the Flat layout with AWS S3 Static Website Hosting, issues arise:
1. URL links to pages without the `.html` extension will not work. For example, a link to `/blog/example` or `/blog/example/` will result in a 404 error.  It has to be `/blog/example.html`
2. Maddeningly, after loading the web app, when you navigate a particular page in the web app the URL bar does not include the `.html` extension. If you refresh that page or share that link it will not work and results in a 404 error.
3. The root `/` works because AWS S3 Static Website Hosting is configured to look for an `index.html` file in the root of the bucket and it finds it.  But for other routes, there is no `index.html` file so it results in a 404 error.

### Index Layout S3 issues
When using the Index layout with AWS S3 Static Website Hosting, it overcomes the issues of the Flat layout, but creates new issues:

1. All page link requests without a trailing slash load slower. This is because the AWS S3 Static Website Hosting service will convert the request without the trailing slash to one with the trailing slash by issuing a 301 redirect.  This is not a huge issue but it does add latency to the page load time.
2. Social media sharing and SEO can be harmed if the links do not have the trailing slash. Page previews will not be shown unless the trailing slash is included.  SEO gets confused between the two different pages (one with trailing slash and one without.)
3. The root `/` works because AWS S3 Static Website Hosting is configured to look for an `index.html` file in the root of the bucket and it finds it. Other routes work but with a redirect.

## Optimal S3 Bucket Layouts
The Optimal layout mimics a traditional web server structure.  It uses a same html file for each route without the .html extension or `index.html` file.  This layout is more user friendly and SEO friendly as it mimics a traditional web server structure.  There are two variations of the Optimal layout -- 1) Single Layout and 2) Double Layout

### Single Layout
The Single layout is the most optimal layout. For each `<page>` url it finds in each `<path>`, it will generate the html file at:
1. `<path>/<page>` - the html file for the page in a path

### Converting Flat or Index Layout to Single Layout 
For the _flat_ layout, `<path><page>.html` object is moved to `<path>/<page>` object
For the _index_ layout, `<path>/<page>/index.html` object is moved to `<path>/<page>` object

### Double Layout
The Double layout is a variation of the Single layout. For each `<page>` url it finds in each `<path>`, it will generate two html files:
1. `<path>/<page>`
2. `<path>/<page>/index.html`

### Converting Flat or Index Layout to Double Layout
For the _flat_ layout, `<path><page>.html` object is copied to two other objects
    - `<path>/<page>`
    - `<path>/<page>/index.html`
Then, if successfully copied, the _flat_ html `<path><page>.html` object is removed.
For the _index_ layout, `<path>/<page>/index.html` object is already correct and is copied to `<path>/<page>` object.

### Summary
The Single Layout is compatible with SEO and Social Media and has lower latency on all routes except if the url includes a trailing slash `<page>/`.  I.e. `/blog/example/` will not work.  But `/blog/example` will work.

The Double Layout has all the benefits of the Single Layout but also works for urls with a trailing slash `/`.  But it does so at the cost of having two html files for each page route.

The root url `/` is a special case handled directly by the AWS S3 Static Website Hosting service in the S3 Bucket hosting configuration where you specify which html object to resolve.  Both Single and Double Layout ignore the root url `/` as it is already handled.

## Future Work
1. Add support for other sitemap formats.
2. Add support to not use a sitemap and crawl the S3 bucket directly.