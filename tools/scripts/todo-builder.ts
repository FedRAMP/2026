import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertPathInside,
  loadToolConfig,
  resolveToolPath,
  toPosixPath,
  type GeneratedDocumentSource,
  type GeneratedDocumentStatus,
  type TodoDocumentConfig,
  type ToolConfig,
} from "./config";

interface PagePicto {
  source?: string;
  status?: string;
}

interface PageFrontmatter {
  description?: string;
  googleDoc?: string;
  picto?: PagePicto;
  purpose?: string;
}

interface TodoPage {
  description?: string;
  googleDoc?: string;
  purpose?: string;
  relativePath: string;
  sectionHref?: string;
  sectionLabel: string;
  source?: string;
  status?: string;
  title: string;
}

interface SiteSection {
  href?: string;
  label: string;
}

interface GeneratedManifest {
  files: string[];
}

export interface TodoBuildOptions {
  generatedAt?: Date;
}

export interface TodoBuildSummary {
  generatedAt: string;
  pageCount: number;
  outputPath: string;
  relativePath: string;
}

const DEFAULT_TODO_CONFIG: TodoDocumentConfig = {
  title: "TO DO",
  output: "todo.md",
  description:
    "A table showing all pages, their source, and their progress along with links to internal documentation only available to FedRAMP.",
  purpose:
    "The FedRAMP team will have a simple place to see progress that is machine-generated.",
  source: "machine",
  status: "placeholder",
};

const GOOGLE_DOC_HEADER_ICON = ":lucide-file-cog:";
const GOOGLE_DOC_LINK_ICON = ":material-file-edit-outline:";
const MARKDOWN_SOURCE_ICON = ":material-language-markdown-outline:";
const LOCATION_SEPARATOR_ICON = ":lucide-circle-arrow-out-down-right:<br>";
const TODO_GROUPS: Array<{
  source: GeneratedDocumentSource;
  sourceLabel: string;
  status: GeneratedDocumentStatus;
  statusLabel: string;
}> = [
  {
    source: "person",
    sourceLabel: "Human-Written",
    status: "stable",
    statusLabel: "Stable",
  },
  {
    source: "person",
    sourceLabel: "Human-Written",
    status: "placeholder",
    statusLabel: "Placeholder",
  },
  {
    source: "person",
    sourceLabel: "Human-Written",
    status: "empty",
    statusLabel: "Empty",
  },
  {
    source: "machine",
    sourceLabel: "Machine-Generated",
    status: "stable",
    statusLabel: "Stable",
  },
  {
    source: "machine",
    sourceLabel: "Machine-Generated",
    status: "placeholder",
    statusLabel: "Placeholder",
  },
  {
    source: "machine",
    sourceLabel: "Machine-Generated",
    status: "empty",
    statusLabel: "Empty",
  },
];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function knownGeneratedSource(
  config: ToolConfig,
  value: string,
): value is GeneratedDocumentSource {
  return value in config.pictographs.source;
}

function knownGeneratedStatus(
  config: ToolConfig,
  value: string,
): value is GeneratedDocumentStatus {
  return value in config.pictographs.status;
}

function todoConfig(config: ToolConfig): TodoDocumentConfig {
  const configured = config.generated.todo;
  const merged = {
    ...DEFAULT_TODO_CONFIG,
    ...configured,
  };

  if (!knownGeneratedSource(config, merged.source)) {
    throw new Error(`generated.todo.source is unsupported: ${merged.source}`);
  }

  if (!knownGeneratedStatus(config, merged.status)) {
    throw new Error(`generated.todo.status is unsupported: ${merged.status}`);
  }

  return merged;
}

