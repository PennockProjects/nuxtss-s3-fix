import { s3CpCommands } from "./utils/s3CpCommands";
import { s3RmCommands } from "./utils/s3RmCommands";
import { program } from "commander";
import logger from "./utils/logger";

program
  .name("nuxtss-s3-fix")
  .description(`A CICD tool that generates AWS S3 commands to optimize a Nuxt Static Sites html page bucket objects for Amazon AWS S3 static web site hosting. AWS S3 Permissions accessing the bucket URL uses the local configured AWS CLI context.
  Example parameters:
    s3://bucket-name
        - generate COPY commands for 's3://bucket-name' using 's3://bucket-name/sitemap.xml'

    s3://bucket-name/key -X -s ./input/foo.xml -l us-west-2 -o ./output/foo-rm.sh
        - generate REMOVE commands for 's3://bucket-name/key' in 'us-west-2' region
        - using paths found in file './input/foo.xml' (sitemap.xml format)
        - outputs to file './output/foo-rm.sh'`)
  .usage("<S3Bucket> [options]")
  .helpOption("-h, --help", "Display help for command")
  .version("[VI]{version}[/VI]", "-v, --version", "Display version information");

program
  .argument('S3Bucket', `An S3 bucket path. Examples: 's3://bucket-name' or 's3://bucket-name/key'`)
  .option("-l, --specific-region <region>", "Specify the AWS region for the S3 bucket")
  .option("-o, --output-file <file>", "Output file to write the commands to")
  .option("-X, --remove-commands","Generate remove commands", false)
  .option("-s, --sitemap-file <file>", "path to sitemap.xml file")
  .option("-q, --quiet", 'Enable quiet mode, which only shows warnings, errors, and command output. Overrides debug mode', false)
  .option('-d, --debug', 'Enable verbose debug output', false)
  .action(async (s3Bucket) => {
    let options = program.opts();
    if(options.quiet) {
      logger.setLogLevel('quiet');
    } else {
      logger.setDebug(options.debug);
    }
    logger.debug('S3Bucket', s3Bucket);
    logger.debug('options', options);

    if (options.removeCommands) {
      logger.info('Generating AWS S3 REMOVE commands');
      const commandsResults = await s3RmCommands(s3Bucket, options)
        .catch(error => {
          logger.error('Error processing S3 Remove commands:', error);
          process.exit(1);
        });
        
      let justCommands = "";
      let commandsGenerated = 0;
      for(const commandItem of commandsResults.validS3Commands) {
        justCommands += commandItem.command + '\n';
        logger.debug('Generated rm command:', commandItem.command);
        commandsGenerated++;
      }
      if (options.outputFile) {
        if(commandsGenerated === 0) {
          logger.warn('No rm commands generated, so no output file created.');
        } else {
          const fs = await import('fs');
          fs.writeFileSync(options.outputFile, justCommands);
          logger.result(`${commandsGenerated} AWS S3 CLI rm commands written to ${options.outputFile}`);
        }
      } else {
        logger.info(`${commandsGenerated} AWS S3 CLI rm commands`);
        logger.result(justCommands);
      }
      return;
    } else {
      logger.info('Generating AWS S3 COPY commands');

      const commandsResults = await s3CpCommands(s3Bucket, options)
        .catch(error => {
          logger.error('Error processing S3 copy commands:', error);
          process.exit(1);
        });
        

      let justCommands = "";
      let commandsGenerated = 0;
      for(const commandItem of commandsResults.validS3Commands) {
        justCommands += commandItem.command + '\n';
        logger.debug('Generated cp command:', commandItem.command);
        commandsGenerated++;
      }
      if (options.outputFile) {
        if(commandsGenerated === 0) {
          logger.warn('No copy commands generated, so no output file created.');
        } else {
          const fs = await import('fs');
          fs.writeFileSync(options.outputFile, justCommands);
          logger.result(`${commandsGenerated} AWS S3 CLI copy commands written to ${options.outputFile}`);
        }
      } else {
        logger.info(`${commandsGenerated} AWS S3 CLI copy commands`);
        logger.result(justCommands);
      }
    }
  });

program.parse(process.argv);