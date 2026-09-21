export const CRE_PUBLIC_WEB_OBJECTIVE =
  "Find public tenant-representation / occupier-advisory commercial real estate firms and named professionals with public role evidence." as const;

export function buildBoundedQueryPlan(input?: { extraQueries?: string[]; maxQueries?: number }): string[] {
  const maxQueries = input?.maxQueries ?? 6;
  const base = [
    "tenant representation commercial real estate team",
    "office tenant representation broker biography",
    "boutique occupier advisory tenant representation",
    "retail tenant representation principal broker",
    "industrial tenant representation advisor",
    "commercial lease tenant advisory team page",
  ];
  const extras = (input?.extraQueries ?? []).map((query) => query.trim()).filter(Boolean);
  return [...new Set([...extras, ...base])].slice(0, maxQueries);
}
