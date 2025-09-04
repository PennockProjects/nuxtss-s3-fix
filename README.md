# `nuxtss-s3-fix`
A CI tool for updating a Nuxt Static Site on AWS S3.  Can be used as a package library or as a CLI tool.
see [PennockProjects blog](https://pennockprojects.com/projects/cicd/nuxtssfix)

It will 
1. Finds a `sitemap.xml` file
    - can be a file, a url, or a key object in a aws S3 bucket
2. Parses the `sitemap.xml` for paths (ignores the protocol and domain)
    - if a `<loc>https://example.com/about</loc>` the path parsed is `/about`
3. Searches an AWS S3 bucket for Nuxt.js static html object key
    - Flat Layout - looks for html object at `s3://<bucket>/<path>.html`
    - Index Layout - looks for html object at `s3://<bucket>/<path>/index.html`
4. Outputs a 'copy' or 'remove' AWS S3 CLI command for each key found
    - Flat Layout
        - Copy: `aws s3 cp s3://<bucket>/<key>.html s3://<bucket>/<key>`
        - Remove: `aws s3 rm s3://<bucket>/<key>`
    - Index Layout
        - Copy: `aws s3 cp s3://<bucket>/<key>/index.html s3://<bucket>/<key>`
        - Remove: `aws s3 rm s3://<bucket>/<key>/index.html`


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

## CLI Usage
```shell
$ npx nuxtss-s3-fix s3://nss3fix -o fixindex26.bat -d -h
Usage: nuxtss-s3-fix <S3Bucket> [options]

A CICD tool that generates AWS S3 commands to optimize a Nuxt Static Sites html page 
bucket objects for Amazon AWS S3 static web site hosting. AWS S3 Permissions
accessing the bucket URL uses the local configured AWS CLI context.
  Example parameters:
    s3://bucket-name
        - generate COPY commands for 's3://bucket-name' using
's3://bucket-name/sitemap.xml'

    s3://bucket-name/key -X -s ./input/foo.xml -l us-west-2 -o ./output/foo-rm.sh    
        - generate REMOVE commands for 's3://bucket-name/key' in 'us-west-2' region  
        - using paths found in file './input/foo.xml' (sitemap.xml format)
        - outputs to file './output/foo-rm.sh'

Arguments:
  S3Bucket                        An S3 bucket path. Examples: 's3://bucket-name' or 
                                  's3://bucket-name/key'

Options:
  -v, --version                   Display version information
  -l, --specific-region <region>  Specify the AWS region for the S3 bucket
  -o, --output-file <file>        Output file to write the commands to
  -X, --remove-commands           Generate remove commands (default: false)
  -s, --sitemap-file <file>       path to sitemap.xml file
  -d, --debug                     Enable verbose debug output (default: false)       
  -h, --help                      Display help for command
```

## Package Library Usage
### S3Commands

```js
/**
TBD
**/
```

ToDo:
- Remove Commands only when the optimal is available
- Refactor s3Commands - S3Copy and S3 Remove
- Refactor S3Commands - modularize instead of waterfall
- Quiet mode
- pass quite and debug to sitemap-diff