function normalizeGeneratedPath(relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Todo output must be relative: ${relativePath}`);
  }

  const normalized = toPosixPath(path.normalize(relativePath));
  if (normalized.startsWith("../") || normalized === "..") {
    throw new Error(`Todo output must stay inside src: ${relativePath}`);
  }

  if (!normalized.endsWith(".md")) {
    throw new Error(`Todo output must be a markdown file: ${relativePath}`);
  }

  return normalized;
}

function resolveSrcPath(
  config: ToolConfig,
  relativePath: string,
  label: string,
): string {
  const srcPath = resolveToolPath(config.paths.src);
  const outputPath = path.resolve(srcPath, relativePath);
  assertPathInside(srcPath, outputPath, label);
  return outputPath;
}

async function assertNoContentCollision(
  config: ToolConfig,
  relativePath: string,
): Promise<void> {
  const contentPath = resolveToolPath(config.paths.content);
  const targetPath = path.resolve(contentPath, relativePath);
  assertPathInside(contentPath, targetPath, "Todo content collision path");

  if (await fileExists(targetPath)) {
    throw new Error(
      `Generated todo output "${relativePath}" would shadow content/${relativePath}. Move generated.todo.output in tools/config.json before building.`,
    );
  }
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        const childFiles = await listMarkdownFiles(entryPath);
        return childFiles.map((childFile) => path.join(entry.name, childFile));
      }

      if (entry.isFile() && entry.name.endsWith(".md")) {
        return [entry.name];
      }

      return [];
    }),
  );

  return files.flat().map(toPosixPath);
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

function meaningfulFrontmatterValue(value: string): string | undefined {
  let normalized = value.trim();
  const quotedValue = normalized.match(/^(['"])(.*)\1$/);
  if (quotedValue?.[2] !== undefined) {
    normalized = quotedValue[2].trim();
  } else if (
    (normalized.startsWith('"') && !normalized.endsWith('"')) ||
    (!normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && !normalized.endsWith("'")) ||
    (!normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.replace(/^['"]|['"]$/g, "").trim();
  }

  return normalized ? normalized : undefined;
}

function frontmatterScalarValue(
  lines: string[],
  key: "description" | "google_doc" | "purpose",
): string | undefined {
  const keyPattern = new RegExp(`^${key}:\\s*(.*)$`);
  const keyIndex = lines.findIndex((line) => keyPattern.test(line));
  if (keyIndex === -1) {
    return undefined;
  }

  const value = lines[keyIndex]?.match(keyPattern)?.[1]?.trim() ?? "";
  const blockScalarMatch = value.match(/^([>|])[-+]?$/);
  if (blockScalarMatch?.[1]) {
    const blockLines: string[] = [];
    for (let index = keyIndex + 1; index < lines.length; index++) {
      const line = lines[index];
      if (!line) {
        blockLines.push("");
        continue;
      }

      if (!line.startsWith(" ")) {
        break;
      }

      blockLines.push(line.trim());
    }

    const separator = blockScalarMatch[1] === ">" ? " " : "\n";
    return meaningfulFrontmatterValue(blockLines.join(separator));
  }

  return meaningfulFrontmatterValue(value);
}

function pictoFrontmatterValue(lines: string[]): PagePicto | undefined {
  const pictoIndex = lines.findIndex((line) => line.trim() === "picto:");
  if (pictoIndex === -1) {
    return undefined;
  }

  const value: PagePicto = {};
  for (let index = pictoIndex + 1; index < lines.length; index++) {
    const line = lines[index];
    if (!line) {
      continue;
    }

    if (!line.startsWith(" ")) {
      break;
    }

    const sourceMatch = line.match(/^\s+source:\s*([A-Za-z0-9_-]+)\s*$/);
    const statusMatch = line.match(/^\s+status:\s*([A-Za-z0-9_-]+)\s*$/);
    if (sourceMatch?.[1]) {
      value.source = sourceMatch[1];
    }
    if (statusMatch?.[1]) {
      value.status = statusMatch[1];
    }
  }

  return value;
}

function parseFrontmatter(contents: string): PageFrontmatter {
  const lines = frontmatterLines(contents);
  if (!lines) {
    return {};
  }

  return {
    description: frontmatterScalarValue(lines, "description"),
    googleDoc: frontmatterScalarValue(lines, "google_doc"),
    purpose: frontmatterScalarValue(lines, "purpose"),
    picto: pictoFrontmatterValue(lines),
  };
}

function pictoSpanValue(contents: string, config: ToolConfig): PagePicto {
  const spanMatch = contents.match(/<span class="picto">([\s\S]*?)<\/span>/);
  const span = spanMatch?.[1] ?? "";
  const value: PagePicto = {};

  for (const source of Object.keys(config.pictographs.source)) {
    if (span.includes(`.${source}`)) {
      value.source = source;
      break;
    }
  }

  for (const status of Object.keys(config.pictographs.status)) {
    if (span.includes(`.${status}`)) {
      value.status = status;
      break;
    }
  }

  return value;
}

function fallbackTitle(relativePath: string): string {
  const parsedPath = path.posix.parse(relativePath);
  const name =
    parsedPath.name === "index"
      ? path.posix.basename(parsedPath.dir) || "Home"
      : parsedPath.name;

  return name
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function pageTitle(relativePath: string, contents: string): string {
  const heading = contents
    .split(/\r?\n/)
    .map((line) => line.match(/^#\s+(.+?)\s*#*\s*$/)?.[1]?.trim())
    .find((title): title is string => Boolean(title));

  return heading?.replace(/\s+\{#[^}]+}\s*$/, "") ?? fallbackTitle(relativePath);
}

async function readPage(
  srcPath: string,
  relativePath: string,
  config: ToolConfig,
  section: SiteSection,
): Promise<TodoPage> {
  const contents = await readFile(path.join(srcPath, relativePath), "utf8");
  const frontmatter = parseFrontmatter(contents);
  const spanPicto = pictoSpanValue(contents, config);

  return {
    relativePath,
    sectionHref: section.href,
    sectionLabel: section.label,
    title: pageTitle(relativePath, contents),
    source: frontmatter.picto?.source ?? spanPicto.source,
    status: frontmatter.picto?.status ?? spanPicto.status,
    description: frontmatter.description,
    purpose: frontmatter.purpose,
    googleDoc: frontmatter.googleDoc,
  };
}

function pictographWithTooltip(pictograph: string, tooltip: string): string {
  const match = pictograph.match(/^(.*)\{\s*([^}]*?)\s*\}$/);
  if (!match?.[1] || !match[2]) {
    throw new Error(`Pictograph is missing Markdown attributes: ${pictograph}`);
  }

  return `${match[1]}{ ${match[2]} title="${markdownAttributeValue(tooltip)}" }`;
}

function markdownAttributeValue(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function pictographSpan(
  config: ToolConfig,
  source: GeneratedDocumentSource,
  status: GeneratedDocumentStatus,
): string {
  const sourcePictograph = config.pictographs.source[source];
  const statusPictograph = config.pictographs.status[status];
  const sourceTooltip = config.pictographs.tooltips[source];
  const statusTooltip = config.pictographs.tooltips[status];

  if (!sourcePictograph || !statusPictograph) {
    throw new Error(`Unsupported todo pictograph: ${source}/${status}`);
  }

  if (!sourceTooltip || !statusTooltip) {
    throw new Error(`Missing todo pictograph tooltip: ${source}/${status}`);
  }

  return `<span class="picto">${pictographWithTooltip(
    sourcePictograph,
    sourceTooltip,
  )} ${pictographWithTooltip(statusPictograph, statusTooltip)}</span>`;
}

function pictographPair(
  config: ToolConfig,
  source: GeneratedDocumentSource,
  status: GeneratedDocumentStatus,
): string {
  const sourcePictograph = config.pictographs.source[source];
  const statusPictograph = config.pictographs.status[status];
  const sourceTooltip = config.pictographs.tooltips[source];
  const statusTooltip = config.pictographs.tooltips[status];

  if (!sourcePictograph || !statusPictograph) {
    throw new Error(`Unsupported todo pictograph: ${source}/${status}`);
  }

  if (!sourceTooltip || !statusTooltip) {
    throw new Error(`Missing todo pictograph tooltip: ${source}/${status}`);
  }

  return `${pictographWithTooltip(
    sourcePictograph,
    sourceTooltip,
  )} ${pictographWithTooltip(statusPictograph, statusTooltip)}`;
}

function compactCellValue(value?: string): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function escapeTableCell(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replace(/\r?\n/g, "<br>");
}

function escapeLinkText(value: string): string {
  return value.replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function escapeLinkDestination(value: string): string {
  return value.replaceAll("(", "%28").replaceAll(")", "%29");
}

function relativeMarkdownLink(
  fromRelativePath: string,
  toRelativePath: string,
): string {
  const fromDir = path.posix.dirname(fromRelativePath);
  const relativeLink = path.posix.relative(fromDir, toRelativePath);
  return relativeLink || path.posix.basename(toRelativePath);
}

function googleDocLink(googleDoc?: string): string {
  const href = compactCellValue(googleDoc);
  if (!href) {
    return MARKDOWN_SOURCE_ICON;
  }

  return `[${GOOGLE_DOC_LINK_ICON}](${escapeLinkDestination(href)}){ title="Link to FedRAMP Internal Google Doc" }`;
}

function linkedSection(todoRelativePath: string, page: TodoPage): string {
  if (!page.sectionHref) {
    return page.sectionLabel;
  }

  return `[${escapeLinkText(page.sectionLabel)}](${escapeLinkDestination(
    relativeMarkdownLink(todoRelativePath, page.sectionHref),
  )})`;
}

function linkedPage(todoRelativePath: string, page: TodoPage): string {
  return `[${escapeLinkText(page.title)}](${escapeLinkDestination(
    relativeMarkdownLink(todoRelativePath, page.relativePath),
  )})`;
}

function linkedLocation(todoRelativePath: string, page: TodoPage): string {
  return `${linkedSection(todoRelativePath, page)} ${LOCATION_SEPARATOR_ICON} ${linkedPage(
    todoRelativePath,
    page,
  )}`;
}

function pictoCell(
  config: ToolConfig,
  source?: string,
  status?: string,
): string {
  if (
    source &&
    status &&
    knownGeneratedSource(config, source) &&
    knownGeneratedStatus(config, status)
  ) {
    return pictographPair(config, source, status);
  }

  return [source, status].map(compactCellValue).filter(Boolean).join(" / ");
}

function renderTableRow(
  config: ToolConfig,
  todoRelativePath: string,
  page: TodoPage,
): string {
  const cells = [
    linkedLocation(todoRelativePath, page),
    pictoCell(config, page.source, page.status),
    compactCellValue(page.description),
    compactCellValue(page.purpose),
    googleDocLink(page.googleDoc),
  ];

  return `| ${cells.map(escapeTableCell).join(" | ")} |`;
}

function renderPageTable(
  config: ToolConfig,
  todoRelativePath: string,
  pages: TodoPage[],
): string[] {
  return [
    `| Location | Picto | Description | Purpose | ${GOOGLE_DOC_HEADER_ICON} |`,
    "| --- | --- | --- | --- | --- |",
    ...pages.map((page) => renderTableRow(config, todoRelativePath, page)),
  ];
}

function renderGroupedPageTables(
  config: ToolConfig,
  todoRelativePath: string,
  pages: TodoPage[],
): string[] {
  return TODO_GROUPS.flatMap((group) => {
    const groupPages = pages.filter(
      (page) => page.source === group.source && page.status === group.status,
    );
    return [
      `## ${group.statusLabel} ${group.sourceLabel} Pages ${pictographPair(
        config,
        group.source,
        group.status,
      )}`,
      "",
      ...renderPageTable(config, todoRelativePath, groupPages),
      "",
    ];
  });
}

function renderTodoMarkdown(
  config: ToolConfig,
  todo: TodoDocumentConfig,
  todoRelativePath: string,
  pages: TodoPage[],
  generatedAt: string,
): string {
  const lines = [
    "---",
    `description: ${JSON.stringify(todo.description)}`,
    `purpose: ${JSON.stringify(todo.purpose)}`,
    'google_doc: ""',
    "picto:",
    `  source: ${todo.source}`,
    `  status: ${todo.status}`,
    "---",
    "",
    pictographSpan(config, todo.source, todo.status),
    "",
    '??? info inline end "Page Info"',
    "",
    `    **Description:** ${compactCellValue(todo.description)}`,
    "    ",
    `    **Purpose:** ${compactCellValue(todo.purpose)}`,
    "",
    `# ${todo.title ?? DEFAULT_TODO_CONFIG.title}`,
    "",
    `**Generated:** ${generatedAt}`,
    "",
    ...renderGroupedPageTables(config, todoRelativePath, pages),
    "",
  ];

  return `${lines.join("\n").trimEnd()}\n`;
}

