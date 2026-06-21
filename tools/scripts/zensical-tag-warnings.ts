import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { toPosixPath } from "./config";
import { requiredZensicalTags } from "./zensical-tags";

const WARNING_ORANGE = "\x1b[38;5;208m";
const WARNING_DIM = "\x1b[2m";
const WARNING_RESET = "\x1b[0m";
const WARNING_MARK = "⚠";

export interface ZensicalTagWarning {
  relativePath: string;
  missingTags: string[];
  foundTags: string[];
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

function frontmatterLines(contents: string): string[] | null {
  const lines = contents.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return null;
  }

  const frontmatterEndIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );
  if (frontmatterEndIndex === -1) {
    return null;
  }

  return lines.slice(1, frontmatterEndIndex);
}

function unquoteYamlScalar(value: string): string {
  const trimmed = value.trim();
  const firstCharacter = trimmed[0];
  const lastCharacter = trimmed.at(-1);

  if (
    trimmed.length >= 2 &&
    ((firstCharacter === '"' && lastCharacter === '"') ||
      (firstCharacter === "'" && lastCharacter === "'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function inlineYamlTags(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map(unquoteYamlScalar)
      .filter(Boolean);
  }

  return [unquoteYamlScalar(trimmed)].filter(Boolean);
}

export function zensicalTagsFromFrontmatter(contents: string): string[] {
  const frontmatter = frontmatterLines(contents);
  if (!frontmatter) {
    return [];
  }

  const tagsIndex = frontmatter.findIndex((line) => /^tags\s*:/.test(line));
  if (tagsIndex === -1) {
    return [];
  }

  const tagsLine = frontmatter[tagsIndex] ?? "";
  const inlineValue = tagsLine.replace(/^tags\s*:\s*/, "");
  if (inlineValue) {
    return inlineYamlTags(inlineValue);
  }

  const tags: string[] = [];
  for (let index = tagsIndex + 1; index < frontmatter.length; index++) {
    const line = frontmatter[index] ?? "";
    if (!line.trim()) {
      continue;
    }

    if (!/^\s/.test(line)) {
      break;
    }

    const itemMatch = line.match(/^\s*-\s*(.+?)\s*$/);
    if (itemMatch?.[1]) {
      const tag = unquoteYamlScalar(itemMatch[1]);
      if (tag) {
        tags.push(tag);
      }
    }
  }

  return tags;
}

export async function findZensicalTagWarnings(
  root: string,
): Promise<ZensicalTagWarning[]> {
  const warnings: ZensicalTagWarning[] = [];
  const markdownFiles = (await listMarkdownFiles(root)).sort();

  for (const filePath of markdownFiles) {
    const relativePath = toPosixPath(path.relative(root, filePath));
    const requiredTags = requiredZensicalTags(relativePath);
    if (!requiredTags.length) {
      continue;
    }

    const foundTags = zensicalTagsFromFrontmatter(
      await readFile(filePath, "utf8"),
    );
    const missingTags = requiredTags.filter((tag) => !foundTags.includes(tag));
    if (missingTags.length) {
      warnings.push({ relativePath, missingTags, foundTags });
    }
  }

  return warnings;
}

export function printZensicalTagWarnings(
  warnings: ZensicalTagWarning[],
): void {
  if (!warnings.length) {
    return;
  }

  console.warn(
    [
      "",
      `${WARNING_ORANGE}${WARNING_MARK} Zensical tag warnings for Markdown pages in 20x/ or rev5/ directories (${warnings.length}):${WARNING_RESET}`,
      "",
      ...warnings.flatMap((warning) => [
        `    ${WARNING_ORANGE}${WARNING_MARK} src/${warning.relativePath}${WARNING_RESET}`,
        `      ${WARNING_DIM}missing: ${warning.missingTags.join(", ")}; found: ${
          warning.foundTags.length
            ? warning.foundTags.join(", ")
            : "(no front matter tags)"
        }${WARNING_RESET}`,
      ]),
      "",
    ].join("\n"),
  );
}
