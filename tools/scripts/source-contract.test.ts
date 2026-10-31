import { expect, test } from "bun:test";
import {
  assertManualCopy,
  assertRecords,
  assertText,
  markdownText,
  selectedRules,
  type RuleEntry,
} from "./test-support/source-contract";
import { loadRules, type Rules } from "./test-support/sources";

const record = (id: string, text: string) =>
  `### Example\n\n!!! abstract "${id}"\n\n!!! quote ""\n    ${text}\n`;
const fixture = (): Rules => ({
  FRD: { info: { name: "Definitions", web_name: "definitions" }, data: {} },
  FRR: {
    SYN: {
      info: {
        name: "Synthetic",
        web_name: "synthetic",
        subsets: {
          ONE: {
            name: "Examples",
            applicability: { types: ["20x"], classes: ["B"] },
          },
        },
      },
      data: {
        all: {
          ONE: {
            "SYN-ONE-AAA": {
              statement: "Original exact text.",
              affects: ["Providers"],
            },
          },
        },
      },
    },
  },
  KSI: {},
  CTL: {},
});

test("source expectations follow changed, added, and removed records", () => {
  const rules = fixture();
  const source = { types: ["20x"], affects: ["Providers"] };
  const entries = rules.FRR.SYN!.data.all!.ONE!;
  assertRecords(
    record("SYN-ONE-AAA", entries["SYN-ONE-AAA"]!.statement!),
    selectedRules(rules, source),
    "original",
  );
  entries["SYN-ONE-AAA"]!.statement =
    "Changed exact text, including punctuation!";
  expect(() =>
    assertRecords(
      record("SYN-ONE-AAA", "Original exact text."),
      selectedRules(rules, source),
      "stale",
    ),
  ).toThrow();
  entries["SYN-ONE-BBB"] = { statement: "New text.", affects: ["Providers"] };
  const current = Object.entries(entries)
    .map(([id, entry]) => record(id, entry.statement!))
    .join("\n");
  assertRecords(current, selectedRules(rules, source), "updated");
  delete entries["SYN-ONE-AAA"];
  expect(() =>
    assertRecords(current, selectedRules(rules, source), "removed"),
  ).toThrow();
  assertRecords(
    record("SYN-ONE-BBB", "New text."),
    selectedRules(rules, source),
    "removed and rebuilt",
  );
});

test("record verification rejects missing, altered, duplicate and unexpected output", () => {
  const expected: Array<[string, RuleEntry]> = [
    ["SYN-ONE-AAA", { statement: "Do this, exactly." }],
  ];
  const correct = record("SYN-ONE-AAA", "Do this, exactly.");
  for (const broken of [
    "",
    correct.replace("exactly", "differently"),
    correct + correct,
    correct + record("SYN-ONE-BBB", "Extra"),
  ]) {
    expect(() => assertRecords(broken, expected, "corrupted output")).toThrow();
  }
});

test("selection follows current class, audience, bucket and subset applicability", () => {
  const rules = fixture();
  expect(selectedRules(rules, { types: ["rev5"] })).toEqual([]);
  expect(selectedRules(rules, { types: ["20x"], classes: ["A"] })).toEqual([]);
  expect(
    selectedRules(rules, { types: ["20x"], affects: ["Assessors"] }),
  ).toEqual([]);
  expect(selectedRules(rules, { types: ["20x"], includeAll: false })).toEqual(
    [],
  );
  rules.FRR.SYN!.info.subsets!.ONE!.applicability!.classes = ["A"];
  expect(selectedRules(rules, { types: ["20x"], classes: ["A"] })).toHaveLength(
    1,
  );
});

test("render normalization preserves wording, punctuation, entities and inline boundaries", () => {
  assertText(
    '<p>Use <strong>this</strong> &amp; <a href="/x">that</a>.</p>',
    "Use **this** & that.",
    "formatting",
    true,
  );
  assertText(
    "<p>pre<em>fix</em>, then act!</p>",
    "prefix, then act!",
    "inline",
    true,
  );
  expect(markdownText("1. First item\n2. Second item")).toContain("First item");
  for (const changed of [
    "Use this & that!",
    "Use that & this.",
    "Use this and that.",
  ])
    expect(() =>
      assertText("<p>Use this &amp; that.</p>", changed, "changed", true),
    ).toThrow();
});