async function appendTodoToGeneratedManifest(
  config: ToolConfig,
  todoRelativePath: string,
): Promise<void> {
  const manifestPath = resolveSrcPath(
    config,
    config.generated.manifest,
    "Generated manifest",
  );
  let manifest: GeneratedManifest = { files: [] };

  if (await fileExists(manifestPath)) {
    manifest = JSON.parse(await readFile(manifestPath, "utf8")) as GeneratedManifest;
  }

  manifest.files = Array.from(
    new Set([...manifest.files, todoRelativePath]),
  ).sort();

  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function selfPage(
  todo: TodoDocumentConfig,
  todoRelativePath: string,
  section: SiteSection,
): TodoPage {
  return {
    relativePath: todoRelativePath,
    sectionHref: section.href,
    sectionLabel: section.label,
    title: todo.title ?? DEFAULT_TODO_CONFIG.title ?? "TO DO",
    source: todo.source,
    status: todo.status,
    description: todo.description,
    purpose: todo.purpose,
  };
}

function siteSectionsFromZensicalConfig(source: string): Map<string, SiteSection> {
  const sectionByPath = new Map<string, SiteSection>();
  const sectionHrefByLabel = new Map<string, string>();
  let currentSectionLabel: string | null = null;
  const topLevelSectionPattern =
    /^  \{\s*(?:"([^"]+)"|([A-Za-z][A-Za-z0-9 _'-]*))\s*=/;

  for (const line of source.split(/\r?\n/)) {
    const sectionMatch = line.match(topLevelSectionPattern);
    if (sectionMatch) {
      currentSectionLabel = (sectionMatch[1] ?? sectionMatch[2] ?? "").trim();
    }

    if (!currentSectionLabel) {
      continue;
    }

    for (const pathMatch of line.matchAll(/"([^"]+\.md)"/g)) {
      const relativePath = pathMatch[1];
      if (!relativePath) {
        continue;
      }

      if (!sectionHrefByLabel.has(currentSectionLabel)) {
        sectionHrefByLabel.set(currentSectionLabel, relativePath);
      }

      if (!sectionByPath.has(relativePath)) {
        sectionByPath.set(relativePath, {
          href: sectionHrefByLabel.get(currentSectionLabel),
          label: currentSectionLabel,
        });
      }
    }
  }

  return sectionByPath;
}

