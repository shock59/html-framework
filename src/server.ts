import express from "express";
import { watch } from "fs";
import compile from "./compile.js";

const app = express();
const port = 3000;

const inputDir = "input";
const outputDir = "output";

app.use(express.static(outputDir));

watch(inputDir, { recursive: true }, async (evt, name) => {
  console.log(`${name} updated, compiling...`);
  await compile(inputDir, outputDir);
  console.clear();
  console.log(`${name} updated, recompiled HTML`);
});

console.log(`Compiling to ${outputDir}`);
await compile(inputDir, outputDir);

app.listen(port, () => {
  console.clear();
  console.log(`Server running at http://127.0.0.1:${port}`);
});
