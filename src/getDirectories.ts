import { parseArgs } from "util";

export default function getDirectories() {
  const args = parseArgs({
    options: {
      input: {
        type: "string",
        short: "i",
      },
      output: {
        type: "string",
        short: "o",
      },
    },
  });

  return {
    input: args.values.input ?? "./input",
    output: args.values.output ?? "./output",
  };
}
