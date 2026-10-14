export function ventureContentActivityFreshnessQc(input: {
  last_asset_published_at: string | null;
  now: string;
  opportunities_in_backlog: number;
  max_idle_hours?: number;
}): "PASS" | "STALE" | "NO_OPPORTUNITY" {
  if (input.opportunities_in_backlog === 0) return "NO_OPPORTUNITY";
  if (!input.last_asset_published_at) return input.opportunities_in_backlog > 0 ? "STALE" : "NO_OPPORTUNITY";
  const idleMs = Date.parse(input.now) - Date.parse(input.last_asset_published_at);
  const maxMs = (input.max_idle_hours ?? 168) * 3600_000;
  return idleMs > maxMs ? "STALE" : "PASS";
}

export function ventureProductDevelopmentFreshnessQc(input: {
  backlog_concepts: number;
  advanced_beyond_concept: number;
  documented_blocker: boolean;
}): "PASS" | "STALE" | "NO_BACKLOG" {
  if (input.backlog_concepts === 0) return "NO_BACKLOG";
  if (input.advanced_beyond_concept > 0) return "PASS";
  return input.documented_blocker ? "PASS" : "STALE";
}

export function occupancynpvContentToConversionQc(draftBody?: string | null): "PASS" | "FAIL" {
  const body = draftBody ?? "";
  if (body.includes("occupancynpv.com") || body.includes("/") || body.length > 500) return "PASS";
  return "FAIL";
}
