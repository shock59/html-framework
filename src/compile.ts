import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type TagAttribute = {
  name: string;
  value?: string;
  quoteType?: string;
};

type Tag = {
  name: string;
  attributes: TagAttribute[];
  children: (Tag | string)[];
  closed: boolean;
};

const voidTags = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
];

function isTag(input: unknown): input is Tag {
  return (input as Tag).name != undefined;
}

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
    if (index >= attributesString.length || attributesString[index] == " ") {
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

      break;
    }

    if (attributesString[index] == "=") {
      const attributeName = attributesString.substring(
        currentAttributeNameIndex,
        index
      );

      index++;
      let attributeValueIndex = index + 1;
      let quoteType;
      if (["'", '"'].includes(attributesString[index]!))
        quoteType = attributesString[index];
      else {
        quoteType = " ";
        attributeValueIndex--;
        index--;
      }

      while (true) {
        index++;
        if (index == attributesString.length) break;
        if (attributesString[index] == quoteType) break;
      }
      const attributeValue = attributesString.substring(
        attributeValueIndex,
        index
      );

      attributes.push({
        name: attributeName,
        value: attributeValue,
        quoteType: quoteType!,
      });

      while (true) {
        index++;
        if (index == attributesString.length || attributesString[index] != " ")
          break;
      }

      currentAttributeNameIndex = index;
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

      if (
        tagAttributes[tagAttributes.length - 1]?.name == "/" &&
        tagAttributes[tagAttributes.length - 1]?.quoteType == undefined
      ) {
        parsed.push({
          name: tagName,
          attributes: tagAttributes.slice(0, -1),
          children: parse(
            html.substring(
              openingTagIndex + tagInsideBrackets.length + 2,
              html.length
            )
          ),
          closed: true,
        });

        return parsed;
      }

      if (voidTags.includes(tagName.toLowerCase())) {
        parsed.push({
          name: tagName,
          attributes: tagAttributes,
          children: parse(
            html.substring(
              openingTagIndex + tagInsideBrackets.length + 2,
              html.length
            )
          ),
          closed: true,
        });

        continue;
      }

      // Find the closing tag
      while (true) {
        index++;
        if (index == html.length) {
          parsed.push({
            name: tagName,
            attributes: tagAttributes,
            children: parse(
              html.substring(
                openingTagIndex + tagInsideBrackets.length + 2,
                html.length
              )
            ),
            closed: false,
          });

          return parsed;
        }
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
        closed: true,
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

function build(parsed: (Tag | string)[]) {
  let html = "";

  for (const element of parsed) {
    if (isTag(element)) {
      html += `<${element.name}`;
      if (element.attributes.length) {
        html += " ";
        for (const [index, attribute] of element.attributes.entries()) {
          html += attribute.name;
          if (attribute.value) {
            const quote = attribute.quoteType == " " ? "" : attribute.quoteType;
            html += `=${quote}${attribute.value}${quote}`;
            if (index != element.attributes.length - 1) html += " ";
          }
        }
      }
      html += ">";
      if (element.children.length) {
        html += build(element.children);
      }
      if (!voidTags.includes(element.name.toLowerCase()) && element.closed) {
        html += `</${element.name}>`;
      }
    } else html += element;
  }

  return html;
}

const inputDir = "input";
const outputDir = "output";

const files = await readdir(inputDir);
for (const file of files) {
  const fileContent = await readFile(path.join(inputDir, file), {
    encoding: "utf-8",
  });
  const parsed = parse(fileContent);
  const newHtml = build(parsed);
  await writeFile(path.join(outputDir, `${file}.json`), JSON.stringify(parsed));
  await writeFile(path.join(outputDir, file), newHtml);
}
