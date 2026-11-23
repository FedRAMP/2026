import { expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildSources } from "./build-sources";
import type { RulesDocument } from "./build-markdown";
import { loadToolConfig, resolveToolPath } from "./config";

type Rule = RulesDocument["KSI"][string]["indicators"][string];

// Derive expectations directly from upstream data without the renderer or its helpers.
function effective({ varies_by_class, ...common }: Rule, key: string) {
  const { applicable, ...overrides } = varies_by_class?.[key] ?? {};
  return { ...common, ...overrides };
}

function records(documents: RulesDocument["FRR"]) {
  return Object.entries(documents).flatMap(([doc, { data }]) =>
    Object.entries(data).flatMap(([bucket, groups]) =>
      Object.entries(groups).flatMap(([group, entries]) =>
        Object.entries(entries).map(([id, rule]) => ({
          doc,
          bucket,
          group,
          id,
          rule,
        })),
      ),
    ),
  );
}

test("each download contains the complete effective source records for its framework and class", async () => {
  const config = await loadToolConfig();
  const temp = await mkdtemp(path.join(tmpdir(), "fedramp-downloads-"));
  try {
    config.paths.src = temp;
    const raw = await readFile(resolveToolPath(config.paths.rulesFile), "utf8");
    const source: RulesDocument = JSON.parse(raw);
    const version = source.info!.version!;
    await buildSources(config);
    const out = path.join(temp, "sources/latest");
    const read = (name: string) => readFile(path.join(out, name), "utf8");
    const datasets = ["consolidated-rules", "definitions"];
    const names = await readdir(out);
    const index = await read("index.md");
    for (const name of names.filter((name) => name.endsWith(".json"))) {
      expect(index).toContain(`](${name})`);
    }
    expect(await read("fedramp-consolidated-rules-min.json")).toBe(await read(`fedramp-consolidated-rules-${version}-min.json`));
    for (const name of names.filter((name) => name.endsWith(".json") && !name.endsWith("-min.json"))) {
      expect(await read(name.replace(/\.json$/, "-min.json"))).toBe(JSON.stringify(JSON.parse(await read(name))));
    }
    expect(await read(`fedramp-consolidated-rules-${version}.json`)).toBe(raw);
    expect(
      JSON.parse(await read(`fedramp-definitions-${version}.json`)).FRD,
    ).toEqual(source.FRD);
    const all = records(source.FRR);
    const keyed = (entries: typeof all) =>
      Object.fromEntries(
        entries.map(({ doc, bucket, group, id, rule }) => [
          [doc, bucket, group, id].join("/"),
          rule,
        ]),
      );
    for (const type of ["20x", "rev5"] as const) {
      for (const key of type === "20x" ? "abcd" : "bcd") {
        datasets.push(`providers-${type}-class-${key}-rules`);
        const file: RulesDocument = JSON.parse(
          await read(
            `fedramp-providers-${type}-class-${key}-rules-${version}.json`,
          ),
        );
        expect(Object.keys(file).sort()).toEqual(
          ["info", "FRR", type === "20x" ? "KSI" : "CTL"].sort(),
        );
        const expected = all
          .filter(({ doc, bucket, group, rule }) => {
            const info = source.FRR[doc]!.info;
            const subset =
              info[type]?.subsets?.[group] ?? info.subsets?.[group];
            const scope = subset?.applicability;
            return (
              (bucket === "all" || bucket === type) &&
              rule.affects?.includes("Providers") &&
              (!scope?.affects?.length ||
                scope.affects.includes("Providers")) &&
              scope?.types?.some((t) => t.toLowerCase() === type) &&
              (rule.varies_by_class?.[key]?.applicable ??
                scope.classes?.includes(key.toUpperCase()))
            );
          })
          .map((entry) => ({ ...entry, rule: effective(entry.rule, key) }));
        expect(keyed(records(file.FRR))).toEqual(keyed(expected));
        for (const { doc, group } of expected) {
          const original = source.FRR[doc]!.info;
          const exported = file.FRR[doc]!.info;
          const subset =
            original[type]?.subsets?.[group] ?? original.subsets?.[group];
          const actual =
            exported[type]?.subsets?.[group] ?? exported.subsets?.[group];
          expect(actual).toEqual({
            ...subset,
            applicability: {
              ...subset?.applicability,
              types: [type === "20x" ? "20x" : "Rev5"],
              classes: [key.toUpperCase()],
            },
          });
          expect(exported[type === "20x" ? "rev5" : "20x"]).toBeUndefined();
          expect(exported[type]?.effective ?? exported.effective).toEqual(
            original[type]?.effective ?? original.effective,
          );
        }
        if (type === "20x") {
          const expectedThemes = structuredClone(source.KSI);
          for (const theme of Object.values(expectedThemes))
            for (const [id, indicator] of Object.entries(theme.indicators))
              theme.indicators[id] = effective(indicator, key);
          expect(file.KSI).toEqual(expectedThemes);
        } else {
          const expectedControls: RulesDocument["CTL"] = {};
          for (const [family, entries] of Object.entries(source.CTL)) {
            for (const [id, control] of Object.entries(entries)) {
              if (!Object.hasOwn(control.varies_by_class ?? {}, key)) continue;
              (expectedControls[family] ??= {})[id] = {
                ...control,
                varies_by_class: { [key]: control.varies_by_class![key]! },
                assess_yearly_by_class: {
                  [key]: control.assess_yearly_by_class![key]!,
                },
              };
            }
          }
          expect(file.CTL).toEqual(expectedControls);
        }
      }
    }
    const expectedNames = datasets.flatMap((dataset) => [
      `fedramp-${dataset}-${version}.json`,
      `fedramp-${dataset}-${version}-min.json`,
    ]);
    expect(names.sort()).toEqual([...expectedNames, "fedramp-consolidated-rules-min.json", "index.md"].sort());
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("force never filters exports, and regeneration preserves the last successful release on input errors", async () => {
  const config = await loadToolConfig();
  const temp = await mkdtemp(path.join(tmpdir(), "fedramp-release-"));
  try {
    config.paths.src = temp;
    config.paths.rulesFile = path.join(temp, "rules.json");
    const yaml = path.join(temp, "CHANGELOG.yml");
    const out = path.join(temp, "sources/latest");
    const read = (name: string) => readFile(path.join(out, name), "utf8");
    const forces = ["MUST NOT", "SHOULD", "SHOULD NOT", "FUTURE", undefined];
    const entries = Object.fromEntries(
      forces.map((force, i) => [
        String(i),
        { force, affects: ["Agencies", "Providers"] },
      ]),
    );
    const variants = Object.fromEntries(
      forces.map((force, i) => [
        String(i),
        {
          guidance: ["common"],
          varies_by_class: { b: { force, guidance: ["specific"] } },
          assess_yearly_by_class: { b: false },
        },
      ]),
    );
    const source = {
      info: { version: "v1", last_updated: "2026-01-01" },
      FRD: {},
      FRR: {
        DOC: {
          info: {
            subsets: {
              ONE: {
                applicability: {
                  types: ["20x", "Rev5"],
                  classes: ["B"],
                  affects: ["Providers", "Agencies"],
                },
              },
            },
          },
          data: {
            all: { ONE: { ...entries, agencyOnly: { affects: ["Agencies"] } } },
          },
        },
      },
      KSI: { theme: { indicators: entries } },
      CTL: { family: variants },
    };
    await writeFile(config.paths.rulesFile, JSON.stringify(source));
    await writeFile(
      yaml,
      "fedramp-consolidated-rules:\n  - version: v1\n    rules: ['First release']",
    );
    await buildSources(config);
    expect(await read("index.md")).toContain("- First release");
    for (const type of ["20x", "rev5"]) {
      const file = JSON.parse(
        await read(`fedramp-providers-${type}-class-b-rules-v1.json`),
      );
      expect(file.FRR.DOC.data.all.ONE).toEqual(
        JSON.parse(JSON.stringify(entries)),
      );
      if (type === "20x")
        expect(file.KSI.theme.indicators).toEqual(
          JSON.parse(JSON.stringify(entries)),
        );
      else
        expect(file.CTL.family).toEqual(JSON.parse(JSON.stringify(variants)));
    }
    await writeFile(
      path.join(out, "fedramp-20x-class-b-rules-v1-min.json"),
      "{}",
    );
    const firstIndex = await read("index.md");
    await writeFile(yaml, "[");
    await expect(buildSources(config)).rejects.toThrow();
    expect(await read("index.md")).toBe(firstIndex);
    source.info.version = "v2";
    await writeFile(yaml, "fedramp-consolidated-rules: []");
    await writeFile(config.paths.rulesFile, JSON.stringify(source));
    await buildSources(config);
    expect(await read("index.md")).toContain("No changelog entry is available");
    expect((await readdir(out)).some((name) => name.includes("-v1"))).toBe(
      false,
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("release rules sort by scope and link each leading current identifier", async () => {
  const temp = await mkdtemp(path.join(tmpdir(), "fedramp-changelog-"));
  try {
    const config = await loadToolConfig();
    config.paths.src = temp;
    config.paths.rulesFile = path.join(temp, "rules.json");
    await writeFile(
      config.paths.rulesFile,
      JSON.stringify({
        info: { version: "v1", last_updated: "2026-01-01" },
        FRD: { data: { all: { "FRD-ABC": { term: "Example term" } } } },
        FRR: {
          DOC: {
            info: { web_name: "example" },
            data: {
              all: {
                SUB: {
                  "DOC-SUB-ABC": { name: "Example rule" },
                  "DOC-SUB-ZZZ": { name: "Last rule" },
                },
              },
            },
          },
        },
        KSI: {},
        CTL: {},
      }),
    );
    await writeFile(
      path.join(temp, "CHANGELOG.yml"),
      JSON.stringify({
        "fedramp-consolidated-rules": [
          {
            version: "v1",
            rules: [
              "FRD-ABC: Updated.",
              "DOC-SUB-ZZZ (Last rule): See DOC-SUB-ABC.",
              "DOC-SUB: Subset update.",
              "DOC-SUB-OLD (Retired rule): Removed.",
              "DOC-SUB-ABC (Original title) and DOC-SUB-ZZZ changed.",
              "DOC: Collection update.",
              "Several rules changed.",
            ],
            tooling: ["Tooling update."],
            schema: ["Schema update."],
          },
        ],
      }),
    );
    await buildSources(config);
    const index = await readFile(
      path.join(temp, "sources/latest/index.md"),
      "utf8",
    );
    expect(index.split("### Rules\n\n")[1]).toEqual(
      [
        "- Several rules changed.",
        "- DOC: Collection update.",
        "- DOC-SUB: Subset update.",
        "- [DOC-SUB-ABC (Original title)](../../reference/example.md#example-rule){ data-preview } and [DOC-SUB-ZZZ (Last rule)](../../reference/example.md#last-rule){ data-preview } changed.",
        "- DOC-SUB-OLD (Retired rule): Removed.",
        "- [DOC-SUB-ZZZ (Last rule)](../../reference/example.md#last-rule){ data-preview }: See DOC-SUB-ABC.",
        "- [FRD-ABC (Example term)](../../definitions.md#example-term){ data-preview }: Updated.",
        "",
        "### Schema",
        "",
        "- Schema update.",
        "",
      ].join("\n"),
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
