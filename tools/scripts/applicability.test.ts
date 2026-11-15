import { expect, test } from "bun:test";
import { collectArtifacts } from "./build-markdown";
import { loadToolConfig, loadRules, type Rules } from "./test-support/sources";
import { selectedRules } from "./test-support/source-contract";
import { readFile } from "node:fs/promises";
import Handlebars from "handlebars";

test("all-class summaries and deadlines keep broad destinations when class references affect Providers", async () => {
  const config = await loadToolConfig();
  const rules = await loadRules();
  const select = (artifacts: ReturnType<typeof collectArtifacts>) =>
    artifacts
      .filter(
        (a) =>
          a.documentType === "DEADLINES" ||
          a.documentType === "FRR_TAGGED_SUMMARY",
      )
      .map((a) => ({ path: a.relativePath, context: a.context }));
  const actual = select(collectArtifacts(rules, config));
  const withoutClassReferences = structuredClone(config);
  withoutClassReferences.generated.ruleDocuments =
    config.generated.ruleDocuments.filter((m) => !m.source.classes?.length);
  withoutClassReferences.generated.referenceIndexDocuments =
    config.generated.referenceIndexDocuments?.filter(
      (m) => !m.source.classes?.length,
    );
  expect(actual).toEqual(
    select(collectArtifacts(rules, withoutClassReferences)),
  );
});

test("rule quotes render resolved artifacts and explicit applicability notes", async () => {
  const { config, rules } = await fixture();
  const entry = rules.FRR.SYN!.data.all!.ONE!["SYN-ONE-ADD"]!;
  entry.force = "MUST";
  entry.artifacts = { all: ["Common evidence."] };
  entry.varies_by_class = {
    a: { applicable: true, artifacts: { all: ["Class A evidence."] } },
    c: { applicable: false },
  };
  const shared = structuredClone(config.generated.ruleDocuments[0]!);
  shared.id = "shared";
  shared.output = "reference/shared/{FRR}.md";
  delete shared.source.classes;
  config.generated.ruleDocuments.push(shared);
  const artifacts = collectArtifacts(rules, config);
  const hb = Handlebars.create();
  hb.registerPartial("rev5-control-list", "");
  const render = hb.compile(
    await readFile(
      new URL("../templates/partials/requirement.hbs", import.meta.url),
      "utf8",
    ),
  );
  const rule = (id: string) =>
    artifacts
      .find((a) => a.mappingId === id)!
      .context.sections.flatMap((s) => s.requirements)
      .find((r) => r.id === "SYN-ONE-ADD")!;
  const a = render(rule("rules-A"));
  expect(a).toContain("    **Artifacts:**\n\n    - Class A evidence.");
  expect(a).not.toContain("Common evidence.");
  expect(a).toContain("    **This rule also applies for Class A.**");
  expect(a).not.toContain("Class C.");
  expect(a).not.toMatch(/\*\*(?:Force|Applicable Classes|Class A):/);
  expect(a).not.toContain("Artifacts (all)");
  const common = render(rule("shared"));
  expect(common).toContain('=== "Class A"');
  expect(common).toContain(
    "        **Artifacts:**\n\n        - Class A evidence.",
  );
  expect(common).toContain(
    "        **Artifacts:**\n\n        - Common evidence.",
  );
  expect(common).toContain("    **This rule does not apply for Class C.**");
  expect(common).not.toContain("**Force:**");
});

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
                varies_by_class: { a: { applicable: true } },
              },
              "SYN-ONE-REMOVE": {
                name: "Removed",
                statement: "Removed text.",
                affects: ["Providers"],
                varies_by_class: {
                  a: { applicable: false },
                  b: { applicable: false },
                },
              },
              "SYN-ONE-SPARSE": {
                name: "Sparse",
                affects: ["Providers"],
                statement: "Inherited text.",
                varies_by_class: {
                  a: { applicable: true, statement: "Only A." },
                },
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

test("all class mappings honor explicit class membership and missing variants", async () => {
  const { config, rules } = await fixture();
  const artifacts = collectArtifacts(rules, config);
  const byClass = (c: string) =>
    artifacts.find((a) => a.mappingId === `rules-${c}`);
  const ids = (c: string) =>
    byClass(c)?.context.sections.flatMap((s) =>
      s.requirements.map((r) => r.id),
    );
  expect(ids("A")).toEqual(["SYN-ONE-ADD", "SYN-ONE-SPARSE"]);
  expect(ids("B")).toEqual(["SYN-ONE-BASE", "SYN-ONE-ADD", "SYN-ONE-SPARSE"]);
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

test("a rule excluded from every inherited class is absent from unfiltered references", async () => {
  const { config, rules } = await fixture();
  for (const mapping of config.generated.ruleDocuments)
    delete mapping.source.classes;
  const page = collectArtifacts(rules, config).find(
    (a) => a.mappingId === "rules-A",
  )!;
  expect(
    page.context.sections.flatMap((s) => s.requirements.map((r) => r.id)),
  ).not.toContain("SYN-ONE-REMOVE");
  expect(
    selectedRules(rules, config.generated.ruleDocuments[0]!.source).map(
      ([id]) => id,
    ),
  ).not.toContain("SYN-ONE-REMOVE");
});

test("class inclusion does not override framework or audience", async () => {
  const { config, rules } = await fixture();
  rules.FRR.SYN!.info.subsets!.ONE!.applicability = {
    types: ["Rev5"],
    classes: ["B"],
    affects: ["Agencies"],
  };
  config.generated.ruleDocuments.forEach((m) => {
    m.source.affects = ["Providers"];
  });
  expect(
    collectArtifacts(rules, config).filter((a) => a.documentType === "FRR"),
  ).toEqual([]);
  expect(
    selectedRules(rules, config.generated.ruleDocuments[0]!.source),
  ).toEqual([]);
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
          varies_by_class: {
            a: { force: "MAY" },
            b: { force: "MAY" },
            c: { force: "MAY" },
            d: { force: "MUST" },
          },
        },
        "KSI-SYN-MIX": {
          name: "Mixed",
          statement: "Mixed text.",
          varies_by_class: {
            a: { force: "MAY" },
            b: { force: "MUST" },
            c: { force: "MUST" },
            d: { force: "MUST" },
          },
        },
        "KSI-SYN-REQ": {
          name: "Required",
          statement: "Required text.",
          varies_by_class: {
            a: { force: "MUST" },
            b: { force: "MUST" },
            c: { force: "MUST" },
            d: { force: "MUST" },
          },
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
