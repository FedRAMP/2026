import { expect, test } from "bun:test";
import { collectArtifacts } from "./build-markdown";
import { loadToolConfig, type Rules } from "./test-support/sources";
import { selectedRules } from "./test-support/source-contract";

async function fixture() {
  const config = await loadToolConfig();
  config.generated = { manifest: config.generated.manifest, ruleDocuments: [] };
  const rules: Rules = {
    FRD: { info: { name: "Definitions", web_name: "definitions" }, data: {} },
    FRR: {
      SYN: {
        info: {
          name: "Synthetic Rules",
          web_name: "synthetic",
          short_name: "SYN",
          subsets: {
            ONE: {
              name: "Base subset",
              applicability: {
                types: ["20x"],
                classes: ["B"],
                affects: ["Providers"],
                paths: ["Program"],
              },
            },
          },
        },
        data: {
          all: {
            ONE: {
              "SYN-ONE-BASE": {
                name: "Base",
                statement: "Base text.",
                affects: ["Providers"],
              },
              "SYN-ONE-ADD": {
                name: "Added",
                statement: "Added text.",
                affects: ["Providers"],
                applicability: { add: { classes: ["A"] } },
              },
              "SYN-ONE-REMOVE": {
                name: "Removed",
                statement: "Removed text.",
                affects: ["Providers"],
                applicability: {
                  add: { classes: ["A"] },
                  exclude: { classes: ["A", "B"] },
                },
              },
              "SYN-ONE-SPARSE": {
                name: "Sparse",
                affects: ["Providers"],
                applicability: { add: { classes: ["A"] } },
                varies_by_class: { a: { statement: "Only A." } },
              },
            },
          },
        },
      },
    },
    KSI: {},
    CTL: {},
  };
  for (const className of ["A", "B", "C"]) {
    config.generated.ruleDocuments.push({
      id: `rules-${className}`,
      output: `reference/${className}/{FRR}.md`,
      outputMode: "documents",
      emptyBehavior: "skip",
      source: {
        collection: "FRR",
        documents: "ALL",
        types: ["20x"],
        classes: [className],
      },
    });
  }
  config.generated.referenceIndexDocuments = [
    {
      id: "index",
      title: "Reference",
      description: "Synthetic index",
      purpose: "Check applicability",
      output: "reference/index.md",
      ruleDocumentMappingIds: ["rules-A", "rules-B", "rules-C"],
      source: {
        collection: "FRR",
        documents: "ALL",
        types: ["20x"],
        classes: ["A", "B", "C"],
      },
    },
  ];
  return { config, rules };
}

test("all class mappings apply additions before exclusions, including sparse variants", async () => {
  const { config, rules } = await fixture();
  const artifacts = collectArtifacts(rules, config);
  const byClass = (c: string) =>
    artifacts.find((a) => a.mappingId === `rules-${c}`);
  const ids = (c: string) =>
    byClass(c)?.context.sections.flatMap((s) =>
      s.requirements.map((r) => r.id),
    );
  expect(ids("A")).toEqual(["SYN-ONE-ADD", "SYN-ONE-SPARSE"]);
  expect(ids("B")).toEqual(["SYN-ONE-BASE", "SYN-ONE-ADD"]);
  expect(byClass("C")).toBeUndefined();
  expect(byClass("A")!.context.sections[0]!.applicabilityGroups).toContainEqual(
    { key: "classes", label: "Class", values: ["Class A"] },
  );
  const index = artifacts.find((a) => a.mappingId === "index")!;
  expect(index.context.referenceIndexRows[0]!.counts).toBe(
    "Subsets: 1<br>Rules: 3",
  );
  expect(
    index.context.referenceIndexRows[0]!.links.map((link) => link.label),
  ).toContain("Class A");
  expect(
    index.context.referenceIndexRows[0]!.links.map((link) => link.label),
  ).not.toContain("Class C");
  for (const mapping of config.generated.ruleDocuments) {
    expect(selectedRules(rules, mapping.source).map(([id]) => id)).toEqual(
      ids(mapping.source.classes![0]!) ?? [],
    );
  }
});

