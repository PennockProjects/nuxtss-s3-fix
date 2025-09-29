import { createS3KeysFromSitemap } from "./utils/s3CommandUtils";
import { processKeysCpActions, executeS3Copy } from "./utils/s3CpCommands";
import { processKeysRmActions, executeS3Remove } from "./utils/s3RmCommands";
import { program } from "commander";
import logger from "./utils/logger";

program
  .name("nuxtss-s3-fix")
  .description(`A CLI tool that generates or executes AWS S3 commands that optimize a Nuxt.js generated static site in an Amazon AWS S3 bucket. An accurate sitemap.xml file, defaulted to be in the root of the bucket or specified is required. The tool can generate AWS S3 CLI commands that can be run by the user or can execute the commands directly. It requires that a local AWS CLI context be configured allowing AWS S3 Bucket Permissions to get and copy objects. When using the generated AWS S3 CLI commands, you may have to rerun the tool after running the generated AWS S3 CLI commands to get updated commands to run next.  Please refer to the README.md document for more details. Examples:
      nuxtss-s3-fix s3://my-bucket-name --XC
      nuxtss-s3-fix s3://my-bucket-name --commands-remove -o rm_commands.sh`)
  .usage("<S3Bucket> [command option] [other options]")
  .helpOption("-h, --help", "Display help for command")

