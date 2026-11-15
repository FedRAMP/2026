import { expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import {
  CLASS_CONTENT_FIELDS,
  applicableClasses,
  resolveClassContent,
} from "./class-content";
import { collectArtifacts } from "./build-markdown";
import { loadRules, loadToolConfig, type Rules } from "./test-support/sources";
import {
  expectedClassContent,
  selectedRules,
  type RuleEntry,
} from "./test-support/source-contract";
import { normalizeOscalControlId } from "./oscal-catalog";
import { resolveToolPath } from "./config";

const schema = await Bun.file(
  resolveToolPath("rules/schemas/fedramp-consolidated-rules.schema.json"),
).json();

test("override fields match the current schema and replace whole values", () => {
  expect(Object.keys(schema.$defs.class_content.properties).sort()).toEqual(
    [...CLASS_CONTENT_FIELDS].sort(),
  );
  const entry: RuleEntry = {
    statement: "Common statement.",
    force: "MUST",
    timeframe_type: "days",
    timeframe_num: 9,
    notes: ["First common note.", "Second common note."],
    following_information: ["First", "Second"],
    artifacts: { all: ["Common"], rev5: ["Rev5"] },
    schema: { name: "Common schema", url: "https://example.com/common" },
    effective_date: { obtain: "2027-01-01", maintain: "2027-02-01" },
    varies_by_class: {
      b: {
        timeframe_num: 3,
        notes: [],
        following_information: ["Replacement"],
        artifacts: { all: ["Replacement artifact"] },
        schema: {
          name: "Replacement schema",
          url: "https://example.com/replacement",
        },
        effective_date: { obtain: "2028-01-01" },
      },
      c: { statement: "Only C.", force: "MAY", note: "Only C note." },
    },
  };
  const original = structuredClone(entry);
  const b = resolveClassContent(entry, "B");
  expect(b).toMatchObject({
    statement: "Common statement.",
    force: "MUST",
    timeframe_type: "days",
    timeframe_num: 3,
    notes: [],
    following_information: ["Replacement"],
    artifacts: { all: ["Replacement artifact"] },
    schema: {
      name: "Replacement schema",
      url: "https://example.com/replacement",
    },
    effective_date: { obtain: "2028-01-01" },
  });
  expect(b.artifacts).toEqual({ all: ["Replacement artifact"] });
  expect(b.effective_date).toEqual({ obtain: "2028-01-01" });
  expect(b.note).toBeUndefined();
  expect(b.following_information_bullets).toBeUndefined();
  for (const c of ["A", "D"]) {
    expect(resolveClassContent(entry, c)).toEqual({
      ...entry,
      varies_by_class: undefined,
    });
  }
  expect(entry).toEqual(original);
});

test("explicit membership is separate from force and missing variants inherit membership", () => {
  const entry: RuleEntry = {
    force: "MAY",
    varies_by_class: {
      a: { applicable: true },
      b: { applicable: false },
      c: { force: "MAY" },
    },
  };
  expect(applicableClasses(entry, ["B", "C", "D"])).toEqual(["A", "C", "D"]);
  expect(resolveClassContent(entry, "A").force).toBe("MAY");
});

async function renderingFixture() {
  const config = await loadToolConfig();
  config.generated = {
    manifest: config.generated.manifest,
    ruleDocuments: [
      {
        id: "rules",
        output: "rules.md",
        source: {
          collection: "FRR",
          documents: "ALL",
          types: ["20x"],
          classes: ["B"],
        },
      },
    ],
    ksiDocuments: [
      {
        id: "ksi",
        output: "ksi.md",
        outputMode: "single",
        source: { collection: "KSI", themes: "ALL", classes: ["B"] },
      },
    ],
  };
  const entry: RuleEntry = {
    name: "Partial override",
    statement: "Common statement.",
    force: "MUST",
    affects: ["Providers"],
    timeframe_type: "days",
    timeframe_num: 9,
    notes: ["Common first.", "Common second."],
    artifacts: { all: ["Common artifact"] },
    varies_by_class: { b: { timeframe_num: 3, force: "MAY" } },
  };
  const rules: Rules = {
    FRD: { info: { name: "Definitions", web_name: "definitions" }, data: {} },
    FRR: {
      SYN: {
        info: {
          name: "Rules",
          web_name: "rules",
          subsets: {
            ONE: {
              name: "Rules",
              applicability: { types: ["20x"], classes: ["B"] },
            },
          },
        },
        data: { all: { ONE: { "SYN-ONE-ONE": entry } } },
      },
    },
    KSI: {
      SYN: {
        name: "Theme",
        web_name: "theme",
        indicators: { "KSI-SYN-ONE": entry },
      },
    },
    CTL: {},
  };
  return { config, rules };
}

test("FRR and KSI render inherited units and content for a one-field override", async () => {
  const { config, rules } = await renderingFixture();
  const artifacts = collectArtifacts(rules, config);
  for (const artifact of artifacts) {
    const entry = artifact.context.sections[0]!.requirements[0]!;
    expect(entry.statementParagraphs).toEqual(["Common statement."]);
    expect(entry.timeframe).toBe("3 days");
    expect(entry.notes).toEqual(["Common first.", "Common second."]);
    expect(entry.artifacts).toEqual([
      { label: "", items: ["Common artifact"] },
    ]);
    expect(entry.force).toBe("MAY");
  }
  expect(
    artifacts.find((a) => a.mappingId === "ksi")!.context.ksiGroups[0]!.title,
  ).toBe("Optional Key Security Indicators");
});

test("multi-class content resolves each class without borrowing or retaining replaced objects", async () => {
  const { config, rules } = await renderingFixture();
  config.generated.ruleDocuments[0]!.source.classes = ["A", "B", "C"];
  rules.FRR.SYN!.info.subsets!.ONE!.applicability!.classes = ["A", "B", "C"];
  const entry = rules.FRR.SYN!.data.all!.ONE!["SYN-ONE-ONE"]!;
  entry.varies_by_class!.c = {
    statement: "Only C.",
    timeframe_num: 6,
    artifacts: { rev5: ["C artifact"] },
  };
  const variants = collectArtifacts(rules, config).find(
    (a) => a.mappingId === "rules",
  )!.context.sections[0]!.requirements[0]!.variantSections;
  expect(variants.map((v) => v.statementParagraphs)).toEqual([
    ["Common statement."],
    ["Common statement."],
    ["Only C."],
  ]);
  expect(variants.map((v) => v.timeframe)).toEqual([
    "9 days",
    "3 days",
    "6 days",
  ]);
  expect(variants[2]!.artifacts).toEqual([
    { label: "rev5", items: ["C artifact"] },
  ]);
});

test("all applicable FRR and all four KSI classes satisfy the effective-content schema", async () => {
  const rules = await loadRules();
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile({
    $defs: schema.$defs,
    $ref: "#/$defs/effective_rule_content",
  });
  for (const c of ["A", "B", "C", "D"]) {
    const entries = [
      ...selectedRules(rules, { types: ["all"], classes: [c] }),
      ...Object.values(rules.KSI).flatMap((t) => Object.entries(t.indicators)),
    ];
    for (const [id, entry] of entries) {
      expect(
        validate(expectedClassContent(entry, c)),
        `${id} Class ${c}: ${ajv.errorsText(validate.errors)}`,
      ).toBe(true);
    }
  }
});

test("CTL forces and annual flags match separate normalized control lists", async () => {
  const rules = await loadRules();
  const baseline = rules.FRR.FRC!.data.rev5!.CSF!["FRC-CSF-BSL"]!;
  const annual = rules.FRR.IVV!.data.rev5!.CSF!["IVV-CSF-AIA"]!;
  for (const c of ["b", "c", "d"]) {
    const ids = (entry: RuleEntry) =>
      new Set(
        Object.values(expectedClassContent(entry, c).rev5_controls_list ?? {})
          .flat()
          .map(normalizeOscalControlId),
      );
    const required = ids(baseline),
      yearly = ids(annual);
    for (const family of Object.values(rules.CTL))
      for (const [id, entry] of Object.entries(family)) {
        expect(entry.varies_by_class?.[c]?.force, `${id}: ${c} force`).toBe(
          required.has(normalizeOscalControlId(id)) ? "MUST" : "MAY",
        );
        expect(
          entry.assess_yearly_by_class?.[c],
          `${id}: ${c} annual list`,
        ).toBe(yearly.has(normalizeOscalControlId(id)));
      }
  }
});

test("metadata-only CTL entries render forces and annual flags without inventing guidance", async () => {
  const rules = await loadRules(),
    config = await loadToolConfig();
  const candidate = Object.entries(rules.CTL)
    .flatMap(([family, controls]) =>
      Object.entries(controls).map(([id, entry]) => ({ family, id, entry })),
    )
    .find(
      ({ entry }) =>
        !entry.guidance?.length &&
        !entry.parameters?.length &&
        Object.values(entry.varies_by_class ?? {}).every(
          (v) => !v.guidance?.length && !v.parameters?.length,
        ),
    )!;
  expect(candidate).toBeDefined();
  config.generated = {
    manifest: config.generated.manifest,
    ruleDocuments: [],
    controlDocuments: [
      {
        id: "controls",
        output: "controls.md",
        source: { collection: "CTL", families: [candidate.family] },
      },
    ],
  };
  const control = collectArtifacts(
    rules,
    config,
  )[0]!.context.controlFamilies[0]!.controls.find(
    (c) => c.id === candidate.id,
  )!;
  expect(control.commonGuidance).toBeUndefined();
  expect(control.classVariants).toEqual([]);
  expect(control.hasFedrampContent).toBe(false);
  expect(control.baselineClasses).toEqual(
    ["b", "c", "d"]
      .filter((c) => candidate.entry.varies_by_class![c]!.force === "MUST")
      .map((c) => `Class ${c.toUpperCase()}`),
  );
  expect(control.annualAssessmentClasses).toEqual(
    ["b", "c", "d"]
      .filter((c) => candidate.entry.assess_yearly_by_class![c])
      .map((c) => `Class ${c.toUpperCase()}`),
  );
});

test("a single range-bound override inherits the other bound and units", async () => {
  const { config, rules } = await renderingFixture();
  const entry = rules.FRR.SYN!.data.all!.ONE!["SYN-ONE-ONE"]!;
  delete entry.timeframe_num;
  entry.timeframe_num_min = 2;
  entry.timeframe_num_max = 9;
  entry.varies_by_class = { b: { timeframe_num_max: 6 } };
  for (const artifact of collectArtifacts(rules, config)) {
    const rendered = artifact.context.sections[0]!.requirements[0]!;
    expect(rendered.timeframe).toBe("2 days to 6 days");
    expect(rendered.force).toBe("MUST");
    expect(rendered.statementParagraphs).toEqual(["Common statement."]);
  }
  const withoutDefault: RuleEntry = {
    varies_by_class: { b: { statement: "Only B.", force: "MUST" } },
  };
  expect(resolveClassContent(withoutDefault, "A").statement).toBeUndefined();
  expect(resolveClassContent(withoutDefault, "A").force).toBeUndefined();
});
