import { helloWorld } from "./utils/helloWorld";
import { program } from "commander";

program
  .name("nuxtss-s3-fix")
  .description("A skeleton CLI to say hello world")
  .usage("<name> [options]")
  .helpOption("-h, --help", "Display help for command")
  .version("[VI]{version}[/VI]", "-v, --version", "Display version information");

program
  .argument("[name]", "name to greet", "World")
  .action((name) => {
    console.log(helloWorld(name));
  });

program.parse(process.argv);