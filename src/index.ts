import { parseArgs } from "util";
import compile from "./compile.js";
import server from "./server.js";

const args = parseArgs({
  allowPositionals: true,
  options: {
    input: {
      type: "string",
      short: "i",
    },
    output: {
      type: "string",
      short: "o",
    },
    port: {
      type: "string",
      short: "p",
    },
    noRm: {
      type: "boolean",
      short: "k",
    },
  },
});

const mode = args.positionals[0];
const directories = {
  input: args.values.input ?? "./input",
  output: args.values.output ?? "./output",
};

switch (mode) {
  case "compile":
    await compile(directories.input, directories.output, !args.values.noRm);
    break;
  case "serve":
    await server(
      directories,
      Number(args.values.port ?? 3000),
      !args.values.noRm
    );
    break;
  case "help":
    console.log(`Usage: html-framework -- [MODE] [OPTIONS]

compile    Compiles markup from the input directory into the output directory
  -i  --input   Set input directory (defaults to ./input)
  -o  --output  Set output directory (defaults to ./output)
  -k  --noRm    Don't delete old files in the output directory

serve      Runs a live development server which automatically compiles files
  -i  --input   Set input directory (defaults to ./input)
  -o  --output  Set output directory (defaults to ./output)
  -p  --port    Set the port for the server (defaults to 3000)
  -k  --noRm    Don't delete old files in the output directory`);
    break;
  default:
    console.log("Please specify a valid option: compile, serve, help");
}
