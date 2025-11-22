import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

type TagAttribute = {
  name: string;
  value?: string;
};

type Tag = {
  name: string;
  attributes: TagAttribute[];
  children: (Tag | string)[];
};

function parseAttributes(tag: string) {
  const name = tag.split(" ", 1)[0] ?? "";

  if (name.length == tag.length)
    return {
      name,
      attributes: [],
    };

  const attributesString = tag.substring(name.length, tag.length).trim();

  let attributes: TagAttribute[] = [];

  let currentAttributeNameIndex = 0;
  let index = 0;

  while (true) {
    if (index >= attributesString.length) break;

    if (attributesString[index] == "=") {
      const attributeName = attributesString.substring(
        currentAttributeNameIndex,
        index
      );

      index++;
      let attributeValueIndex = index + 1;
      const quoteType = attributesString[index];
      while (true) {
        index++;
        if (index == attributesString.length)
          return {
            name,
            attributes: [],
          };
        if (attributesString[index] == quoteType) break;
      }
      const attributeValue = attributesString.substring(
        attributeValueIndex,
        index
      );

      attributes.push({
        name: attributeName,
        value: attributeValue,
      });

      while (true) {
        index++;
        if (index == attributesString.length || attributesString[index] != " ")
          break;
      }

      currentAttributeNameIndex = index;
      continue;
    }

    if (attributesString[index] == " ") {
      const attributeName = attributesString.substring(
        currentAttributeNameIndex,
        index
      );
      attributes.push({
        name: attributeName,
      });

      while (true) {
        index++;
        if (index == attributesString.length || attributesString[index] != " ")
          break;
      }
      continue;
    }

    index++;
  }
  return {
    name,
    attributes,
  };
}

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
      const tagInsideBrackets = html.substring(openingTagIndex + 1, index);

      const { name: tagName, attributes: tagAttributes } =
        parseAttributes(tagInsideBrackets);

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
        attributes: tagAttributes,
        children: parse(
          html.substring(
            openingTagIndex + tagInsideBrackets.length + 2,
            closingTagIndex
          )
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
  console.log(JSON.stringify(parse(fileContent)));
}
