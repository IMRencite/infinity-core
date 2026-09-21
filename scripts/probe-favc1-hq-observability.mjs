/**
 * Non-destructive probe: reconstruct HQ FAVC1 room states from persisted cycle data.
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

const cycleKey = process.argv[2] ?? "cycle-1786914709744";
const orgId = process.argv[3] ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

function mapStatus(status) {
  const normalized = (status ?? "").toLowerCase();
  if (["requested", "running", "researching", "analyzing", "scoring"].includes(normalized)) return "RUNNING";
  if (["completed", "complete"].includes(normalized)) return "COMPLETE";
  if (["failed", "policy_blocked"].includes(normalized)) return "FAILED";
  return "NOT_STARTED";
}

const discoveryKey = `first-autonomous-venture-v1:${orgId}:${cycleKey}:discovery`;
const monetizationKey = `first-autonomous-venture-v1:${orgId}:${cycleKey}:monetization`;
const selectionKey = `first-autonomous-venture-v1:${orgId}:${cycleKey}:venture_selection`;

const { data: discovery } = await admin
  .from("opportunity_discovery_runs")
  .select("*")
  .eq("organization_id", orgId)
  .eq("idempotency_key", discoveryKey)
  .maybeSingle();

const { data: monetization } = await admin
  .from("monetization_runs")
  .select("*")
  .eq("organization_id", orgId)
  .eq("idempotency_key", monetizationKey)
  .maybeSingle();

const { data: selection } = await admin
  .from("venture_selection_runs")
  .select("*")
  .eq("organization_id", orgId)
  .eq("idempotency_key", selectionKey)
  .maybeSingle();

const researchIds = Array.isArray(discovery?.research_run_ids) ? discovery.research_run_ids : [];
const { data: prefixResearch } = await admin
  .from("research_runs")
  .select("id, status")
  .eq("organization_id", orgId)
  .like("idempotency_key", `first-autonomous-venture-v1:${orgId}:${cycleKey}%`);

const researchRuns = prefixResearch ?? [];
const researchRunning = researchRuns.filter((run) => mapStatus(run.status) === "RUNNING").length;
const researchComplete = researchRuns.filter((run) => mapStatus(run.status) === "COMPLETE").length;

const discoveryState = mapStatus(discovery?.status);
const monetizationState = mapStatus(monetization?.status);
const selectionState = selection ? mapStatus(selection.status) : monetizationState === "COMPLETE" ? "BLOCKED" : "NOT_STARTED";
const commandState =
  discoveryState === "RUNNING" || monetizationState === "RUNNING"
    ? "RUNNING"
    : monetizationState === "COMPLETE" && !selection
      ? "FAILED"
      : "COMPLETE";

const researchState =
  researchRunning > 0 ? "RUNNING" : researchComplete > 0 ? "COMPLETE" : discoveryState === "COMPLETE" ? "COMPLETE" : "NOT_STARTED";

const knownCost =
  [discovery?.estimated_cost_usd, monetization?.estimated_cost_usd, selection?.estimated_cost_usd]
    .filter((value) => value != null)
    .reduce((sum, value) => sum + Number(value), 0) || null;

console.log(
  JSON.stringify(
    {
      cycleKey,
      terminalOutcome: commandState === "FAILED" ? "SYSTEM_FAILURE" : discoveryState === "COMPLETE" && monetizationState === "COMPLETE" ? "SYSTEM_FAILURE" : "RUNNING",
      Command: commandState,
      VentureRadar: discoveryState,
      ResearchGrid: researchState,
      ProfitLab: monetizationState,
      BlueprintLab: selectionState,
      workerSourceCount: researchRuns.length,
      candidateCount: discovery?.candidates_persisted ?? null,
      monetizedCandidateCount: monetization?.candidates_analyzed ?? null,
      knownCycleCost: knownCost,
    },
    null,
    2,
  ),
);

if (!discovery || !monetization) {
  console.error("HQ FAVC1 OBSERVABILITY PROBE: FAIL");
  process.exit(1);
}

console.log("HQ FAVC1 OBSERVABILITY PROBE: PASS");
process.exit(0);
