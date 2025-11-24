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
  },
});

const mode = args.positionals[0];
const directories = {
  input: args.values.input ?? "./input",
  output: args.values.output ?? "./output",
};

switch (mode) {
  case "compile":
    await compile(directories.input, directories.output);
    break;
  case "serve":
    await server(directories, Number(args.values.port ?? 3000));
    break;
  case "help":
    console.log(`Usage: npm run dev -- [MODE] [OPTIONS]

compile    Compiles markup from the input directory into the output directory
  -i  --input   Set input directory (defaults to ./input)
  -o  --output  Set output directory (defaults to ./output)
  
serve      Runs a live development server which automatically compiles files
  -i  --input   Set input directory (defaults to ./input)
  -o  --output  Set output directory (defaults to ./output)
  -p  --port    Set the port for the server (defaults to 3000)`);
    break;
  default:
    console.log("Please specify a valid option: compile, serve, help");
}
