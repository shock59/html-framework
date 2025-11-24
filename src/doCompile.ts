import compile from "./compile.js";
import getDirectories from "./getDirectories.js";
const directories = getDirectories();
await compile(directories.input, directories.output);
