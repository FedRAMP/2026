const REQUIRED_TAG_BY_DIRECTORY = new Map([
  ["20x", "20x"],
  ["rev5", "Rev5"],
]);

export function requiredZensicalTags(relativePath: string): string[] {
  const pathSegments = relativePath.replaceAll("\\", "/").split("/");
  const requiredTags = pathSegments.flatMap((segment) => {
    const tag = REQUIRED_TAG_BY_DIRECTORY.get(segment);
    return tag ? [tag] : [];
  });

  return Array.from(new Set(requiredTags));
}

export function mergePathZensicalTags(
  tags: string[],
  relativePath: string,
): string[] {
  return Array.from(
    new Set([...tags, ...requiredZensicalTags(relativePath)]),
  );
}
