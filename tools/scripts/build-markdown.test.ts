import { describe, expect, test } from "bun:test";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  buildMarkdown,
  collectArtifacts,
  loadRules,
  OUTPUT_DIR,
  RULES_FILE,
} from "./build-markdown";

async function listMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const filePaths = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listMarkdownFiles(fullPath);
      }

      return entry.name.endsWith(".md") ? [fullPath] : [];
    }),
  );

  return filePaths.flat();
}

describe("build-markdown", () => {
  test("the consolidated rules source exists", async () => {
    await access(RULES_FILE);
  });

  test("builds the expected markdown files from the JSON source", async () => {
    const rules = await loadRules();
    const expectedArtifacts = collectArtifacts(rules);

    const summary = await buildMarkdown();
    expect(summary.artifactCount).toBe(expectedArtifacts.length);

    const actualFiles = (await listMarkdownFiles(OUTPUT_DIR))
      .map((filePath) => path.relative(OUTPUT_DIR, filePath))
      .sort();
    const expectedFiles = [
      ...expectedArtifacts.map((artifact) => artifact.relativePath),
      "index.md",
    ]
      .sort();

    expect(actualFiles).toEqual(expectedFiles);

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
    expect(definitionsContents).not.toContain(
      '??? abstract "Background & Authority"',
    );
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

    const previewIndexContents = await readFile(
      path.join(OUTPUT_DIR, "index.md"),
      "utf8",
    );
    expect(previewIndexContents).toContain("# FedRAMP Rules Preview");
    expect(previewIndexContents).toContain("[Definitions](definitions/)");

    const requirementContents = await readFile(
      path.join(OUTPUT_DIR, "20x", "certification-data-sharing.md"),
      "utf8",
    );
    expect(requirementContents).toContain(
      '!!! info "Effective Date(s) & Overall Applicability for 20x"',
    );
    expect(requirementContents).toContain('{ data-preview }');
    expect(requirementContents).toContain("../definitions/#");

    expect(definitionsContents).toContain(
      '!!! info "Effective Date(s) & Overall Applicability for 20x and Rev5"',
    );

    const sharedTwentyXContents = await readFile(
      path.join(OUTPUT_DIR, "20x", "fedramp-security-inbox.md"),
      "utf8",
    );
    expect(sharedTwentyXContents).toContain(
      '!!! info "Effective Date(s) & Overall Applicability for 20x"',
    );

    const sharedRev5Contents = await readFile(
      path.join(OUTPUT_DIR, "rev5", "fedramp-security-inbox.md"),
      "utf8",
    );
    expect(sharedRev5Contents).toContain(
      '!!! info "Effective Date(s) & Overall Applicability for Rev5"',
    );

    const nonApplicableRev5Path = path.join(
      OUTPUT_DIR,
      "rev5",
      "persistent-validation-and-assessment.md",
    );
    await expect(access(nonApplicableRev5Path)).rejects.toThrow();
  });
});
