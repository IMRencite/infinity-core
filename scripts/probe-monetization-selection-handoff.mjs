/**
 * Non-building live probe: verify explicit monetization → selection handoff for a completed cycle.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const sep = trimmed.indexOf("=");
  if (sep === -1) continue;
  process.env[trimmed.slice(0, sep)] = trimmed.slice(sep + 1).replace(/^["']|["']$/g, "");
}

const discoveryRunId = process.argv[2] ?? "b6ee782c-38cf-4279-8318-caa118e33989";
const monetizationRunId = process.argv[3] ?? "94b34a17-bfc5-4207-9f96-c7c735f86eaf";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: candidates } = await admin
  .from("opportunity_candidates")
  .select("id, title, discovery_run_id, organization_id")
  .eq("discovery_run_id", discoveryRunId)
  .order("opportunity_score", { ascending: false, nullsFirst: false });

const { data: monetizationRun } = await admin
  .from("monetization_runs")
  .select("*")
  .eq("id", monetizationRunId)
  .maybeSingle();

const { data: analyses } = await admin
  .from("monetization_candidate_analyses")
  .select("opportunity_candidate_id, monetization_run_id")
  .eq("monetization_run_id", monetizationRunId);

const discoveredCandidateIds = (candidates ?? []).map((c) => c.id);
const monetizedCandidateIds = (analyses ?? []).map((a) => a.opportunity_candidate_id);
const inputIds = (monetizationRun?.opportunity_candidate_ids ?? []);
const reportHandoff = monetizationRun?.engine_report?.handoff ?? null;

const excludedCandidates = discoveredCandidateIds
  .filter((id) => !monetizedCandidateIds.includes(id))
  .map((candidateId) => {
    const inInput = inputIds.includes(candidateId);
    return {
      candidateId,
      stage: "monetization",
      reason: inInput
        ? "in_monetization_input_but_no_current_analysis"
        : "Excluded by monetization maxCandidates limit (5)",
      classification: inInput ? "monetization_analysis_failed" : "monetization_input_truncated",
    };
  });

const selectionCandidateIds = reportHandoff?.monetizedCandidateIds ?? monetizedCandidateIds;

console.log(
  JSON.stringify(
    {
      discoveredCandidateIds,
      monetizedCandidateIds,
      selectionCandidateIds,
      excludedCandidates: reportHandoff?.excludedCandidates ?? excludedCandidates,
    },
    null,
    2,
  ),
);

if (selectionCandidateIds.length === 0) {
  console.error("LIVE HANDOFF PROBE: FAIL — empty selection pool");
  process.exit(1);
}

for (const candidateId of selectionCandidateIds) {
  if (!monetizedCandidateIds.includes(candidateId)) {
    console.error(`LIVE HANDOFF PROBE: FAIL — ${candidateId} missing current monetization analysis`);
    process.exit(1);
  }
  const candidate = candidates?.find((c) => c.id === candidateId);
  if (!candidate || candidate.discovery_run_id !== discoveryRunId) {
    console.error(`LIVE HANDOFF PROBE: FAIL — ${candidateId} discovery lineage mismatch`);
    process.exit(1);
  }
}

const staleDiscoveryExpectation = discoveredCandidateIds.filter(
  (id) => !selectionCandidateIds.includes(id) && !monetizedCandidateIds.includes(id),
);
const wronglyRequired = staleDiscoveryExpectation.filter((id) =>
  selectionCandidateIds.includes(id),
);
if (wronglyRequired.length > 0) {
  console.error("LIVE HANDOFF PROBE: FAIL — non-monetized discovery IDs required", wronglyRequired);
  process.exit(1);
}

console.log("LIVE HANDOFF PROBE: PASS");
process.exit(0);
