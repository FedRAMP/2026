import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildMarkdown, collectArtifacts, loadRules } from "./build-markdown";
import { loadToolConfig } from "./config";

test("trigram lookup covers collections, rulesets, subsets, and themes with valid targets", async () => {
  const config = await loadToolConfig();
  const rules = await loadRules(config);
  const artifacts = collectArtifacts(rules, config);
  const lookup = artifacts.find(
    (artifact) => artifact.documentType === "TRIGRAMS",
  )!;
  const rows = lookup.context.trigramRows;
  const expected = [rules.FRD.info.short_name!, "FRR", "KSI", "CTL"];
  for (const [key, document] of Object.entries(rules.FRR)) {
    const trigram = document.info.short_name ?? key;
    expected.push(
      trigram,
      ...Object.keys(document.info.subsets ?? {}),
    );
  }
  expected.push(
    ...Object.entries(rules.KSI).map(
      ([key, theme]) => theme.short_name ?? key,
    ),
  );
  expect(rows.map((row) => row.trigram)).toEqual(
    [...new Set(expected)].sort((a, b) => a.localeCompare(b, "en")),
  );
  expect(new Set(rows.map((row) => row.trigram)).size).toBe(rows.length);
  expect(new Set(rows.map((row) => row.type))).toEqual(
    new Set(["Collection", "Ruleset", "Ruleset subset", "KSI theme"]),
  );
  for (const excluded of ["FRD-SNT", "AFC-CSO", "CDS-CSO", "AFC-CSO-ABC", "KSI-CED", "KSI-CED-RAT"]) {
    expect(rows.some((row) => row.trigram === excluded)).toBe(false);
  }
  const href = (trigram: string) =>
    rows.find((row) => row.trigram === trigram)?.href;
  expect(href("FRD")).toBe("definitions.md");
  expect(href("MKT")).toBe("reference/marketplace-listing.md");
  expect(href("CSO")).toBeUndefined();
  expect(href("TRC")).toBe("reference/certification-data-sharing.md#fedramp-compatible-trust-centers");
  expect(href("CED")).toBe(
    "reference/key-security-indicators.md#cybersecurity-education",
  );
  for (const row of rows) {
    if (row.type === "Ruleset subset") {
      const occurrences = Object.values(rules.FRR).filter(
        (document) => Object.hasOwn(document.info.subsets ?? {}, row.trigram),
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
  expect(rows.filter((row) => row.trigram === "CSO")).toEqual([{
    trigram: "CSO",
    name: "General Provider Responsibilities",
    type: "Ruleset subset",
    href: undefined,
  }]);
  expect(rows.filter((row) => row.trigram === "FRP")).toHaveLength(1);
  expect(rows.filter((row) => row.trigram === "IAS")).toHaveLength(1);
});

test("trigrams follow moved mappings and fall back to the KSI theme key", async () => {
  const config = structuredClone(await loadToolConfig());
  const rules = structuredClone(await loadRules(config));
  delete rules.KSI.CED!.short_name;
  config.generated.trigramDocuments![0]!.output = "lookup/trigrams.md";
  config.generated.definitionDocuments![0]!.output = "glossary.md";
  const rows = collectArtifacts(rules, config).find(
    (artifact) => artifact.documentType === "TRIGRAMS",
  )!.context.trigramRows;
  expect(rows.find((row) => row.trigram === "FRD")!.href).toBe(
    "../glossary.md",
  );
  expect(rows.find((row) => row.trigram === "CED")!.href).toBe(
    "../reference/key-security-indicators.md#cybersecurity-education",
  );
});

test("trigrams reject missing targets and duplicate identifiers", async () => {
  const config = structuredClone(await loadToolConfig());
  const rules = await loadRules(config);
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
  const config = structuredClone(await loadToolConfig());
  const rules = structuredClone(await loadRules(config));
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
    expect(markdown).toContain("| CSO | General Provider Responsibilities | Ruleset subset |");
    expect(markdown).not.toContain("[CSO]");
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
