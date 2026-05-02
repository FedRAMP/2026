import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createContentChangeFilter,
  createContentChangeTracker,
  syncContentChangesToSrc,
} from "./dev";

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

  test("syncs changed content files into src without clearing src", async () => {
    const tempRoot = await createTempContent();
    const contentDir = path.join(tempRoot, "content");
    const srcDir = path.join(tempRoot, "src");
    const contentFile = path.join(contentDir, "nested", "start.md");
    const srcGeneratedFile = path.join(srcDir, "definitions.md");

    await mkdir(path.dirname(contentFile), { recursive: true });
    await mkdir(srcDir, { recursive: true });
    await writeFile(contentFile, "Initial content\n");
    await writeFile(srcGeneratedFile, "Generated output\n");

    const trackContentChange = createContentChangeTracker(contentDir);

    await writeFile(contentFile, "Updated content\n");
    const change = trackContentChange("nested/start.md");
    expect(change).not.toBeNull();

    const summary = syncContentChangesToSrc(contentDir, srcDir, [change!]);

    expect(summary).toEqual({
      copiedFiles: 1,
      needsFullDeploy: false,
      removedFiles: 0,
      reloadTargets: ["nested/start.md"],
    });
    expect(
      await readFile(path.join(srcDir, "nested", "start.md"), "utf8"),
    ).toBe("Updated content\n");
    expect(await readFile(srcGeneratedFile, "utf8")).toBe("Generated output\n");
  });

  test("removes deleted content files from src without requiring a full deploy", async () => {
    const tempRoot = await createTempContent();
    const contentDir = path.join(tempRoot, "content");
    const srcDir = path.join(tempRoot, "src");
    const contentFile = path.join(contentDir, "start.md");
    const srcFile = path.join(srcDir, "start.md");

    await mkdir(contentDir, { recursive: true });
    await mkdir(srcDir, { recursive: true });
    await writeFile(contentFile, "Initial content\n");
    await writeFile(srcFile, "Initial content\n");

    const trackContentChange = createContentChangeTracker(contentDir);

    await unlink(contentFile);
    const change = trackContentChange("start.md");
    expect(change).not.toBeNull();

    const summary = syncContentChangesToSrc(contentDir, srcDir, [change!]);

    expect(summary).toEqual({
      copiedFiles: 0,
      needsFullDeploy: false,
      removedFiles: 1,
      reloadTargets: [],
    });
    expect(await readFile(srcFile, "utf8").catch(() => null)).toBeNull();
  });
});
