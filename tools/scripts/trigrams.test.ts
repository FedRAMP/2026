import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildMarkdown, collectArtifacts } from "./build-markdown";
import { loadToolConfig, loadRules, type Rules } from "./test-support/sources";
import { expectedTrigrams } from "./test-support/source-contract";

test("trigram lookup covers collections, rulesets, subsets, and themes with valid targets", async () => {
  const config = await loadToolConfig();
  const rules = await loadRules(config);
  const artifacts = collectArtifacts(rules, config);
  const lookup = artifacts.find(
    (artifact) => artifact.documentType === "TRIGRAMS",
  )!;
  const rows = lookup.context.trigramRows;
  expect(rows).toEqual(expectedTrigrams(rules, config));
  for (const row of rows) {
    if (row.type === "Ruleset subset") {
      const occurrences = Object.values(rules.FRR).filter((document) =>
        Object.hasOwn(document.info.subsets ?? {}, row.trigram),
      ).length;
      expect(Boolean(row.href), row.trigram).toBe(occurrences === 1);
    }
    if (!row.href) continue;
    const [file, anchor] = row.href.split("#");
    const target = artifacts.find((artifact) => artifact.relativePath === file);
    expect(target, row.trigram).toBeDefined();
    if (anchor)
      expect(
        target!.context.sections.some((section) => section.anchorId === anchor),
        row.trigram,
      ).toBe(true);
  }
});

test("shared subset trigrams use a stable representative regardless of source order", async () => {
  const config = await loadToolConfig();
  const rules = structuredClone(await loadRules(config));
  rules.FRR = Object.fromEntries(Object.entries(rules.FRR).reverse());
  const rows = collectArtifacts(rules, config).find(
    (artifact) => artifact.documentType === "TRIGRAMS",
  )!.context.trigramRows;
  expect(rows).toEqual(expectedTrigrams(rules, config));
});

test("trigrams follow moved mappings and fall back to the KSI theme key", async () => {
  const { config, rules } = await trigramFixture();
  delete rules.KSI.XYZ!.short_name;
  config.generated.trigramDocuments![0]!.output = "lookup/trigrams.md";
  config.generated.definitionDocuments![0]!.output = "glossary.md";
  const rows = collectArtifacts(rules, config).find(
    (artifact) => artifact.documentType === "TRIGRAMS",
  )!.context.trigramRows;
  expect(rows.find((row) => row.trigram === "FRD")!.href).toBe(
    "../glossary.md",
  );
  expect(rows.find((row) => row.trigram === "XYZ")!.href).toBe(
    "../reference/key-security-indicators.md#sample-theme",
  );
});

test("trigrams reject missing targets and duplicate identifiers", async () => {
  const { config, rules } = await trigramFixture();
  config.generated.trigramDocuments![0]!.collections.push({
    trigram: "FRD",
    name: "Duplicate",
    mappingId: "fedramp-definitions",
  });
  expect(() => collectArtifacts(rules, config)).toThrow(
    'Duplicate trigram "FRD"',
  );
  config.generated.trigramDocuments![0]!.collections.pop();
  config.generated.trigramDocuments![0]!.definitionDocumentMappingId =
    "missing";
  expect(() => collectArtifacts(rules, config)).toThrow(
    'requires one target from "missing"',
  );
});

test("trigram rendering escapes table cells, tracks its manifest, and protects manual content", async () => {
  const { config, rules } = await trigramFixture();
  const temp = await mkdtemp(path.join(tmpdir(), "fedramp-trigrams-"));
  try {
    config.paths.src = path.join(temp, "src");
    config.paths.content = path.join(temp, "content");
    config.paths.rulesFile = path.join(temp, "rules.json");
    await mkdir(config.paths.content);
    rules.FRD.info.name = "Definitions | Terms\nLookup";
    await writeFile(config.paths.rulesFile, JSON.stringify(rules));
    await buildMarkdown(config);
    const markdown = await readFile(
      path.join(config.paths.src, "trigrams.md"),
      "utf8",
    );
    expect(markdown).toContain(
      "| [FRD](definitions.md) | Definitions \\| Terms Lookup | Collection |",
    );
    expect(markdown.match(/\| Trigram \| Name \| Type \|/g)?.length).toBe(1);
    expect(markdown).toContain("| SHR | Shared subset | Ruleset subset |");
    expect(markdown).not.toContain("[SHR]");
    expect(markdown).toContain('title: "FedRAMP Trigrams"');
    expect(markdown).toContain("source: machine");
    const manifest = JSON.parse(
      await readFile(
        path.join(config.paths.src, config.generated.manifest),
        "utf8",
      ),
    );
    expect(manifest.files).toContain("trigrams.md");
    await writeFile(
      path.join(config.paths.content, "trigrams.md"),
      "Manual content",
    );
    await expect(buildMarkdown(config)).rejects.toThrow(
      "would shadow content/trigrams.md",
    );
    expect(
      await readFile(path.join(config.paths.content, "trigrams.md"), "utf8"),
    ).toBe("Manual content");
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

async function trigramFixture() {
  const config = await loadToolConfig();
  for (const key of Object.keys(config.generated)) {
    if (Array.isArray(config.generated[key as keyof typeof config.generated]))
      (config.generated as unknown as Record<string, unknown>)[key] = [];
  }
  delete config.generated.search;
  const doc = (key: string) => ({
    info: {
      name: `${key} rules`,
      short_name: key,
      web_name: key.toLowerCase(),
      subsets: { SHR: { name: "Shared subset" } },
    },
    data: {
      all: {
        SHR: {
          [`${key}-SHR-ONE`]: {
            name: "Sample rule",
            statement: "Follow this synthetic rule.",
          },
        },
      },
    },
  });
  const rules: Rules = {
    FRD: {
      info: { name: "Definitions", short_name: "FRD", web_name: "definitions" },
      data: {
        all: {
          "FRD-ONE": { term: "Example", definition: "Synthetic definition." },
        },
      },
    },
    FRR: { AAA: doc("AAA"), BBB: doc("BBB") },
    KSI: {
      XYZ: {
        name: "Sample Theme",
        web_name: "sample-theme",
        short_name: "XYZ",
        indicators: {
          "KSI-XYZ-ONE": { name: "Indicator", statement: "Measure this." },
        },
      },
    },
    CTL: {},
  };
  config.generated.definitionDocuments = [
    {
      id: "fedramp-definitions",
      output: "definitions.md",
      source: { collection: "FRD", types: ["all"] },
    },
  ];
  config.generated.ruleDocuments = [
    {
      id: "rules",
      output: "reference/{FRR}.md",
      outputMode: "documents",
      source: { collection: "FRR", documents: "ALL", types: ["all"] },
    },
  ];
  config.generated.ksiDocuments = [
    {
      id: "ksi",
      output: "reference/key-security-indicators.md",
      outputMode: "single",
      source: { collection: "KSI", themes: "ALL" },
    },
  ];
  config.generated.trigramDocuments = [
    {
      id: "trigrams",
      title: "FedRAMP Trigrams",
      description: "Fixture",
      output: "trigrams.md",
      definitionDocumentMappingId: "fedramp-definitions",
      ruleDocumentMappingId: "rules",
      ksiDocumentMappingId: "ksi",
      collections: [],
    },
  ];
  return { config, rules };
}
