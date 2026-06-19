import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { loadToolConfig, resolveToolPath, toPosixPath } from "./config";

const WARNING_ORANGE = "\x1b[38;5;208m";
const WARNING_DIM = "\x1b[2m";
const WARNING_RESET = "\x1b[0m";
const WARNING_MARK = "⚠";
const CAPITALIZATION_PATTERN =
  /\bFedRAMP certification packages?\b|\bFedRAMP certifications?\b/gi;

export interface ContentStyleWarning {
  relativePath: string;
  line: number;
  column: number;
  found: string;
  expected: string;
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(entryPath);
    }
  }

  return files;
}

function expectedCapitalization(found: string): string {
  const isPackage = /\bpackage/i.test(found);
  const isPlural = /s$/i.test(found);

  if (isPackage) {
    return `FedRAMP Certification Package${isPlural ? "s" : ""}`;
  }

  return `FedRAMP Certification${isPlural ? "s" : ""}`;
}

export async function findFedrampCertificationCapitalizationWarnings(
  root: string,
): Promise<ContentStyleWarning[]> {
  const warnings: ContentStyleWarning[] = [];
  const markdownFiles = (await listMarkdownFiles(root)).sort();

  for (const filePath of markdownFiles) {
    const contents = await readFile(filePath, "utf8");
    const relativePath = toPosixPath(path.relative(root, filePath));
    const lines = contents.split(/\r?\n/);

    lines.forEach((line, lineIndex) => {
      for (const match of line.matchAll(CAPITALIZATION_PATTERN)) {
        const found = match[0];
        const expected = expectedCapitalization(found);
        if (found === expected) {
          continue;
        }

        warnings.push({
          relativePath,
          line: lineIndex + 1,
          column: (match.index ?? 0) + 1,
          found,
          expected,
        });
      }
    });
  }

  return warnings;
}

export function printFedrampCertificationCapitalizationWarnings(
  warnings: ContentStyleWarning[],
): void {
  if (!warnings.length) {
    return;
  }

  console.warn(
    [
      "",
      `${WARNING_ORANGE}${WARNING_MARK} FedRAMP Certification capitalization warnings (${warnings.length}):${WARNING_RESET}`,
      "",
      ...warnings.flatMap((warning) => [
        `    ${WARNING_ORANGE}${WARNING_MARK} ${warning.relativePath}:${warning.line}:${warning.column}${WARNING_RESET}`,
        `      ${WARNING_DIM}"${warning.found}" → "${warning.expected}"${WARNING_RESET}`,
      ]),
      "",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const config = await loadToolConfig();
  const contentPath = resolveToolPath(config.paths.content);
  const warnings =
    await findFedrampCertificationCapitalizationWarnings(contentPath);
  printFedrampCertificationCapitalizationWarnings(warnings);
}

if (import.meta.main) {
  await main();
}
