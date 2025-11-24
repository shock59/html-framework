import express from "express";
import { watch } from "fs";
import compile from "./compile.js";
import getDirectories from "./getDirectories.js";

const app = express();
const port = 3000;

const directories = getDirectories();

app.use(express.static(directories.output));

watch(directories.input, { recursive: true }, async (evt, name) => {
  console.log(`${name} updated, compiling...`);
  await compile(directories.input, directories.output);
  console.clear();
  console.log(`${name} updated, recompiled HTML`);
});

console.log(`Compiling to ${directories.output}`);
await compile(directories.input, directories.output);

app.listen(port, () => {
  console.clear();
  console.log(`Server running at http://127.0.0.1:${port}`);
});
