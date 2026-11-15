import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** Keep watcher-visible files intact until their complete replacement is ready. */
export async function writeIfChanged(
  file: string,
  contents: string,
): Promise<boolean> {
  try {
    if ((await readFile(file, "utf8")) === contents) return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    await writeFile(temporary, contents, "utf8");
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
  return true;
}