test("type and audience overrides affect selection, and an emptied dimension stays excluded", async () => {
  const { config, rules } = await fixture();
  rules.FRR.SYN!.info.subsets!.ONE!.applicability = {
    types: ["Rev5"],
    classes: ["A"],
    affects: ["Agencies"],
  };
  const entries = rules.FRR.SYN!.data.all!.ONE!;
  entries["SYN-ONE-ADD"]!.applicability = {
    add: { types: ["20x"], affects: ["Providers"] },
  };
  entries["SYN-ONE-REMOVE"]!.applicability = {
    add: { types: ["20x"], affects: ["Providers"] },
    exclude: { types: ["20x", "Rev5"] },
  };
  config.generated.ruleDocuments.forEach((m) => {
    m.source.affects = ["Providers"];
  });
  const artifacts = collectArtifacts(rules, config);
  expect(
    artifacts
      .find((a) => a.mappingId === "rules-A")!
      .context.sections.flatMap((s) => s.requirements.map((r) => r.id)),
  ).toEqual(["SYN-ONE-ADD"]);
  expect(
    selectedRules(rules, config.generated.ruleDocuments[0]!.source).map(
      ([id]) => id,
    ),
  ).toEqual(["SYN-ONE-ADD"]);
});

test("KSI groups use displayed forces, retain theme anchors, and omit Class D on shared pages", async () => {
  const { config, rules } = await fixture();
  config.generated.ruleDocuments = [];
  config.generated.referenceIndexDocuments = [];
  rules.KSI = {
    SYN: {
      name: "Synthetic Theme",
      web_name: "synthetic-theme",
      short_name: "SYN",
      indicators: {
        "KSI-SYN-OPT": {
          name: "Optional",
          statement: "Optional text.",
          force_by_class: { a: "MAY", b: "MAY", c: "MAY", d: "MUST" },
        },
        "KSI-SYN-MIX": {
          name: "Mixed",
          statement: "Mixed text.",
          force_by_class: { a: "MAY", b: "MUST", c: "MUST", d: "MUST" },
        },
        "KSI-SYN-REQ": {
          name: "Required",
          statement: "Required text.",
          force_by_class: { a: "MUST", b: "MUST", c: "MUST", d: "MUST" },
        },
      },
    },
  };
  config.generated.ksiDocuments = [undefined, "A", "B", "C"].map(
    (className) => ({
      id: className ?? "shared",
      output: `ksi/${className ?? "shared"}.md`,
      outputMode: "single",
      source: {
        collection: "KSI",
        themes: "ALL",
        ...(className ? { classes: [className] } : {}),
      },
    }),
  );
  for (const artifact of collectArtifacts(rules, config)) {
    expect(artifact.context.ksiGroups.map((g) => g.title)).toEqual([
      "Required Key Security Indicators",
      "Optional Key Security Indicators",
    ]);
    const [required, optional] = artifact.context.ksiGroups;
    expect(
      required!.sections.flatMap((s) => s.requirements.map((r) => r.id)),
    ).toEqual(
      artifact.mappingId === "A"
        ? ["KSI-SYN-REQ"]
        : ["KSI-SYN-MIX", "KSI-SYN-REQ"],
    );
    expect(
      optional!.sections.flatMap((s) => s.requirements.map((r) => r.id)),
    ).toEqual(
      artifact.mappingId === "A"
        ? ["KSI-SYN-OPT", "KSI-SYN-MIX"]
        : ["KSI-SYN-OPT"],
    );
    expect(required!.sections[0]!.anchorId).toBe("synthetic-theme");
    expect(optional!.sections[0]!.anchorId).toBe("synthetic-theme-optional");
    expect(
      artifact.context.sections
        .flatMap((s) => s.requirements)
        .flatMap((r) => r.classForces)
        .some((f) => f?.className === "D"),
    ).toBe(false);
  }
});

test("production mappings omit 20x Class D and the Class A companion page", async () => {
  const config = await loadToolConfig();
  for (const mapping of [
    ...config.generated.ruleDocuments,
    ...(config.generated.referenceIndexDocuments ?? []),
  ]) {
    if (mapping.source.types?.includes("20x"))
      expect(mapping.source.classes ?? []).not.toContain("D");
  }
  for (const mapping of config.generated.ksiDocuments ?? [])
    expect(mapping.source.classes ?? []).not.toContain("D");
  const classA = config.generated.ruleDocuments.find(
    (m) => m.id === "20x-a-ruleset-reference",
  )!;
  expect(classA.relatedRulesOutput).toBeUndefined();
  expect(classA.relatedRulesGroups).toBeUndefined();
});
