import express from "express";
import { watch } from "fs";
import compile from "./compile.js";
const app = express();
const port = 3000;

const inputDir = "input";
const outputDir = "output";

app.use(express.static(outputDir));

watch(inputDir, { recursive: true }, function (evt, name) {
  compile(inputDir, outputDir);
  console.log(`${name} updated, recompiled HTML`);
});

app.listen(port, () => {
  console.log(`Server running at http://127.0.0.1:${port}`);
});
