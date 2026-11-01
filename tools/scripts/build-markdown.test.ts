import {
  sources,
  loadRules,
  loadToolConfig,
  readTree,
} from "./test-support/sources";
import {
  assertArtifactSource,
  expectedOutputPaths,
  assertManualCopy,
  assertManualHtml,
} from "./test-support/source-contract";
import Handlebars from "handlebars";
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
import { buildMarkdown, collectArtifacts, RULES_FILE } from "./build-markdown";
import { REPO_ROOT, resolveToolPath, type ToolConfig } from "./config";
import { deploy } from "./deploy";
import {
  findZensicalTagWarnings,
  printZensicalTagWarnings,
  type ZensicalTagWarning,
  zensicalTagsFromFrontmatter,
} from "./zensical-tag-warnings";
const execFileAsync = promisify(execFile);
const RULES_REMOTE_URL = "https://github.com/FedRAMP/rules.git";
const DEFAULT_RULES_REMOTE_BRANCH = "main";
const RULES_SCHEMA_FILE = resolveToolPath(
  "rules/schemas/fedramp-consolidated-rules.schema.json",
);
const PERSON_PICTOGRAPH =
  ':lucide-person-standing:{ .person title="This content was written by a human just for this page." }';
const PERSON_PICTO_SPAN = `<span class="picto">${PERSON_PICTOGRAPH}</span>`;
const WARNING_ORANGE = "\x1b[38;5;208m";
const WARNING_RESET = "\x1b[0m";
const WARNING_MARK = "⚠";
const ERROR_RED = "\x1b[31m";
const COLOR_RESET = "\x1b[0m";
let unlinkedMarkdownWarningPaths: string[] = [];
let boldMarkdownHeadingWarnings: string[] = [];
let contentPictographWarnings: string[] = [];
let rulesSubmoduleSyncWarnings: string[] = [];
let zensicalTagWarnings: ZensicalTagWarning[] = [];
const humanReadableFailureSummaries: string[] = [];

