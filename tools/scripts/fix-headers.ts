import fs from "node:fs/promises";
import path from "node:path";
import { loadToolConfig, resolveToolPath } from "./config";

export interface HeaderFixSummary {
  changedFiles: string[];
  fixedHeadings: number;
}

const BOLD_MARKDOWN_HEADING_PATTERN =
  /^(\s{0,3}#{1,6}\s+)\*\*(.+?)\*\*(\s*#*\s*)$/;

async function listMarkdownFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(root, entry.name);

      if (entry.isDirectory()) {
        return listMarkdownFiles(entryPath);
      }

      if (entry.isFile() && entry.name.endsWith(".md")) {
        return [entryPath];
      }

      return [];
    }),
  );

  return nestedFiles.flat();
}

export function fixBoldMarkdownHeadingsInText(source: string): {
  contents: string;
  fixedHeadings: number;
} {
  let fixedHeadings = 0;
  const contents = source.replace(/^.*$/gm, (line) => {
    const fixedLine = line.replace(
      BOLD_MARKDOWN_HEADING_PATTERN,
      (_match, prefix: string, headingText: string, suffix: string) => {
        fixedHeadings++;
        return `${prefix}${headingText}${suffix}`;
      },
    );

    return fixedLine;
  });

  return { contents, fixedHeadings };
}

export async function fixBoldMarkdownHeadingsInDirectory(
  contentPath: string,
): Promise<HeaderFixSummary> {
  const changedFiles: string[] = [];
  let fixedHeadings = 0;

  for (const filePath of await listMarkdownFiles(contentPath)) {
    const source = await fs.readFile(filePath, "utf8");
    const result = fixBoldMarkdownHeadingsInText(source);

    if (result.contents === source) {
      continue;
    }

    await fs.writeFile(filePath, result.contents, "utf8");
    fixedHeadings += result.fixedHeadings;
    changedFiles.push(
      path.relative(contentPath, filePath).split(path.sep).join("/"),
    );
  }

  return {
    changedFiles: changedFiles.sort(),
    fixedHeadings,
  };
}

async function main(): Promise<void> {
  const config = await loadToolConfig();
  const contentPath = resolveToolPath(config.paths.content);
  const summary = await fixBoldMarkdownHeadingsInDirectory(contentPath);

  console.log(
    `Fixed ${summary.fixedHeadings} bold markdown heading${
      summary.fixedHeadings === 1 ? "" : "s"
    } in ${summary.changedFiles.length} content file${
      summary.changedFiles.length === 1 ? "" : "s"
    }.`,
  );

  for (const relativePath of summary.changedFiles) {
    console.log(`- content/${relativePath}`);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Header fix failed:");
    console.error(error);
    process.exit(1);
  });
}
