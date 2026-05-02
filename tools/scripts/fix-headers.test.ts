import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  fixBoldMarkdownHeadingsInDirectory,
  fixBoldMarkdownHeadingsInText,
} from "./fix-headers";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((tempRoot) =>
      rm(tempRoot, { force: true, recursive: true }),
    ),
  );
});

async function createTempRoot(): Promise<string> {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "cr26-fix-headers-"));
  tempRoots.push(tempRoot);
  return tempRoot;
}

describe("fix-headers", () => {
  test("removes bold markers when they wrap an entire markdown heading", () => {
    const result = fixBoldMarkdownHeadingsInText(
      [
        "# **Title**",
        "### **this is a header**",
        "#### **Closing style** ###",
        "## **Partial** heading",
        "Paragraph with **bold** text.",
      ].join("\n"),
    );

    expect(result.fixedHeadings).toBe(3);
    expect(result.contents).toBe(
      [
        "# Title",
        "### this is a header",
        "#### Closing style ###",
        "## **Partial** heading",
        "Paragraph with **bold** text.",
      ].join("\n"),
    );
  });

  test("only changes markdown files inside the provided content directory", async () => {
    const tempRoot = await createTempRoot();
    const contentDir = path.join(tempRoot, "content");
    const srcDir = path.join(tempRoot, "src");
    await mkdir(path.join(contentDir, "nested"), { recursive: true });
    await mkdir(srcDir, { recursive: true });

    await writeFile(path.join(contentDir, "index.md"), "# **Content**\n");
    await writeFile(
      path.join(contentDir, "nested", "page.md"),
      "## **Nested**\n",
    );
    await writeFile(path.join(contentDir, "notes.txt"), "# **Not Markdown**\n");
    await writeFile(path.join(srcDir, "index.md"), "# **Generated**\n");

    const summary = await fixBoldMarkdownHeadingsInDirectory(contentDir);

    expect(summary).toEqual({
      changedFiles: ["index.md", "nested/page.md"],
      fixedHeadings: 2,
    });
    expect(await readFile(path.join(contentDir, "index.md"), "utf8")).toBe(
      "# Content\n",
    );
    expect(
      await readFile(path.join(contentDir, "nested", "page.md"), "utf8"),
    ).toBe("## Nested\n");
    expect(await readFile(path.join(contentDir, "notes.txt"), "utf8")).toBe(
      "# **Not Markdown**\n",
    );
    expect(await readFile(path.join(srcDir, "index.md"), "utf8")).toBe(
      "# **Generated**\n",
    );
  });
});
