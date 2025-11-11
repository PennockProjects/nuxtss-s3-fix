import { S3CommandStatus } from "./types/S3Command";
import { createS3KeysFromSitemap } from "./utils/s3CommandUtils";
import { processKeysCpActions, executeS3Copy } from "./utils/s3CpCommands";
import { processKeysRmActions, executeS3Remove } from "./utils/s3RmCommands";
import { program } from "commander";
import logger from "./utils/logger";
import { S3Layout } from "./types/S3Command";

program
  .name("nuxtss-s3-fix")
  .description(`A CLI tool that generates or executes AWS S3 commands that optimize a Nuxt.js generated static site in an Amazon AWS S3 bucket. An accurate sitemap.xml file, defaulted to be in the root of the bucket or specified is required. The tool can generate AWS S3 CLI commands that can be run by the user or can execute the commands directly. It requires that a local AWS CLI context be configured allowing AWS S3 Bucket Permissions to get and copy objects. When using the generated AWS S3 CLI commands, you may have to rerun the tool after running the generated AWS S3 CLI commands to get updated commands to run next.  Please refer to the README.md document for more details. Examples:
      nuxtss-s3-fix s3://my-bucket-name -e --double-layout
      nuxtss-s3-fix s3://my-bucket-name -s ./site_map_expected.xml -o s3BucketCommands.sh`)
  .usage("<S3Bucket> [command option] [other options]")
  .helpOption("-h, --help", "Display help for command")