afterAll(() => {
  printUnlinkedMarkdownWarnings();
  printBoldMarkdownHeadingWarnings();
  printContentPictographWarnings();
  printRulesSubmoduleSyncWarnings();
  printZensicalTagWarnings(zensicalTagWarnings);
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
      `${WARNING_ORANGE}${WARNING_MARK} Content markdown files should declare picto.source in frontmatter:${WARNING_RESET}`,
      "",
      ...contentPictographWarnings.map(
        (warning) =>
          `    ${WARNING_ORANGE}${WARNING_MARK} ${warning}${WARNING_RESET}`,
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
        (warning) =>
          `    ${WARNING_ORANGE}${WARNING_MARK} ${warning}${WARNING_RESET}`,
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

type RulesForTest = Awaited<ReturnType<typeof loadRules>>;
type RequirementDocumentForTest = RulesForTest["FRR"][string];
type ArtifactForTest = ReturnType<typeof collectArtifacts>[number];

function findArtifact(
  artifacts: ArtifactForTest[],
  relativePath: string,
): ArtifactForTest {
  const artifact = artifacts.find(
    (entry) => entry.relativePath === relativePath,
  );
  if (!artifact) {
    throw new Error(`Expected generated artifact: ${relativePath}`);
  }

  return artifact;
}

function expectedPictograph(config: ToolConfig) {
  const icon = config.pictographs.source.machine.replace(
    /\s*}$/,
    ` title="${config.pictographs.tooltips.machine}" }`,
  );
  return `<span class="picto">${icon}</span>`;
}

function setRulesSourceStatuses(
  rules: RulesForTest,
  status: "stable" | "placeholder" | "empty",
): void {
  rules.FRD.info.status = status;

  for (const document of Object.values(rules.FRR)) {
    document.info.status = status;
  }

  for (const theme of Object.values(rules.KSI)) {
    theme.status = status;
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
        return childFiles.map((childFile) => path.join(entry.name, childFile));
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

    outputLines.push(line);
  }

  return outputLines.join("\n");
}

function normalizeManualMarkdownForComparison(contents: string): string {
  return `${stripGeneratedManualPageAdornments(contents)
    .replace(/^(---\n[\s\S]*?\n---)\n*/, "$1\n\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()}\n`;
}

async function findManualSrcContentDrift(
  srcRoot: string,
  contentRoot: string,
): Promise<ManualSrcContentDrift[]> {
  const srcMarkdownPaths = (await listRelativeFiles(contentRoot))
    .filter((relativePath) => relativePath.endsWith(".md"))
    .sort();
  const drift: ManualSrcContentDrift[] = [];

  for (const relativePath of srcMarkdownPaths) {
    const srcPath = path.join(srcRoot, relativePath);
    const contentPath = path.join(contentRoot, relativePath);
    if (!(await fileExists(srcPath))) {
      drift.push({ relativePath });
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

async function findBoldMarkdownHeadingWarnings(
  root: string,
): Promise<string[]> {
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

  const pictoIndex = frontmatter.findIndex((line) => line.trim() === "picto:");
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

  if (!picto.source) {
    return `${relativePath}: missing picto.source`;
  }

  if (!knownSources.has(picto.source)) {
    return `${relativePath}: unknown picto.source "${picto.source}"`;
  }

  if (picto.status) {
    return `${relativePath}: picto.status is no longer supported`;
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

function generatedMappingPictoStatusFailures(config: ToolConfig): string[] {
  const asRecords = (mappings: unknown[] | undefined) =>
    (mappings ?? []) as Array<Record<string, unknown>>;
  const generatedMappingGroups: Array<
    [string, Array<Record<string, unknown>>]
  > = [
    ["definitionDocuments", asRecords(config.generated.definitionDocuments)],
    ["ksiDocuments", asRecords(config.generated.ksiDocuments)],
    ["controlDocuments", asRecords(config.generated.controlDocuments)],
    [
      "fullControlReferenceDocuments",
      asRecords(config.generated.fullControlReferenceDocuments),
    ],
    ["deadlineDocuments", asRecords(config.generated.deadlineDocuments)],
    [
      "taggedDocumentSummaries",
      asRecords(config.generated.taggedDocumentSummaries),
    ],
    [
      "referenceIndexDocuments",
      asRecords(config.generated.referenceIndexDocuments),
    ],
    [
      "frrCollectionDocuments",
      asRecords(config.generated.frrCollectionDocuments),
    ],
    ["ruleDocuments", asRecords(config.generated.ruleDocuments)],
  ];
  const failures: string[] = [];

  for (const [groupName, mappings] of generatedMappingGroups) {
    mappings.forEach((mapping, index) => {
      const mappingLabel =
        typeof mapping.id === "string" ? mapping.id : "unknown mapping";

      if (Object.hasOwn(mapping, "status")) {
        failures.push(
          `generated.${groupName}[${index}] (${mappingLabel}) declares removed pictograph status`,
        );
      }
    });
  }

  return failures;
}

function pictographTooltipFailures(config: ToolConfig): string[] {
  const failures: string[] = [];
  const tooltipKeys = Object.keys(config.pictographs.source) as Array<
    keyof ToolConfig["pictographs"]["tooltips"]
  >;

  for (const key of tooltipKeys) {
    if (!config.pictographs.tooltips[key]?.trim()) {
      failures.push(`pictographs.tooltips.${key} is missing or empty`);
    }
  }

  return failures;
}

let markdownBuildPromise: ReturnType<typeof buildMarkdown> | undefined;
function markdownBuild() {
  return (markdownBuildPromise ??= (async () => {
    await sources();
    await deploy();
    const summary = await buildMarkdown();
    expect(summary.artifacts.map((a) => a.relativePath).sort()).toEqual(
      await expectedOutputPaths(),
    );
    return summary;
  })());
}

describe("build-markdown", () => {
  test("the consolidated rules source exists", async () => {
    await access(RULES_FILE);
  });

  test("generated config mappings do not declare pictograph statuses", async () => {
    const config = await loadToolConfig();
    const failures = generatedMappingPictoStatusFailures(config);
    const statusFailureSummary = [
      "Generated markdown mappings in tools/config.json must not declare pictograph status.",
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

    const expectedHead = await expectedRulesHead(
      rulesPath,
      expectedRulesBranch,
    );

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

  for (const documentType of [
    "FRR",
    "FRD",
    "KSI",
    "CTL",
    "CTL_REFERENCE",
    "DEADLINES",
    "FRR_TAGGED_SUMMARY",
    "FRR_REFERENCE_INDEX",
    "TRIGRAMS",
  ] as const) {
    test(`${documentType} Markdown matches current authoritative source records`, async () => {
      const summary = await markdownBuild();
      for (const artifact of summary.artifacts.filter(
        (a) => a.documentType === documentType,
      )) {
        await assertArtifactSource(
          artifact,
          await readFile(artifact.outputPath, "utf8"),
        );
      }
    });
  }

  test("renders source-only pictographs for generated pages", async () => {
    const config = await loadToolConfig();
    const rules = structuredClone(await loadRules(config));
    setRulesSourceStatuses(rules, "placeholder");

    const artifacts = collectArtifacts(rules, config);

    expect(artifacts.length).toBeGreaterThan(0);
    for (const artifact of artifacts) {
      expect(
        artifact.context.pictoSpan,
        `${artifact.relativePath} should render only the machine source pictograph`,
      ).toBe(expectedPictograph(config));
    }
  });

  test("links the five force terms in FRR statements across page mappings and variants", async () => {
    const config = await loadToolConfig();
    const rules = structuredClone(await loadRules(config));
    const statement =
      "Providers MUST comply, MUST NOT disclose, SHOULD review, SHOULD NOT skip, and MAY proceed. Providers MUST document decisions.";
    const terms = ["MUST", "MUST NOT", "SHOULD", "SHOULD NOT", "MAY"];
    rules.FRD.data = {
      all: Object.fromEntries(
        [...terms, "Certification Package"].map((term, i) => [
          `FRD-T${i}`,
          {
            term,
            definition: `Synthetic definition of ${term}.`,
            do_not_link: terms.includes(term),
          },
        ]),
      ),
    };
    const expectedStatement = (href: string) =>
      `Providers [MUST](${href}#must){ data-preview } comply, [MUST NOT](${href}#must-not){ data-preview } disclose, [SHOULD](${href}#should){ data-preview } review, [SHOULD NOT](${href}#should-not){ data-preview } skip, and [MAY](${href}#may){ data-preview } proceed. Providers [MUST](${href}#must){ data-preview } document decisions.`;
    const syntheticDocument = testRequirementDocument({
      name: "Synthetic Ruleset",
      shortName: "SYN",
      webName: "synthetic-ruleset",
      affects: ["Providers"],
    });
    syntheticDocument.data.all = {
      GEN: {
        "SYN-GEN-ONE": {
          name: "Synthetic Requirement",
          statement: `${statement}\n\nSee REL-GEN-ONE (Related Requirement).`,
          related: ["REL-GEN-ONE"],
          affects: ["Providers"],
          terms: [...terms, "Certification Package"],
          note: "Providers MAY consult this note.",
          following_information: ["Providers MUST supply this information."],
          varies_by_class: {
            b: {
              statement,
              notes: ["Providers SHOULD review this note."],
            },
          },
          varies_by_level: {
            low: {
              statement,
              following_information_bullets: ["Providers MUST NOT omit this."],
            },
          },
        },
      },
    };
    const relatedDocument = testRequirementDocument({
      name: "Related Ruleset",
      shortName: "REL",
      webName: "related-ruleset",
      affects: ["Providers"],
    });
    relatedDocument.data.all = {
      GEN: {
        "REL-GEN-ONE": {
          name: "Related Requirement",
          statement,
          affects: ["Providers"],
        },
      },
    };
    rules.FRR = { SYN: syntheticDocument, REL: relatedDocument };
    const originalRules = structuredClone(rules);
    const source = {
      collection: "FRR" as const,
      documents: ["SYN"],
      types: ["all" as const],
      includeAll: true,
    };
    const artifacts = collectArtifacts(rules, {
      ...config,
      generated: {
        ...config.generated,
        trigramDocuments: [],
        definitionDocuments: [],
        ksiDocuments: [],
        controlDocuments: [],
        fullControlReferenceDocuments: [],
        deadlineDocuments: [],
        taggedDocumentSummaries: [],
        referenceIndexDocuments: [],
        ruleDocuments: [
          {
            id: "force-documents",
            output: "reference/{FRR}.md",
            outputMode: "documents",
            definitionsHref: "../definitions/",
            relatedRulesOutput: "reference/related.md",
            source,
          },
          {
            id: "force-single",
            output: "rules.md",
            source,
          },
          {
            id: "force-grouped",
            output: "providers/20x/rules/all.md",
            definitionsHref: "../../../reference/custom-definitions/",
            source: {
              ...source,
              documents: ["SYN", "REL"],
              groupBy: "document",
            },
          },
        ],
        frrCollectionDocuments: [
          {
            id: "force-collection",
            title: "Responsibilities",
            output: "responsibilities/rules.md",
            definitionsHref: "../definitions/",
            source,
          },
        ],
      },
    });

    for (const [relativePath, href] of [
      ["reference/synthetic-ruleset.md", "../definitions/"],
      ["rules.md", "definitions/"],
      ["providers/20x/rules/all.md", "../../../reference/custom-definitions/"],
      ["responsibilities/rules.md", "../definitions/"],
    ] as const) {
      const artifact = findArtifact(artifacts, relativePath);
      const requirement = artifact.context.sections
        .flatMap((section) => section.requirements)
        .find((entry) => entry.id === "SYN-GEN-ONE")!;

      expect(requirement.statementParagraphs[0]).toBe(expectedStatement(href));
      expect(
        requirement.variantSections.map((variant) => variant.title),
      ).toEqual(["Class B", "Low"]);
      for (const variant of requirement.variantSections) {
        expect(variant.statementParagraphs).toEqual([expectedStatement(href)]);
      }
      expect(requirement.noteParagraphs).toEqual([
        "Providers MAY consult this note.",
      ]);
      expect(requirement.numberedItems).toEqual([
        "Providers MUST supply this information.",
      ]);
      expect(requirement.variantSections[0]?.notes).toEqual([
        "Providers SHOULD review this note.",
      ]);
      expect(requirement.variantSections[1]?.bulletItems).toEqual([
        "Providers MUST NOT omit this.",
      ]);
      expect(requirement.terms).toEqual([
        {
          label: "Certification Package",
          href: `${href}#certification-package`,
        },
      ]);
    }

    const documentArtifact = findArtifact(
      artifacts,
      "reference/synthetic-ruleset.md",
    );
    expect(
      documentArtifact.context.sections[0]?.requirements[0]
        ?.statementParagraphs[1],
    ).toBe(
      "See [REL-GEN-ONE (Related Requirement)](related.md#related-requirement){ data-preview }.",
    );
    const relatedArtifact = findArtifact(artifacts, "reference/related.md");
    expect(
      relatedArtifact.context.sections[0]?.requirements[0]?.statementParagraphs,
    ).toEqual([expectedStatement("../definitions/")]);
    expect(rules).toEqual(originalRules);
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
        trigramDocuments: [],
        definitionDocuments: [],
        ksiDocuments: [],
        controlDocuments: [],
        fullControlReferenceDocuments: [],
        deadlineDocuments: [],
        taggedDocumentSummaries: [],
        referenceIndexDocuments: [],
        frrCollectionDocuments: [],
        ruleDocuments: [
          {
            id: "assessor-20x-with-ignored-marketplace",
            output: "assessors/20x/rules/{FRR}.md",
            outputMode: "documents",
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

  test('expands source.types "all" to common, 20x, and Rev5 rule content', async () => {
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
        trigramDocuments: [],
        definitionDocuments: [],
        ksiDocuments: [],
        controlDocuments: [],
        fullControlReferenceDocuments: [],
        deadlineDocuments: [],
        taggedDocumentSummaries: [],
        referenceIndexDocuments: [],
        frrCollectionDocuments: [],
        ruleDocuments: [
          {
            id: "agnostic-provider-rules",
            output: "agnostic/{FRR}.md",
            outputMode: "documents",
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

    expect(artifact.context.tags).toEqual([
      "20x",
      "Rev5",
      "Cloud Service Providers",
      "Rules",
    ]);
    expect(requirementIds).toContain("SYN-GEN-ONE");
    expect(requirementIds).toContain("SYN-20X-ONE");
    expect(requirementIds).toContain("SYN-REV5-ONE");
  });

  test("filters ruleset references by subset applicability and selected class", async () => {
    const config = await loadToolConfig();
    const rules = structuredClone(await loadRules(config));
    const syntheticDocument = testRequirementDocument({
      name: "Synthetic Ruleset",
      shortName: "SYN",
      webName: "synthetic-ruleset",
      affects: ["Providers"],
    });

    syntheticDocument.info.subsets = {
      AON: {
        name: "Class A Only",
        description: "Rules specific to Class A.",
        applicability: {
          types: ["20x"],
          paths: ["Program"],
          classes: ["A"],
          affects: ["Providers"],
        },
      },
      BON: {
        name: "Class B Only",
        description: "Rules specific to Class B.",
        applicability: {
          types: ["20x"],
          paths: ["Program", "Agency"],
          classes: ["B"],
          affects: ["Providers", "Agencies"],
        },
      },
      R5B: {
        name: "Rev5 Class B",
        description: "Rules specific to Rev5 Class B.",
        applicability: {
          types: ["Rev5"],
          paths: ["Agency"],
          classes: ["B"],
          affects: ["Providers"],
        },
      },
    };
    syntheticDocument.data.all = {
      AON: {
        "SYN-AON-ONE": {
          name: "Class A Requirement",
          statement:
            "This Class A rule refers to SYN-BON-VAR (Class Variant Requirement) and KSI-SYN-INCLUDED (Synthetic Indicator).",
          related: ["SYN-BON-VAR", "KSI-SYN-INCLUDED"],
          affects: ["Providers"],
        },
      },
      BON: {
        "SYN-BON-VAR": {
          name: "Class Variant Requirement",
          reference: "Companion Ruleset",
          reference_url_web_name: "companion-ruleset",
          varies_by_class: {
            a: {
              statement: "Class A variant should not render.",
            },
            b: {
              statement: "Class B variant should render.",
            },
          },
          affects: ["Providers"],
        },
      },
      R5B: {
        "SYN-R5B-ONE": {
          name: "Rev5 Requirement",
          statement: "This should not appear on 20x pages.",
          affects: ["Providers"],
        },
      },
    };
    const omittedDocument = testRequirementDocument({
      name: "Omitted Ruleset",
      shortName: "OMT",
      webName: "omitted-ruleset",
      affects: ["Providers"],
    });
    omittedDocument.info.subsets = {
      BON: syntheticDocument.info.subsets.BON!,
    };
    omittedDocument.data.all = {
      BON: {
        "OMT-BON-ONE": {
          name: "Omitted Class B Requirement",
          statement:
            "This document is not included in the linked rule mapping.",
          affects: ["Providers"],
        },
      },
    };
    rules.FRR = {
      SYN: syntheticDocument,
      OMT: omittedDocument,
    };
    rules.KSI = {
      SYN: {
        id: "KSI-SYN",
        name: "Synthetic Indicators",
        web_name: "synthetic-indicators",
        short_name: "SYN",
        status: "stable",
        indicators: {
          "KSI-SYN-INCLUDED": {
            name: "Synthetic Indicator",
            statement: "Related indicator should render.",
          },
          "KSI-SYN-OTHER": {
            name: "Other Indicator",
            statement: "Unrelated indicator should not render.",
          },
        },
      },
    };

    const artifacts = collectArtifacts(rules, {
      ...config,
      generated: {
        ...config.generated,
        trigramDocuments: [],
        definitionDocuments: [],
        ksiDocuments: [
          {
            id: "20x-a-ksi-reference",
            title: "Key Security Indicators",
            output: "reference/20x/a/key-security-indicators.md",
            outputMode: "single",
            definitionsHref: "../../../definitions/",
            relatedIndicatorsFromRuleDocumentMappingId: "20x-a-reference",
            source: {
              collection: "KSI",
              themes: "ALL",
              classes: ["A"],
            },
          },
        ],
        controlDocuments: [],
        fullControlReferenceDocuments: [],
        deadlineDocuments: [],
        taggedDocumentSummaries: [],
        frrCollectionDocuments: [],
        referenceIndexDocuments: [
          {
            id: "20x-reference-index",
            title: "20x Ruleset Reference",
            description: "Synthetic top-level reference index.",
            purpose: "Verifies class-specific reference links.",
            output: "reference/20x/index.md",
            ruleDocumentMappingIds: ["20x-a-reference", "20x-b-reference"],
            source: {
              collection: "FRR",
              documents: ["SYN", "OMT"],
              types: ["20x"],
              classes: ["A", "B"],
              includeAll: true,
              allPosition: "first",
            },
          },
          {
            id: "20x-b-reference-index",
            title: "20x Class B Ruleset Reference",
            description: "Synthetic reference index.",
            purpose: "Verifies class-specific reference index rows.",
            output: "reference/20x/b/index.md",
            ruleDocumentMappingId: "20x-b-reference",
            source: {
              collection: "FRR",
              documents: ["SYN", "OMT"],
              types: ["20x"],
              classes: ["B"],
              includeAll: true,
              allPosition: "first",
            },
          },
        ],
        ruleDocuments: [
          {
            id: "complete-reference",
            output: "reference/{FRR}.md",
            outputMode: "documents",
            rulesHref: "../",
            emptyBehavior: "skip",
            source: {
              collection: "FRR",
              documents: ["SYN"],
              types: ["all"],
              includeAll: true,
              allPosition: "first",
            },
          },
          {
            id: "provider-20x-rules",
            output: "providers/20x/rules/{FRR}.md",
            outputMode: "documents",
            rulesHref: "../../../",
            emptyBehavior: "skip",
            source: {
              collection: "FRR",
              documents: ["SYN"],
              types: ["20x"],
              affects: ["Providers"],
              includeAll: true,
              allPosition: "first",
            },
          },
          {
            id: "20x-a-reference",
            output: "reference/20x/a/{FRR}.md",
            outputMode: "documents",
            rulesHref: "../",
            relatedRulesOutput: "reference/20x/a/related.md",
            relatedRulesTitle: "20x Class A Related Rules",
            emptyBehavior: "skip",
            source: {
              collection: "FRR",
              documents: ["SYN"],
              types: ["20x"],
              classes: ["A"],
              includeAll: true,
              allPosition: "first",
            },
          },
          {
            id: "20x-b-reference",
            output: "reference/20x/b/{FRR}.md",
            outputMode: "documents",
            rulesHref: "../",
            emptyBehavior: "skip",
            source: {
              collection: "FRR",
              documents: ["SYN"],
              types: ["20x"],
              classes: ["B"],
              includeAll: true,
              allPosition: "first",
            },
          },
        ],
      },
    });

    const ruleArtifact = findArtifact(
      artifacts,
      "reference/20x/b/synthetic-ruleset.md",
    );
    const classARuleArtifact = findArtifact(
      artifacts,
      "reference/20x/a/synthetic-ruleset.md",
    );
    const completeRuleArtifact = findArtifact(
      artifacts,
      "reference/synthetic-ruleset.md",
    );
    const provider20xArtifact = findArtifact(
      artifacts,
      "providers/20x/rules/synthetic-ruleset.md",
    );
    const classARequirement = classARuleArtifact.context.sections
      .flatMap((section) => section.requirements)
      .find((entry) => entry.id === "SYN-AON-ONE");
    const requirementIds = ruleArtifact.context.sections.flatMap((section) =>
      section.requirements.map((requirement) => requirement.id),
    );
    const requirement = ruleArtifact.context.sections
      .flatMap((section) => section.requirements)
      .find((entry) => entry.id === "SYN-BON-VAR");
    const classBSection = ruleArtifact.context.sections.find(
      (section) => section.title === "Class B Only",
    );
    const providerClassBSection = provider20xArtifact.context.sections.find(
      (section) => section.title === "Class B Only",
    );
    const providerRequirementIds = provider20xArtifact.context.sections.flatMap(
      (section) => section.requirements.map((entry) => entry.id),
    );
    const completeRev5Section = completeRuleArtifact.context.sections.find(
      (section) => section.title === "Rev5 Class B",
    );

    expect(requirementIds).toEqual(["SYN-BON-VAR"]);
    expect(classBSection?.applicabilityGroups).toEqual([
      { key: "types", label: "Type", values: ["20x"] },
      {
        key: "paths",
        label: "Path",
        values: ["Program", "Agency"],
      },
      { key: "classes", label: "Class", values: ["Class B"] },
      {
        key: "affects",
        label: "Audience",
        values: ["Providers", "Agencies"],
      },
    ]);
    expect(providerClassBSection?.applicabilityGroups).toEqual([
      { key: "types", label: "Type", values: ["20x"] },
      {
        key: "paths",
        label: "Path",
        values: ["Program", "Agency"],
      },
      { key: "classes", label: "Class", values: ["Class B"] },
      {
        key: "affects",
        label: "Audience",
        values: ["Providers"],
      },
    ]);
    expect(providerRequirementIds).toContain("SYN-AON-ONE");
    expect(providerRequirementIds).toContain("SYN-BON-VAR");
    expect(providerRequirementIds).not.toContain("SYN-R5B-ONE");
    expect(completeRev5Section?.applicabilityGroups).toEqual([
      { key: "types", label: "Type", values: ["Rev5"] },
      { key: "paths", label: "Path", values: ["Agency"] },
      { key: "classes", label: "Class", values: ["Class B"] },
      {
        key: "affects",
        label: "Audience",
        values: ["Providers"],
      },
    ]);
    expect(requirement?.variantSections).toHaveLength(1);
    expect(requirement?.variantSections[0]?.title).toBe("Class B");
    expect(
      requirement?.variantSections[0]?.statementParagraphs.join("\n"),
    ).toContain("Class B variant should render.");
    expect(
      requirement?.variantSections[0]?.statementParagraphs.join("\n"),
    ).not.toContain("Class A variant should not render.");
    expect(requirement?.reference).toEqual({
      label: "Companion Ruleset",
      url: "../companion-ruleset/",
    });
    expect(classARequirement?.statementParagraphs.join("\n")).toContain(
      "[SYN-BON-VAR (Class Variant Requirement)](related.md#class-variant-requirement){ data-preview }",
    );
    expect(classARequirement?.statementParagraphs.join("\n")).toContain(
      "[KSI-SYN-INCLUDED (Synthetic Indicator)](key-security-indicators.md#synthetic-indicator){ data-preview }",
    );

    const relatedArtifact = findArtifact(
      artifacts,
      "reference/20x/a/related.md",
    );
    expect(relatedArtifact.title).toBe("20x Class A Related Rules");
    expect(
      relatedArtifact.context.sections.flatMap((section) =>
        section.requirements.map((entry) => entry.id),
      ),
    ).toEqual(["SYN-BON-VAR"]);

    const ksiArtifact = findArtifact(
      artifacts,
      "reference/20x/a/key-security-indicators.md",
    );
    expect(
      ksiArtifact.context.sections.flatMap((section) =>
        section.requirements.map((entry) => entry.id),
      ),
    ).toEqual(["KSI-SYN-INCLUDED"]);

    const indexArtifact = findArtifact(artifacts, "reference/20x/b/index.md");
    expect(indexArtifact.context.referenceIndexRows).toEqual([
      expect.objectContaining({
        acronym: "SYN",
        href: "synthetic-ruleset.md",
        counts: "Subsets: 1<br>Rules: 1",
      }),
    ]);

    const topIndexArtifact = findArtifact(artifacts, "reference/20x/index.md");
    expect(topIndexArtifact.context.referenceIndexRows).toEqual([
      expect.objectContaining({
        acronym: "SYN",
        href: "a/synthetic-ruleset.md",
        multipleLinks: true,
        links: [
          {
            label: "Class A",
            href: "a/synthetic-ruleset.md",
          },
          {
            label: "Class B",
            href: "b/synthetic-ruleset.md",
          },
        ],
        counts: "Subsets: 2<br>Rules: 2",
      }),
    ]);
  });

  test("trims KSI class variants when a KSI mapping selects a class", async () => {
    const config = await loadToolConfig();
    const rules = structuredClone(await loadRules(config));
    rules.KSI = {
      SYN: {
        id: "SYN",
        name: "Synthetic Indicators",
        web_name: "synthetic-indicators",
        short_name: "SYN",
        status: "stable",
        indicators: {
          "KSI-SYN-VAR": {
            name: "Class Variant Indicator",
            statement:
              "Indicators MUST remain unchanged and MAY use force terms.",
            varies_by_class: {
              b: {
                statement:
                  "Class B indicator SHOULD render and MUST NOT change.",
              },
              c: {
                statement: "Class C indicator should not render.",
              },
            },
          },
        },
      },
    };

    const artifacts = collectArtifacts(rules, {
      ...config,
      generated: {
        ...config.generated,
        trigramDocuments: [],
        definitionDocuments: [],
        ksiDocuments: [
          {
            id: "20x-b-ksi-reference",
            title: "Key Security Indicators",
            output: "reference/20x/b/key-security-indicators.md",
            outputMode: "single",
            source: {
              collection: "KSI",
              themes: "ALL",
              classes: ["B"],
            },
          },
        ],
        controlDocuments: [],
        fullControlReferenceDocuments: [],
        deadlineDocuments: [],
        taggedDocumentSummaries: [],
        referenceIndexDocuments: [],
        frrCollectionDocuments: [],
        ruleDocuments: [],
      },
    });

    const artifact = findArtifact(
      artifacts,
      "reference/20x/b/key-security-indicators.md",
    );
    const indicator = artifact.context.sections[0]?.requirements[0];

    expect(indicator?.variantSections).toHaveLength(1);
    expect(indicator?.statementParagraphs).toEqual([
      "Indicators MUST remain unchanged and MAY use force terms.",
    ]);
    expect(indicator?.variantSections[0]?.title).toBe("Class B");
    expect(indicator?.variantSections[0]?.statementParagraphs.join("\n")).toBe(
      "Class B indicator SHOULD render and MUST NOT change.",
    );
    expect(
      indicator?.variantSections[0]?.statementParagraphs.join("\n"),
    ).not.toContain("Class C indicator should not render.");
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
        trigramDocuments: [],
        definitionDocuments: [],
        ksiDocuments: [],
        controlDocuments: [],
        fullControlReferenceDocuments: [],
        deadlineDocuments: [
          {
            id: "deadlines-with-ignored-marketplace",
            title: "Important Deadlines",
            output: "providers/updating/deadlines/{type}.md",
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
        trigramDocuments: [],
        definitionDocuments: [],
        ksiDocuments: [],
        controlDocuments: [],
        fullControlReferenceDocuments: [],
        deadlineDocuments: [
          {
            id: "provider-deadlines-with-rec",
            title: "Important Deadlines",
            output: "providers/updating/deadlines/{type}.md",
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

  test("renders optional introductions across generated mappings", async () => {
    const config = await loadToolConfig();
    const rules = await loadRules(config);
    const introduction =
      "Introduction **Markdown** & [link](https://example.com)\n- first\n- second\n\nAnother paragraph.";
    const engine = Handlebars.create();
    for (const file of await readdir(resolveToolPath(config.paths.partials))) {
      if (file.endsWith(".hbs")) {
        engine.registerPartial(
          path.basename(file, ".hbs"),
          await readFile(
            path.join(resolveToolPath(config.paths.partials), file),
            "utf8",
          ),
        );
      }
    }
    const templates = new Map<string, Handlebars.TemplateDelegate>();
    const configure = (value?: string): ToolConfig => {
      const copy = structuredClone(config);
      for (const mappings of Object.values(copy.generated)) {
        if (Array.isArray(mappings)) {
          for (const mapping of mappings) mapping.introduction = value;
        }
      }
      if (copy.generated.definitions)
        copy.generated.definitions.introduction = value;
      return copy;
    };
    const baseline = collectArtifacts(rules, configure());
    const introduced = collectArtifacts(rules, configure(introduction));
    expect(introduced.length).toBe(baseline.length);
    for (const [index, artifact] of introduced.entries()) {
      expect(artifact.context.introduction).toBe(introduction);
      let render = templates.get(artifact.templatePath);
      if (!render) {
        render = engine.compile(await readFile(artifact.templatePath, "utf8"), {
          noEscape: true,
        });
        templates.set(artifact.templatePath, render);
      }
      const output = render(artifact.context);
      expect(output).toContain(`# ${artifact.title}\n\n${introduction}\n\n`);
      expect(output.split(introduction).length).toBe(2);
      expect(output.replace(`${introduction}\n\n`, "")).toBe(
        render(baseline[index]!.context),
      );
      expect(render({ ...artifact.context, introduction: "" })).toBe(
        render(baseline[index]!.context),
      );
    }
    for (const artifact of collectArtifacts(rules, configure(" \n\t "))) {
      expect(artifact.context.introduction).toBeUndefined();
    }
    const legacy = configure(introduction);
    legacy.generated.trigramDocuments = [];
    legacy.generated.definitionDocuments = [];
    legacy.generated.definitions = {
      enabled: true,
      output: "legacy-definitions.md",
      introduction,
    };
    expect(
      collectArtifacts(rules, legacy).find(
        (artifact) => artifact.relativePath === "legacy-definitions.md",
      )?.context.introduction,
    ).toBe(introduction);
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
          trigramDocuments: [],
          definitions: undefined,
          definitionDocuments: [
            {
              id: "custom-definitions",
              title: "Custom FedRAMP Definitions",
              output: "reference/fedramp-definitions.md",
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
          controlDocuments: [],
          fullControlReferenceDocuments: [],
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
        [
          "---",
          "tags:",
          "  - 20x",
          "  - Rev5",
          "  - Federal Agencies",
          "  - Cloud Service Providers",
          "  - Independent Assessors",
          "  - Advisors",
          "  - FedRAMP",
          "  - Definitions",
          "---",
          "",
          expectedPictograph(config),
          "",
          "# Custom FedRAMP Definitions",
        ].join("\n"),
      );
      expect(contents.includes("## Important Related Terms")).toBe(
        Object.values((await loadRules()).FRD.data)
          .flatMap((bucket) => Object.values(bucket))
          .some((entry) => Boolean(entry.tag?.trim())),
      );
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
            trigramDocuments: [],
            definitions: undefined,
            definitionDocuments: [
              {
                id: "first-definitions",
                title: "First Definitions",
                output: "definitions.md",
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
            controlDocuments: [],
            fullControlReferenceDocuments: [],
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
  test("stakeholder manual content declares audience and content-type tags", async () => {
    const config = await loadToolConfig();
    const contentPath = resolveToolPath(config.paths.content);
    const markdownPaths = (await listRelativeFiles(contentPath)).filter(
      (relativePath) => relativePath.endsWith(".md"),
    );
    const contentTypeTags = new Set([
      "Controls",
      "Deadlines",
      "Definitions",
      "Guidance",
      "Historical",
      "Key Security Indicators",
      "Legal Authority",
      "Rules",
    ]);
    const requiredAudienceTagByPathPrefix = new Map([
      ["advisors/", "Advisors"],
      ["assessors/", "Independent Assessors"],
      ["providers/", "Cloud Service Providers"],
    ]);

    for (const relativePath of markdownPaths) {
      const requiredAudienceTag = Array.from(
        requiredAudienceTagByPathPrefix.entries(),
      ).find(([pathPrefix]) => relativePath.startsWith(pathPrefix))?.[1];
      if (!requiredAudienceTag) {
        continue;
      }

      const contents = await readFile(
        path.join(contentPath, relativePath),
        "utf8",
      );
      const tags = zensicalTagsFromFrontmatter(contents);
      expect(
        tags.some((tag) => contentTypeTags.has(tag)),
        `${relativePath} should declare a content-type tag`,
      ).toBe(true);
      expect(tags).toContain(requiredAudienceTag);
    }
  });

  test("warns when content markdown is missing valid pictograph frontmatter", async () => {
    const config = await loadToolConfig();
    const contentPath = resolveToolPath(config.paths.content);

    contentPictographWarnings = await findContentPictographWarnings(
      contentPath,
      config,
    );

    expect(Array.isArray(contentPictographWarnings)).toBe(true);
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
          "---",
          "",
          PERSON_PICTO_SPAN,
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
          "---",
          "",
          PERSON_PICTO_SPAN,
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
      await writeFile(
        path.join(tempContentDir, "tight-frontmatter.md"),
        [
          "---",
          "description: Tight source page.",
          "purpose: Confirms frontmatter spacing does not count as drift.",
          "picto:",
          "  source: person",
          "---",
          "# Tight",
          "",
          "Original content.",
          "",
        ].join("\n"),
        "utf8",
      );
      await writeFile(
        path.join(tempSrcDir, "tight-frontmatter.md"),
        [
          "---",
          "description: Tight source page.",
          "purpose: Confirms frontmatter spacing does not count as drift.",
          "picto:",
          "  source: person",
          "---",
          "",
          PERSON_PICTO_SPAN,
          "",
          "# Tight",
          "",
          "Original content.",
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
    await markdownBuild();
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
    const expectedGeneratedFiles = await expectedOutputPaths();
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
    expect(stdout).toContain("Build finished");

    const manifest = await readJson<{ files: string[] }>(
      path.join(srcPath, config.generated.manifest),
    );
    expect(manifest.files).toEqual(expectedGeneratedFiles);

    const { content } = await sources();
    const copies = await readTree(srcPath);
    for (const [filename, source] of content) {
      assertManualCopy(source, copies.get(filename), filename);
      if (filename.endsWith(".md")) {
        assertManualHtml(
          source.toString(),
          await readFile(markdownToHtmlPath(htmlPath, filename), "utf8"),
          filename,
        );
      } else {
        const output = await readFile(path.join(htmlPath, filename));
        assertManualCopy(source, output, filename);
      }
    }

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
    zensicalTagWarnings = await findZensicalTagWarnings(srcPath);
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

    for (const artifact of expectedArtifacts) {
      await assertArtifactSource(
        artifact,
        await readFile(artifact.outputPath, "utf8"),
      );
      await assertArtifactSource(
        artifact,
        await readFile(
          markdownToHtmlPath(htmlPath, artifact.relativePath),
          "utf8",
        ),
        true,
      );
    }
  }, 120_000);
});
