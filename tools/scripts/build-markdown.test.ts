import { afterAll, describe, expect, test } from "bun:test";
import { execFile, spawn } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { AnySchema } from "ajv";
import {
  buildMarkdown,
  collectArtifacts,
  loadRules,
  OUTPUT_DIR,
  RULES_FILE,
} from "./build-markdown";
import {
  loadToolConfig,
  REPO_ROOT,
  resolveToolPath,
  type ToolConfig,
} from "./config";
import { deploy } from "./deploy";
import { buildTodo } from "./todo-builder";

const execFileAsync = promisify(execFile);
const RULES_REMOTE_URL = "https://github.com/FedRAMP/rules.git";
const DEFAULT_RULES_REMOTE_BRANCH = "main";
const RULES_SCHEMA_FILE = resolveToolPath(
  "rules/schemas/fedramp-consolidated-rules.schema.json",
);
const MACHINE_PICTOGRAPH =
  ':lucide-computer:{ .machine title="This content is machine-generated from FedRAMP Machine-Readable Rules." }';
const PERSON_PICTOGRAPH =
  ':lucide-person-standing:{ .person title="This content was written by a human just for this page." }';
const STABLE_PICTOGRAPH =
  ':lucide-book-open-check:{ .stable title="This content is relatively stable and only minor changes are expected." }';
const PLACEHOLDER_PICTOGRAPH =
  ':lucide-pencil:{ .placeholder title="This content is a placeholder and is not complete." }';
const EMPTY_PICTOGRAPH =
  ':lucide-circle-slash:{ .empty title="This content has not been produced or ported to this website yet." }';
const STABLE_STATUS_SPAN =
  '<span class="picto">:lucide-computer:{ .machine title="This content is machine-generated from FedRAMP Machine-Readable Rules." } :lucide-book-open-check:{ .stable title="This content is relatively stable and only minor changes are expected." }</span>';
const PLACEHOLDER_STATUS_SPAN =
  '<span class="picto">:lucide-computer:{ .machine title="This content is machine-generated from FedRAMP Machine-Readable Rules." } :lucide-pencil:{ .placeholder title="This content is a placeholder and is not complete." }</span>';
const MANUAL_STABLE_STATUS_SPAN =
  '<span class="picto">:lucide-person-standing:{ .person title="This content was written by a human just for this page." } :lucide-book-open-check:{ .stable title="This content is relatively stable and only minor changes are expected." }</span>';
const WARNING_ORANGE = "\x1b[38;5;208m";
const WARNING_RESET = "\x1b[0m";
const WARNING_MARK = "⚠";
const ERROR_RED = "\x1b[31m";
const COLOR_RESET = "\x1b[0m";
let unlinkedMarkdownWarningPaths: string[] = [];
let boldMarkdownHeadingWarnings: string[] = [];
let contentPictographWarnings: string[] = [];
let contentFrontmatterWarnings: string[] = [];
let emptyContentFrontmatterWarnings: string[] = [];
let rulesSubmoduleSyncWarnings: string[] = [];
const humanReadableFailureSummaries: string[] = [];

afterAll(() => {
  printUnlinkedMarkdownWarnings();
  printBoldMarkdownHeadingWarnings();
  printContentPictographWarnings();
  printContentFrontmatterWarnings();
  printEmptyContentFrontmatterWarnings();
  printRulesSubmoduleSyncWarnings();
  printHumanReadableFailureSummaries();
});

function printUnlinkedMarkdownWarnings(): void {
  if (!unlinkedMarkdownWarningPaths.length) {
    return;
  }

  console.warn(
    [
      "",
      `${WARNING_ORANGE}${WARNING_MARK} Markdown files exist in src/ after bun run build but are not linked in zensical.toml:${WARNING_RESET}`,
      "",
      ...unlinkedMarkdownWarningPaths.map(
        (relativePath) =>
          `    ${WARNING_ORANGE}${WARNING_MARK} ${relativePath}${WARNING_RESET}`,
      ),
      "",
    ].join("\n"),
  );
}

function printBoldMarkdownHeadingWarnings(): void {
  if (!boldMarkdownHeadingWarnings.length) {
    return;
  }

  console.warn(
    [
      "",
      `${WARNING_ORANGE}${WARNING_MARK} Markdown headings should not be wrapped in bold markers:${WARNING_RESET}`,
      "",
      ...boldMarkdownHeadingWarnings.map(
        (location) =>
          `    ${WARNING_ORANGE}${WARNING_MARK} ${location}${WARNING_RESET}`,
      ),
      "",
    ].join("\n"),
  );
}

function printContentPictographWarnings(): void {
  if (!contentPictographWarnings.length) {
    return;
  }

  console.warn(
    [
      "",
      `${WARNING_ORANGE}${WARNING_MARK} Content markdown files should declare picto.source and picto.status in frontmatter:${WARNING_RESET}`,
      "",
      ...contentPictographWarnings.map(
        (warning) => `    ${WARNING_ORANGE}${WARNING_MARK} ${warning}${WARNING_RESET}`,
      ),
      "",
    ].join("\n"),
  );
}

function printContentFrontmatterWarnings(): void {
  if (!contentFrontmatterWarnings.length) {
    return;
  }

  console.warn(
    [
      "",
      `${WARNING_ORANGE}${WARNING_MARK} Content markdown files should declare description, purpose, and google_doc in frontmatter:${WARNING_RESET}`,
      "",
      ...contentFrontmatterWarnings.map(
        (warning) => `    ${WARNING_ORANGE}${WARNING_MARK} ${warning}${WARNING_RESET}`,
      ),
      "",
    ].join("\n"),
  );
}

function printEmptyContentFrontmatterWarnings(): void {
  if (!emptyContentFrontmatterWarnings.length) {
    return;
  }

  console.warn(
    [
      "",
      `${WARNING_ORANGE}${WARNING_MARK} Content markdown description and purpose frontmatter should not be empty:${WARNING_RESET}`,
      "",
      ...emptyContentFrontmatterWarnings.map(
        (warning) => `    ${WARNING_ORANGE}${WARNING_MARK} ${warning}${WARNING_RESET}`,
      ),
      "",
    ].join("\n"),
  );
}

function printRulesSubmoduleSyncWarnings(): void {
  if (!rulesSubmoduleSyncWarnings.length) {
    return;
  }

  console.warn(
    [
      "",
      `${WARNING_ORANGE}Rules submodule sync warnings:${WARNING_RESET}`,
      "",
      ...rulesSubmoduleSyncWarnings.map(
        (warning) => `    ${WARNING_ORANGE}${WARNING_MARK} ${warning}${WARNING_RESET}`,
      ),
      "",
    ].join("\n"),
  );
}

function printHumanReadableFailureSummaries(): void {
  if (!humanReadableFailureSummaries.length) {
    return;
  }

  console.error(
    [
      "",
      `${ERROR_RED}Human-readable failure summary:${COLOR_RESET}`,
      "",
      ...humanReadableFailureSummaries.map(
        (summary, index) =>
          `${ERROR_RED}${index + 1}. ${summary
            .trim()
            .replaceAll("\n", `\n   `)}${COLOR_RESET}`,
      ),
      "",
    ].join("\n"),
  );
}

function expectWithFailureSummary(
  summary: string,
  assertion: () => void,
): void {
  try {
    assertion();
  } catch (error) {
    humanReadableFailureSummaries.push(summary);
    throw error;
  }
}

