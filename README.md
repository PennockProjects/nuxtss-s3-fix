# `nuxtss-s3-fix`
A tool for updating a Nuxt Static Site on AWS S3.  Can be used as a package library or as a CLI.
see [PennockProjects blog](https://pennockprojects.com/projects/cicd/nuxtssfix)

It will 
1. Find a `sitemap.xml` file, if not specified, it will look for `s3://<bucket>/sitemap.xml`
    - the `sitemap.xml` file must be in standard sitemap format
    - with the `-s` option a sitemap file can be specified instead of root of the S3 bucket and can be a local file, a url, or a different key object in the same aws S3 bucket or in another S3 bucket
2. Read the `sitemap.xml` file and for each `<loc></loc>` element found, parse it for its path (ignoring the protocol and domain)
    - if a `<loc>https://example.com/about</loc>` the path parsed is `/about`
3. Search the AWS S3 bucket for path html objects in one of two Nuxt.js static layouts and the optimal layout:
    - Nuxt static Flat Layout - looks for html object at `s3://<bucket>/<path>.html`
    - Nuxt static Index Layout - looks for html object at `s3://<bucket>/<path>/index.html`
    - Optimal 'Same as Directory' Layout - looks for html object at `s3://<bucket>/<path>`
4. Generate a copy command (`-c` option) or execute a copy action (`--XC` option)
    - It will only generate a copy command or execute a copy action that will copy a 'found' flat or index layout object to the optimal layout object if a path html object in Optimal Layout **does not exist**.  The prevents extraneous copies.
    - AWS S3 CLI command for each path found
        - Flat Layout Copy Command: 
            - `aws s3 cp s3://<bucket>/<path>.html s3://<bucket>/<path>`
        - Index Layout Copy Command: 
            - `aws s3 cp s3://<bucket>/<path>/index.html s3://<bucket>/<path>`
5. Generate a remove command (`-r` option) or execute a remove action (`--XR` option) 
    - It will only generate a remove command or execute a remove action that will remove a 'found' flat or index layout object if a path html object in Optimal Layout **exists**. This prevents removal of files that have not been copied.
    - AWS S3 CLI command generated for each path found
        - Flat Layout Remove Command:
            - `aws s3 rm s3://<bucket>/<path>.html`
        - Index Layout Remove Command:
            - `aws s3 rm s3://<bucket>/<path>/index.html`


```xml
<url>
        <loc>https://example.com/about</loc>
</url>
<url>
        <loc>https://example.com/blog</loc>
</url>

```

## Documentation
See [Project Documentation](https://pennockprojects.com/projects/cicd/nuxtssfix)

## Installing
To install `@pennockprojects/nuxtss-s3-fix` use your favorite package manager, instructions for using npm are:

```bash
npm install @pennockprojects/nuxtss-s3-fix --save-dev
```

## CLI Usage
```shell
$ npx nuxtss-s3-fix -h
Usage: nuxtss-s3-fix <S3Bucket> [command option] [other options]

A CLI tool that generates or executes AWS S3 commands that optimize a Nuxt.js generated static site in an Amazon AWS S3 bucket. 
An accurate sitemap.xml file, defaulted to be in the root of the bucket or specified is required. The tool can generate AWS S3  
CLI commands that can be run by the user or can execute the commands directly. It requires that a local AWS CLI context be      
configured allowing AWS S3 Bucket Permissions to get and copy objects. When using the generated AWS S3 CLI commands, you may    
have to rerun the tool after running the generated AWS S3 CLI commands to get updated commands to run next.  Please refer to theREADME.md document for more details. Examples:
      nuxtss-s3-fix s3://my-bucket-name --XC
      nuxtss-s3-fix s3://my-bucket-name --commands-remove -o rm_commands.sh

Arguments:
  S3Bucket                           An S3 bucket path starting with 's3://'. Examples: 's3://bucket-name' or
                                     's3://bucket-name/key'

Options:
  -c, --commands-copy                Generate AWS CLI copy commands (default: false)
  -r, --commands-remove              Generate AWS CLI remove commands (default: false)
  -o, --output-file <file>           Output file for AWS CLI Commands generated (default: outputs to console)
  --XC, --execute-copy               Execute copy actions (default: false)
  --XR, --execute-remove             Execute remove commands (default: false)
  -l, --specific-region <region>     Specify a non-default AWS region for the S3 bucket
  -s, --sitemap-location <location>  locator to the sitemap.xml (default: looks in the bucket root)
  -q, --quiet                        Enable quiet mode, which only shows warnings, errors, and command output. Overrides debug  
                                     mode (default: false)
  -d, --debug                        Enable verbose debug output (default: false)
  --dry-run                          Perform a trial run with no changes made (default: false)
  -v, --version                      Display version information
  -h, --help                         Display help for command
```

## Package Library Usage
### S3Commands

```js
/**
TBD
**/
```

ToDo:
- Remove commands only when the optimal is available
- Refactor s3Commands - S3Copy and S3 Remove
- Refactor S3Commands - modularize instead of waterfall
- Quiet mode
- pass quite and debug to sitemap-diff

 Nuxt.js static site generation has two different layout options -- 1) Flat or 2) Index governed by 'autoSubfolderIndex' variable in the 'nuxt.config.js' file.