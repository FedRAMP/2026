const REQUIRED_TAG_BY_DIRECTORY = new Map([
  ["20x", "20x"],
  ["rev5", "Rev5"],
]);

const AUDIENCE_TAG_BY_DIRECTORY = new Map([
  ["advisors", "Advisors"],
  ["agencies", "Federal Agencies"],
  ["assessors", "Independent Assessors"],
  ["providers", "Cloud Service Providers"],
  ["responsibilities", "FedRAMP"],
]);

const AUDIENCE_TAG_BY_AFFECTED_PARTY = new Map([
  ["advisors", "Advisors"],
  ["agencies", "Federal Agencies"],
  ["assessors", "Independent Assessors"],
  ["fedramp", "FedRAMP"],
  ["providers", "Cloud Service Providers"],
]);

const CONTENT_TYPE_TAG_BY_DOCUMENT_TYPE = new Map([
  ["CTL", "Controls"],
  ["CTL_REFERENCE", "Controls"],
  ["DEADLINES", "Deadlines"],
  ["FRD", "Definitions"],
  ["FRR", "Rules"],
  ["FRR_REFERENCE_INDEX", "Rules"],
  ["FRR_TAGGED_SUMMARY", "Rules"],
  ["KSI", "Key Security Indicators"],
]);

export function requiredZensicalTags(relativePath: string): string[] {
  const pathSegments = relativePath.replaceAll("\\", "/").split("/");
  const requiredTags = pathSegments.flatMap((segment) => {
    const tag = REQUIRED_TAG_BY_DIRECTORY.get(segment);
    return tag ? [tag] : [];
  });

  return Array.from(new Set(requiredTags));
}

export function pathAudienceZensicalTags(relativePath: string): string[] {
  const pathSegments = relativePath.replaceAll("\\", "/").split("/");
  const audienceTags = pathSegments.flatMap((segment) => {
    const tag = AUDIENCE_TAG_BY_DIRECTORY.get(segment);
    return tag ? [tag] : [];
  });

  return Array.from(new Set(audienceTags));
}

export function affectedPartyZensicalTags(
  affectedParties: readonly string[],
): string[] {
  return Array.from(
    new Set(
      affectedParties.flatMap((affectedParty) => {
        const tag = AUDIENCE_TAG_BY_AFFECTED_PARTY.get(
          affectedParty.trim().toLowerCase(),
        );
        return tag ? [tag] : [];
      }),
    ),
  );
}

export function contentTypeZensicalTags(documentType: string): string[] {
  const tag = CONTENT_TYPE_TAG_BY_DOCUMENT_TYPE.get(documentType);
  return tag ? [tag] : [];
}

export function mergePathZensicalTags(
  tags: string[],
  relativePath: string,
): string[] {
  return Array.from(
    new Set([
      ...tags,
      ...requiredZensicalTags(relativePath),
      ...pathAudienceZensicalTags(relativePath),
    ]),
  );
}

export function mergeGeneratedZensicalTags(
  tags: string[],
  relativePath: string,
  documentType: string,
  affectedParties: readonly string[],
): string[] {
  return Array.from(
    new Set([
      ...mergePathZensicalTags(tags, relativePath),
      ...affectedPartyZensicalTags(affectedParties),
      ...contentTypeZensicalTags(documentType),
    ]),
  );
}