program
  .argument('S3Bucket', `An S3 bucket path starting with 's3://'. Examples: 's3://bucket-name' or 's3://bucket-name/key'`)
  .option("-e, --execute-commands","Execute AWS commands", false)
  .option("-2, --double-layout", "the Double layout duplicates each page html object. (default: the Single layout has only one page html object)", false)
  .option("-o, --output-file <file>", "Output file for AWS CLI Commands generated (default: outputs to console)", undefined)
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
    let copyOptimized = 0;
    let removeGenerated = 0;
    let removeNotGenerated = 0;
    let removeExecuted = 0;
    let removeSkipped = 0;
    let removeOptimized = 0;
    let isCopyAllPaths = false;
    let isRemoveAllPathsSkipped = false;
    let isRemovePassRun = false;

    if(options.executeCommands && options.outputFile) {
      logger.error(`Actions are to be executed but an output file for command generation was specified.`);
      options.outputFile = undefined;
      process.exit(0);
    }

    if( options.dryRun ) {
      logger.info('Dry run mode enabled, so no COPY or REMOVE actions will be executed or generated.');
    }

    const s3Report = await createS3KeysFromSitemap(s3Bucket, {
      isExecute: options.executeCommands, ...options}).catch(error => {
      logger.error('Error processing sitemap.xml for s3 keys:', error);
      process.exit(1);
    });

    if (!s3Report) {
      logger.error('Error creating S3 keys from sitemap.xml. Exiting.');
      process.exit(1);
    }

    if(s3Report.paths.length === 0) {
      logger.warn('No paths found in the sitemap.xml file. Exiting.');
      process.exit(0);
    }

    if (s3Report.keysAll.length === 0) {
      logger.warn('No valid S3 object keys can be created from the paths found in the sitemap.xml file. Exiting.');
      process.exit(0);
    }

    s3Report.s3PathLayoutNew = options.doubleLayout ? S3Layout.DOUBLE : S3Layout.SINGLE;
    logger.info('Desired S3 layout for sitemap.xml paths:', s3Report.s3PathLayoutNew.toUpperCase());

    logger.info('Checking AWS S3 bucket for COPY optimization commands');
    const cpResults = await processKeysCpActions(s3Report)
      .catch(error => {
        logger.error('Error processing keys for AWS S3 copy actions:', error);
        process.exit(1);
      });
     
    if (cpResults.s3CopyCommands.length > 0) {
      for(const commandItem of cpResults.s3CopyCommands) {
        if(options.executeCommands) {
          if(options.dryRun) {
            logger.debug(`Skipped execute '${commandItem.commandType}' to '${commandItem.targetKey}'`);
            copySkipped++;
          } else {
            logger.debug(`Executing '${commandItem.commandType}' to '${commandItem.targetKey}'`);
            const execResult = await executeS3Copy(cpResults.bucketUri, commandItem.sourceKey, commandItem.targetKey)
              .catch(error => {
                logger.error('Error executing S3 copy command:', error);
              });
            if(execResult) logger.debug('Execute result:', execResult);
            copyExecuted++;
          }
        } else {
          if(options.dryRun) {
            logger.debug(`Skipped generating ${commandItem.commandType.toUpperCase()} to '${commandItem.targetKey}'`);
            copyNotGenerated++;
          } else {
            logger.debug(`Generated command: '${commandItem.commandType.toUpperCase()}' to '${commandItem.targetKey}'`);
            CLICommandsOutput += commandItem.command + '\n';
            copyGenerated++;
          }
        }
      }
    } else {
      for(const commandItem of cpResults.s3CopyCommandsSkipped) {
        if(commandItem.commandStatus === S3CommandStatus.LAYOUT_OPTIMIZED) {
          copyOptimized++;
        }
      }
    }

    if(copyNotGenerated > 0) {
      isCopyAllPaths = s3Report.s3PathLayoutNew === S3Layout.DOUBLE ? (copyNotGenerated == s3Report.paths.length*2) : (copyNotGenerated == s3Report.paths.length);
    } else if(copyGenerated > 0) {
      isCopyAllPaths = s3Report.s3PathLayoutNew === S3Layout.DOUBLE ? (copyGenerated == s3Report.paths.length*2) : (copyGenerated == s3Report.paths.length);
    }

    if(!isCopyAllPaths) {
      isRemovePassRun = true;
      logger.info('Checking AWS S3 bucket for REMOVE optimizations commands');
      const rmResults = await processKeysRmActions(s3Report)
        .catch(error => {
          logger.error('Error processing S3 Remove commands:', error);
          process.exit(1);
        });
          
      if (rmResults.s3RemoveCommands.length > 0) {
        for(const commandItem of rmResults.s3RemoveCommands) {
          if(options.executeCommands) {
            if(options.dryRun) {
              logger.debug(`Skipped execute '${commandItem.commandType}' on '${commandItem.targetKey}'`);
              removeSkipped++;
            } else {
              logger.debug(`Executing '${commandItem.commandType}' on '${commandItem.targetKey}'`);
              const execResult = await executeS3Remove(rmResults.bucketUri, commandItem.targetKey)
                .catch(error => {
                  logger.error('Error executing S3 remove command:', error);
                });
              if(execResult) logger.debug('Execute result:', execResult);
              removeExecuted++;
            }
          } else {
            if(options.dryRun) {
              logger.debug(`Skipped generating ${commandItem.commandType.toUpperCase()} to '${commandItem.targetKey}'`);
              removeNotGenerated++;
            } else {
              logger.debug(`Generated command: '${commandItem.commandType.toUpperCase()}' to '${commandItem.targetKey}'`);
              CLICommandsOutput += commandItem.command + '\n';
              removeGenerated++;
            }
          }
        }
      } else {
        for(const commandItem of rmResults.s3CopyCommandsSkipped) {
          if(commandItem.commandStatus === S3CommandStatus.LAYOUT_OPTIMIZED) {
            removeOptimized++;
          }
        }
      }
    }

    if(removeNotGenerated > 0) {
      isRemoveAllPathsSkipped = s3Report.s3PathLayoutNew === S3Layout.DOUBLE ? (removeNotGenerated == s3Report.paths.length*2) : (removeNotGenerated == s3Report.paths.length);
    }

    // Report
    if(copyOptimized > 0  || removeOptimized > 0) {
      if(copyOptimized > 0 && removeOptimized > 0 && copyOptimized !== removeOptimized) {
        logger.error(`Mismatch in optimized key counts COPY: ${copyOptimized} REMOVE: ${removeOptimized} in ${s3Report.s3PathLayoutNew.toUpperCase()} layout`);
      } else {
        logger.info(`Keys already optimized in ${s3Report.s3PathLayoutNew.toUpperCase()} layout: ${Math.max(copyOptimized,removeOptimized)}`);
      }
    }

    if(options.executeCommands) {
      if(copyExecuted == 0 && copySkipped == 0) {
        logger.log('No COPY actions are available to be executed.');
      } else if(isRemovePassRun) {
        if(options.executeCommands && copySkipped > 0) {
          logger.log(`${copySkipped} COPY actions were skipped. During a live run, each successful COPY action may trigger REMOVE action(s).`);
        } else if(removeExecuted === 0 && removeSkipped == 0) {
          logger.log('No REMOVE actions are available to be executed.');
        }
      }
    } else {
      if(copyGenerated == 0 && copyNotGenerated == 0) {
        logger.log('No COPY commands available to be generated.');
      } else if(isRemovePassRun && removeGenerated === 0 && removeNotGenerated == 0) {
        logger.log('No REMOVE commands available to be generated.');
      }
    }
    
    if(copyExecuted > 0 || removeExecuted > 0) 
      logger.log(`Actions executed COPY: ${copyExecuted} REMOVE: ${removeExecuted}`);
    if(copySkipped > 0 || removeSkipped > 0)
      logger.log(`Actions *not* executed,--dry-run, COPY: ${copySkipped} REMOVE: ${removeSkipped}`);
    if(copyGenerated > 0 || removeGenerated > 0) {
      logger.info(`Commands generated COPY: ${copyGenerated} REMOVE: ${removeGenerated}`);
    }
    if(copyNotGenerated > 0 || removeNotGenerated > 0) {
      if(isCopyAllPaths) {
        logger.info(`All ${s3Report.paths.length} paths need COPY actions for optimization.`)
        logger.log(`Please rerun this tool without --dry-run to generate ${copyNotGenerated} COPY commands.`);
      } else {
        logger.log(`COPY command generation skipped (--dry-run): ${copyNotGenerated} for ${s3Report.paths.length} paths`);
        if(isRemoveAllPathsSkipped) {
          logger.info(`All ${s3Report.paths.length} paths need REMOVE actions for optimization`);
          logger.log(`Please rerun this tool without --dry-run to generate ${removeNotGenerated} REMOVE commands.`);
        } else {
          logger.log(`REMOVE command generation skipped (--dry-run): ${removeNotGenerated} for ${s3Report.paths.length} paths`);
        }
      }
    }
    
    // For command generation, prompt to run again after 
    if(!options.executeCommands && copyGenerated > 0)
      logger.info(`After running the ${copyGenerated} COPY commands, please rerun this tool for MORE commands until optimization is complete.`);

    // Handle command generation output
    let commandsGenerated = copyGenerated + removeGenerated;
    if(commandsGenerated > 0) {
      if (options.outputFile) {
        const fs = await import('fs');
        fs.writeFileSync(options.outputFile, CLICommandsOutput);
        logger.log(`${commandsGenerated} AWS S3 CLI commands written to ${options.outputFile}`);
      } else {
        logger.info(`${commandsGenerated} AWS S3 CLI commands printed to console output:`);
        logger.log(CLICommandsOutput);
      }
    }
    process.exit(0);
  });

program.parse(process.argv);