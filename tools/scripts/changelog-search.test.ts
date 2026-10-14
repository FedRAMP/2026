import { expect, test } from "bun:test";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import Handlebars from "handlebars";
import { resolveToolPath } from "./config";

const execFileAsync = promisify(execFile);
const renderHtml = `
import json, markdown, sys
from html.parser import HTMLParser
class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = [False]
        self.included = []
        self.excluded = []
    def handle_starttag(self, tag, attrs):
        self.stack.append(self.stack[-1] or 'data-search-exclude' in dict(attrs))
    def handle_endtag(self, tag):
        self.stack.pop()
    def handle_data(self, text):
        (self.excluded if self.stack[-1] else self.included).append(text)
html = markdown.markdown(sys.argv[1], extensions=['attr_list', 'admonition', 'pymdownx.details'])
parser = Text()
parser.feed(html)
print(json.dumps({'included': ' '.join(parser.included), 'excluded': ' '.join(parser.excluded)}))
`;

for (const partial of ["requirement", "definition"]) {
  for (const count of [0, 1, 2]) {
    test(`${partial}: excludes ${count} changelog entries while retaining identifiers and current text`, async () => {
      const source = await readFile(
        resolveToolPath(`templates/partials/${partial}.hbs`),
        "utf8",
      );
      const changelog = Array.from({ length: count }, (_, index) => ({
        date: `2026-06-${24 + index}`,
        comment: `Historical change ${index}`,
        previousValue: "Obsolete definition text",
      }));
      const engine = Handlebars.create();
      engine.registerPartial(
        "rev5-control-list",
        await readFile(
          resolveToolPath("templates/partials/rev5-control-list.hbs"),
          "utf8",
        ),
      );
      const markdown = engine.compile(source, { noEscape: true })({
        id: "TEST-ID",
        formerId: "FORMER-ID",
        title: "Current title",
        term: "Current term",
        statementParagraphs: ["Current statement text"],
        definitionParagraphs: ["Current definition text"],
        changelog,
      });
      const { stdout } = await execFileAsync(
        resolveToolPath(".venv/bin/python"),
        ["-c", renderHtml, markdown],
      );
      const { included, excluded } = JSON.parse(stdout) as {
        included: string;
        excluded: string;
      };
      expect(included).toContain("TEST-ID");
      expect(included).toContain(
        partial === "requirement"
          ? "Current statement text"
          : "Current definition text",
      );
      expect(excluded).not.toContain("TEST-ID");
      if (count === 0) {
        expect(excluded).toBe("");
        expect(markdown).not.toContain("data-search-exclude");
      } else {
        expect(included).toContain("FORMER-ID");
        expect(included).not.toContain("Changelog:");
        expect(excluded).toContain("Changelog:");
        for (const entry of changelog) {
          expect(excluded).toContain(entry.date);
          expect(excluded).toContain(entry.comment);
          expect(included).not.toContain(entry.date);
          expect(included).not.toContain(entry.comment);
        }
        if (partial === "definition") {
          expect(excluded).toContain("Was:");
          expect(excluded).toContain("Obsolete definition text");
          expect(included).not.toContain("Obsolete definition text");
        }
      }
    });
  }
}
