/**
 * Live bounded validation acquisition probe — provider-backed new evidence.
 * Does NOT run FAVC1 or mutate historical selection decisions.
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

const orgId = process.argv[2] ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const candidateId = process.argv[3] ?? "65e55dde-2b40-409e-b76e-f79ad295cf81";
const monetizationRunId = process.argv[4] ?? "7940a03d-d580-4739-b1b5-473290aa657a";
const cycleKey = process.argv[5] ?? `probe-${Date.now()}`;

const { loadCandidateBundlesForSelection } = await import(
  "../lib/infinity/venture-selection/load/load-candidates.ts"
);
const { runValidationAcquisitionProbe } = await import(
  "../lib/infinity/first-autonomous-venture-cycle/bounded-validation/run-acquisition-probe.ts"
);
const { buildValidationStationState } = await import(
  "../lib/infinity/operator-console/favc1-cycle/validation-station.ts"
);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const bundles = await loadCandidateBundlesForSelection(admin, orgId, {
  candidateIds: [candidateId],
  monetizationRunId,
});

const candidate = bundles[0];
if (!candidate) {
  console.error("Candidate not found");
  process.exit(1);
}

const { data: adversarial } = await admin
  .from("adversarial_reviews")
  .select("risk_inputs")
  .eq("opportunity_candidate_id", candidateId)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

console.log("=== LIVE VALIDATION ACQUISITION PROBE ===");
console.log(`candidate=${candidateId} cycleKey=${cycleKey}`);

const result = await runValidationAcquisitionProbe({
  admin,
  organizationId: orgId,
  candidate,
  cycleKey,
  blockingAssumptionText: "Customer acquisition cost can be kept near $110.",
  adversarialRiskInputs: adversarial?.risk_inputs ?? undefined,
});

console.log(JSON.stringify(result, null, 2));

const hq = buildValidationStationState({
  validationActive: result.ok && !result.technicalFailure,
  validationCompleted: result.ok,
  providerCalls: result.providerCalls,
  synthesisOnly: result.providerCalls === 0,
  costUsd: result.costUsd,
  costKnown: result.costKnown,
  currentTask: result.providerCalls > 0 ? "Running grounded CAC benchmark research" : null,
});

console.log("\n=== HQ VALIDATION STATION ===");
console.log(JSON.stringify(hq, null, 2));

console.log("\n=== EVIDENCE TABLE ===");
for (const row of result.evidenceTable) {
  console.log(
    [row.source.slice(0, 80), row.novelty, row.relevance, row.quantitativeMatch, row.validationResult].join(" | "),
  );
}

console.log("\n=== READINESS ===");
console.log(
  result.acquisitionReady
    ? "YES — LIVE VALIDATION CAN ACQUIRE NEW GROUNDED EVIDENCE"
    : "NO — VALIDATION CANNOT YET RESOLVE NEW UNCERTAINTY",
);
