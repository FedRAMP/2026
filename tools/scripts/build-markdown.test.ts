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
  type RuleType,
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

function expectFileToStartWith(
  filePath: string,
  contents: string,
  expectedStart: string,
  description: string,
): void {
  const relativePath = path.relative(REPO_ROOT, filePath);
  const summary = `${description}: ${relativePath}`;

  expectWithFailureSummary(summary, () => {
    expect(contents, summary).toStartWith(expectedStart);
  });
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
type RequirementEntryForTest =
  NonNullable<
    NonNullable<RequirementDocumentForTest["data"]["all"]>[string]
  >[string];
type RuleBucketForTest = "all" | RuleType;
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

function slugifyHeading(heading: string): string {
  return slugifyTerm(heading.replace(/&/g, " and "));
}

function mermaidNodeId(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `node_${normalized || "unnamed"}`;
}

function mermaidQuotedValue(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\r", " ")
    .replaceAll("\n", "<br/>");
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

function matchesAffectedParties(
  requirement: RequirementEntryForTest,
  affects: string[],
): boolean {
  if (!affects.length) {
    return true;
  }

  return (requirement.affects ?? []).some((affectedParty) =>
    affects.some(
      (allowedParty) =>
        allowedParty.toLowerCase() === affectedParty.toLowerCase(),
    ),
  );
}

function firstRuleSelection(
  document: RequirementDocumentForTest | undefined,
  bucketNames: RuleBucketForTest[],
  affects: string[] = [],
): {
  id: string;
  requirement: RequirementEntryForTest;
  bucketName: RuleBucketForTest;
  subsetKey: string;
} {
  if (!document) {
    throw new Error("Expected source document to exist in rules JSON.");
  }

  for (const bucketName of bucketNames) {
    const bucket = document.data[bucketName];
    if (!bucket) {
      continue;
    }

    for (const [subsetKey, requirements] of Object.entries(bucket)) {
      for (const [id, requirement] of Object.entries(requirements)) {
        if (matchesAffectedParties(requirement, affects)) {
          return { id, requirement, bucketName, subsetKey };
        }
      }
    }
  }

  throw new Error(
    `Expected ${document.info.short_name ?? document.info.name} to include a ${bucketNames.join(
      "/",
    )} rule${affects.length ? ` affecting ${affects.join(", ")}` : ""}.`,
  );
}

function firstRuleId(
  document: RequirementDocumentForTest | undefined,
  bucketNames: RuleBucketForTest[],
  affects: string[] = [],
): string {
  return firstRuleSelection(document, bucketNames, affects).id;
}

function subsetTitle(
  document: RequirementDocumentForTest | undefined,
  bucketName: RuleBucketForTest,
  subsetKey: string,
): string {
  if (!document) {
    throw new Error("Expected source document to exist in rules JSON.");
  }

  const versionSubset =
    bucketName === "all"
      ? undefined
      : document.info[bucketName]?.subsets?.[subsetKey];

  return (
    versionSubset?.name ?? document.info.subsets?.[subsetKey]?.name ?? subsetKey
  );
}

function subsetDescription(
  document: RequirementDocumentForTest | undefined,
  bucketName: RuleBucketForTest,
  subsetKey: string,
): string {
  if (!document) {
    throw new Error("Expected source document to exist in rules JSON.");
  }

  const versionSubset =
    bucketName === "all"
      ? undefined
      : document.info[bucketName]?.subsets?.[subsetKey];

  return (
    versionSubset?.description ??
    document.info.subsets?.[subsetKey]?.description ??
    ""
  );
}

function firstRuleIdsByBucket(
  document: RequirementDocumentForTest | undefined,
): string[] {
  if (!document) {
    throw new Error("Expected source document to exist in rules JSON.");
  }

  const ids = new Set<string>();
  for (const bucketName of Object.keys(document.data) as RuleBucketForTest[]) {
    ids.add(firstRuleSelection(document, [bucketName]).id);
  }

  return Array.from(ids);
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

function deadlineRowMarkdown(row: {
  shortName: string;
  name: string;
  href: string;
  obtain: string;
  maintain: string;
  graceEnds: string;
}): string {
  return `| ${row.shortName} | [${row.name}](${row.href}) | ${row.obtain} | ${row.maintain} | ${row.graceEnds} |`;
}

function controlUrl(controlId: string): string {
  if (controlId.includes(".")) {
    const [main = "", sub = ""] = controlId.split(".");
    const [prefix = "", number = ""] = main.split("-");

    return `https://controlfreak.risk-redux.io/controls/${prefix.toUpperCase()}-${number.padStart(
      2,
      "0",
    )}(${sub.padStart(2, "0")})`;
  }

  const [prefix = "", number = ""] = controlId.split("-");
  return `https://controlfreak.risk-redux.io/controls/${prefix.toUpperCase()}-${number.padStart(
    2,
    "0",
  )}`;
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

function expectNoDeadlineRowsForDocuments(
  contents: string,
  rules: RulesForTest,
  documentKeys: string[],
): void {
  for (const documentKey of documentKeys) {
    const shortName = rules.FRR[documentKey]?.info.short_name;
    if (shortName) {
      expect(contents).not.toContain(`| ${shortName} |`);
    }
  }
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
          grace_ends: "2026-03-01",
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
    for (const relativePath of [
      "agencies/rules/collaborative-continuous-monitoring.md",
      "agencies/rules/vulnerability-detection-and-response.md",
      "definitions.md",
      "providers/20x/key-security-indicators/change-management.md",
      "providers/20x/key-security-indicators/cloud-native-architecture.md",
      "providers/20x/rules/fedramp-certification.md",
      "providers/updating/deadlines/20x.md",
      "providers/updating/deadlines/rev5.md",
      "reference/agency-use.md",
      "reference/fedramp-certification.md",
      "reference/index.md",
      "reference/security-decision-record.md",
      "responsibilities/rules.md",
    ]) {
      expect(relativePaths).toContain(relativePath);
    }
    expect(relativePaths).not.toContain(
      "assessors/20x/rules/marketplace-listing.md",
    );

    const referenceArtifactPaths = relativePaths.filter((relativePath) =>
      relativePath.startsWith("reference/"),
    );
    expect(referenceArtifactPaths).toHaveLength(Object.keys(rules.FRR).length + 1);

    for (const artifact of expectedArtifacts) {
      await access(artifact.outputPath);
      const contents = await readFile(artifact.outputPath, "utf8");

      expect(contents).toContain(`# ${artifact.title}`);
      expect(contents.trim().length).toBeGreaterThan(0);
    }

    const referenceIndexContents = await readFile(
      path.join(OUTPUT_DIR, "reference", "index.md"),
      "utf8",
    );
    expect(referenceIndexContents).toStartWith(
      [
        "---",
        'title: "Complete Ruleset Reference"',
        'description: "This section contains the entire Consolidated Rules for 2026 as a standalone reference for each ruleset."',
        'purpose: "This content allows folks to see the full rules together without them broken apart by stakeholder."',
        'google_doc: ""',
        "picto:",
        "  source: machine",
        "  status: stable",
        "---",
        "",
        STABLE_STATUS_SPAN,
        "",
        '??? info inline end "Page Info"',
        "",
        "    **Description:** This section contains the entire Consolidated Rules for 2026 as a standalone reference for each ruleset.",
        "    ",
        "    **Purpose:** This content allows folks to see the full rules together without them broken apart by stakeholder.",
        "",
        "# Complete Ruleset Reference",
      ].join("\n"),
    );
    expect(referenceIndexContents).toContain(
      "This section of the Consolidated Rules for 2026 contains each complete FedRAMP Ruleset with all related content in a single rule as an overall reference. The individual stakeholder sections of this site contain only the specific rules that apply in different circumstances for different stakeholders, while the reference rulesets are entirely unabridged.",
    );
    expectTextOrder(
      referenceIndexContents,
      [
        "# Complete Ruleset Reference",
        "This section of the Consolidated Rules for 2026 contains each complete FedRAMP Ruleset",
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

    const referenceFrcContents = await readFile(
      path.join(OUTPUT_DIR, "reference", "fedramp-certification.md"),
      "utf8",
    );
    const fedrampCertificationName = rules.FRR.FRC?.info.name;
    expect(fedrampCertificationName).toBeTruthy();
    expect(referenceFrcContents).toStartWith(
      `---\ntags:\n  - 20x\n  - Rev5\n---\n\n${PLACEHOLDER_STATUS_SPAN}\n\n# ${fedrampCertificationName}`,
    );
    for (const ruleId of firstRuleIdsByBucket(rules.FRR.FRC)) {
      expect(referenceFrcContents).toContain(ruleId);
    }
    expect(referenceFrcContents).toContain("../definitions/#");

    const definitionsContents = await readFile(
      path.join(OUTPUT_DIR, "definitions.md"),
      "utf8",
    );
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
      `---\ntags:\n  - 20x\n  - Rev5\n---\n\n${STABLE_STATUS_SPAN}\n\n# FedRAMP Definitions`,
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

    const ksiArtifactPaths = relativePaths.filter((relativePath) =>
      relativePath.startsWith("providers/20x/key-security-indicators/"),
    );
    expect(ksiArtifactPaths).toHaveLength(Object.keys(rules.KSI).length);

    const changeManagementTheme = Object.values(rules.KSI).find(
      (theme) => theme.web_name === "change-management",
    );
    if (!changeManagementTheme) {
      throw new Error(
        'Expected a KSI theme with web_name "change-management" in the rules JSON.',
      );
    }
    const [changeManagementIndicatorId, changeManagementIndicator] =
      Object.entries(changeManagementTheme.indicators)[0] ?? [];
    if (!changeManagementIndicatorId || !changeManagementIndicator) {
      throw new Error("Expected Change Management to include a KSI indicator.");
    }
    const changeManagementControl = changeManagementIndicator.controls?.[0];

    const ksiChangeManagementContents = await readFile(
      path.join(
        OUTPUT_DIR,
        "providers",
        "20x",
        "key-security-indicators",
        "change-management.md",
      ),
      "utf8",
    );
    expect(ksiChangeManagementContents).toStartWith(
      `---\ntags:\n  - 20x\n---\n\n${STABLE_STATUS_SPAN}\n\n# ${changeManagementTheme.name}`,
    );
    expect(ksiChangeManagementContents).toContain(
      `# ${changeManagementTheme.name}`,
    );
    expect(ksiChangeManagementContents).not.toContain("**Subsets**");
    expect(ksiChangeManagementContents).not.toContain('!!! info ""');
    expect(ksiChangeManagementContents).toContain(changeManagementIndicatorId);
    expect(ksiChangeManagementContents).toContain(
      `### ${changeManagementIndicator.name ?? changeManagementIndicatorId}`,
    );
    if (changeManagementControl) {
      expect(ksiChangeManagementContents).toContain(
        "**Related SP 800-53 Controls:**",
      );
      expect(ksiChangeManagementContents).toContain(
        `[${changeManagementControl.toUpperCase()}](${controlUrl(
          changeManagementControl,
        )})`,
      );
    }
    const ksiPolicyInventoryContents = await readFile(
      path.join(
        OUTPUT_DIR,
        "providers",
        "20x",
        "key-security-indicators",
        "policy-and-inventory.md",
      ),
      "utf8",
    );
    const policyInventoryTheme = Object.values(rules.KSI).find(
      (theme) => theme.web_name === "policy-and-inventory",
    );
    if (!policyInventoryTheme) {
      throw new Error(
        'Expected a KSI theme with web_name "policy-and-inventory" in the rules JSON.',
      );
    }
    const [policyInventoryIndicatorId] =
      Object.entries(policyInventoryTheme.indicators)[0] ?? [];
    if (!policyInventoryIndicatorId) {
      throw new Error("Expected Policy and Inventory to include a KSI indicator.");
    }
    expect(ksiPolicyInventoryContents).toContain(policyInventoryIndicatorId);

    const deadlines20xPath = path.join(
      OUTPUT_DIR,
      "providers",
      "updating",
      "deadlines",
      "20x.md",
    );
    const deadlines20xContents = await readFile(deadlines20xPath, "utf8");
    const providerDeadlineIgnoredDocuments =
      (config.generated.deadlineDocuments ?? []).find(
        (mapping) => mapping.id === "provider-important-deadlines",
      )?.source.ignoreDocuments ?? [];
    expectFileToStartWith(
      deadlines20xPath,
      deadlines20xContents,
      `---\ntags:\n  - 20x\n---\n\n${PLACEHOLDER_STATUS_SPAN}\n\n# 20x Deadlines`,
      "Generated provider 20x deadlines markdown has an unexpected header",
    );
    expectDeadlineRowsFromArtifact(
      deadlines20xContents,
      findArtifact(expectedArtifacts, "providers/updating/deadlines/20x.md"),
      "Generated provider 20x deadlines should render source-derived rows in artifact order",
    );
    expectNoDeadlineRowsForDocuments(
      deadlines20xContents,
      rules,
      providerDeadlineIgnoredDocuments,
    );
    expect(deadlines20xContents).not.toContain("Rev5 Deadlines");

    const deadlinesRev5Contents = await readFile(
      path.join(OUTPUT_DIR, "providers", "updating", "deadlines", "rev5.md"),
      "utf8",
    );
    expect(deadlinesRev5Contents).toStartWith(
      `---\ntags:\n  - Rev5\n---\n\n${PLACEHOLDER_STATUS_SPAN}\n\n# Rev5 Deadlines`,
    );
    expectDeadlineRowsFromArtifact(
      deadlinesRev5Contents,
      findArtifact(expectedArtifacts, "providers/updating/deadlines/rev5.md"),
      "Generated provider Rev5 deadlines should render source-derived rows in artifact order",
    );
    expectNoDeadlineRowsForDocuments(
      deadlinesRev5Contents,
      rules,
      providerDeadlineIgnoredDocuments,
    );
    expect(deadlinesRev5Contents).not.toContain("20x Deadlines");

    const assessorDeadlines20xContents = await readFile(
      path.join(OUTPUT_DIR, "assessors", "updating", "deadlines", "20x.md"),
      "utf8",
    );
    expectDeadlineRowsFromArtifact(
      assessorDeadlines20xContents,
      findArtifact(expectedArtifacts, "assessors/updating/deadlines/20x.md"),
      "Generated assessor 20x deadlines should render source-derived rows in artifact order",
    );
    expect(assessorDeadlines20xContents).not.toContain(
      "../../../providers/20x/rules/",
    );

    const assessorDeadlinesRev5Contents = await readFile(
      path.join(OUTPUT_DIR, "assessors", "updating", "deadlines", "rev5.md"),
      "utf8",
    );
    expectDeadlineRowsFromArtifact(
      assessorDeadlinesRev5Contents,
      findArtifact(expectedArtifacts, "assessors/updating/deadlines/rev5.md"),
      "Generated assessor Rev5 deadlines should render source-derived rows in artifact order",
    );
    expect(assessorDeadlinesRev5Contents).not.toContain(
      "../../../providers/rev5/rules/",
    );

    const contentDefinitionsPath = path.join(
      resolveToolPath(config.paths.content),
      "definitions.md",
    );
    await expect(access(contentDefinitionsPath)).rejects.toThrow();

    const provider20xContents = await readFile(
      path.join(
        OUTPUT_DIR,
        "providers",
        "20x",
        "rules",
        "fedramp-certification.md",
      ),
      "utf8",
    );
    const fedrampCertificationPurpose = rules.FRR.FRC?.info.purpose;
    const provider20xCommonRule = firstRuleSelection(rules.FRR.FRC, ["all"], [
      "Providers",
    ]);
    const provider20xSpecificRule = firstRuleSelection(rules.FRR.FRC, ["20x"], [
      "Providers",
    ]);
    const providerRev5SpecificRuleId = firstRuleId(rules.FRR.FRC, ["rev5"], [
      "Providers",
    ]);
    const provider20xCommonSubsetTitle = subsetTitle(
      rules.FRR.FRC,
      provider20xCommonRule.bucketName,
      provider20xCommonRule.subsetKey,
    );
    const provider20xSpecificSubsetTitle = subsetTitle(
      rules.FRR.FRC,
      provider20xSpecificRule.bucketName,
      provider20xSpecificRule.subsetKey,
    );
    expect(fedrampCertificationPurpose).toBeTruthy();
    expect(provider20xContents).toStartWith(
      `---\ntags:\n  - 20x\n---\n\n${PLACEHOLDER_STATUS_SPAN}\n\n# ${fedrampCertificationName}`,
    );
    expectTextOrder(
      provider20xContents,
      [
        `# ${fedrampCertificationName}`,
        fedrampCertificationPurpose ?? "",
        "**Subsets**",
        `- [${provider20xCommonSubsetTitle}](#${slugifyHeading(
          provider20xCommonSubsetTitle,
        )})`,
        `- [${provider20xSpecificSubsetTitle}](#${slugifyHeading(
          provider20xSpecificSubsetTitle,
        )})`,
        "\n---",
        `## ${provider20xCommonSubsetTitle} {#${slugifyHeading(
          provider20xCommonSubsetTitle,
        )}}`,
      ],
      "Generated FRR markdown should place info.purpose and a multi-section TOC before the first body rule",
    );
    expect(provider20xContents).toContain(`# ${fedrampCertificationName}`);
    expect(provider20xContents).toContain(provider20xCommonRule.id);
    expect(provider20xContents).toContain(provider20xSpecificRule.id);
    expect(provider20xContents).not.toContain(providerRev5SpecificRuleId);
    expect(provider20xContents).toContain("../../../definitions/#");

    const providerRev5Contents = await readFile(
      path.join(
        OUTPUT_DIR,
        "providers",
        "rev5",
        "rules",
        "fedramp-certification.md",
      ),
      "utf8",
    );
    expect(providerRev5Contents).toStartWith(
      `---\ntags:\n  - Rev5\n---\n\n${PLACEHOLDER_STATUS_SPAN}\n\n# ${fedrampCertificationName}`,
    );
    expect(providerRev5Contents).toContain(providerRev5SpecificRuleId);
    expect(providerRev5Contents).not.toContain(provider20xSpecificRule.id);

    const provider20xIcpContents = await readFile(
      path.join(
        OUTPUT_DIR,
        "providers",
        "20x",
        "rules",
        "incident-communications-procedures.md",
      ),
      "utf8",
    );
    const providerIcpRules = rules.FRR.ICP?.data.all?.CSO ?? {};
    const incidentFlow = rules.FRR.ICP?.info.flows?.[0];
    if (!incidentFlow?.steps?.length) {
      throw new Error("Expected ICP to include a workflow in the rules JSON.");
    }
    const firstRuleStep = incidentFlow.steps.find(
      (step) => step.to && providerIcpRules[step.to],
    );
    if (!firstRuleStep?.from || !firstRuleStep.to) {
      throw new Error(
        "Expected ICP workflow to include a step from a start node to a rule.",
      );
    }
    const firstWorkflowRule = providerIcpRules[firstRuleStep.to];
    if (!firstWorkflowRule?.name) {
      throw new Error(
        `Expected ICP workflow rule ${firstRuleStep.to} to exist in the provider rules.`,
      );
    }
    const firstWorkflowStartNode = mermaidNodeId(firstRuleStep.from);
    const firstWorkflowRuleNode = mermaidNodeId(firstRuleStep.to);
    expect(provider20xIcpContents).toContain(
      `## Activity Workflow: ${incidentFlow.activity ?? "Flow 1"}`,
    );
    expect(provider20xIcpContents).toContain("``` mermaid");
    expect(provider20xIcpContents).toContain("flowchart TD");
    expect(provider20xIcpContents).toContain(
      `${firstRuleStep.to}<br/>${firstWorkflowRule.name}`,
    );
    expect(provider20xIcpContents).toContain(
      `${firstWorkflowStartNode}(["${mermaidQuotedValue(firstRuleStep.from)}"])`,
    );
    expect(provider20xIcpContents).toMatch(
      new RegExp(
        `${firstWorkflowStartNode} -->(\\|"[^"]+"\\|)? ${firstWorkflowRuleNode}`,
      ),
    );
    expect(provider20xIcpContents).toContain(
      `click ${firstWorkflowRuleNode} href "#`,
    );
    expect(provider20xIcpContents).toContain(
      `"Jump to ${firstRuleStep.to}"`,
    );
    const notificationRule = Object.values(providerIcpRules).find((rule) =>
      rule.notification?.some(
        (notification) =>
          notification.party && notification.method && notification.target,
      ),
    );
    const notification = notificationRule?.notification?.find(
      (entry) => entry.party && entry.method && entry.target,
    );
    expect(notificationRule).toBeTruthy();
    expect(notification).toBeTruthy();
    expect(provider20xIcpContents).toContain(
      `Notify ${notification?.party} by ${notification?.method} using ${notification?.target}.`,
    );

    const provider20xFsiContents = await readFile(
      path.join(
        OUTPUT_DIR,
        "providers",
        "20x",
        "rules",
        "fedramp-security-inbox.md",
      ),
      "utf8",
    );
    expect(provider20xFsiContents).toContain(
      firstRuleId(rules.FRR.FSI, ["all", "20x", "rev5"], ["Providers"]),
    );

    const fedrampResponsibilitiesContents = await readFile(
      path.join(OUTPUT_DIR, "responsibilities", "rules.md"),
      "utf8",
    );
    expect(fedrampResponsibilitiesContents).toStartWith(
      `---\ntags:\n  - 20x\n  - Rev5\n---\n\n${PLACEHOLDER_STATUS_SPAN}\n\n# FedRAMP's Responsibilities`,
    );
    expect(fedrampResponsibilitiesContents).not.toContain("Effective Date(s)");
    expect(fedrampResponsibilitiesContents).not.toContain("Activity Workflow");
    expect(fedrampResponsibilitiesContents).not.toContain("``` mermaid");

    const fedrampSecurityInboxName = rules.FRR.FSI?.info.name;
    const fedrampSecurityInboxPurpose = rules.FRR.FSI?.info.purpose;
    const fedrampFsiRule = firstRuleSelection(
      rules.FRR.FSI,
      ["all", "20x", "rev5"],
      ["FedRAMP"],
    );
    const fedrampFsiSubsetDescription = subsetDescription(
      rules.FRR.FSI,
      fedrampFsiRule.bucketName,
      fedrampFsiRule.subsetKey,
    );
    expect(fedrampSecurityInboxName).toBeTruthy();
    expect(fedrampSecurityInboxPurpose).toBeTruthy();
    expect(fedrampFsiSubsetDescription).toBeTruthy();
    expectTextOrder(
      fedrampResponsibilitiesContents,
      [
        "# FedRAMP's Responsibilities",
        `## ${fedrampSecurityInboxName} {#${slugifyHeading(
          fedrampSecurityInboxName ?? "",
        )}}`,
        fedrampSecurityInboxPurpose ?? "",
        fedrampFsiSubsetDescription,
        fedrampFsiRule.id,
      ],
      "Generated FedRAMP responsibilities markdown should place each FRR purpose and FRP subset description before FedRAMP rules",
    );
    expect(fedrampResponsibilitiesContents).not.toContain(
      firstRuleId(rules.FRR.FRC, ["all", "20x", "rev5"], ["Providers"]),
    );

    const vulnerabilityDetectionName = rules.FRR.VDR?.info.name;
    const vulnerabilityDetectionPurpose = rules.FRR.VDR?.info.purpose;
    const fedrampVdrRule = firstRuleSelection(
      rules.FRR.VDR,
      ["all", "20x", "rev5"],
      ["FedRAMP"],
    );
    const fedrampVdrSubsetTitle = subsetTitle(
      rules.FRR.VDR,
      fedrampVdrRule.bucketName,
      fedrampVdrRule.subsetKey,
    );
    const fedrampVdrSubsetDescription = subsetDescription(
      rules.FRR.VDR,
      fedrampVdrRule.bucketName,
      fedrampVdrRule.subsetKey,
    );
    expect(vulnerabilityDetectionName).toBeTruthy();
    expect(vulnerabilityDetectionPurpose).toBeTruthy();
    expect(fedrampVdrSubsetDescription).toBeTruthy();
    expectTextOrder(
      fedrampResponsibilitiesContents,
      [
        `## ${vulnerabilityDetectionName} {#${slugifyHeading(
          vulnerabilityDetectionName ?? "",
        )}}`,
        vulnerabilityDetectionPurpose ?? "",
        fedrampVdrSubsetDescription,
        fedrampVdrRule.id,
      ],
      "Generated FedRAMP responsibilities markdown should repeat the FRR layout for later responsibility sections",
    );
    expect(fedrampResponsibilitiesContents).not.toContain(
      `## ${fedrampVdrSubsetTitle}`,
    );

    const agencyCcmContents = await readFile(
      path.join(
        OUTPUT_DIR,
        "agencies",
        "rules",
        "collaborative-continuous-monitoring.md",
      ),
      "utf8",
    );
    const collaborativeMonitoringPurpose = rules.FRR.CCM?.info.purpose;
    const collaborativeMonitoringName = rules.FRR.CCM?.info.name;
    const agencyCcmRule = firstRuleSelection(
      rules.FRR.CCM,
      ["all", "20x", "rev5"],
      ["Agencies"],
    );
    const agencyCcmSubsetTitle = subsetTitle(
      rules.FRR.CCM,
      agencyCcmRule.bucketName,
      agencyCcmRule.subsetKey,
    );
    expect(collaborativeMonitoringPurpose).toBeTruthy();
    expect(collaborativeMonitoringName).toBeTruthy();
    expect(agencyCcmContents).toStartWith(
      `---\ntags:\n  - 20x\n  - Rev5\n---\n\n${STABLE_STATUS_SPAN}\n\n# ${collaborativeMonitoringName}`,
    );
    expectTextOrder(
      agencyCcmContents,
      [
        `# ${collaborativeMonitoringName}`,
        collaborativeMonitoringPurpose ?? "",
        "\n---",
        `## ${agencyCcmSubsetTitle} {#${slugifyHeading(agencyCcmSubsetTitle)}}`,
      ],
      "Generated single-subset FRR markdown should place info.purpose before the first body rule without a TOC",
    );
    expect(agencyCcmContents).toContain(`# ${collaborativeMonitoringName}`);
    expect(agencyCcmContents).not.toContain("**Subsets**");
    expect(agencyCcmContents).toContain(`## ${agencyCcmSubsetTitle}`);
    expect(agencyCcmContents).toContain(agencyCcmRule.id);

    const agencyVdrContents = await readFile(
      path.join(
        OUTPUT_DIR,
        "agencies",
        "rules",
        "vulnerability-detection-and-response.md",
      ),
      "utf8",
    );
    expect(agencyVdrContents).toContain(`# ${vulnerabilityDetectionName}`);
    const agencyVdrRule = firstRuleSelection(
      rules.FRR.VDR,
      ["all", "20x", "rev5"],
      ["Agencies"],
    );
    const agencyVdrSubsetTitle = subsetTitle(
      rules.FRR.VDR,
      agencyVdrRule.bucketName,
      agencyVdrRule.subsetKey,
    );
    expect(agencyVdrContents).toContain(`## ${agencyVdrSubsetTitle}`);
    expect(agencyVdrContents).toContain(agencyVdrRule.id);
    expect(agencyVdrContents).not.toContain(
      fedrampVdrRule.id,
    );
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

  test("resolves related FRR links to the matching generated audience page", async () => {
    const config = await loadToolConfig();
    const rules = structuredClone(await loadRules(config));
    const providerRule = firstRuleSelection(rules.FRR.FRC, ["all", "20x"], [
      "Providers",
    ]);
    const assessorRule = firstRuleSelection(rules.FRR.FRC, ["all", "20x"], [
      "Assessors",
    ]);
    const assessorRuleName = assessorRule.requirement.name ?? assessorRule.id;

    providerRule.requirement.statement = `${
      providerRule.requirement.statement ?? ""
    } See ${assessorRule.id} (${assessorRuleName}).`;
    providerRule.requirement.related = [assessorRule.id];

    const artifacts = collectArtifacts(rules, config);
    const providerFrcArtifact = artifacts.find(
      (artifact) =>
        artifact.relativePath === "providers/20x/rules/fedramp-certification.md",
    );
    const linkedRule = providerFrcArtifact?.context.sections
      .flatMap((section) => section.requirements)
      .find((requirement) => requirement.id === providerRule.id);

    expect(linkedRule?.statementParagraphs.join("\n")).toContain(
      `[${assessorRule.id} (${assessorRuleName})](../../../assessors/20x/rules/fedramp-certification.md#${slugifyHeading(
        assessorRuleName,
      )}){ data-preview }`,
    );
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

    const renderedFrcDocument = rules.FRR.FRC;
    const renderedAgencyUseDocument = rules.FRR.AGU;
    const renderedChangeManagementTheme = Object.values(rules.KSI).find(
      (theme) => theme.web_name === "change-management",
    );
    if (
      !renderedFrcDocument ||
      !renderedAgencyUseDocument ||
      !renderedChangeManagementTheme
    ) {
      throw new Error(
        "Expected source documents for rendered page smoke tests to exist.",
      );
    }
    const renderedDefinitionTerm =
      Object.values(rules.FRD.data.all ?? {})
        .map((entry) => entry.term)
        .sort((left, right) => left.localeCompare(right))[0] ??
      rules.FRD.info.name;
    const renderedChangeManagementIndicatorId =
      Object.keys(renderedChangeManagementTheme.indicators)[0] ??
      renderedChangeManagementTheme.name;

    const renderedPages = [
      {
        path: "definitions/index.html",
        expectedText: ["FedRAMP Definitions", renderedDefinitionTerm],
      },
      {
        path: "providers/20x/rules/fedramp-certification/index.html",
        expectedText: [
          renderedFrcDocument.info.name,
          firstRuleId(renderedFrcDocument, ["all", "20x"], ["Providers"]),
        ],
      },
      {
        path: "providers/20x/key-security-indicators/change-management/index.html",
        expectedText: [
          renderedChangeManagementTheme.name,
          renderedChangeManagementIndicatorId,
        ],
      },
      {
        path: "providers/updating/deadlines/20x/index.html",
        expectedText: ["20x Deadlines", renderedFrcDocument.info.name],
      },
      {
        path: "responsibilities/rules/index.html",
        expectedText: ["FedRAMP's Responsibilities", renderedFrcDocument.info.name],
      },
      {
        path: "agencies/rules/agency-use/index.html",
        expectedText: [renderedAgencyUseDocument.info.name],
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