async function loadSiteSections(
  config: ToolConfig,
): Promise<Map<string, SiteSection>> {
  const zensicalConfig = await readFile(
    resolveToolPath(config.paths.zensicalConfig),
    "utf8",
  );
  return siteSectionsFromZensicalConfig(zensicalConfig);
}

function pageSection(
  sectionByPath: Map<string, SiteSection>,
  relativePath: string,
): SiteSection {
  return sectionByPath.get(relativePath) ?? { label: "Unlinked" };
}

function shouldIncludeTodoPage(
  relativePath: string,
  todoRelativePath: string,
): boolean {
  return relativePath !== todoRelativePath && !relativePath.startsWith("authority/");
}

export async function buildTodo(
  config?: ToolConfig,
  options: TodoBuildOptions = {},
): Promise<TodoBuildSummary> {
  const toolConfig = config ?? (await loadToolConfig());
  const todo = todoConfig(toolConfig);
  const todoRelativePath = normalizeGeneratedPath(todo.output);
  const outputPath = resolveSrcPath(toolConfig, todoRelativePath, "Todo output");
  const srcPath = resolveToolPath(toolConfig.paths.src);
  const generatedAt = (options.generatedAt ?? new Date()).toISOString();

  await assertNoContentCollision(toolConfig, todoRelativePath);

  const sectionByPath = await loadSiteSections(toolConfig);
  const markdownPaths = (await listMarkdownFiles(srcPath))
    .filter((relativePath) => shouldIncludeTodoPage(relativePath, todoRelativePath))
    .sort((left, right) => left.localeCompare(right));
  const pages = await Promise.all(
    markdownPaths.map((relativePath) =>
      readPage(
        srcPath,
        relativePath,
        toolConfig,
        pageSection(sectionByPath, relativePath),
      ),
    ),
  );
  pages.push(
    selfPage(todo, todoRelativePath, pageSection(sectionByPath, todoRelativePath)),
  );
  pages.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );

  const rendered = renderTodoMarkdown(
    toolConfig,
    todo,
    todoRelativePath,
    pages,
    generatedAt,
  );

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, rendered, "utf8");
  await appendTodoToGeneratedManifest(toolConfig, todoRelativePath);

  return {
    generatedAt,
    pageCount: pages.length,
    outputPath,
    relativePath: todoRelativePath,
  };
}

if (import.meta.main) {
  buildTodo()
    .then((summary) => {
      console.log(
        `Generated ${summary.relativePath} with ${summary.pageCount} pages.`,
      );
    })
    .catch((error) => {
      console.error("Failed to build todo markdown.");
      console.error(error);
      process.exitCode = 1;
    });
}
