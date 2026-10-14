function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Resolve exact Markdown paths below the selected Zensical navigation sections. */
export function searchableNavigationPages(
  config: unknown,
  sectionPaths: string[][],
): Set<string> {
  const nav = record(record(config)?.project)?.nav;
  const pages = new Set<string>();
  function collect(node: unknown): void {
    if (typeof node === "string") {
      if (node.endsWith(".md")) pages.add(node);
    } else if (Array.isArray(node)) {
      node.forEach(collect);
    } else {
      Object.values(record(node) ?? {}).forEach(collect);
    }
  }

  for (const sectionPath of sectionPaths) {
    if (sectionPath.length === 0) {
      throw new Error("Search navigation section path must not be empty");
    }
    let node: unknown = nav;
    for (const name of sectionPath) {
      const entries = Array.isArray(node) ? node : [node];
      const matches = entries
        .map(record)
        .filter((entry) => entry && Object.hasOwn(entry, name));
      if (matches.length !== 1) {
        throw new Error(
          `Search navigation section missing or ambiguous: ${sectionPath.join(" → ")} (at ${name})`,
        );
      }
      node = matches[0]![name];
      if (!Array.isArray(node) && !record(node)) {
        throw new Error(
          `Search navigation path is not a section: ${sectionPath.join(" → ")}`,
        );
      }
    }
    collect(node);
  }
  return pages;
}
