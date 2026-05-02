import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createContentChangeFilter } from "./dev";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((tempRoot) =>
      rm(tempRoot, { force: true, recursive: true }),
    ),
  );
});

async function createTempContent(): Promise<string> {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "cr26-dev-watch-"));
  tempRoots.push(tempRoot);
  return tempRoot;
}

describe("dev content watcher", () => {
  test("ignores events when content file signatures have not changed", async () => {
    const contentDir = await createTempContent();
    await writeFile(path.join(contentDir, "start.md"), "Initial content\n");

    const hasMeaningfulChange = createContentChangeFilter(contentDir);

    expect(hasMeaningfulChange("start.md")).toBe(false);
  });

  test("detects content edits, deletes, and creates", async () => {
    const contentDir = await createTempContent();
    const filePath = path.join(contentDir, "start.md");
    const newFilePath = path.join(contentDir, "new.md");
    await writeFile(filePath, "Initial content\n");

    const hasMeaningfulChange = createContentChangeFilter(contentDir);

    await writeFile(newFilePath, "New content\n");
    expect(hasMeaningfulChange("new.md")).toBe(true);
    expect(hasMeaningfulChange("new.md")).toBe(false);

    await writeFile(filePath, "Updated content with a different size\n");
    expect(hasMeaningfulChange("start.md")).toBe(true);
    expect(hasMeaningfulChange("start.md")).toBe(false);

    await unlink(filePath);
    expect(hasMeaningfulChange("start.md")).toBe(true);
    expect(hasMeaningfulChange("start.md")).toBe(false);

    await writeFile(filePath, "Created again\n");
    expect(hasMeaningfulChange("start.md")).toBe(true);
  });
});
