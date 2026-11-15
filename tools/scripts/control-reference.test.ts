import { expect, test } from "bun:test";
import { collectArtifacts } from "./build-markdown";
import { loadRules, loadToolConfig, sources } from "./test-support/sources";

async function fixture() {
  const rules = await loadRules(),
    config = await loadToolConfig();
  const { catalog } = await sources();
  const family = [...catalog.families.values()].find(
    (f) =>
      [...f.controls.values()].filter((c) => c.status !== "withdrawn").length >=
      3,
  )!;
  const controls = [...family.controls.values()]
    .filter((c) => c.status !== "withdrawn")
    .slice(0, 3);
  const [required, other, optional] = controls.map((c) => c.id) as [
    string,
    string,
    string,
  ];
  rules.CTL = {
    [family.id]: {
      [required]: {
        guidance: ["Common guidance."],
        varies_by_class: {
          b: { force: "MUST", guidance: ["B guidance."] },
          c: { force: "MUST", guidance: ["C guidance."] },
          d: { force: "MAY", guidance: ["D guidance."] },
        },
        assess_yearly_by_class: { b: false, c: true, d: false },
      },
      [other]: {
        varies_by_class: {
          b: { force: "MAY" },
          c: { force: "MAY" },
          d: { force: "MUST" },
        },
        assess_yearly_by_class: { b: false, c: false, d: true },
      },
      [optional]: {
        varies_by_class: {
          b: { force: "MAY" },
          c: { force: "MAY" },
          d: { force: "MAY" },
        },
        assess_yearly_by_class: { b: false, c: false, d: false },
      },
    },
  };
  config.generated = {
    manifest: config.generated.manifest,
    ruleDocuments: [],
    controlDocuments: [
      {
        id: "provider",
        output: "provider.md",
        source: { collection: "CTL", families: [family.id] },
      },
    ],
    fullControlReferenceDocuments: [
      {
        id: "full",
        title: "Full",
        output: "full",
        source: { collection: "OSCAL", families: "ALL" },
      },
      ...["B", "C", "D"].map((c) => ({
        id: c,
        title: c,
        output: `class-${c}`,
        source: {
          collection: "OSCAL" as const,
          families: "ALL" as const,
          classes: [c],
        },
      })),
    ],
  };
  return { rules, config, family, required, other, optional };
}

test("baseline badges exclude MAY and annual badges omit false flags on both control surfaces", async () => {
  const { rules, config, required, other, optional } = await fixture();
  const artifacts = collectArtifacts(rules, config);
  for (const id of ["full", "provider"]) {
    const controls = artifacts
      .filter((a) => a.mappingId === id)
      .flatMap((a) => a.context.controlFamilies.flatMap((f) => f.controls));
    expect(controls.find((c) => c.id === required)!.baselineClasses).toEqual([
      "Class B",
      "Class C",
    ]);
    expect(
      controls.find((c) => c.id === required)!.annualAssessmentClasses,
    ).toEqual(["Class C"]);
    expect(controls.find((c) => c.id === other)!.baselineClasses).toEqual([
      "Class D",
    ]);
    expect(
      controls.find((c) => c.id === other)!.annualAssessmentClasses,
    ).toEqual(["Class D"]);
    expect(controls.find((c) => c.id === optional)!.baselineClasses).toEqual(
      [],
    );
    expect(
      controls.find((c) => c.id === optional)!.annualAssessmentClasses,
    ).toEqual([]);
  }
});

test("class references filter controls, guidance, labels, families and index totals together", async () => {
  const { rules, config, family, required, other } = await fixture();
  const artifacts = collectArtifacts(rules, config);
  for (const className of ["B", "C", "D"]) {
    const pages = artifacts.filter((a) => a.mappingId === className);
    expect(pages).toHaveLength(2);
    const index = pages.find((a) => !a.sourceDocument)!;
    expect(index.context.controlCount).toBe(1);
    expect(index.context.controlFamilies.map((f) => f.id)).toEqual([family.id]);
    const control = pages.find((a) => a.sourceDocument)!.context
      .controlFamilies[0]!.controls[0]!;
    expect(control.id).toBe(className === "D" ? other : required);
    expect(control.baselineClasses).toEqual([`Class ${className}`]);
    expect(control.annualAssessmentClasses).toEqual(
      className === "B" ? [] : [`Class ${className}`],
    );
    if (className !== "D") {
      expect(control.commonGuidance!.guidance).toEqual(["Common guidance."]);
      expect(control.classVariants.map((v) => v.title)).toEqual([
        `Class ${className}`,
      ]);
      expect(control.classVariants[0]!.guidance).toEqual([
        `${className} guidance.`,
      ]);
    }
  }
});

test("filtered mappings do not change canonical rule and KSI control links", async () => {
  const config = await loadToolConfig(),
    rules = await loadRules();
  const original = collectArtifacts(rules, config);
  const full = config.generated.fullControlReferenceDocuments!;
  config.generated.fullControlReferenceDocuments = [...full].reverse();
  const reordered = collectArtifacts(rules, config);
  const links = (artifacts: ReturnType<typeof collectArtifacts>) =>
    artifacts
      .filter((a) => a.documentType === "FRR" || a.documentType === "KSI")
      .map((a) => ({
        path: a.relativePath,
        sections: a.context.sections,
        indicators: a.context.indicators,
      }));
  expect(links(reordered)).toEqual(links(original));
  config.generated.fullControlReferenceDocuments = full.filter(
    (m) => !m.source.classes?.length,
  );
  expect(links(collectArtifacts(rules, config))).toEqual(links(original));
});
