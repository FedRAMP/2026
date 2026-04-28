import { describe, expect, test } from "bun:test";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  buildMarkdown,
  collectArtifacts,
  loadRules,
  OUTPUT_DIR,
  RULES_FILE,
} from "./build-markdown";
import { loadToolConfig, resolveToolPath } from "./config";
import { deploy } from "./deploy";

describe("build-markdown", () => {
  test("the consolidated rules source exists", async () => {
    await access(RULES_FILE);
  });

  test("builds configured markdown files from the JSON source", async () => {
    const config = await loadToolConfig();
    const rules = await loadRules(config);
    const expectedArtifacts = collectArtifacts(rules, config);

    await deploy();
    const summary = await buildMarkdown();
    expect(summary.artifactCount).toBe(expectedArtifacts.length);

    expect(summary.artifacts.map((artifact) => artifact.relativePath).sort()).toEqual(
      [
        "definitions.md",
        "providers/20x/initial/certification.md",
        "providers/rev5/initial/certification.md",
        "responsibilities/fsi.md",
        "responsibilities/icp.md",
        "responsibilities/index.md",
        "responsibilities/mkt.md",
        "responsibilities/scn.md",
        "responsibilities/vdr.md",
      ],
    );

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

    const contentDefinitionsPath = path.join(
      resolveToolPath(config.paths.content),
      "definitions.md",
    );
    await expect(access(contentDefinitionsPath)).rejects.toThrow();

    const provider20xContents = await readFile(
      path.join(OUTPUT_DIR, "providers", "20x", "initial", "certification.md"),
      "utf8",
    );
    expect(provider20xContents).toContain(
      '!!! info "Effective Date(s) & Overall Applicability for 20x"',
    );
    expect(provider20xContents).toContain("FRC-CSO-CDS");
    expect(provider20xContents).toContain("FRC-CSX-SUM");
    expect(provider20xContents).not.toContain("FRC-CSL-CDE");
    expect(provider20xContents).toContain("../../../definitions/#");

    const providerRev5Contents = await readFile(
      path.join(OUTPUT_DIR, "providers", "rev5", "initial", "certification.md"),
      "utf8",
    );
    expect(providerRev5Contents).toContain(
      '!!! info "Effective Date(s) & Overall Applicability for Rev5"',
    );
    expect(providerRev5Contents).toContain("FRC-CSO-CDS");
    expect(providerRev5Contents).toContain("FRC-CSL-CDE");
    expect(providerRev5Contents).not.toContain("FRC-CSX-SUM");

    const fedrampResponsibilitiesContents = await readFile(
      path.join(OUTPUT_DIR, "responsibilities", "index.md"),
      "utf8",
    );
    expect(fedrampResponsibilitiesContents).toContain(
      "# FedRAMP Responsibilities",
    );
    expect(fedrampResponsibilitiesContents).not.toContain("Effective Date(s)");
    expect(fedrampResponsibilitiesContents).toContain("FSI-FRP-VRE");
    expect(fedrampResponsibilitiesContents).toContain("ICP-FRP-ORV");
    expect(fedrampResponsibilitiesContents).toContain("MKT-FRP-DSM");
    expect(fedrampResponsibilitiesContents).toContain("SCN-FRP-CAP");
    expect(fedrampResponsibilitiesContents).toContain("VDR-FRP-ARP");
    expect(fedrampResponsibilitiesContents).not.toContain("FRC-CSO-CDS");

    const fedrampVdrContents = await readFile(
      path.join(OUTPUT_DIR, "responsibilities", "vdr.md"),
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
