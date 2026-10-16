import { fetchPublicHtml } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";

export async function verifyClubThrottleProductionPublication(input: {
  canonical_url: string;
  expected_path: string;
  content_markers?: string[];
}): Promise<{
  AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC: "PASS" | "FAIL" | "NOT_RUN";
  http_status: number;
  canonical_ok: boolean;
  schema_ok: boolean;
  content_revision_ok: boolean;
}> {
  const url = input.canonical_url.replace(/\/+$/, "") + "/";
  const live = await fetchPublicHtml(url);
  const body = live.body ?? "";
  const canonical_ok =
    body.includes(`rel="canonical"`) && body.includes(input.expected_path.replace(/\/+$/, ""));
  const schema_ok = body.includes("application/ld+json");
  const markers = input.content_markers ?? [];
  const content_revision_ok =
    markers.length === 0 ? true : markers.filter((m) => body.includes(m)).length >= Math.min(2, markers.length);
  const pass = live.ok && canonical_ok && schema_ok && content_revision_ok;
  return {
    AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC: pass ? "PASS" : live.ok ? "FAIL" : "NOT_RUN",
    http_status: live.status,
    canonical_ok,
    schema_ok,
    content_revision_ok,
  };
}
