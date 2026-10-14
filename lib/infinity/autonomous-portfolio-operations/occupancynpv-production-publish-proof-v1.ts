import { fetchPublicHtml } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";

export async function verifyOccupancyNpvProductionPublication(input: {
  canonical_url: string;
  expected_path: string;
}): Promise<{
  AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC: "PASS" | "FAIL" | "NOT_RUN";
  http_status: number;
  canonical_ok: boolean;
  schema_ok: boolean;
  responsive_marker_ok: boolean;
}> {
  const url = input.canonical_url.replace(/\/+$/, "") + "/";
  const live = await fetchPublicHtml(url);
  const body = live.body ?? "";
  const canonical_ok = body.includes(`rel="canonical"`) && body.includes(input.expected_path.replace(/\/+$/, ""));
  const schema_ok = body.includes("application/ld+json");
  const responsive_marker_ok = body.includes("viewport") || body.includes("pv-shell");
  const pass = live.ok && canonical_ok && schema_ok;
  return {
    AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC: pass ? "PASS" : live.ok ? "FAIL" : "NOT_RUN",
    http_status: live.status,
    canonical_ok,
    schema_ok,
    responsive_marker_ok,
  };
}
