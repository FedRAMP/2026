import path from "node:path";
import { parse } from "smol-toml";
import { resolveToolPath, type ToolConfig } from "./config";
import { writeIfChanged } from "./write-if-changed";

function pageUrl(source: URL): URL {
  const url = new URL(source);
  url.pathname = url.pathname
    .replace(/\/index\.md$/, "/")
    .replace(/\.md$/, "/");
  return url;
}

function relocateLinks(body: string, source: URL, page: URL): string {
  // Preserve examples verbatim, including Markdown links shown as inline code.
  let fence = "";
  return body
    .split("\n")
    .map((line) => {
      const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
      if (fence) {
        if (marker?.startsWith(fence) && line.trim() === marker) fence = "";
        return line;
      }
      if (marker) {
        fence = marker;
        return line;
      }
      return line.replace(
        /(`+).*?\1|\]\((<?)([^\s)<>]+)(>?)/g,
        (match, code, open, target, close) => {
          if (code || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target))
            return match;
          const doc = new URL(target, /^[?#]/.test(target) ? page : source);
          const url = /\.md$/.test(doc.pathname) ? pageUrl(doc) : doc;
          return `](${open}${url.href}${close}`;
        },
      );
    })
    .join("\n");
}

export async function buildLlmCorpus(config: ToolConfig): Promise<void> {
  const content = resolveToolPath(config.paths.content);
  const src = resolveToolPath(config.paths.src);
  const file = "llms-full.txt";
  if (await Bun.file(path.join(content, file)).exists())
    throw new Error(`Generated corpus collides with manual content: ${file}`);

  const settings = parse(
    await Bun.file(resolveToolPath(config.paths.zensicalConfig)).text(),
  );
  const project = settings.project as { site_url: string };
  const sections: string[] = [];
  const files = Array.from(
    new Bun.Glob("**/*.md").scanSync({ cwd: content }),
  ).sort();
  for (const name of files) {
    const source = new URL(name, project.site_url);
    const page = pageUrl(source);
    const raw = await Bun.file(path.join(content, name)).text();
    const body = raw
      .replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .trim();
    const title = /^#\s+(.+)$/m.exec(body)?.[1] ?? name;
    sections.push(
      `Source: content/${name}\nTitle: ${title}\nURL: ${page.href}\n\n${relocateLinks(body, source, page)}`,
    );
  }
  await writeIfChanged(
    path.join(src, file),
    sections.join("\n\n---\n\n") + "\n",
  );
}
