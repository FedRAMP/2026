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

const execFileAsync = promisify(execFile);
const RULES_REMOTE_URL = "https://github.com/FedRAMP/rules.git";
const RULES_REMOTE_BRANCH = "main";
const RULES_SCHEMA_FILE = resolveToolPath(
  "rules/schemas/fedramp-consolidated-rules.schema.json",
);
const STABLE_STATUS_SPAN =
  '<span class="picto">:lucide-computer:{ .machine } :lucide-book-open-check:{ .stable }</span>';
const PLACEHOLDER_STATUS_SPAN =
  '<span class="picto">:lucide-computer:{ .machine } :lucide-pencil:{ .placeholder }</span>';
const WARNING_ORANGE = "\x1b[38;5;208m";
const WARNING_RESET = "\x1b[0m";
const WARNING_MARK = "⚠";
const ERROR_RED = "\x1b[31m";
const COLOR_RESET = "\x1b[0m";
let unlinkedMarkdownWarningPaths: string[] = [];
let boldMarkdownHeadingWarnings: string[] = [];
let contentPictographWarnings: string[] = [];
const humanReadableFailureSummaries: string[] = [];

afterAll(() => {
  printUnlinkedMarkdownWarnings();
  printBoldMarkdownHeadingWarnings();
  printContentPictographWarnings();
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
      `${WARNING_ORANGE}${WARNING_MARK} Content markdown files should begin with one source pictograph and one status pictograph in a picto span:${WARNING_RESET}`,
      "",
      ...contentPictographWarnings.map(
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

async function git(args: string[], cwd = REPO_ROOT): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout.trim();
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function runCommandWithSpinner(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> {
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
    return await new Promise((resolve, reject) => {
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

function escapeRegExp(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences(source: string, needle: string): number {
  return Array.from(source.matchAll(new RegExp(escapeRegExp(needle), "g")))
    .length;
}

function findMarkdownBodyStart(
  contents: string,
): { line: string; lineNumber: number } | null {
  const lines = contents.split(/\r?\n/);
  let index = 0;

  if (lines[0]?.trim() === "---") {
    index = 1;
    while (index < lines.length && lines[index]?.trim() !== "---") {
      index++;
    }

    if (index < lines.length) {
      index++;
    }
  }

  while (index < lines.length && !lines[index]?.trim()) {
    index++;
  }

  const line = lines[index];
  if (line === undefined) {
    return null;
  }

  return {
    line,
    lineNumber: index + 1,
  };
}

function validatePictographSpan(
  relativePath: string,
  contents: string,
  config: ToolConfig,
): string | null {
  const bodyStart = findMarkdownBodyStart(contents);
  if (!bodyStart) {
    return `${relativePath}: missing content`;
  }

  const spanMatch = bodyStart.line
    .trim()
    .match(/^<span class="picto">(.+)<\/span>$/);
  if (!spanMatch?.[1]) {
    return `${relativePath}:${bodyStart.lineNumber}: missing picto span at beginning`;
  }

  const innerSpan = spanMatch[1].trim();
  const sourcePictographs = Object.values(config.pictographs.source);
  const statusPictographs = Object.values(config.pictographs.status);
  const matchedSourcePictographs = sourcePictographs.filter(
    (pictograph) => countOccurrences(innerSpan, pictograph) === 1,
  );
  const matchedStatusPictographs = statusPictographs.filter(
    (pictograph) => countOccurrences(innerSpan, pictograph) === 1,
  );

  if (matchedSourcePictographs.length !== 1) {
    return `${relativePath}:${bodyStart.lineNumber}: expected exactly one source pictograph`;
  }

  if (matchedStatusPictographs.length !== 1) {
    return `${relativePath}:${bodyStart.lineNumber}: expected exactly one status pictograph`;
  }

  const matchedSourcePictograph = matchedSourcePictographs[0];
  const matchedStatusPictograph = matchedStatusPictographs[0];
  if (!matchedSourcePictograph || !matchedStatusPictograph) {
    return `${relativePath}:${bodyStart.lineNumber}: invalid picto span`;
  }

  const remaining = innerSpan
    .replace(matchedSourcePictograph, "")
    .replace(matchedStatusPictograph, "")
    .trim();
  if (remaining.length) {
    return `${relativePath}:${bodyStart.lineNumber}: picto span contains extra content`;
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
    const warning = validatePictographSpan(relativePath, contents, config);
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
    ["definitionDocuments", config.generated.definitionDocuments ?? []],
    ["ksiDocuments", config.generated.ksiDocuments ?? []],
    ["deadlineDocuments", config.generated.deadlineDocuments ?? []],
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

  test("the rules submodule is synced to the latest upstream main", async () => {
    const rulesPath = resolveToolPath("rules");
    const localHead = await git(["rev-parse", "HEAD"], rulesPath);
    const latestRemoteRef = await git([
      "ls-remote",
      RULES_REMOTE_URL,
      `refs/heads/${RULES_REMOTE_BRANCH}`,
    ]);
    const latestRemoteHead = latestRemoteRef.split(/\s+/)[0];
    if (!latestRemoteHead) {
      throw new Error(
        `Could not resolve ${RULES_REMOTE_URL} ${RULES_REMOTE_BRANCH}.`,
      );
    }

    const syncFailureSummary = [
      `tools/rules is not synced to ${RULES_REMOTE_URL} ${RULES_REMOTE_BRANCH}.`,
      `Run "bun run sync" from tools/ and commit the updated submodule pointer.`,
      `Local HEAD: ${localHead}`,
      `Upstream ${RULES_REMOTE_BRANCH}: ${latestRemoteHead}`,
    ].join("\n");

    expectWithFailureSummary(syncFailureSummary, () => {
      expect(localHead, syncFailureSummary).toBe(latestRemoteHead);
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
      "responsibilities/fedramp-security-inbox.md",
      "responsibilities/incident-communications-procedures.md",
      "responsibilities/marketplace-listing.md",
      "responsibilities/significant-change-notifications.md",
      "responsibilities/vulnerability-detection-and-response.md",
    ]) {
      expect(relativePaths).toContain(relativePath);
    }

    for (const artifact of expectedArtifacts) {
      await access(artifact.outputPath);
      const contents = await readFile(artifact.outputPath, "utf8");

      expect(contents).toContain(`# ${artifact.title}`);
      expect(contents.trim().length).toBeGreaterThan(0);
    }

    const definitionsContents = await readFile(
      path.join(OUTPUT_DIR, "definitions.md"),
      "utf8",
    );
    expect(definitionsContents).toStartWith(
      `---\ntags:\n  - 20x\n  - Rev5\n---\n\n${STABLE_STATUS_SPAN}\n\n# FedRAMP Definitions`,
    );
    expect(definitionsContents).not.toContain(
      '??? abstract "Background & Authority"',
    );
    expect(definitionsContents).not.toContain("Effective Date(s)");
    expect(definitionsContents).not.toContain("Overall Applicability");
    expect(definitionsContents).toContain('!!! quote ""');
    const definitionSectionHeaders = Array.from(
      definitionsContents.matchAll(/^## (.+)$/gm),
      (match) => match[1],
    );
    const definitionTags = Array.from(
      new Set(
        Object.values(rules.FRD.data.both ?? {})
          .map((entry) => entry.tag?.trim())
          .filter((tag): tag is string => Boolean(tag)),
      ),
    ).sort((left, right) => left.localeCompare(right));
    expect(definitionSectionHeaders).toEqual([
      "General Terms",
      ...definitionTags.map((tag) => `Specific Terms: ${tag}`),
    ]);
    expect(definitionsContents).toContain("## Specific Terms: Vulnerabilities");

    const ksiArtifactPaths = relativePaths.filter((relativePath) =>
      relativePath.startsWith("providers/20x/key-security-indicators/"),
    );
    expect(ksiArtifactPaths).toHaveLength(Object.keys(rules.KSI).length);

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
      `---\ntags:\n  - 20x\n---\n\n${STABLE_STATUS_SPAN}\n\n# Change Management`,
    );
    expect(ksiChangeManagementContents).toContain("# Change Management");
    expect(ksiChangeManagementContents).not.toContain('!!! info ""');
    expect(ksiChangeManagementContents).toContain("KSI-CMT-LMC");
    expect(ksiChangeManagementContents).toContain("### Logging Changes");
    expect(ksiChangeManagementContents).toContain(
      "**Related SP 800-53 Controls:**",
    );
    expect(ksiChangeManagementContents).toContain(
      "[AU-2](https://controlfreak.risk-redux.io/controls/AU-02)",
    );
    expect(ksiChangeManagementContents).toContain(
      "../../../definitions/#cloud-service-offering",
    );

    const deadlines20xContents = await readFile(
      path.join(OUTPUT_DIR, "providers", "updating", "deadlines", "20x.md"),
      "utf8",
    );
    expect(deadlines20xContents).toStartWith(
      `---\ntags:\n  - 20x\n---\n\n${STABLE_STATUS_SPAN}\n\n# 20x Deadlines`,
    );
    expect(deadlines20xContents).toContain(
      "| FRC | [FedRAMP Certification](../../20x/rules/fedramp-certification.md) | 2026-05-04 | 2027-05-04 | 2027-05-04 |",
    );
    expect(deadlines20xContents).not.toContain("Rev5 Deadlines");
    expect(
      deadlines20xContents.indexOf(
        "| SCG | [Secure Configuration Guide](../../20x/rules/secure-configuration-guide.md) | 2026-03-01 | 2026-03-01 | 2026-07-01 |",
      ),
    ).toBeLessThan(
      deadlines20xContents.indexOf(
        "| MKT | [Marketplace Listing](../../20x/rules/marketplace-listing.md) | 2026-05-04 | 2027-01-01 | 2027-05-04 |",
      ),
    );

    const deadlinesRev5Contents = await readFile(
      path.join(OUTPUT_DIR, "providers", "updating", "deadlines", "rev5.md"),
      "utf8",
    );
    expect(deadlinesRev5Contents).toStartWith(
      `---\ntags:\n  - Rev5\n---\n\n${STABLE_STATUS_SPAN}\n\n# Rev5 Deadlines`,
    );
    expect(deadlinesRev5Contents).toContain(
      "| FRC | [FedRAMP Certification](../../rev5/rules/fedramp-certification.md) | 2027-01-01 | 2027-01-01 | 2027-01-01 |",
    );
    expect(deadlinesRev5Contents).toContain(
      "| MAS | [Minimum Assessment Scope](../../rev5/rules/minimum-assessment-scope.md) | 2027-01-01 | 2027-01-01 | Within 2 months of the next annual assessment after 2027-01-01 |",
    );
    expect(deadlinesRev5Contents).not.toContain("20x Deadlines");

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
    expect(provider20xContents).toStartWith(
      `---\ntags:\n  - 20x\n---\n\n${STABLE_STATUS_SPAN}\n\n# FedRAMP Certification`,
    );
    expect(provider20xContents).toContain("# FedRAMP Certification");
    expect(provider20xContents).toContain("FRC-CSO-CDS");
    expect(provider20xContents).toContain("FRC-CSX-SUM");
    expect(provider20xContents).not.toContain("FRC-CSL-CDE");
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
      `---\ntags:\n  - Rev5\n---\n\n${PLACEHOLDER_STATUS_SPAN}\n\n# FedRAMP Certification`,
    );
    expect(providerRev5Contents).toContain("FRC-CSL-CDE");
    expect(providerRev5Contents).not.toContain("FRC-CSX-SUM");

    const fedrampFsiContents = await readFile(
      path.join(OUTPUT_DIR, "responsibilities", "fedramp-security-inbox.md"),
      "utf8",
    );
    expect(fedrampFsiContents).toStartWith(
      `---\ntags:\n  - 20x\n  - Rev5\n---\n\n${STABLE_STATUS_SPAN}\n\n# FedRAMP Security Inbox`,
    );
    expect(fedrampFsiContents).toContain("# FedRAMP Security Inbox");
    expect(fedrampFsiContents).not.toContain("Effective Date(s)");
    expect(fedrampFsiContents).toContain("FSI-FRP-VRE");
    expect(fedrampFsiContents).not.toContain("FRC-CSO-CDS");

    const fedrampVdrContents = await readFile(
      path.join(
        OUTPUT_DIR,
        "responsibilities",
        "vulnerability-detection-and-response.md",
      ),
      "utf8",
    );
    expect(fedrampVdrContents).toContain(
      "# Vulnerability Detection and Response",
    );
    expect(fedrampVdrContents).toContain("## FedRAMP Responsibilities");
    expect(fedrampVdrContents).not.toContain(
      "## Vulnerability Detection and Response",
    );
    expect(fedrampVdrContents).toContain("VDR-FRP-ARP");

    const agencyCcmContents = await readFile(
      path.join(
        OUTPUT_DIR,
        "agencies",
        "rules",
        "collaborative-continuous-monitoring.md",
      ),
      "utf8",
    );
    expect(agencyCcmContents).toStartWith(
      `---\ntags:\n  - 20x\n  - Rev5\n---\n\n${PLACEHOLDER_STATUS_SPAN}\n\n# Collaborative Continuous Monitoring`,
    );
    expect(agencyCcmContents).toContain("# Collaborative Continuous Monitoring");
    expect(agencyCcmContents).toContain("## Agency Guidance");
    expect(agencyCcmContents).toContain("CCM-AGM-ROR");
    expect(agencyCcmContents).not.toContain("## Ongoing Certification Reports");

    const agencyVdrContents = await readFile(
      path.join(
        OUTPUT_DIR,
        "agencies",
        "rules",
        "vulnerability-detection-and-response.md",
      ),
      "utf8",
    );
    expect(agencyVdrContents).toContain("# Vulnerability Detection and Response");
    expect(agencyVdrContents).toContain("## Agency Guidance");
    expect(agencyVdrContents).toContain("VDR-AGM-RVR");
    expect(agencyVdrContents).not.toContain("VDR-FRP-ARP");
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
              status: "stable",
              includeEffectiveDates: false,
              source: {
                collection: "FRD",
                types: ["20x", "rev5"],
                includeBoth: true,
                bothPosition: "first",
              },
            },
          ],
          ksiDocuments: [],
          deadlineDocuments: [],
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
      expect(contents).toContain("## General Terms");
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
  test("warns when content markdown is missing a valid pictograph span", async () => {
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

describe("build pipeline", () => {
  test("bun run build produces a complete Zensical site", async () => {
    const config = await loadToolConfig();
    const rules = await loadRules(config);
    const expectedArtifacts = collectArtifacts(rules, config);
    const expectedGeneratedFiles = expectedArtifacts
      .map((artifact) => artifact.relativePath)
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
    expect(stdout).toContain("Build finished");

    const manifest = await readJson<{ files: string[] }>(
      path.join(srcPath, config.generated.manifest),
    );
    expect(manifest.files).toEqual(expectedGeneratedFiles);

    const contentFiles = await listRelativeFiles(contentPath);
    for (const relativePath of contentFiles) {
      await access(path.join(srcPath, relativePath));
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

    const renderedPages = [
      {
        path: "definitions/index.html",
        expectedText: ["FedRAMP Definitions", "Cloud Service Offering"],
      },
      {
        path: "providers/20x/rules/fedramp-certification/index.html",
        expectedText: ["FedRAMP Certification", "FRC-CSO-CDS"],
      },
      {
        path: "providers/20x/key-security-indicators/change-management/index.html",
        expectedText: ["Change Management", "KSI-CMT-LMC"],
      },
      {
        path: "providers/updating/deadlines/20x/index.html",
        expectedText: ["20x Deadlines", "FedRAMP Certification"],
      },
      {
        path: "agencies/rules/agency-use/index.html",
        expectedText: ["Agency Use of FedRAMP Certified Cloud Services"],
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
