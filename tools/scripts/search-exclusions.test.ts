import { expect, test } from "bun:test";
import { searchableNavigationPages } from "./search-exclusions";

const navigation = {
  project: {
    nav: [
      {
        Reference: [
          {
            Complete: [
              "reference/index.md",
              { Nested: [{ Rules: "reference/rules.md" }] },
            ],
          },
          { Other: [{ Controls: "reference/controls.md" }] },
          { Classes: ["reference/a/rules.md"] },
        ],
      },
    ],
  },
};

test("search selection traverses nested sections and matches exact paths", () => {
  const pages = searchableNavigationPages(navigation, [
    ["Reference", "Complete"],
    ["Reference", "Other"],
  ]);
  expect([...pages].sort()).toEqual([
    "reference/controls.md",
    "reference/index.md",
    "reference/rules.md",
  ]);
  expect(pages.has("reference/a/rules.md")).toBe(false);
  expect(pages.has("reference/rules.md/extra")).toBe(false);
});

test("search selection fails clearly for missing, empty, or non-section paths", () => {
  expect(() =>
    searchableNavigationPages(navigation, [["Reference", "Missing"]]),
  ).toThrow("Reference → Missing");
  expect(() => searchableNavigationPages(navigation, [[]])).toThrow(
    "must not be empty",
  );
  expect(() =>
    searchableNavigationPages(navigation, [["Reference", "Other", "Controls"]]),
  ).toThrow("not a section");
});

test("search selection rejects ambiguous section names", () => {
  const config = { project: { nav: [{ Reference: [] }, { Reference: [] }] } };
  expect(() => searchableNavigationPages(config, [["Reference"]])).toThrow(
    "ambiguous",
  );
});

test("moving a page between sections updates search membership", () => {
  const config = structuredClone(navigation);
  config.project.nav[0]!.Reference[0] = { Complete: ["reference/new.md"] };
  const pages = searchableNavigationPages(config, [["Reference", "Complete"]]);
  expect(pages.has("reference/new.md")).toBe(true);
  expect(pages.has("reference/rules.md")).toBe(false);
});
