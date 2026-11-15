// Only FRR/KSI content follows this replacement contract; CTL is separate.
export const CLASS_CONTENT_FIELDS = [
  "statement",
  "following_information",
  "following_information_bullets",
  "force",
  "notes",
  "schema",
  "note",
  "artifacts",
  "timeframe_type",
  "timeframe_num",
  "timeframe_num_min",
  "timeframe_num_max",
  "rev5_controls_list",
  "pain_timeframes",
  "effective_date",
] as const;

export function resolveClassContent<
  T extends { varies_by_class?: Record<string, object> },
>(entry: T, className: string): T {
  const resolved = { ...entry };
  delete resolved.varies_by_class;
  const variant = entry.varies_by_class?.[className.toLowerCase()];
  for (const field of CLASS_CONTENT_FIELDS) {
    if (variant && Object.hasOwn(variant, field)) {
      (resolved as Record<string, unknown>)[field] = (
        variant as Record<string, unknown>
      )[field];
    }
  }
  return resolved;
}

export function applicableClasses(
  entry: { varies_by_class?: Record<string, { applicable?: boolean }> },
  inherited: readonly string[] = [],
): string[] {
  return ["A", "B", "C", "D"].filter((className) => {
    const flag = entry.varies_by_class?.[className.toLowerCase()]?.applicable;
    if (flag === true) return true;
    if (flag === false) return false;
    return inherited.some((value) => value.toUpperCase() === className);
  });
}
