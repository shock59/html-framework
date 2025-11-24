import {
  lstat,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
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
  opened: boolean;
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
  filename: string,
  imported: Parsed,
  newContents: Parsed,
  allFiles: Record<string, Parsed>,
  alreadyImported: string[]
) {
  for (const [index, element] of imported.entries()) {
    if (!isTag(element)) continue;
    if (element.name == "contents") {
      imported = [
        ...imported.slice(0, index),
        ...handleImportTags(filename, newContents, allFiles, [
          ...alreadyImported,
        ]),
        ...imported.slice(index + 1, imported.length),
      ];
    } else {
      imported = [
        ...imported.slice(0, index),
        {
          name: element.name,
          attributes: element.attributes,
          children: updateContents(
            filename,
            element.children,
            newContents,
            { ...allFiles },
            alreadyImported
          ),
          closed: element.closed,
          opened: element.opened,
        },
        ...imported.slice(index + 1, imported.length),
      ];
    }
  }

  return imported;
}

function handleRelativeSrcs(
  originalFilename: string,
  newFilename: string,
  parsed: Parsed
) {
  for (const [index, element] of parsed.entries()) {
    if (!isTag(element)) continue;
    const attributeIndex = element.attributes.findIndex((attribute) =>
      ["src", "href"].includes(attribute.name)
    );

    parsed = [
      ...parsed.slice(0, index),
      {
        name: element.name,
        attributes: element.attributes,
        children: handleRelativeSrcs(
          originalFilename,
          newFilename,
          element.children
        ),
        closed: element.closed,
        opened: element.opened,
      },
      ...parsed.slice(index + 1, parsed.length),
    ];

    if (attributeIndex == -1) continue;

    const value = element.attributes[attributeIndex]!.value!;
    if (/^(\/)|(http:\/\/)|(https:\/\/)|(data:)/i.test(value)) continue;

    const newValue = path.join(
      path.dirname(newFilename),
      path.join(path.dirname(originalFilename), value)
    );
    let newElement = element;
    newElement.attributes[attributeIndex]!.value = newValue;

    parsed = [
      ...parsed.slice(0, index),
      newElement,
      ...parsed.slice(index + 1, parsed.length),
    ];
  }

  return parsed;
}

function handleImportTags(
  filename: string,
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
      const importedPath =
        value[0] == "/" ? value : path.join(path.dirname(filename), value);
      if (alreadyImported.includes(importedPath)) {
        continue;
      }
      let imported = [...(allFiles[importedPath] ?? [])];
      if (!imported) continue;

      imported = updateContents(
        filename,
        imported,
        element.children,
        allFiles,
        [...alreadyImported, importedPath]
      );
      imported = handleRelativeSrcs(filename, importedPath, imported);

      const newElements = handleImportTags(
        importedPath,
        imported,
        { ...allFiles },
        [...alreadyImported, importedPath]
      );

      parsed = [
        ...parsed.slice(0, index),
        ...newElements,
        ...parsed.slice(index + 1, parsed.length),
      ];

      return handleImportTags(
        filename,
        parsed,
        { ...allFiles },
        alreadyImported
      );
    } else {
      parsed = [
        ...parsed.slice(0, index),
        {
          name: element.name,
          attributes: element.attributes,
          children: handleImportTags(
            filename,
            element.children,
            { ...allFiles },
            alreadyImported
          ),
          closed: element.closed,
          opened: element.opened,
        },
        ...parsed.slice(index + 1, parsed.length),
      ];
    }
  }

  return parsed;
}

async function handleEachTags(
  filename: string,
  parsed: Parsed,
  allFiles: Record<string, Parsed>,
  alreadyImported: string[],
  inputDir: string
) {
  for (const [index, element] of parsed.entries()) {
    if (!isTag(element)) continue;
    if (element.name == "each") {
      const src = element.attributes.find(
        (attribute) => attribute.name == "src" && attribute.value != undefined
      );
      if (!src) continue;
      const value = src.value!;
      let importedPath =
        value[0] == "/" ? value : path.join(path.dirname(filename), value);
      if (importedPath[importedPath.length - 1] != "/")
        if (alreadyImported.includes(importedPath)) {
          continue;
        }

      if (!(await lstat(path.join(inputDir, importedPath))).isDirectory())
        continue;

      const files = Object.keys(allFiles).filter((filename) =>
        filename.startsWith(importedPath)
      );
      let newElements: Parsed = [];
      for (const filename of files) {
        let newElement: Parsed = updateContents(
          filename,
          allFiles[filename]!,
          element.children,
          allFiles,
          [...alreadyImported, filename]
        );
        newElement = handleRelativeSrcs(filename, importedPath, newElement);
        newElements.push(...newElement);
      }

      parsed = [
        ...parsed.slice(0, index),
        ...newElements,
        ...parsed.slice(index + 1, parsed.length),
      ];
      return handleEachTags(
        filename,
        parsed,
        allFiles,
        alreadyImported,
        inputDir
      );
    } else {
      parsed = [
        ...parsed.slice(0, index),
        {
          name: element.name,
          attributes: element.attributes,
          children: await handleEachTags(
            filename,
            element.children,
            allFiles,
            alreadyImported,
            inputDir
          ),
          closed: element.closed,
          opened: element.opened,
        },
        ...parsed.slice(index + 1, parsed.length),
      ];
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

      // Closing tag without an opening tag
      if (tagInsideBrackets[0] == "/") {
        parsed.push({
          name: tagInsideBrackets,
          attributes: [],
          children: [],
          opened: false,
          closed: true,
        });
      }

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
          opened: true,
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
          opened: true,
          closed: true,
        });

        index++;
        currentTextStartingIndex = index;
        continue;
      }

      let newTags = 0;
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
            opened: true,
            closed: false,
          });

          return parsed;
        }
        if (
          [`<${tagName} `, `<${tagName}>`].includes(
            html.substring(index, index + tagName.length + 2)
          )
        ) {
          newTags++;
        }

        if (
          html.substring(index, index + tagName.length + 3) == `</${tagName}>`
        ) {
          if (newTags == 0) break;
          newTags--;
        }
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
        opened: true,
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
      if (element.opened) {
        html += `<${element.name}`;
        if (element.attributes.length) {
          html += " ";
          for (const [index, attribute] of element.attributes.entries()) {
            html += attribute.name;
            if (attribute.value) {
              const quote =
                attribute.quoteType == " " ? "" : attribute.quoteType;
              html += `=${quote}${attribute.value}${quote}`;
              if (index != element.attributes.length - 1) html += " ";
            }
          }
        }
        html += ">";
        if (element.children.length) {
          html += build(element.children);
        }
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

export default async function compile(
  inputDir: string,
  outputDir: string,
  doRm: boolean
) {
  const parsed = await getFiles(inputDir);

  if (doRm)
    try {
      await rm(path.join(outputDir), { recursive: true });
    } catch {}

  let builtCount = 0;
  for (const file of Object.keys(parsed)) {
    // console.log(JSON.stringify(parsed["components/codeblock.html"]));

    if (file.split("/")[0] == "components") continue;
    let newParsed = handleImportTags(file, parsed[file]!, parsed, [file]);
    newParsed = await handleEachTags(file, newParsed, parsed, [file], inputDir);
    const built = build(newParsed);
    const outputPath = path.join(outputDir, file);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, built);
    builtCount++;
  }

  console.log(`Built ${builtCount}/${Object.keys(parsed).length} files`);
}
