import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

type TagAttribute = {
  name: string;
  value?: string;
};

type Tag = {
  name: string;
  children: (Tag | string)[];
};

function parse(html: string) {
  let parsed: (Tag | string)[] = [];

  let currentTextStartingIndex = 0;
  let index = 0;
  while (true) {

    if (index == html.length) break;

    if (html[index] == "<") {
      if (index > currentTextStartingIndex) {
        parsed.push(html.substring(currentTextStartingIndex, index));
      }

      let openingTagIndex = index;

      // Get tag name
      while (true) {
        index++;
        if (index == html.length) return [];
        if (html[index] == ">") break;
      }
      const tagName = html.substring(openingTagIndex + 1, index);

      // Find the closing tag
      while (true) {
        index++;
        if (index == html.length) return [];
        if (
          html.substring(index, index + tagName.length + 3) == `</${tagName}>`
        )
          break;
      }
      const closingTagIndex = index;

      parsed.push({
        name: tagName,
        children: parse(
          html.substring(openingTagIndex + tagName.length + 2, closingTagIndex)
        ),
      });

      index += tagName.length + 3;
      currentTextStartingIndex = index;
      continue;
    }

    index++;
  }

  if (index > currentTextStartingIndex) {
    parsed.push(html.substring(currentTextStartingIndex, index));
  }

  return parsed;
}

const inputDir = "input";

const files = await readdir(inputDir);
for (const file of files) {
  console.log(file);
  const fileContent = await readFile(path.join(inputDir, file), {
    encoding: "utf-8",
  });
  console.log(parse(fileContent));
}
