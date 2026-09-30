import type { PublicVentureProjection } from "./types";

export function selectMostRecentPublicVentures(
  ventures: PublicVentureProjection[],
  limit = 10,
): PublicVentureProjection[] {
  const seen = new Set<string>();
  const eligible = ventures.filter((row) => {
    const key = row.public_venture_id ?? row.public_name;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(row.public_name);
  });
  return eligible
    .slice()
    .sort((left, right) => {
      const leftTime = Date.parse(left.created_at ?? "");
      const rightTime = Date.parse(right.created_at ?? "");
      if (Number.isFinite(rightTime) && Number.isFinite(leftTime) && rightTime !== leftTime) {
        return rightTime - leftTime;
      }
      if (Number.isFinite(rightTime) && !Number.isFinite(leftTime)) return 1;
      if (!Number.isFinite(rightTime) && Number.isFinite(leftTime)) return -1;
      const leftId = left.public_venture_id ?? left.public_name;
      const rightId = right.public_venture_id ?? right.public_name;
      return leftId.localeCompare(rightId);
    })
    .slice(0, Math.max(0, limit));
}
