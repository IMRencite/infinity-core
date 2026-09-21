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

const CURRENT_DISCOVERY = "7979f49f-fb61-480f-8369-5f7b924d83ae";
const vsRunId = process.argv[2] ?? "4eda68f6-8f74-4fe3-b0e0-5ae6cb3b75cb";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: run } = await admin
  .from("venture_selection_runs")
  .select("*")
  .eq("id", vsRunId)
  .maybeSingle();

console.log(
  JSON.stringify(
    {
      id: run?.id,
      organizationId: run?.organization_id,
      status: run?.status,
      opportunityCandidateIds: run?.opportunity_candidate_ids,
      discoveryRunIds: run?.discovery_run_ids,
      monetizationRunId: run?.monetization_run_id,
      selectionReport: run?.selection_report
        ? {
            winnerDecision: run.selection_report?.winnerDecision ?? null,
            noGoReason: run.selection_report?.noGoReason ?? null,
          }
        : null,
    },
    null,
    2,
  ),
);

const { data: evals } = await admin
  .from("candidate_selection_evaluations")
  .select("*")
  .eq("venture_selection_run_id", vsRunId);

for (const e of evals ?? []) {
  const { data: cand } = await admin
    .from("opportunity_candidates")
    .select("id, title, discovery_run_id, organization_id")
    .eq("id", e.opportunity_candidate_id)
    .maybeSingle();

  console.log(
    JSON.stringify(
      {
        candidateId: cand?.id,
        title: cand?.title,
        discoveryRunId: cand?.discovery_run_id,
        organizationId: cand?.organization_id,
        fromCurrentDiscovery: cand?.discovery_run_id === CURRENT_DISCOVERY,
        decision: e.decision,
        selectionScore: e.selection_score,
        adversarialScore: e.adversarial_score,
      },
      null,
      2,
    ),
  );
}