test("manual copy verification detects missing pages and changed assets", () => {
  const source = Buffer.from("# A source page\n\nExact text.\n");
  assertManualCopy(
    source,
    Buffer.from('<span class="picto">generated</span>\n\n' + source),
    "page.md",
  );
  expect(() => assertManualCopy(source, undefined, "page.md")).toThrow();
  expect(() =>
    assertManualCopy(
      source,
      Buffer.from("# A source page\n\nWrong text."),
      "page.md",
    ),
  ).toThrow();
  expect(() =>
    assertManualCopy(
      Buffer.from([0, 1, 2]),
      Buffer.from([0, 1, 3]),
      "asset.bin",
    ),
  ).toThrow();
});

test("source fixture clones cannot mutate the cached rules", async () => {
  const first = await loadRules();
  const original = first.FRD.info.name;
  first.FRD.info.name = "Fixture-only name";
  expect((await loadRules()).FRD.info.name).toBe(original);
});

test("real-source clones rebuild after definition, date and baseline changes without editing assertions", async () => {
  const { mkdtemp, mkdir, writeFile, readFile, rm } =
    await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const { sources } = await import("./test-support/sources");
  const { buildMarkdown } = await import("./build-markdown");
  const { assertArtifactSource } =
    await import("./test-support/source-contract");
  const snapshot = structuredClone(await sources());
  const temp = await mkdtemp(path.join(tmpdir(), "source-evolution-"));
  try {
    Object.assign(snapshot.config.paths, {
      src: path.join(temp, "src"),
      content: path.join(temp, "content"),
      rulesFile: path.join(temp, "rules.json"),
    });
    await mkdir(snapshot.config.paths.content);
    const definitions = snapshot.rules.FRD.data.all!;
    definitions["FRD-SYNTHETIC"] = {
      term: "Synthetic original term",
      definition: "Original fixture wording.",
    };
    async function buildAndVerify() {
      await writeFile(
        snapshot.config.paths.rulesFile,
        JSON.stringify(snapshot.rules),
      );
      const summary = await buildMarkdown(snapshot.config);
      for (const artifact of summary.artifacts.filter((a) =>
        ["FRD", "DEADLINES", "CTL_REFERENCE"].includes(a.documentType),
      )) {
        await assertArtifactSource(
          artifact,
          await readFile(artifact.outputPath, "utf8"),
          false,
          snapshot,
        );
      }
      return summary;
    }
    await buildAndVerify();
    definitions["FRD-SYNTHETIC"] = {
      term: "Synthetic renamed term",
      definition: "Changed fixture wording, precisely!",
    };
    for (const doc of Object.values(snapshot.rules.FRR)) {
      for (const effective of [
        doc.info.effective,
        doc.info["20x"]?.effective,
        doc.info.rev5?.effective,
      ])
        if (effective?.date) effective.date.optional_adoption = "2099-01-02";
    }
    const baseline =
      snapshot.rules.FRR.FRC!.data.rev5!.CSF!["FRC-CSF-BSL"]!.varies_by_class!;
    const variant = Object.values(baseline).find((v) =>
      Object.values(v.rev5_controls_list ?? {}).some((ids) => ids.length),
    )!;
    const list = Object.values(variant.rev5_controls_list!).find(
      (ids) => ids.length,
    )!;
    list.pop();
    await buildAndVerify();
    delete definitions["FRD-SYNTHETIC"];
    await buildAndVerify();
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}, 30_000);

test("manual diagram verification preserves braces and catches changed diagram text", async () => {
  const { assertManualHtml } = await import("./test-support/source-contract");
  const code = 'flowchart LR\n  node@{ img: "/asset.jpg", h: 72 }\n';
  const source = `\`\`\`mermaid\n${code}\`\`\`\n`;
  const html = `<article><pre class="mermaid"><code>${code}</code></pre></article>`;
  assertManualHtml(source, html, "diagram.md");
  expect(() =>
    assertManualHtml(source, html.replace("72", "73"), "diagram.md"),
  ).toThrow();
});
