import { lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
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

type Parsed = (Tag | string)[];

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

function updateContents(
  imported: Parsed,
  newContents: Parsed,
  allFiles: Record<string, Parsed>,
  alreadyImported: string[]
) {
  for (const [index, element] of imported.entries()) {
    if (!isTag(element)) continue;
    if (element.name == "contents") {
      console.log(imported);

      imported = [
        ...imported.slice(0, index),
        ...handleImportTags(newContents, allFiles, [...alreadyImported]),
        ...imported.slice(index + 1, imported.length),
      ];
    } else {
      element.children = updateContents(
        element.children,
        newContents,
        allFiles,
        alreadyImported
      );
    }
  }

  return imported;
}

function handleImportTags(
  parsed: Parsed,
  allFiles: Record<string, Parsed>,
  alreadyImported: string[]
) {
  for (const [index, element] of parsed.entries()) {
    if (!isTag(element)) continue;
    if (element.name == "import") {
      const src = element.attributes.find(
        (attribute) => attribute.name == "src" && attribute.value != undefined
      );
      if (!src) continue;
      const value = src.value!;
      if (alreadyImported.includes(value)) {
        continue;
      }

      let imported = allFiles[value];
      if (!imported) continue;

      imported = updateContents(imported, element.children, allFiles, [
        ...alreadyImported,
        value,
      ]);

      parsed = [
        ...parsed.slice(0, index),
        ...handleImportTags(imported, allFiles, [...alreadyImported, value]),
        ...parsed.slice(index + 1, parsed.length),
      ];
    } else {
      element.children = handleImportTags(
        element.children,
        allFiles,
        alreadyImported
      );
    }
  }

  return parsed;
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
    attributes: attributes.filter((attribute) => attribute.name != ""),
  };
}

function parse(html: string) {
  let parsed: Parsed = [];

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

      // Self closing tags
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

        currentTextStartingIndex = index + 1;
        continue;
      }

      if (voidTags.includes(tagName.toLowerCase())) {
        parsed.push({
          name: tagName,
          attributes: tagAttributes,
          children: [],
          closed: true,
        });

        index++;
        currentTextStartingIndex = index;
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

function build(parsed: Parsed) {
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

async function getFiles(dir: string) {
  let parsed: Record<string, Parsed> = {};
  const files = await readdir(dir);

  for (const file of files) {
    const fullFilePath = path.join(dir, file);

    if ((await lstat(fullFilePath)).isDirectory()) {
      console.log(fullFilePath);
      const newFiles = await getFiles(fullFilePath);
      for (const filename of Object.keys(newFiles)) {
        parsed[path.join(file, filename)] = newFiles[filename]!;
      }
      continue;
    }

    const fileContent = await readFile(path.join(dir, file), {
      encoding: "utf-8",
    });
    parsed[file] = parse(fileContent);
  }

  return parsed;
}

export default async function compile(inputDir: string, outputDir: string) {
  const parsed = await getFiles(inputDir);

  for (const file of Object.keys(parsed)) {
    if (file.split("/")[0] == "components") continue;
    const newParsed = handleImportTags(parsed[file]!, parsed, [file]);
    const built = build(newParsed);
    const outputPath = path.join(outputDir, file);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, built);
  }
}
