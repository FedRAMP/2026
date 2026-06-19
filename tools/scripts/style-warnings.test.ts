import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { findFedrampCertificationCapitalizationWarnings } from "./style-warnings";

describe("content style warnings", () => {
  test("finds lowercase FedRAMP Certification names without double reporting packages", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "cr26-style-warnings-"));
    const nestedDir = path.join(tempDir, "nested");

    try {
      await mkdir(nestedDir);
      await writeFile(
        path.join(tempDir, "clean.md"),
        [
          "# Clean",
          "",
          "FedRAMP Certification and FedRAMP Certifications are correct.",
          "FedRAMP Certification Package and FedRAMP Certification Packages are correct.",
        ].join("\n"),
        "utf8",
      );
      await writeFile(
        path.join(nestedDir, "warnings.md"),
        [
          "# Warnings",
          "",
          "A FedRAMP certification is incorrectly capitalized.",
          "Review the FedRAMP Certification package.",
          "Reuse FedRAMP certification packages whenever possible.",
        ].join("\n"),
        "utf8",
      );

      expect(
        await findFedrampCertificationCapitalizationWarnings(tempDir),
      ).toEqual([
        {
          relativePath: "nested/warnings.md",
          line: 3,
          column: 3,
          found: "FedRAMP certification",
          expected: "FedRAMP Certification",
        },
        {
          relativePath: "nested/warnings.md",
          line: 4,
          column: 12,
          found: "FedRAMP Certification package",
          expected: "FedRAMP Certification Package",
        },
        {
          relativePath: "nested/warnings.md",
          line: 5,
          column: 7,
          found: "FedRAMP certification packages",
          expected: "FedRAMP Certification Packages",
        },
      ]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
