import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  findZensicalTagWarnings,
  zensicalTagsFromFrontmatter,
} from "./zensical-tag-warnings";
import { requiredZensicalTags } from "./zensical-tags";

describe("Zensical tag warnings", () => {
  test("reads block and inline tags from YAML front matter", () => {
    expect(
      zensicalTagsFromFrontmatter(
        ["---", "tags:", "  - 20x", "  - Rev5", "---", "", "# Page"].join(
          "\n",
        ),
      ),
    ).toEqual(["20x", "Rev5"]);
    expect(
      zensicalTagsFromFrontmatter(
        ["---", 'tags: ["20x", \'Rev5\']', "---", "", "# Page"].join("\n"),
      ),
    ).toEqual(["20x", "Rev5"]);
  });

  test("maps version directory names to their configured tag labels", () => {
    expect(requiredZensicalTags("providers/20x/index.md")).toEqual(["20x"]);
    expect(requiredZensicalTags("providers/rev5/index.md")).toEqual(["Rev5"]);
    expect(requiredZensicalTags("reference/20x/rev5/index.md")).toEqual([
      "20x",
      "Rev5",
    ]);
    expect(requiredZensicalTags("reference/20x-overview.md")).toEqual([]);
  });

  test("finds missing tags without treating them as test failures", async () => {
    const tempDir = await mkdtemp(
      path.join(tmpdir(), "cr26-zensical-tags-"),
    );

    try {
      await mkdir(path.join(tempDir, "providers", "20x"), {
        recursive: true,
      });
      await mkdir(path.join(tempDir, "providers", "rev5"), {
        recursive: true,
      });
      await mkdir(path.join(tempDir, "reference"), { recursive: true });

      await writeFile(
        path.join(tempDir, "providers", "20x", "valid.md"),
        ["---", "tags:", "  - 20x", "---", "", "# Valid"].join("\n"),
        "utf8",
      );
      await writeFile(
        path.join(tempDir, "providers", "20x", "missing.md"),
        "# Missing front matter\n",
        "utf8",
      );
      await writeFile(
        path.join(tempDir, "providers", "rev5", "wrong.md"),
        ["---", "tags: [20x]", "---", "", "# Wrong tag"].join("\n"),
        "utf8",
      );
      await writeFile(
        path.join(tempDir, "reference", "untagged.md"),
        "# No version directory\n",
        "utf8",
      );

      expect(await findZensicalTagWarnings(tempDir)).toEqual([
        {
          relativePath: "providers/20x/missing.md",
          missingTags: ["20x"],
          foundTags: [],
        },
        {
          relativePath: "providers/rev5/wrong.md",
          missingTags: ["Rev5"],
          foundTags: ["20x"],
        },
      ]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
