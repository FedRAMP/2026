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

    const relativePaths = summary.artifacts
      .map((artifact) => artifact.relativePath)
      .sort();
    expect(relativePaths).toEqual(
      expectedArtifacts.map((artifact) => artifact.relativePath).sort(),
    );
    for (const relativePath of [
<<<<<<< HEAD
      "agencies/rules/collaborative-continuous-monitoring.md",
      "agencies/rules/vulnerability-detection-and-response.md",
      "definitions.md",
      "providers/20x/key-security-indicators/change-management.md",
      "providers/20x/key-security-indicators/cloud-native-architecture.md",
      "providers/20x/rules/fedramp-certification.md",
      "responsibilities/fedramp-security-inbox.md",
      "responsibilities/incident-communications-procedures.md",
      "responsibilities/marketplace-listing.md",
      "responsibilities/significant-change-notifications.md",
      "responsibilities/vulnerability-detection-and-response.md",
=======
      "agencies/rules/ccm.md",
      "agencies/rules/vdr.md",
      "definitions.md",
      "providers/20x/rules/frc.md",
      "responsibilities/fsi.md",
      "responsibilities/icp.md",
      "responsibilities/mkt.md",
      "responsibilities/scn.md",
      "responsibilities/vdr.md",
>>>>>>> main
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
    expect(definitionsContents).not.toContain(
      '??? abstract "Background & Authority"',
    );
<<<<<<< HEAD
    expect(definitionsContents).not.toContain("Effective Date(s)");
    expect(definitionsContents).not.toContain("Overall Applicability");
=======
>>>>>>> main
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

<<<<<<< HEAD
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

=======
>>>>>>> main
    const contentDefinitionsPath = path.join(
      resolveToolPath(config.paths.content),
      "definitions.md",
    );
    await expect(access(contentDefinitionsPath)).rejects.toThrow();

    const provider20xContents = await readFile(
<<<<<<< HEAD
      path.join(
        OUTPUT_DIR,
        "providers",
        "20x",
        "rules",
        "fedramp-certification.md",
      ),
=======
      path.join(OUTPUT_DIR, "providers", "20x", "rules", "frc.md"),
>>>>>>> main
      "utf8",
    );
    expect(provider20xContents).toContain("# FedRAMP Certification");
    expect(provider20xContents).toContain("FRC-CSO-CDS");
    expect(provider20xContents).toContain("FRC-CSX-SUM");
    expect(provider20xContents).not.toContain("FRC-CSL-CDE");
    expect(provider20xContents).toContain("../../../definitions/#");

    const fedrampFsiContents = await readFile(
<<<<<<< HEAD
      path.join(OUTPUT_DIR, "responsibilities", "fedramp-security-inbox.md"),
=======
      path.join(OUTPUT_DIR, "responsibilities", "fsi.md"),
>>>>>>> main
      "utf8",
    );
    expect(fedrampFsiContents).toContain("# FedRAMP Security Inbox");
    expect(fedrampFsiContents).not.toContain("Effective Date(s)");
    expect(fedrampFsiContents).toContain("FSI-FRP-VRE");
    expect(fedrampFsiContents).not.toContain("FRC-CSO-CDS");

    const fedrampVdrContents = await readFile(
<<<<<<< HEAD
      path.join(
        OUTPUT_DIR,
        "responsibilities",
        "vulnerability-detection-and-response.md",
      ),
=======
      path.join(OUTPUT_DIR, "responsibilities", "vdr.md"),
>>>>>>> main
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
<<<<<<< HEAD
      path.join(
        OUTPUT_DIR,
        "agencies",
        "rules",
        "collaborative-continuous-monitoring.md",
      ),
=======
      path.join(OUTPUT_DIR, "agencies", "rules", "ccm.md"),
>>>>>>> main
      "utf8",
    );
    expect(agencyCcmContents).toContain("# Collaborative Continuous Monitoring");
    expect(agencyCcmContents).toContain("## Agency Guidance");
    expect(agencyCcmContents).toContain("CCM-AGM-ROR");
    expect(agencyCcmContents).not.toContain("## Ongoing Certification Reports");

    const agencyVdrContents = await readFile(
<<<<<<< HEAD
      path.join(
        OUTPUT_DIR,
        "agencies",
        "rules",
        "vulnerability-detection-and-response.md",
      ),
=======
      path.join(OUTPUT_DIR, "agencies", "rules", "vdr.md"),
>>>>>>> main
      "utf8",
    );
    expect(agencyVdrContents).toContain("# Vulnerability Detection and Response");
    expect(agencyVdrContents).toContain("## Agency Guidance");
    expect(agencyVdrContents).toContain("VDR-AGM-RVR");
    expect(agencyVdrContents).not.toContain("VDR-FRP-ARP");
<<<<<<< HEAD
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
=======

>>>>>>> main
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