program
  .argument('S3Bucket', `An S3 bucket path starting with 's3://'. Examples: 's3://bucket-name' or 's3://bucket-name/key'`)
  .option("-c, --commands-copy","Generate AWS CLI copy commands", false)
  .option("-r, --commands-remove","Generate AWS CLI remove commands", false)
  .option("-o, --output-file <file>", "Output file for AWS CLI Commands generated (default: outputs to console)", undefined)
  .option("--XC, --execute-copy","Execute copy actions", false)
  .option("--XR, --execute-remove","Execute remove commands", false)
  .option("-l, --specific-region <region>", "Specify a non-default AWS region for the S3 bucket")
  .option("-s, --sitemap-location <location>", "locator to the sitemap.xml (default: looks in the bucket root)")
  .option("-q, --quiet", 'Enable quiet mode, which only shows warnings, errors, and command output. Overrides debug mode', false)
  .option('-d, --debug', 'Enable verbose debug output', false)
  .option('--dry-run', 'Perform a trial run with no changes made', false)
  .version("[VI]{version}[/VI]", "-v, --version", "Display version information")
  .action(async (s3Bucket) => {
    let options = program.opts();
    if(options.quiet) {
      logger.setLogLevel('quiet');
    } else {
      logger.setDebug(options.debug);
    }
    logger.debug('S3Bucket', s3Bucket);
    logger.debug('options', options);

    let CLICommandsOutput = "";
    let copyGenerated = 0;
    let copyNotGenerated = 0;
    let copyExecuted = 0;
    let copySkipped = 0;
    let removeGenerated = 0;
    let removeNotGenerated = 0;
    let removeExecuted = 0;
    let removeNotExecuted = 0;

    let isExecuteCopyAndRemoveOnIndex = false;

    if(!options.commandsCopy && !options.executeCopy && !options.commandsRemove && !options.executeRemove) {
      logger.error('No command generation or execution option specified. Must specify at least one command option: --commands-copy, --commands-remove, --execute-copy, or --execute-remove.');
      process.exit(0);
    }

    if(!(options.commandsCopy || options.commandsRemove) && options.outputFile) {
      logger.warn(`No command generation option (--commands-copy or --commands-remove) specified, so command output file: ${options.outputFile} will not be created.`);
      options.outputFile = undefined;
    }

    if( options.dryRun ) {
      logger.info('Dry run mode enabled, so no COPY or REMOVE actions will be generated or executed.');
    }

    const s3Report = await createS3KeysFromSitemap(s3Bucket, options).catch(error => {
      logger.error('Error processing sitemap.xml for s3 keys:', error);
      process.exit(1);
    });

    if (s3Report.keysAll.length === 0) {
      logger.warn('No valid S3 object keys can be created from the paths found in the sitemap.xml file. Exiting.');
      process.exit(0);
    }

    if( options.commandsCopy || options.executeCopy ) {
      logger.info('Checking AWS S3 bucket for COPY optimization commands');

      const cpResults = await processKeysCpActions(s3Report)
        .catch(error => {
          logger.error('Error processing keys for AWS S3 copy actions:', error);
          process.exit(1);
        });
        
      if (cpResults.s3CopyCommands.length > 0) {
        for(const commandItem of cpResults.s3CopyCommands) {
          if(options.dryRun) {
            if(options.commandsCopy) copyNotGenerated++;
            if(options.executeCopy) copySkipped++;
            continue;
          }
          if(options.commandsCopy) {
            CLICommandsOutput += commandItem.command + '\n';
            copyGenerated++;
          }
          if(options.executeCopy) {
            logger.debug(`Executing '${commandItem.command}'`);
            const execResult = await executeS3Copy(cpResults.bucketUri, commandItem.sourceKey, commandItem.targetKey)
              .catch(error => {
                logger.error('Error executing S3 copy command:', error);
              });
            if(execResult) logger.debug('Execute result:', execResult);
            copyExecuted++;
          }
        }
      }
      // Note special case for an Index Layout that removal of the Index Files is not recommend
      isExecuteCopyAndRemoveOnIndex = options.executeCopy && cpResults.s3CopyIndexes && options.executeRemove;

      if(options.executeCopy) {
        if(copyExecuted > 0) logger.result(`COPY actions executed: ${copyExecuted}`);
        if(copySkipped > 0) logger.result(`COPY actions NOT executed: ${copySkipped}`);
        if(copyExecuted === 0 && copySkipped === 0) logger.result('No COPY actions are available to be executed.');
      }
    }

    if( options.commandsRemove || options.executeRemove ) {
      logger.info('Checking AWS S3 bucket for REMOVE optimizations commands');
      const rmResults = await processKeysRmActions(s3Report)
        .catch(error => {
          logger.error('Error processing S3 Remove commands:', error);
          process.exit(1);
        });
          
      if (rmResults.s3RemoveCommands.length > 0) {
        for(const commandItem of rmResults.s3RemoveCommands) {
          if(options.dryRun) {
            if(options.commandsRemove) removeNotGenerated++;
            if(options.executeRemove) removeNotExecuted++;
            continue;
          }
          if(options.executeRemove) {
            logger.debug(`Executing '${commandItem.command}'`);
            const execResult = await executeS3Remove(rmResults.bucketUri, commandItem.targetKey)
              .catch(error => {
                logger.error('Error executing S3 remove command:', error);
              });
            removeExecuted++;
            if(execResult) logger.debug('Execute result:', execResult);
          }
          if(options.commandsRemove) {
            CLICommandsOutput += commandItem.command + '\n';
            removeGenerated++;
          }
        }
      }
      if(options.executeRemove) {
        if(removeExecuted>0) logger.result(`REMOVE actions executed: ${removeExecuted}`);
        if(removeNotExecuted>0) logger.result(`REMOVE actions NOT executed: ${removeNotExecuted}`);
        if(removeExecuted === 0 && removeNotExecuted === 0) {
          if(copySkipped > 0 && options.executeCopy) {
            logger.result('No REMOVE actions are available to be executed. However there were COPY actions not executed. Had they been executed, there may have been REMOVE actions executed.');
          } else {
            logger.result('No REMOVE actions are available to be executed.')
          }
        }
      }
    }
    // Summary

    let commandsGenerated = copyGenerated + removeGenerated;
    let commandsNotGenerated = copyNotGenerated + removeNotGenerated;

    if(options.commandsCopy || options.commandsRemove) {
      if(commandsNotGenerated > 0) {
        if(copyNotGenerated>0) {
          logger.info(`Dry run mode enabled, COPY command generation skipped: ${copyNotGenerated}`);
        }
        if(removeNotGenerated>0) {
          logger.info(`Dry run mode enabled, REMOVE commands generation skipped: ${removeNotGenerated}`);
        }
        if(isExecuteCopyAndRemoveOnIndex) {
          logger.info("Both options '-execute-copy' and '--execute-remove' were specified, but Index HTML objects were found.")
          logger.info("It is recommended to not use '--execute-remove' or '--XR' on Index HTML objects.")
        }
      } else {
        if(options.dryRun) {
          logger.result('Dry run mode enabled, but no COPY or REMOVE commands available to be generated.');
        }
      }

      if(commandsGenerated > 0) {
        if(copyGenerated>0) logger.info(`COPY commands generated: ${copyGenerated}`);
        if(removeGenerated>0) logger.info(`REMOVE commands generated: ${removeGenerated}`);
        if (options.outputFile) {
          const fs = await import('fs');
          fs.writeFileSync(options.outputFile, CLICommandsOutput);
          logger.result(`${commandsGenerated} AWS S3 CLI commands written to ${options.outputFile}`);
        } else {
          logger.info(`${commandsGenerated} AWS S3 CLI commands printed to console output:`);
          logger.result(CLICommandsOutput);
        }
      } else {
        if(!options.dryRun) {
          if(options.commandsCopy && options.commandsRemove) {
            logger.result('No COPY OR REMOVE commands available to be generated.');
          } else if (options.commandsCopy) {
          logger.result('No COPY commands available to be generated.');
          } else if (options.commandsRemove) {
            logger.result('No REMOVE commands available to be generated.');
          }
        }
      }
    }
  });

program.parse(process.argv);