function expectTextOrder(
  contents: string,
  expectedTexts: string[],
  description: string,
): void {
  expectWithFailureSummary(description, () => {
    let previousIndex = -1;
    for (const expectedText of expectedTexts) {
      const index = contents.indexOf(expectedText, previousIndex + 1);
      expect(
        index,
        `${description}: missing or out-of-order text: ${expectedText}`,
      ).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });
}

type RulesForTest = Awaited<ReturnType<typeof loadRules>>;
type RequirementDocumentForTest = RulesForTest["FRR"][string];
type ArtifactForTest = ReturnType<typeof collectArtifacts>[number];

function markdownTableCell(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
}

function humanizeStatus(value?: string): string {
  if (!value) {
    return "Unknown";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function slugifyTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function relatedTermsGroupAnchorId(tag: string): string {
  return `related-terms-group-${slugifyTerm(tag)}`;
}

function documentSubsetCount(document: RequirementDocumentForTest): number {
  const subsetKeys = new Set<string>();

  for (const bucket of Object.values(document.data)) {
    for (const subsetKey of Object.keys(bucket ?? {})) {
      subsetKeys.add(subsetKey);
    }
  }

  return subsetKeys.size;
}

function documentRuleCount(document: RequirementDocumentForTest): number {
  const ruleIds = new Set<string>();

  for (const bucket of Object.values(document.data)) {
    for (const requirements of Object.values(bucket ?? {})) {
      for (const ruleId of Object.keys(requirements ?? {})) {
        ruleIds.add(ruleId);
      }
    }
  }

  return ruleIds.size;
}

function latestRequirementUpdateDate(
  document: RequirementDocumentForTest,
): string {
  const dates: string[] = [];

  for (const bucket of Object.values(document.data)) {
    for (const requirements of Object.values(bucket ?? {})) {
      for (const requirement of Object.values(requirements ?? {})) {
        for (const change of requirement.updated ?? []) {
          if (change.date) {
            dates.push(change.date);
          }
        }
      }
    }
  }

  return dates.sort().at(-1) ?? "";
}

function expectedReferenceIndexRows(rules: RulesForTest): string[] {
  return Object.values(rules.FRR)
    .map((document) => {
      const acronym = markdownTableCell(document.info.short_name ?? "");
      const name = markdownTableCell(document.info.name);
      const href = `${document.info.web_name}.md`;
      const status = markdownTableCell(humanizeStatus(document.info.status));
      const counts = `Subsets: ${documentSubsetCount(
        document,
      )}<br>Rules: ${documentRuleCount(document)}`;
      const updated = markdownTableCell(latestRequirementUpdateDate(document));

      return {
        acronym,
        row: `| ${acronym} | [${name}](${href}) | ${status} | ${counts} | ${updated} |`,
      };
    })
    .sort((left, right) => left.acronym.localeCompare(right.acronym))
    .map((entry) => entry.row);
}

function expectedImportantRelatedTermRows(rules: RulesForTest): string[] {
  const taggedTerms = new Map<string, string[]>();

  for (const entry of Object.values(rules.FRD.data.all ?? {})) {
    const tag = entry.tag?.trim();
    if (!tag) {
      continue;
    }

    const terms = taggedTerms.get(tag) ?? [];
    terms.push(entry.term);
    taggedTerms.set(tag, terms);
  }

  return Array.from(taggedTerms.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([tag, terms]) => {
      const linkedTerms = terms
        .sort((left, right) => left.localeCompare(right))
        .map((term) => `[${term}](#${slugifyTerm(term)}){ data-preview }`)
        .join("<br>");

      return `| <span id="${relatedTermsGroupAnchorId(
        tag,
      )}"></span>${tag} | ${linkedTerms} |`;
    });
}

function findArtifact(
  artifacts: ArtifactForTest[],
  relativePath: string,
): ArtifactForTest {
  const artifact = artifacts.find((entry) => entry.relativePath === relativePath);
  if (!artifact) {
    throw new Error(`Expected generated artifact: ${relativePath}`);
  }

  return artifact;
}

function firstArtifactMatching(
  artifacts: ArtifactForTest[],
  predicate: (artifact: ArtifactForTest) => boolean,
  description: string,
): ArtifactForTest {
  const artifact = artifacts.find(predicate);
  if (!artifact) {
    throw new Error(`Expected generated artifact matching: ${description}`);
  }

  return artifact;
}

function artifactWithMappingId(
  artifacts: ArtifactForTest[],
  mappingId: string,
): ArtifactForTest {
  return firstArtifactMatching(
    artifacts,
    (artifact) => artifact.mappingId === mappingId,
    `mapping id ${mappingId}`,
  );
}

function artifactsWithMappingId(
  artifacts: ArtifactForTest[],
  mappingId: string,
): ArtifactForTest[] {
  return artifacts.filter((artifact) => artifact.mappingId === mappingId);
}

function artifactOfType(
  artifacts: ArtifactForTest[],
  documentType: ArtifactForTest["documentType"],
): ArtifactForTest {
  return firstArtifactMatching(
    artifacts,
    (artifact) => artifact.documentType === documentType,
    `document type ${documentType}`,
  );
}

function artifactsOfType(
  artifacts: ArtifactForTest[],
  documentType: ArtifactForTest["documentType"],
): ArtifactForTest[] {
  return artifacts.filter((artifact) => artifact.documentType === documentType);
}

function firstRequirementInArtifact(artifact: ArtifactForTest): {
  id: string;
  title: string;
} {
  for (const section of artifact.context.sections) {
    const requirement = section.requirements[0];
    if (requirement) {
      return requirement;
    }
  }

  throw new Error(`Expected ${artifact.relativePath} to include a requirement.`);
}

async function readGeneratedArtifact(artifact: ArtifactForTest): Promise<string> {
  return readFile(artifact.outputPath, "utf8");
}

function deadlineRowMarkdown(row: {
  shortName: string;
  displayName: string;
  href: string;
  optionalAdoption: string;
  obtain: string;
  maintain: string;
  graceEnds: string;
}): string {
  return `| [${row.displayName}](${row.href}) | ${row.optionalAdoption} | ${row.obtain} | ${row.maintain} | ${row.graceEnds} |`;
}

function taggedDocumentSummaryRowMarkdown(row: {
  label: string;
  href: string;
  summary: string;
  applicableRuleCount: number;
}): string {
  return `| [**${row.label}**](${row.href}) | ${row.summary} |`;
}

function taggedDocumentSummaryStatsMarkdown(artifact: ArtifactForTest): string {
  const stats = artifact.context.taggedDocumentSummaryStats;
  if (!stats) {
    throw new Error(
      `Expected ${artifact.relativePath} to include tagged summary stats.`,
    );
  }

  return `!!! tip "There are ${stats.rulesetCount} applicable rulesets with ${stats.ruleCount} total applicable rules."`;
}

function expectDeadlineRowsFromArtifact(
  contents: string,
  artifact: ArtifactForTest,
  description: string,
): void {
  const expectedRows = artifact.context.deadlineTables.flatMap((table) =>
    table.rows.map(deadlineRowMarkdown),
  );
  expect(expectedRows.length).toBeGreaterThan(0);

  expectTextOrder(contents, expectedRows, description);
}

function expectTaggedDocumentSummaryRowsFromArtifact(
  contents: string,
  artifact: ArtifactForTest,
  description: string,
): void {
  const expectedRows = artifact.context.taggedDocumentSummaryRows.map(
    taggedDocumentSummaryRowMarkdown,
  );
  expect(expectedRows.length).toBeGreaterThan(0);

  expectTextOrder(contents, expectedRows, description);
}

function expectTaggedDocumentSummaryStatsFromArtifact(
  contents: string,
  artifact: ArtifactForTest,
  description: string,
): void {
  expectWithFailureSummary(description, () => {
    expect(contents).toContain(taggedDocumentSummaryStatsMarkdown(artifact));
  });
}

function testRequirementDocument(options: {
  name: string;
  shortName: string;
  webName: string;
  affects: string[];
}): RequirementDocumentForTest {
  return {
    info: {
      name: options.name,
      short_name: options.shortName,
      web_name: options.webName,
      status: "stable",
      effective: {
        is: "required",
        date: {
          obtain: "2026-01-01",
          maintain: "2026-02-01",
          optional_adoption: "2025-12-01",
          grace: {
            default: "2026-03-01",
            until_next_assessment: false,
          },
        },
      },
    },
    data: {
      all: {
        GEN: {
          [`${options.shortName}-GEN-ONE`]: {
            name: "Synthetic Requirement",
            statement: "Synthetic requirement used by tests.",
            affects: options.affects,
          },
        },
      },
    },
  };
}

async function git(args: string[], cwd = REPO_ROOT): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout.trim();
}

async function optionalGit(
  args: string[],
  cwd = REPO_ROOT,
): Promise<string | null> {
  try {
    return await git(args, cwd);
  } catch {
    return null;
  }
}

async function expectedRulesHead(
  rulesPath: string,
  branch: string,
): Promise<{ head: string; source: string }> {
  const shouldCheckRemote =
    process.env.CI === "true" || process.env.CHECK_RULES_REMOTE === "1";

  if (!shouldCheckRemote) {
    const localRemoteHead = await optionalGit(
      ["rev-parse", "--verify", `refs/remotes/origin/${branch}`],
      rulesPath,
    );
    if (localRemoteHead) {
      return {
        head: localRemoteHead,
        source: `local origin/${branch}`,
      };
    }
  }

  const latestRemoteRef = await git([
    "ls-remote",
    RULES_REMOTE_URL,
    `refs/heads/${branch}`,
  ]);
  const latestRemoteHead = latestRemoteRef.split(/\s+/)[0];
  if (!latestRemoteHead) {
    throw new Error(`Could not resolve ${RULES_REMOTE_URL} ${branch}.`);
  }

  return {
    head: latestRemoteHead,
    source: `${RULES_REMOTE_URL} ${branch}`,
  };
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited from signal ${signal}`));
        return;
      }

      if (code && code !== 0) {
        const details = [stderr.trim(), stdout.trim()]
          .filter(Boolean)
          .join("\n\n");
        reject(
          new Error(
            `${command} ${args.join(" ")} exited with code ${code}${
              details ? `\n\n${details}` : ""
            }`,
          ),
        );
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

async function runCommandWithSpinner(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> {
  if (!process.stderr.isTTY) {
    return runCommand(command, args, cwd);
  }

  const spinnerFrames = ["-", "\\", "|", "/"];
  let frameIndex = 0;
  const renderSpinner = () => {
    const frame = spinnerFrames[frameIndex % spinnerFrames.length];
    frameIndex++;
    process.stderr.write(`\rRunning build pipeline ${frame}`);
  };

  renderSpinner();
  const spinner = setInterval(renderSpinner, 120);

  try {
    return await runCommand(command, args, cwd);
  } finally {
    clearInterval(spinner);
    process.stderr.write("\r\x1b[2K");
  }
}

async function listRelativeFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(root, entry.name);

      if (entry.isDirectory()) {
        const childFiles = await listRelativeFiles(entryPath);
        return childFiles.map((childFile) =>
          path.join(entry.name, childFile),
        );
      }

      if (entry.isFile()) {
        return [entry.name];
      }

      return [];
    }),
  );

  return files.flat().map((filePath) => filePath.split(path.sep).join("/"));
}

interface ManualSrcContentDrift {
  relativePath: string;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function stripGeneratedManualPageAdornments(contents: string): string {
  const lines = contents.replace(/\r\n?/g, "\n").split("\n");
  const outputLines: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (/^<span class="picto">.+<\/span>$/.test(trimmed)) {
      continue;
    }

    if (trimmed === '??? info inline end "Page Info"') {
      while (
        index + 1 < lines.length &&
        (lines[index + 1] === "" || /^\s/.test(lines[index + 1] ?? ""))
      ) {
        index++;
      }
      continue;
    }

    outputLines.push(line);
  }

  return outputLines.join("\n");
}

function normalizeManualMarkdownForComparison(contents: string): string {
  return `${stripGeneratedManualPageAdornments(contents)
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()}\n`;
}

async function findManualSrcContentDrift(
  srcRoot: string,
  contentRoot: string,
): Promise<ManualSrcContentDrift[]> {
  const srcMarkdownPaths = (await listRelativeFiles(srcRoot))
    .filter((relativePath) => relativePath.endsWith(".md"))
    .sort();
  const drift: ManualSrcContentDrift[] = [];

  for (const relativePath of srcMarkdownPaths) {
    const srcPath = path.join(srcRoot, relativePath);
    const contentPath = path.join(contentRoot, relativePath);
    if (!(await fileExists(contentPath))) {
      continue;
    }

    const srcContents = normalizeManualMarkdownForComparison(
      await readFile(srcPath, "utf8"),
    );
    const contentContents = normalizeManualMarkdownForComparison(
      await readFile(contentPath, "utf8"),
    );

    if (srcContents !== contentContents) {
      drift.push({ relativePath });
    }
  }

  return drift;
}

function markdownToHtmlPath(htmlRoot: string, relativePath: string): string {
  const parsedPath = path.posix.parse(relativePath);
  const directoryParts = parsedPath.dir ? parsedPath.dir.split("/") : [];

  if (parsedPath.name === "index") {
    return path.join(htmlRoot, ...directoryParts, "index.html");
  }

  return path.join(htmlRoot, ...directoryParts, parsedPath.name, "index.html");
}

function markdownPathsInZensicalConfig(source: string): string[] {
  return Array.from(
    new Set(
      Array.from(source.matchAll(/"([^"]+\.md)"/g), (match) => match[1])
        .filter((relativePath): relativePath is string => Boolean(relativePath))
        .sort(),
    ),
  );
}

interface ZensicalNavLocation {
  sectionHref?: string;
  sectionLabel: string;
}

function navLocationsInZensicalConfig(
  source: string,
): Map<string, ZensicalNavLocation> {
  const locationByPath = new Map<string, ZensicalNavLocation>();
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

      if (!locationByPath.has(relativePath)) {
        locationByPath.set(relativePath, {
          sectionHref: sectionHrefByLabel.get(currentSectionLabel),
          sectionLabel: currentSectionLabel,
        });
      }
    }
  }

  return locationByPath;
}

function expectedTodoLocationFromZensicalConfig(
  zensicalConfig: string,
  pageTitle: string,
  relativePath: string,
): string {
  const location = navLocationsInZensicalConfig(zensicalConfig).get(relativePath);
  if (!location) {
    throw new Error(`${relativePath} must be linked in zensical.toml`);
  }

  const sectionLink = location.sectionHref
    ? `[${location.sectionLabel}](${location.sectionHref})`
    : location.sectionLabel;

  return `${sectionLink} :lucide-circle-arrow-out-down-right:<br> [${pageTitle}](${relativePath})`;
}

async function findBoldMarkdownHeadingWarnings(root: string): Promise<string[]> {
  const markdownPaths = (await listRelativeFiles(root))
    .filter((relativePath) => relativePath.endsWith(".md"))
    .sort();
  const warnings: string[] = [];
  const boldHeadingPattern = /^#{1,6}\s+\*\*.+\*\*\s*(?:#+\s*)?$/;

  for (const relativePath of markdownPaths) {
    const contents = await readFile(path.join(root, relativePath), "utf8");
    const lines = contents.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (boldHeadingPattern.test(line.trim())) {
        warnings.push(`${relativePath}:${index + 1}: ${line.trim()}`);
      }
    });
  }

  return warnings;
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

function pictoFrontmatterValue(
  contents: string,
): { source?: string; status?: string } | null {
  const frontmatter = frontmatterLines(contents);
  if (!frontmatter) {
    return null;
  }

  const pictoIndex = frontmatter.findIndex(
    (line) => line.trim() === "picto:",
  );
  if (pictoIndex === -1) {
    return null;
  }

  const value: { source?: string; status?: string } = {};
  for (let index = pictoIndex + 1; index < frontmatter.length; index++) {
    const line = frontmatter[index];
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

function validateRequiredContentFrontmatter(
  relativePath: string,
  contents: string,
): string | null {
  const frontmatter = frontmatterLines(contents);
  if (!frontmatter) {
    return `${relativePath}: missing yaml frontmatter`;
  }

  const declaredKeys = new Set(
    frontmatter
      .map((line) => line.match(/^([A-Za-z0-9_-]+):(?:\s|$)/)?.[1])
      .filter((key): key is string => Boolean(key)),
  );
  const missingKeys = ["description", "purpose", "google_doc"].filter(
    (key) => !declaredKeys.has(key),
  );

  if (!missingKeys.length) {
    return null;
  }

  return `${relativePath}: missing ${missingKeys.join(", ")}`;
}

function validateNonEmptyContentFrontmatter(
  relativePath: string,
  contents: string,
): string | null {
  const frontmatter = frontmatterLines(contents);
  if (!frontmatter) {
    return null;
  }

  const emptyKeys = ["description", "purpose"].filter((key) => {
    const line = frontmatter.find((frontmatterLine) =>
      frontmatterLine.match(new RegExp(`^${key}:`)),
    );
    if (!line) {
      return false;
    }

    const value = line.slice(line.indexOf(":") + 1).trim();
    return value === "" || value === '""' || value === "''";
  });

  if (!emptyKeys.length) {
    return null;
  }

  return `${relativePath}: empty ${emptyKeys.join(", ")}`;
}

function validatePictographFrontmatter(
  relativePath: string,
  contents: string,
  config: ToolConfig,
): string | null {
  const picto = pictoFrontmatterValue(contents);
  if (!picto) {
    return `${relativePath}: missing picto frontmatter`;
  }

  const knownSources = new Set(Object.keys(config.pictographs.source));
  const knownStatuses = new Set(Object.keys(config.pictographs.status));

  if (!picto.source) {
    return `${relativePath}: missing picto.source`;
  }

  if (!knownSources.has(picto.source)) {
    return `${relativePath}: unknown picto.source "${picto.source}"`;
  }

  if (!picto.status) {
    return `${relativePath}: missing picto.status`;
  }

  if (!knownStatuses.has(picto.status)) {
    return `${relativePath}: unknown picto.status "${picto.status}"`;
  }

  return null;
}

async function findContentPictographWarnings(
  root: string,
  config: ToolConfig,
): Promise<string[]> {
  const markdownPaths = (await listRelativeFiles(root))
    .filter((relativePath) => relativePath.endsWith(".md"))
    .sort();
  const warnings: string[] = [];

  for (const relativePath of markdownPaths) {
    const contents = await readFile(path.join(root, relativePath), "utf8");
    const warning = validatePictographFrontmatter(
      relativePath,
      contents,
      config,
    );
    if (warning) {
      warnings.push(warning);
    }
  }

  return warnings;
}

async function findContentFrontmatterWarnings(root: string): Promise<string[]> {
  const markdownPaths = (await listRelativeFiles(root))
    .filter((relativePath) => relativePath.endsWith(".md"))
    .sort();
  const warnings: string[] = [];

  for (const relativePath of markdownPaths) {
    const contents = await readFile(path.join(root, relativePath), "utf8");
    const warning = validateRequiredContentFrontmatter(relativePath, contents);
    if (warning) {
      warnings.push(warning);
    }
  }

  return warnings;
}

async function findEmptyContentFrontmatterWarnings(
  root: string,
): Promise<string[]> {
  const markdownPaths = (await listRelativeFiles(root))
    .filter(
      (relativePath) =>
        relativePath.endsWith(".md") && !relativePath.startsWith("authority/"),
    )
    .sort();
  const warnings: string[] = [];

  for (const relativePath of markdownPaths) {
    const contents = await readFile(path.join(root, relativePath), "utf8");
    const warning = validateNonEmptyContentFrontmatter(relativePath, contents);
    if (warning) {
      warnings.push(warning);
    }
  }

  return warnings;
}

function generatedMappingStatusFailures(config: ToolConfig): string[] {
  const configuredStatuses = new Set(Object.keys(config.pictographs.status));
  const generatedMappingGroups: Array<
    [string, Array<{ id?: unknown; status?: unknown }>]
  > = [
    ["todo", config.generated.todo ? [config.generated.todo] : []],
    ["definitionDocuments", config.generated.definitionDocuments ?? []],
    ["ksiDocuments", config.generated.ksiDocuments ?? []],
    ["deadlineDocuments", config.generated.deadlineDocuments ?? []],
    ["taggedDocumentSummaries", config.generated.taggedDocumentSummaries ?? []],
    ["referenceIndexDocuments", config.generated.referenceIndexDocuments ?? []],
    ["frrCollectionDocuments", config.generated.frrCollectionDocuments ?? []],
    ["ruleDocuments", config.generated.ruleDocuments],
  ];
  const failures: string[] = [];

  for (const [groupName, mappings] of generatedMappingGroups) {
    mappings.forEach((mapping, index) => {
      const mappingLabel =
        typeof mapping.id === "string" ? mapping.id : "unknown mapping";

      if (typeof mapping.status !== "string") {
        failures.push(
          `generated.${groupName}[${index}] (${mappingLabel}) is missing status`,
        );
        return;
      }

      if (!configuredStatuses.has(mapping.status)) {
        failures.push(
          `generated.${groupName}[${index}] (${mappingLabel}) uses unknown status "${mapping.status}"`,
        );
      }
    });
  }

  return failures;
}

function pictographTooltipFailures(config: ToolConfig): string[] {
  const failures: string[] = [];
  const tooltipKeys = [
    ...Object.keys(config.pictographs.source),
    ...Object.keys(config.pictographs.status),
  ] as Array<keyof ToolConfig["pictographs"]["tooltips"]>;

  for (const key of tooltipKeys) {
    if (!config.pictographs.tooltips[key]?.trim()) {
      failures.push(`pictographs.tooltips.${key} is missing or empty`);
    }
  }

  return failures;
}

describe("build-markdown", () => {
  test("the consolidated rules source exists", async () => {
    await access(RULES_FILE);
  });

  test("generated config mappings declare known statuses", async () => {
    const config = await loadToolConfig();
    const failures = generatedMappingStatusFailures(config);
    const statusFailureSummary = [
      "Generated markdown mappings in tools/config.json must declare a status from pictographs.status.",
      ...failures,
    ].join("\n");

    expectWithFailureSummary(statusFailureSummary, () => {
      expect(failures, statusFailureSummary).toEqual([]);
    });
  });

  test("pictographs declare tooltips", async () => {
    const config = await loadToolConfig();
    const failures = pictographTooltipFailures(config);
    const tooltipFailureSummary = [
      "Pictographs in tools/config.json must declare matching tooltips.",
      ...failures,
    ].join("\n");

    expectWithFailureSummary(tooltipFailureSummary, () => {
      expect(failures, tooltipFailureSummary).toEqual([]);
    });
  });

  test("the consolidated rules source matches the bundled schema", async () => {
    const schema = await readJson<AnySchema>(RULES_SCHEMA_FILE);
    const rules = await readJson<unknown>(RULES_FILE);
    const ajv = new Ajv2020({ allErrors: true });
    addFormats(ajv);

    const validate = ajv.compile(schema);
    const valid = validate(rules);
    const schemaFailureSummary = [
      `${path.relative(REPO_ROOT, RULES_FILE)} does not match ${path.relative(
        REPO_ROOT,
        RULES_SCHEMA_FILE,
      )}.`,
      ajv.errorsText(validate.errors, { separator: "\n" }),
    ].join("\n");

    expectWithFailureSummary(schemaFailureSummary, () => {
      expect(valid, schemaFailureSummary).toBe(true);
    });
  });

  test("the rules submodule is synced to an allowed upstream branch", async () => {
    const rulesPath = resolveToolPath("rules");
    const [siteBranch, rulesBranch, localHead] = await Promise.all([
      git(["rev-parse", "--abbrev-ref", "HEAD"]),
      git(["rev-parse", "--abbrev-ref", "HEAD"], rulesPath),
      git(["rev-parse", "HEAD"], rulesPath),
    ]);
    const usesDefaultRulesBranch =
      rulesBranch === "HEAD" || rulesBranch === DEFAULT_RULES_REMOTE_BRANCH;
    const expectedRulesBranch = usesDefaultRulesBranch
      ? DEFAULT_RULES_REMOTE_BRANCH
      : rulesBranch;

    if (
      !usesDefaultRulesBranch &&
      (siteBranch === "HEAD" || siteBranch === DEFAULT_RULES_REMOTE_BRANCH)
    ) {
      const branchFailureSummary = [
        `tools/rules is synced to ${RULES_REMOTE_URL} ${rulesBranch}, but non-${DEFAULT_RULES_REMOTE_BRANCH} rules branches are only allowed from a site working branch.`,
        `Check out a site branch before syncing rules to ${rulesBranch}, or run "bun run sync" from tools/ to use ${DEFAULT_RULES_REMOTE_BRANCH}.`,
        `Site branch: ${siteBranch}`,
        `Rules branch: ${rulesBranch}`,
      ].join("\n");

      expectWithFailureSummary(branchFailureSummary, () => {
        expect(siteBranch, branchFailureSummary).not.toBe("HEAD");
        expect(siteBranch, branchFailureSummary).not.toBe(
          DEFAULT_RULES_REMOTE_BRANCH,
        );
      });
    }

    const expectedHead = await expectedRulesHead(rulesPath, expectedRulesBranch);

    const syncFailureSummary = [
      `tools/rules is not synced to ${expectedHead.source}.`,
      `Run "${
        expectedRulesBranch === DEFAULT_RULES_REMOTE_BRANCH
          ? "bun run sync"
          : `bun run sync ${expectedRulesBranch}`
      }" from tools/ and commit the updated submodule pointer.`,
      `Site branch: ${siteBranch}`,
      `Rules branch: ${rulesBranch}`,
      `Local HEAD: ${localHead}`,
      `Expected HEAD: ${expectedHead.head}`,
    ].join("\n");

    if (usesDefaultRulesBranch) {
      if (localHead !== expectedHead.head) {
        rulesSubmoduleSyncWarnings.push(syncFailureSummary);
      }
      expect(Array.isArray(rulesSubmoduleSyncWarnings)).toBe(true);
      return;
    }

    expectWithFailureSummary(syncFailureSummary, () => {
      expect(localHead, syncFailureSummary).toBe(expectedHead.head);
    });
  });

  test("builds configured markdown files from the JSON source", async () => {
    const config = await loadToolConfig();
    const rules = await loadRules(config);
    const expectedArtifacts = collectArtifacts(rules, config);

    await deploy();
    const summary = await buildMarkdown();
    expect(summary.artifactCount).toBe(expectedArtifacts.length);

    const relativePaths = summary.artifacts
      .map((artifact) => artifact.relativePath)
      .sort();
    expect(relativePaths).toEqual(
      expectedArtifacts.map((artifact) => artifact.relativePath).sort(),
    );
    for (const mapping of config.generated.definitionDocuments ?? []) {
      expect(relativePaths).toContain(mapping.output);
    }
    for (const mapping of config.generated.referenceIndexDocuments ?? []) {
      expect(relativePaths).toContain(mapping.output);
    }
    for (const mapping of config.generated.frrCollectionDocuments ?? []) {
      expect(relativePaths).toContain(mapping.output);
    }
    for (const mapping of config.generated.taggedDocumentSummaries ?? []) {
      expect(relativePaths).toContain(mapping.output);
    }

    for (const mapping of config.generated.deadlineDocuments ?? []) {
      for (const artifact of artifactsWithMappingId(expectedArtifacts, mapping.id)) {
        expect(relativePaths).toContain(artifact.relativePath);
      }
    }

    for (const mapping of config.generated.ksiDocuments ?? []) {
      const artifacts = artifactsWithMappingId(expectedArtifacts, mapping.id);
      expect(artifacts.length).toBeGreaterThan(0);
      for (const artifact of artifacts) {
        expect(relativePaths).toContain(artifact.relativePath);
      }
    }

    for (const mapping of config.generated.ruleDocuments) {
      const artifacts = artifactsWithMappingId(expectedArtifacts, mapping.id);
      expect(artifacts.length).toBeGreaterThan(0);
      for (const artifact of artifacts) {
        expect(relativePaths).toContain(artifact.relativePath);
      }
    }

    const referenceArtifactPaths = relativePaths.filter((relativePath) =>
      relativePath.startsWith("reference/"),
    );
    expect(referenceArtifactPaths).toHaveLength(
      expectedArtifacts.filter((artifact) =>
        artifact.relativePath.startsWith("reference/"),
      ).length,
    );

    for (const artifact of expectedArtifacts) {
      await access(artifact.outputPath);
      const contents = await readFile(artifact.outputPath, "utf8");

      expect(contents).toContain(`# ${artifact.title}`);
      expect(contents.trim().length).toBeGreaterThan(0);
    }

    const referenceIndexArtifact = artifactOfType(
      expectedArtifacts,
      "FRR_REFERENCE_INDEX",
    );
    const referenceIndexContents = await readGeneratedArtifact(
      referenceIndexArtifact,
    );
    expect(referenceIndexContents).toStartWith(
      [
        "---",
        `title: ${JSON.stringify(referenceIndexArtifact.title)}`,
        `description: ${JSON.stringify(referenceIndexArtifact.context.description ?? "")}`,
        `purpose: ${JSON.stringify(referenceIndexArtifact.context.purpose ?? "")}`,
        'google_doc: ""',
        "picto:",
        "  source: machine",
        `  status: ${referenceIndexArtifact.context.pictoStatus}`,
        "---",
        "",
        referenceIndexArtifact.context.statusSpan ?? "",
        "",
        '??? info inline end "Page Info"',
        "",
        `    **Description:** ${referenceIndexArtifact.context.description ?? ""}`,
        "    ",
        `    **Purpose:** ${referenceIndexArtifact.context.purpose ?? ""}`,
        "",
        `# ${referenceIndexArtifact.title}`,
      ].join("\n"),
    );
    for (const paragraph of referenceIndexArtifact.context.purposeParagraphs) {
      expect(referenceIndexContents).toContain(paragraph);
    }
    expectTextOrder(
      referenceIndexContents,
      [
        `# ${referenceIndexArtifact.title}`,
        referenceIndexArtifact.context.purposeParagraphs[0] ?? "",
        "| Acronym | Ruleset | Status | Counts | Most Recently Updated |",
      ],
      "Generated reference index should place configured introduction before the table",
    );
    expect(referenceIndexContents).toContain(
      "| Acronym | Ruleset | Status | Counts | Most Recently Updated |",
    );
    expectTextOrder(
      referenceIndexContents,
      expectedReferenceIndexRows(rules),
      "Generated reference index should render source-derived rows in acronym order",
    );

    const effectiveDateArtifact = firstArtifactMatching(
      expectedArtifacts,
      (artifact) => artifact.context.effectiveEntries.length > 0,
      "an artifact with effective-date entries",
    );
    const effectiveDateContents = await readGeneratedArtifact(effectiveDateArtifact);
    const effectiveDateTexts = effectiveDateArtifact.context.effectiveEntries.flatMap(
      (entry) => [
        `!!! info "Effective Date(s) & Overall Applicability for ${entry.audienceLabel}"`,
        `- **${entry.statusLabel}**`,
        ...entry.dateLines.map((line) => `- **${line.label}:** ${line.value}`),
        ...entry.classLines.map((line) => `- **${line.label}:** ${line.value}`),
      ],
    );
    expectTextOrder(
      effectiveDateContents,
      effectiveDateTexts,
      "Generated effective-date metadata should render source-derived dates",
    );
    expect(effectiveDateContents).not.toContain("[object Object]");

    const definitionsArtifact = artifactOfType(expectedArtifacts, "FRD");
    const definitionsContents = await readGeneratedArtifact(definitionsArtifact);
    const definitionsPurpose = rules.FRD.info.purpose;
    const definitionHeaders = Array.from(
      definitionsContents.matchAll(/^## (.+)$/gm),
      (match) => match[1],
    ).filter((heading) => heading !== "Important Related Terms");
    const definitionTerms = Object.values(rules.FRD.data.all ?? {})
      .map((entry) => entry.term)
      .sort((left, right) => left.localeCompare(right));
    const relatedTermRows = expectedImportantRelatedTermRows(rules);
    const definitionIntroOrder = [
      "# FedRAMP Definitions",
      definitionsPurpose ?? "",
    ];
    if (relatedTermRows.length) {
      definitionIntroOrder.push(
        "## Important Related Terms",
        "| Related Terms Group | Terms |",
      );
    }
    if (definitionTerms[0]) {
      definitionIntroOrder.push(`## ${definitionTerms[0]}`);
    }

    expect(definitionsPurpose).toBeTruthy();
    expect(definitionsContents).toStartWith(
      `---\ntags:\n  - 20x\n  - Rev5\n---\n\n${definitionsArtifact.context.statusSpan}\n\n# ${definitionsArtifact.title}`,
    );
    expectTextOrder(
      definitionsContents,
      definitionIntroOrder,
      "Generated FRD markdown should place info.purpose and related terms table before the definitions",
    );
    expect(definitionsContents).not.toContain("**Subsets**");
    expect(definitionsContents).not.toContain(
      '??? abstract "Background & Authority"',
    );
    expect(definitionsContents).not.toContain("Effective Date(s)");
    expect(definitionsContents).not.toContain("Overall Applicability");
    expect(definitionsContents).toContain('!!! quote ""');
    expect(definitionsContents).not.toContain("## General Terms");
    expect(definitionsContents).not.toContain("## Related Terms:");
    for (const row of relatedTermRows) {
      expect(definitionsContents).toContain(row);
    }
    const firstTaggedDefinition = Object.values(rules.FRD.data.all ?? {}).find(
      (entry) => entry.tag?.trim(),
    );
    if (firstTaggedDefinition?.tag) {
      expect(definitionsContents).toContain(
        `**Related Terms Group:** [${firstTaggedDefinition.tag}](#${relatedTermsGroupAnchorId(
          firstTaggedDefinition.tag,
        )})`,
      );
    }
    expect(definitionHeaders).toEqual(definitionTerms);

    const ksiThemeArtifact = firstArtifactMatching(
      expectedArtifacts,
      (artifact) =>
        artifact.documentType === "KSI" && artifact.context.indicators.length > 0,
      "a theme-based KSI artifact",
    );
    const ksiThemeContents = await readGeneratedArtifact(ksiThemeArtifact);
    const ksiThemeIndicator = ksiThemeArtifact.context.indicators[0];
    if (!ksiThemeIndicator) {
      throw new Error(
        `Expected ${ksiThemeArtifact.relativePath} to include a KSI indicator.`,
      );
    }
    expect(ksiThemeContents).toStartWith(
      `---\ntags:\n  - 20x\n---\n\n${ksiThemeArtifact.context.statusSpan}\n\n# ${ksiThemeArtifact.title}`,
    );
    expect(ksiThemeContents).not.toContain("**Subsets**");
    expect(ksiThemeContents).toContain(ksiThemeIndicator.id);
    expect(ksiThemeContents).toContain(`### ${ksiThemeIndicator.title}`);
    if (ksiThemeIndicator.controlLinks[0]) {
      const control = ksiThemeIndicator.controlLinks[0];
      expect(ksiThemeContents).toContain("**Related SP 800-53 Controls:**");
      expect(ksiThemeContents).toContain(`[${control.label}](${control.url})`);
    }

    const ksiReferenceArtifact = firstArtifactMatching(
      expectedArtifacts,
      (artifact) =>
        artifact.documentType === "KSI" && artifact.context.sections.length > 0,
      "a grouped KSI reference artifact",
    );
    const ksiReferenceContents = await readGeneratedArtifact(ksiReferenceArtifact);
    const firstKsiSection = ksiReferenceArtifact.context.sections[0];
    const firstKsiSectionRequirement = firstKsiSection?.requirements[0];
    if (!firstKsiSection || !firstKsiSectionRequirement) {
      throw new Error(
        `Expected ${ksiReferenceArtifact.relativePath} to include grouped KSI indicators.`,
      );
    }
    expect(ksiReferenceContents).toStartWith(
      `---\ntags:\n  - 20x\n---\n\n${ksiReferenceArtifact.context.statusSpan}\n\n# ${ksiReferenceArtifact.title}`,
    );
    expect(ksiReferenceContents).not.toContain("**Subsets**");
    expectTextOrder(
      ksiReferenceContents,
      [
        `# ${ksiReferenceArtifact.title}`,
        `## ${firstKsiSection.title}`,
        `### ${firstKsiSectionRequirement.title}`,
        firstKsiSectionRequirement.id,
      ],
      "Generated KSI reference markdown should group indicators by source theme",
    );

    for (const deadlineArtifact of artifactsOfType(expectedArtifacts, "DEADLINES")) {
      const deadlineContents = await readGeneratedArtifact(deadlineArtifact);
      expect(deadlineContents).toContain(`# ${deadlineArtifact.title}`);
      expect(deadlineContents).toContain(
        "| Ruleset | Optional Adoption | Obtain | Maintain | Grace Ends |",
      );
      expectDeadlineRowsFromArtifact(
        deadlineContents,
        deadlineArtifact,
        `Generated deadline markdown should render source-derived rows for ${deadlineArtifact.relativePath}`,
      );
    }

    for (const summaryArtifact of artifactsOfType(
      expectedArtifacts,
      "FRR_TAGGED_SUMMARY",
    )) {
      const summaryContents = await readGeneratedArtifact(summaryArtifact);
      expect(summaryContents).toContain(`# ${summaryArtifact.title}`);
      expectTaggedDocumentSummaryStatsFromArtifact(
        summaryContents,
        summaryArtifact,
        `Generated tagged summary should render aggregate stats for ${summaryArtifact.relativePath}`,
      );

      if (summaryArtifact.context.taggedDocumentSummaryRows.length) {
        expect(summaryContents).toContain("| Ruleset | Summary |");
        expect(summaryContents).toContain("<br><br>**Applicable Rules:**");
        expectTaggedDocumentSummaryRowsFromArtifact(
          summaryContents,
          summaryArtifact,
          `Generated tagged summary should render source-derived rows for ${summaryArtifact.relativePath}`,
        );
      } else {
        expect(summaryContents).toContain("No matching rules are currently available.");
      }
    }

    for (const artifact of artifactsOfType(expectedArtifacts, "FRR")) {
      const contents = await readGeneratedArtifact(artifact);
      for (const section of artifact.context.sections) {
        expect(contents).toContain(`## ${section.title}`);
        const requirement = section.requirements[0];
        if (requirement) {
          expect(contents).toContain(requirement.id);
          expect(contents).toContain(`### ${requirement.title}`);
        }
      }
    }

    const workflowArtifact = firstArtifactMatching(
      expectedArtifacts,
      (artifact) => artifact.context.flows.length > 0,
      "an FRR artifact with an activity workflow",
    );
    const workflowContents = await readGeneratedArtifact(workflowArtifact);
    const workflow = workflowArtifact.context.flows[0];
    if (!workflow) {
      throw new Error(`Expected ${workflowArtifact.relativePath} to include a workflow.`);
    }
    expect(workflowContents).toContain(`## Activity Workflow: ${workflow.title}`);
    expect(workflowContents).toContain("``` mermaid");
    for (const line of workflow.mermaidLines) {
      expect(workflowContents).toContain(line);
    }

    const schemaArtifact = firstArtifactMatching(
      expectedArtifacts,
      (artifact) =>
        artifact.context.sections.some((section) =>
          section.requirements.some((requirement) => requirement.schema),
        ),
      "an FRR artifact with related JSON schema metadata",
    );
    const schemaContents = await readGeneratedArtifact(schemaArtifact);
    const schemaRequirement = schemaArtifact.context.sections
      .flatMap((section) => section.requirements)
      .find((requirement) => requirement.schema);
    if (!schemaRequirement?.schema) {
      throw new Error(`Expected ${schemaArtifact.relativePath} to include schema metadata.`);
    }
    expectTextOrder(
      schemaContents,
      [
        `### ${schemaRequirement.title}`,
        `!!! schema "Related JSON Schema: [${schemaRequirement.schema.name}](${schemaRequirement.schema.url})"`,
        '!!! quote ""',
      ],
      "Generated requirement markdown should place related JSON schema metadata before the statement",
    );

    const notificationArtifact = firstArtifactMatching(
      expectedArtifacts,
      (artifact) =>
        artifact.context.sections.some((section) =>
          section.requirements.some(
            (requirement) => requirement.notifications.length > 0,
          ),
        ),
      "an FRR artifact with notification metadata",
    );
    const notificationContents = await readGeneratedArtifact(notificationArtifact);
    const notificationRequirement = notificationArtifact.context.sections
      .flatMap((section) => section.requirements)
      .find((requirement) => requirement.notifications.length > 0);
    const notification = notificationRequirement?.notifications[0];
    if (!notification) {
      throw new Error(
        `Expected ${notificationArtifact.relativePath} to include notification metadata.`,
      );
    }
    expect(notificationContents).toContain(
      `Notify ${notification.party} by ${notification.method} using ${notification.target}.`,
    );

    const referenceArtifact = firstArtifactMatching(
      expectedArtifacts,
      (artifact) =>
        artifact.context.sections.some((section) =>
          section.requirements.some((requirement) => requirement.reference),
        ),
      "an FRR artifact with a requirement reference link",
    );
    const referenceContents = await readGeneratedArtifact(referenceArtifact);
    const referenceRequirement = referenceArtifact.context.sections
      .flatMap((section) => section.requirements)
      .find((requirement) => requirement.reference);
    if (!referenceRequirement?.reference) {
      throw new Error(
        `Expected ${referenceArtifact.relativePath} to include reference metadata.`,
      );
    }
    expect(referenceContents).toContain(
      `**Reference:** [${referenceRequirement.reference.label}](${referenceRequirement.reference.url})`,
    );

    const frrCollectionMapping = config.generated.frrCollectionDocuments?.[0];
    if (frrCollectionMapping) {
      const frrCollectionArtifact = artifactWithMappingId(
        expectedArtifacts,
        frrCollectionMapping.id,
      );
      const frrCollectionContents =
        await readGeneratedArtifact(frrCollectionArtifact);
      const frrCollectionRequirement =
        firstRequirementInArtifact(frrCollectionArtifact);
      expect(frrCollectionContents).not.toContain("Effective Date(s)");
      expect(frrCollectionContents).not.toContain("Activity Workflow");
      expect(frrCollectionContents).not.toContain("``` mermaid");
      expect(frrCollectionContents).toContain(frrCollectionRequirement.id);
    }

    const contentDefinitionsPath = path.join(
      resolveToolPath(config.paths.content),
      "definitions.md",
    );
    await expect(access(contentDefinitionsPath)).rejects.toThrow();
  });

  test("ignores configured rule documents after resolving the source selection", async () => {
    const config = await loadToolConfig();
    const rules = structuredClone(await loadRules(config));
    rules.FRR = {
      INCLUDED: testRequirementDocument({
        name: "Included Synthetic Ruleset",
        shortName: "INC",
        webName: "included-synthetic-ruleset",
        affects: ["Assessors"],
      }),
      IGNORED: testRequirementDocument({
        name: "Ignored Synthetic Ruleset",
        shortName: "IGN",
        webName: "ignored-synthetic-ruleset",
        affects: ["Assessors"],
      }),
    };
    const artifacts = collectArtifacts(rules, {
      ...config,
      generated: {
        ...config.generated,
        definitionDocuments: [],
        ksiDocuments: [],
        deadlineDocuments: [],
        taggedDocumentSummaries: [],
        referenceIndexDocuments: [],
        frrCollectionDocuments: [],
        ruleDocuments: [
          {
            id: "assessor-20x-with-ignored-marketplace",
            output: "assessors/20x/rules/{FRR}.md",
            outputMode: "documents",
            status: "placeholder",
            emptyBehavior: "skip",
            source: {
              collection: "FRR",
              documents: "ALL",
              ignoreDocuments: ["IGNORED"],
              types: ["20x"],
              affects: ["Assessors"],
              includeAll: true,
              allPosition: "first",
            },
          },
        ],
      },
    });

    expect(
      artifacts.some((artifact) => artifact.sourceDocument === "IGNORED"),
    ).toBe(false);
    expect(
      artifacts.some(
        (artifact) =>
          artifact.relativePath ===
          "assessors/20x/rules/ignored-synthetic-ruleset.md",
      ),
    ).toBe(false);
  });

  test("expands source.types \"all\" to common, 20x, and Rev5 rule content", async () => {
    const config = await loadToolConfig();
    const rules = structuredClone(await loadRules(config));
    const syntheticDocument = testRequirementDocument({
      name: "Synthetic Ruleset",
      shortName: "SYN",
      webName: "synthetic-ruleset",
      affects: ["Providers"],
    });
    syntheticDocument.info["20x"] = {
      subsets: {
        TYP: {
          name: "20x Rules",
          description: "Rules specific to 20x.",
        },
      },
    };
    syntheticDocument.info.rev5 = {
      subsets: {
        TYP: {
          name: "Rev5 Rules",
          description: "Rules specific to Rev5.",
        },
      },
    };
    syntheticDocument.data["20x"] = {
      TYP: {
        "SYN-20X-ONE": {
          name: "20x Synthetic Requirement",
          statement: "Synthetic 20x requirement used by tests.",
          affects: ["Providers"],
        },
      },
    };
    syntheticDocument.data.rev5 = {
      TYP: {
        "SYN-REV5-ONE": {
          name: "Rev5 Synthetic Requirement",
          statement: "Synthetic Rev5 requirement used by tests.",
          affects: ["Providers"],
        },
      },
    };
    rules.FRR = {
      SYN: syntheticDocument,
    };

    const artifacts = collectArtifacts(rules, {
      ...config,
      generated: {
        ...config.generated,
        definitionDocuments: [],
        ksiDocuments: [],
        deadlineDocuments: [],
        taggedDocumentSummaries: [],
        referenceIndexDocuments: [],
        frrCollectionDocuments: [],
        ruleDocuments: [
          {
            id: "agnostic-provider-rules",
            output: "agnostic/{FRR}.md",
            outputMode: "documents",
            status: "stable",
            emptyBehavior: "skip",
            source: {
              collection: "FRR",
              documents: ["SYN"],
              types: ["all"],
              affects: ["Providers"],
              includeAll: true,
              allPosition: "first",
            },
          },
        ],
      },
    });

    const artifact = findArtifact(artifacts, "agnostic/synthetic-ruleset.md");
    const requirementIds = artifact.context.sections.flatMap((section) =>
      section.requirements.map((requirement) => requirement.id),
    );

    expect(artifact.context.tags).toEqual(["20x", "Rev5"]);
    expect(requirementIds).toContain("SYN-GEN-ONE");
    expect(requirementIds).toContain("SYN-20X-ONE");
    expect(requirementIds).toContain("SYN-REV5-ONE");
  });

  test("ignores configured deadline documents after resolving the source selection", async () => {
    const config = await loadToolConfig();
    const rules = structuredClone(await loadRules(config));
    rules.FRR = {
      INCLUDED: testRequirementDocument({
        name: "Included Synthetic Ruleset",
        shortName: "INC",
        webName: "included-synthetic-ruleset",
        affects: ["Providers"],
      }),
      IGNORED: testRequirementDocument({
        name: "Ignored Synthetic Ruleset",
        shortName: "IGN",
        webName: "ignored-synthetic-ruleset",
        affects: ["Providers"],
      }),
    };
    const artifacts = collectArtifacts(rules, {
      ...config,
      generated: {
        ...config.generated,
        definitionDocuments: [],
        ksiDocuments: [],
        deadlineDocuments: [
          {
            id: "deadlines-with-ignored-marketplace",
            title: "Important Deadlines",
            output: "providers/updating/deadlines/{type}.md",
            status: "stable",
            template: "templates/deadlines.hbs",
            source: {
              collection: "FRR",
              documents: ["IGNORED", "INCLUDED"],
              ignoreDocuments: ["IGNORED"],
              types: ["20x"],
            },
          },
        ],
        taggedDocumentSummaries: [],
        referenceIndexDocuments: [],
        frrCollectionDocuments: [],
        ruleDocuments: [],
      },
    });

    const deadlineArtifact = artifacts.find(
      (artifact) =>
        artifact.documentType === "DEADLINES" &&
        artifact.relativePath === "providers/updating/deadlines/20x.md",
    );
    const shortNames =
      deadlineArtifact?.context.deadlineTables.flatMap((table) =>
        table.rows.map((row) => row.shortName),
      ) ?? [];

    expect(deadlineArtifact).toBeDefined();
    expect(shortNames).toContain("INC");
    expect(shortNames).not.toContain("IGN");
  });

  test("ignores deadline documents with no rules affecting the configured audience", async () => {
    const config = await loadToolConfig();
    const rules = structuredClone(await loadRules(config));
    rules.FRR = {
      INCLUDED: testRequirementDocument({
        name: "Included Synthetic Ruleset",
        shortName: "INC",
        webName: "included-synthetic-ruleset",
        affects: ["Providers"],
      }),
      FILTERED: testRequirementDocument({
        name: "Filtered Synthetic Ruleset",
        shortName: "FLT",
        webName: "filtered-synthetic-ruleset",
        affects: ["Assessors"],
      }),
    };
    const artifacts = collectArtifacts(rules, {
      ...config,
      generated: {
        ...config.generated,
        definitionDocuments: [],
        ksiDocuments: [],
        deadlineDocuments: [
          {
            id: "provider-deadlines-with-rec",
            title: "Important Deadlines",
            output: "providers/updating/deadlines/{type}.md",
            status: "stable",
            template: "templates/deadlines.hbs",
            source: {
              collection: "FRR",
              documents: ["INCLUDED", "FILTERED"],
              types: ["20x"],
              affects: ["Providers"],
            },
          },
        ],
        taggedDocumentSummaries: [],
        referenceIndexDocuments: [],
        frrCollectionDocuments: [],
        ruleDocuments: [],
      },
    });

    const deadlineArtifact = artifacts.find(
      (artifact) =>
        artifact.documentType === "DEADLINES" &&
        artifact.relativePath === "providers/updating/deadlines/20x.md",
    );
    const shortNames =
      deadlineArtifact?.context.deadlineTables.flatMap((table) =>
        table.rows.map((row) => row.shortName),
      ) ?? [];

    expect(deadlineArtifact).toBeDefined();
    expect(shortNames).toContain("INC");
    expect(shortNames).not.toContain("FLT");
  });

  test("adds page info admonitions below content pictograph spans", async () => {
    const config = await loadToolConfig();
    const tempDir = await mkdtemp(path.join(tmpdir(), "cr26-site-tools-"));
    const tempContentDir = path.join(tempDir, "content");
    const tempSrcDir = path.join(tempDir, "src");
    const tempHtmlDir = path.join(tempDir, "html");

    try {
      await mkdir(tempContentDir, { recursive: true });
      await mkdir(tempSrcDir, { recursive: true });
      await writeFile(
        path.join(tempSrcDir, "index.md"),
        [
          "---",
          "description: This page contains an overview of the Public Preview, including descriptions of the content sources and status.",
          "purpose: Helps folks understand the goals of the Public Preview and how to approach reviewing it.",
          "picto:",
          "  source: person",
          "  status: stable",
          "---",
          "",
          "# Public Preview",
          "",
        ].join("\n"),
        "utf8",
      );
      await writeFile(
        path.join(tempSrcDir, "purpose-only.md"),
        [
          "---",
          'description: ""',
          "purpose: Explains why this page exists.",
          "picto:",
          "  source: person",
          "  status: stable",
          "---",
          "",
          "# Purpose Only",
          "",
        ].join("\n"),
        "utf8",
      );
      await writeFile(
        path.join(tempSrcDir, "empty.md"),
        [
          "---",
          'description: ""',
          "purpose: ''",
          "picto:",
          "  source: person",
          "  status: stable",
          "---",
          "",
          "# Empty Page Info",
          "",
        ].join("\n"),
        "utf8",
      );

      await buildMarkdown({
        ...config,
        paths: {
          ...config.paths,
          content: path.relative(resolveToolPath("."), tempContentDir),
          src: path.relative(resolveToolPath("."), tempSrcDir),
          html: path.relative(resolveToolPath("."), tempHtmlDir),
        },
        generated: {
          ...config.generated,
          definitions: undefined,
          definitionDocuments: [],
          ksiDocuments: [],
          deadlineDocuments: [],
          taggedDocumentSummaries: [],
          referenceIndexDocuments: [],
          frrCollectionDocuments: [],
          ruleDocuments: [],
        },
      });

      const indexContents = await readFile(
        path.join(tempSrcDir, "index.md"),
        "utf8",
      );
      expect(indexContents).toContain(
        [
          MANUAL_STABLE_STATUS_SPAN,
          "",
          '??? info inline end "Page Info"',
          "",
          "    **Description:** This page contains an overview of the Public Preview, including descriptions of the content sources and status.",
          "    ",
          "    **Purpose:** Helps folks understand the goals of the Public Preview and how to approach reviewing it.",
        ].join("\n"),
      );

      const purposeOnlyContents = await readFile(
        path.join(tempSrcDir, "purpose-only.md"),
        "utf8",
      );
      expect(purposeOnlyContents).toContain(
        [
          MANUAL_STABLE_STATUS_SPAN,
          "",
          '??? info inline end "Page Info"',
          "",
          "    **Purpose:** Explains why this page exists.",
        ].join("\n"),
      );
      expect(purposeOnlyContents).not.toContain("**Description:**");

      const emptyContents = await readFile(
        path.join(tempSrcDir, "empty.md"),
        "utf8",
      );
      expect(emptyContents).toContain(`---\n\n${MANUAL_STABLE_STATUS_SPAN}`);
      expect(emptyContents).not.toContain('??? info inline end "Page Info"');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test("builds a todo page from the completed src markdown set", async () => {
    const config = await loadToolConfig();
    const tempDir = await mkdtemp(path.join(tmpdir(), "cr26-site-tools-"));
    const tempContentDir = path.join(tempDir, "content");
    const tempSrcDir = path.join(tempDir, "src");
    const tempHtmlDir = path.join(tempDir, "html");
    const generatedAt = new Date("2026-05-03T12:00:00.000Z");

    try {
      await mkdir(tempContentDir, { recursive: true });
      await mkdir(tempSrcDir, { recursive: true });
      await writeFile(
        path.join(tempSrcDir, "index.md"),
        [
          "---",
          'description: "Manual description"',
          'purpose: "Manual purpose"',
          'google_doc: "https://docs.google.com/document/d/example/edit"',
          "picto:",
          "  source: person",
          "  status: empty",
          "---",
          "",
          "# Manual Page",
          "",
        ].join("\n"),
        "utf8",
      );
      await mkdir(path.join(tempSrcDir, "authority", "law"), {
        recursive: true,
      });
      await writeFile(
        path.join(tempSrcDir, "authority", "law", "index.md"),
        [
          "---",
          "picto:",
          "  source: person",
          "  status: stable",
          "---",
          "",
          "# Authority Page",
          "",
        ].join("\n"),
        "utf8",
      );
      await writeFile(
        path.join(tempSrcDir, "generated.md"),
        [
          "---",
          "tags:",
          "  - 20x",
          "---",
          "",
          STABLE_STATUS_SPAN,
          "",
          "# Generated Page",
          "",
        ].join("\n"),
        "utf8",
      );

      const summary = await buildTodo(
        {
          ...config,
          paths: {
            ...config.paths,
            content: path.relative(resolveToolPath("."), tempContentDir),
            src: path.relative(resolveToolPath("."), tempSrcDir),
            html: path.relative(resolveToolPath("."), tempHtmlDir),
          },
        },
        { generatedAt },
      );

      expect(summary.relativePath).toBe("todo.md");
      expect(summary.pageCount).toBe(3);

      const contents = await readFile(path.join(tempSrcDir, "todo.md"), "utf8");
      expect(contents).toStartWith(
        [
          "---",
          `description: ${JSON.stringify(config.generated.todo?.description)}`,
          `purpose: ${JSON.stringify(config.generated.todo?.purpose)}`,
          'google_doc: ""',
          "picto:",
          "  source: machine",
          "  status: placeholder",
          "---",
          "",
          PLACEHOLDER_STATUS_SPAN,
        ].join("\n"),
      );
      expect(contents).toContain("**Generated:** 2026-05-03T12:00:00.000Z");
      expect(contents).toContain(
        `## Stable Human-Written Pages ${PERSON_PICTOGRAPH} ${STABLE_PICTOGRAPH}`,
      );
      expect(contents).toContain(
        `## Placeholder Human-Written Pages ${PERSON_PICTOGRAPH} ${PLACEHOLDER_PICTOGRAPH}`,
      );
      expect(contents).toContain(
        `## Empty Human-Written Pages ${PERSON_PICTOGRAPH} ${EMPTY_PICTOGRAPH}`,
      );
      expect(contents).toContain(
        `## Stable Machine-Generated Pages ${MACHINE_PICTOGRAPH} ${STABLE_PICTOGRAPH}`,
      );
      expect(contents).toContain(
        `## Placeholder Machine-Generated Pages ${MACHINE_PICTOGRAPH} ${PLACEHOLDER_PICTOGRAPH}`,
      );
      expect(contents).toContain(
        `## Empty Machine-Generated Pages ${MACHINE_PICTOGRAPH} ${EMPTY_PICTOGRAPH}`,
      );
      expect(contents).toContain(
        `| [Overview](index.md) :lucide-circle-arrow-out-down-right:<br> [Manual Page](index.md) | ${PERSON_PICTOGRAPH} ${EMPTY_PICTOGRAPH} | Manual description | Manual purpose | [:material-file-edit-outline:](https://docs.google.com/document/d/example/edit){ title="Link to FedRAMP Internal Google Doc" } |`,
      );
      expect(contents).toContain(
        `| Unlinked :lucide-circle-arrow-out-down-right:<br> [Generated Page](generated.md) | ${MACHINE_PICTOGRAPH} ${STABLE_PICTOGRAPH} |  |  | :material-language-markdown-outline: |`,
      );
      expect(contents).toContain(
        `| [Overview](index.md) :lucide-circle-arrow-out-down-right:<br> [TO DO](todo.md) | ${MACHINE_PICTOGRAPH} ${PLACEHOLDER_PICTOGRAPH} | A table showing all pages, their source, and their progress along with links to internal documentation only available to FedRAMP. | The FedRAMP team will have a simple place to see progress that is machine-generated. | :material-language-markdown-outline: |`,
      );
      expect(contents).not.toContain("Authority Page");
      expect(contents).not.toContain("authority/law/index.md");

      const manifest = await readJson<{ files: string[] }>(
        path.join(tempSrcDir, config.generated.manifest),
      );
      expect(manifest.files).toEqual(["todo.md"]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test("builds configured FRD definition document mappings", async () => {
    const config = await loadToolConfig();
    const tempDir = await mkdtemp(path.join(tmpdir(), "cr26-site-tools-"));
    const tempContentDir = path.join(tempDir, "content");
    const tempSrcDir = path.join(tempDir, "src");
    const tempHtmlDir = path.join(tempDir, "html");

    try {
      await mkdir(tempContentDir, { recursive: true });

      const summary = await buildMarkdown({
        ...config,
        paths: {
          ...config.paths,
          content: path.relative(resolveToolPath("."), tempContentDir),
          src: path.relative(resolveToolPath("."), tempSrcDir),
          html: path.relative(resolveToolPath("."), tempHtmlDir),
        },
        generated: {
          ...config.generated,
          definitions: undefined,
          definitionDocuments: [
            {
              id: "custom-definitions",
              title: "Custom FedRAMP Definitions",
              output: "reference/fedramp-definitions.md",
              status: "placeholder",
              includeEffectiveDates: false,
              source: {
                collection: "FRD",
                types: ["20x", "rev5"],
                includeAll: true,
                allPosition: "first",
              },
            },
          ],
          ksiDocuments: [],
          deadlineDocuments: [],
          taggedDocumentSummaries: [],
          referenceIndexDocuments: [],
          frrCollectionDocuments: [],
          ruleDocuments: [],
        },
      });

      expect(summary.artifactCount).toBe(1);
      expect(summary.artifacts[0]?.mappingId).toBe("custom-definitions");
      expect(summary.artifacts[0]?.relativePath).toBe(
        "reference/fedramp-definitions.md",
      );

      const contents = await readFile(
        path.join(tempSrcDir, "reference", "fedramp-definitions.md"),
        "utf8",
      );
      expect(contents).toContain("# Custom FedRAMP Definitions");
      expect(contents).toStartWith(
        `---\ntags:\n  - 20x\n  - Rev5\n---\n\n${STABLE_STATUS_SPAN}\n\n# Custom FedRAMP Definitions`,
      );
      expect(contents).toContain("## Important Related Terms");
      expect(contents).not.toContain("## General Terms");
      expect(contents).not.toContain("Effective Date(s)");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test("rejects generated outputs that already exist in content", async () => {
    const config = await loadToolConfig();
    const tempDir = await mkdtemp(path.join(tmpdir(), "cr26-site-tools-"));
    const tempContentDir = path.join(tempDir, "content");
    const tempSrcDir = path.join(tempDir, "src");
    const tempHtmlDir = path.join(tempDir, "html");

    try {
      await mkdir(tempContentDir, { recursive: true });
      await writeFile(
        path.join(tempContentDir, "definitions.md"),
        "# Manual definitions\n",
        "utf8",
      );

      await expect(
        buildMarkdown({
          ...config,
          paths: {
            ...config.paths,
            content: path.relative(resolveToolPath("."), tempContentDir),
            src: path.relative(resolveToolPath("."), tempSrcDir),
            html: path.relative(resolveToolPath("."), tempHtmlDir),
          },
        }),
      ).rejects.toThrow(/would shadow content\/definitions\.md/);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test("rejects duplicate generated output paths", async () => {
    const config = await loadToolConfig();
    const tempDir = await mkdtemp(path.join(tmpdir(), "cr26-site-tools-"));
    const tempContentDir = path.join(tempDir, "content");
    const tempSrcDir = path.join(tempDir, "src");
    const tempHtmlDir = path.join(tempDir, "html");

    try {
      await mkdir(tempContentDir, { recursive: true });

      await expect(
        buildMarkdown({
          ...config,
          paths: {
            ...config.paths,
            content: path.relative(resolveToolPath("."), tempContentDir),
            src: path.relative(resolveToolPath("."), tempSrcDir),
            html: path.relative(resolveToolPath("."), tempHtmlDir),
          },
          generated: {
            ...config.generated,
            definitions: undefined,
            definitionDocuments: [
              {
                id: "first-definitions",
                title: "First Definitions",
                output: "definitions.md",
                status: "stable",
                includeEffectiveDates: false,
                source: {
                  collection: "FRD",
                  types: ["20x", "rev5"],
                  includeAll: true,
                  allPosition: "first",
                },
              },
              {
                id: "second-definitions",
                title: "Second Definitions",
                output: "definitions.md",
                status: "stable",
                includeEffectiveDates: false,
                source: {
                  collection: "FRD",
                  types: ["20x", "rev5"],
                  includeAll: true,
                  allPosition: "first",
                },
              },
            ],
            ksiDocuments: [],
            deadlineDocuments: [],
            taggedDocumentSummaries: [],
            referenceIndexDocuments: [],
            frrCollectionDocuments: [],
            ruleDocuments: [],
          },
        }),
      ).rejects.toThrow(
        /definitions\.md" is produced by multiple mappings: first-definitions, second-definitions/,
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("content quality", () => {
  test("warns when content markdown is missing valid pictograph frontmatter", async () => {
    const config = await loadToolConfig();
    const contentPath = resolveToolPath(config.paths.content);

    contentPictographWarnings = await findContentPictographWarnings(
      contentPath,
      config,
    );

    expect(Array.isArray(contentPictographWarnings)).toBe(true);
  });

  test("warns when content markdown is missing required frontmatter fields", async () => {
    const config = await loadToolConfig();
    const contentPath = resolveToolPath(config.paths.content);

    contentFrontmatterWarnings =
      await findContentFrontmatterWarnings(contentPath);

    expect(Array.isArray(contentFrontmatterWarnings)).toBe(true);
  });

  test("warns when content markdown has empty description or purpose frontmatter", async () => {
    const config = await loadToolConfig();
    const contentPath = resolveToolPath(config.paths.content);

    emptyContentFrontmatterWarnings =
      await findEmptyContentFrontmatterWarnings(contentPath);

    expect(Array.isArray(emptyContentFrontmatterWarnings)).toBe(true);
  });

  test("warns when markdown headings are wrapped in bold markers", async () => {
    const config = await loadToolConfig();
    const contentPath = resolveToolPath(config.paths.content);

    boldMarkdownHeadingWarnings =
      await findBoldMarkdownHeadingWarnings(contentPath);

    expect(Array.isArray(boldMarkdownHeadingWarnings)).toBe(true);
  });
});

describe("manual content source drift", () => {
  test("detects manual src edits while ignoring generated page adornments", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "cr26-site-tools-"));
    const tempContentDir = path.join(tempDir, "content");
    const tempSrcDir = path.join(tempDir, "src");

    try {
      await mkdir(tempContentDir, { recursive: true });
      await mkdir(tempSrcDir, { recursive: true });
      await writeFile(
        path.join(tempContentDir, "clean.md"),
        [
          "---",
          "description: Clean source page.",
          "purpose: Confirms generated adornments do not count as drift.",
          "picto:",
          "  source: person",
          "  status: stable",
          "---",
          "",
          "# Clean",
          "",
          "Original content.",
          "",
        ].join("\n"),
        "utf8",
      );
      await writeFile(
        path.join(tempSrcDir, "clean.md"),
        [
          "---",
          "description: Clean source page.",
          "purpose: Confirms generated adornments do not count as drift.",
          "picto:",
          "  source: person",
          "  status: stable",
          "---",
          "",
          MANUAL_STABLE_STATUS_SPAN,
          "",
          '??? info inline end "Page Info"',
          "",
          "    **Description:** Clean source page.",
          "    ",
          "    **Purpose:** Confirms generated adornments do not count as drift.",
          "",
          "# Clean",
          "",
          "Original content.",
          "",
        ].join("\n"),
        "utf8",
      );
      await writeFile(
        path.join(tempContentDir, "drift.md"),
        [
          "---",
          "description: Drift source page.",
          "purpose: Confirms direct src edits are caught.",
          "picto:",
          "  source: person",
          "  status: stable",
          "---",
          "",
          "# Drift",
          "",
          "Original content.",
          "",
        ].join("\n"),
        "utf8",
      );
      await writeFile(
        path.join(tempSrcDir, "drift.md"),
        [
          "---",
          "description: Drift source page.",
          "purpose: Confirms direct src edits are caught.",
          "picto:",
          "  source: person",
          "  status: stable",
          "---",
          "",
          MANUAL_STABLE_STATUS_SPAN,
          "",
          "# Drift",
          "",
          "Original content.",
          "",
          "This paragraph was typed into src by mistake.",
          "",
        ].join("\n"),
        "utf8",
      );

      expect(
        await findManualSrcContentDrift(tempSrcDir, tempContentDir),
      ).toEqual([{ relativePath: "drift.md" }]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test("manual pages in src do not contain edits missing from content", async () => {
    const config = await loadToolConfig();
    const srcPath = resolveToolPath(config.paths.src);
    const contentPath = resolveToolPath(config.paths.content);
    const drift = await findManualSrcContentDrift(srcPath, contentPath);

    expectWithFailureSummary(
      [
        "Manual content pages in src/ differ from their content/ sources.",
        "This usually means a generated src/ file was edited directly.",
        "Move the edits into the matching content/ file, then run bun run build to regenerate src/.",
        "",
        ...drift.map(
          ({ relativePath }) =>
            `- src/${relativePath} differs from content/${relativePath}`,
        ),
      ].join("\n"),
      () => {
        expect(drift).toEqual([]);
      },
    );
  });
});

describe("build pipeline", () => {
  test("bun run build produces a complete Zensical site", async () => {
    const config = await loadToolConfig();
    const rules = await loadRules(config);
    const expectedArtifacts = collectArtifacts(rules, config);
    const expectedGeneratedFiles = expectedArtifacts
      .map((artifact) => artifact.relativePath)
      .concat(config.generated.todo?.output ?? "todo.md")
      .sort();
    const srcPath = resolveToolPath(config.paths.src);
    const contentPath = resolveToolPath(config.paths.content);
    const htmlPath = resolveToolPath(config.paths.html);

    const { stdout } = await runCommandWithSpinner(
      "bun",
      ["run", "build"],
      resolveToolPath("."),
    );

    expect(stdout).toContain(
      `Generated ${expectedArtifacts.length} markdown files.`,
    );
    expect(stdout).toContain("Generated todo.md with ");
    expect(stdout).toContain("Build finished");

    const manifest = await readJson<{ files: string[] }>(
      path.join(srcPath, config.generated.manifest),
    );
    expect(manifest.files).toEqual(expectedGeneratedFiles);

    const contentFiles = await listRelativeFiles(contentPath);
    for (const relativePath of contentFiles) {
      await access(path.join(srcPath, relativePath));
    }

    const copiedIndexMarkdown = await readFile(
      path.join(srcPath, "index.md"),
      "utf8",
    );
    expect(copiedIndexMarkdown).toContain(
      [
        "picto:",
        "  source: person",
        "  status: stable",
        "---",
        "",
        MANUAL_STABLE_STATUS_SPAN,
        "",
        '??? info inline end "Page Info"',
        "",
        "    **Description:** This page contains an overview of the Public Preview, including descriptions of the content sources and status.",
        "    ",
        "    **Purpose:** Helps folks understand the goals of the Public Preview and how to approach reviewing it.",
        "",
        "# Public Preview",
      ].join("\n"),
    );

    const zensicalConfig = await readFile(
      resolveToolPath(config.paths.zensicalConfig),
      "utf8",
    );
    const linkedMarkdownPaths = new Set(
      markdownPathsInZensicalConfig(zensicalConfig),
    );
    const srcMarkdownPaths = (await listRelativeFiles(srcPath))
      .filter((relativePath) => relativePath.endsWith(".md"))
      .sort();
    const unlinkedMarkdownPaths = srcMarkdownPaths.filter(
      (relativePath) => !linkedMarkdownPaths.has(relativePath),
    );

    unlinkedMarkdownWarningPaths = unlinkedMarkdownPaths;

    for (const relativePath of markdownPathsInZensicalConfig(zensicalConfig)) {
      await access(path.join(srcPath, relativePath));
      await access(markdownToHtmlPath(htmlPath, relativePath));
    }

    for (const artifact of expectedArtifacts) {
      await access(path.join(srcPath, artifact.relativePath));
      await access(markdownToHtmlPath(htmlPath, artifact.relativePath));

      const generatedMarkdown = await readFile(
        path.join(srcPath, artifact.relativePath),
        "utf8",
      );
      expect(generatedMarkdown).not.toContain("{{");
      expect(generatedMarkdown).not.toContain("[object Object]");
    }

    const todoMarkdown = await readFile(path.join(srcPath, "todo.md"), "utf8");
    expect(todoMarkdown).toContain("# TO DO");
    expect(todoMarkdown).toContain("**Generated:**");
    expect(todoMarkdown).toContain(
      "| Location | Picto | Description | Purpose | :lucide-file-cog: |",
    );
    expect(todoMarkdown).toContain(
      `## Stable Human-Written Pages ${PERSON_PICTOGRAPH} ${STABLE_PICTOGRAPH}`,
    );
    expect(todoMarkdown).toContain(
      `## Placeholder Machine-Generated Pages ${MACHINE_PICTOGRAPH} ${PLACEHOLDER_PICTOGRAPH}`,
    );
    expect(todoMarkdown).toContain("[Public Preview](index.md)");
    expect(todoMarkdown).toContain("[FedRAMP Definitions](definitions.md)");
    expect(todoMarkdown).toContain("[FedRAMP](responsibilities/index.md)");
    expect(todoMarkdown).toContain(
      expectedTodoLocationFromZensicalConfig(
        zensicalConfig,
        "FedRAMP Definitions",
        "definitions.md",
      ),
    );
    expect(todoMarkdown).not.toContain("authority/");
    expect(todoMarkdown).toContain(
      "A table showing all pages, their source, and their progress along with links to internal documentation only available to FedRAMP.",
    );
    expect(todoMarkdown).not.toContain("{{");
    expect(todoMarkdown).not.toContain("[object Object]");

    for (const relativePath of [
      "index.html",
      "search.json",
      "sitemap.xml",
      "assets/fr-only-logo-black.png",
      "stylesheets/custom.css",
      "authority/m-24-15/m-24-15-official.png",
    ]) {
      await access(path.join(htmlPath, relativePath));
    }

    const renderedDefinitionArtifact = artifactOfType(expectedArtifacts, "FRD");
    const renderedKsiThemeArtifact = firstArtifactMatching(
      expectedArtifacts,
      (artifact) =>
        artifact.documentType === "KSI" && artifact.context.indicators.length > 0,
      "a rendered KSI theme artifact",
    );
    const renderedKsiThemeIndicator =
      renderedKsiThemeArtifact.context.indicators[0];
    const renderedKsiReferenceArtifact = firstArtifactMatching(
      expectedArtifacts,
      (artifact) =>
        artifact.documentType === "KSI" && artifact.context.sections.length > 0,
      "a rendered KSI reference artifact",
    );
    const renderedDeadlineArtifact = artifactOfType(expectedArtifacts, "DEADLINES");
    const renderedResponsibilitiesArtifact = firstArtifactMatching(
      expectedArtifacts,
      (artifact) =>
        (config.generated.frrCollectionDocuments ?? []).some(
          (mapping) => mapping.id === artifact.mappingId,
        ),
      "a rendered FRR collection artifact",
    );
    const renderedAgencyArtifact = firstArtifactMatching(
      expectedArtifacts,
      (artifact) =>
        artifact.documentType === "FRR" &&
        artifact.relativePath.startsWith("agencies/rules/"),
      "a rendered agency rules artifact",
    );
    if (!renderedKsiThemeIndicator) {
      throw new Error(
        `Expected ${renderedKsiThemeArtifact.relativePath} to include an indicator.`,
      );
    }
    const renderedDefinitionTerm =
      Object.values(rules.FRD.data.all ?? {})
        .map((entry) => entry.term)
        .sort((left, right) => left.localeCompare(right))[0] ??
      rules.FRD.info.name;
    const renderedKsiThemeHtmlPath = path.relative(
      htmlPath,
      markdownToHtmlPath(htmlPath, renderedKsiThemeArtifact.relativePath),
    );
    const renderedKsiReferenceHtmlPath = path.relative(
      htmlPath,
      markdownToHtmlPath(htmlPath, renderedKsiReferenceArtifact.relativePath),
    );
    const renderedDeadlineHtmlPath = path.relative(
      htmlPath,
      markdownToHtmlPath(htmlPath, renderedDeadlineArtifact.relativePath),
    );
    const renderedResponsibilitiesHtmlPath = path.relative(
      htmlPath,
      markdownToHtmlPath(htmlPath, renderedResponsibilitiesArtifact.relativePath),
    );
    const renderedAgencyHtmlPath = path.relative(
      htmlPath,
      markdownToHtmlPath(htmlPath, renderedAgencyArtifact.relativePath),
    );

    const renderedPages = [
      {
        path: path.relative(
          htmlPath,
          markdownToHtmlPath(htmlPath, renderedDefinitionArtifact.relativePath),
        ),
        expectedText: [renderedDefinitionArtifact.title, renderedDefinitionTerm],
      },
      {
        path: renderedKsiThemeHtmlPath,
        expectedText: [
          renderedKsiThemeArtifact.title,
          renderedKsiThemeIndicator.id,
        ],
      },
      {
        path: renderedKsiReferenceHtmlPath,
        expectedText: [
          renderedKsiReferenceArtifact.title,
          renderedKsiReferenceArtifact.context.sections[0]?.title ?? "",
          renderedKsiReferenceArtifact.context.sections[0]?.requirements[0]?.id ??
            "",
        ],
      },
      {
        path: renderedDeadlineHtmlPath,
        expectedText: [renderedDeadlineArtifact.title],
      },
      {
        path: renderedResponsibilitiesHtmlPath,
        expectedText: [renderedResponsibilitiesArtifact.title],
      },
      {
        path: renderedAgencyHtmlPath,
        expectedText: [renderedAgencyArtifact.title],
      },
      {
        path: "todo/index.html",
        expectedText: ["TO DO", "Public Preview", "FedRAMP Definitions"],
      },
    ];

    for (const page of renderedPages) {
      const contents = await readFile(path.join(htmlPath, page.path), "utf8");

      for (const expectedText of page.expectedText) {
        expect(contents).toContain(expectedText);
      }
      expect(contents).not.toContain("{{");
      expect(contents).not.toContain("[object Object]");
    }
  });
});
