/**
 * Read-only replay: would cycle-1786942702140 escalate to provider acquisition?
 * Does NOT mutate database rows or call providers.
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

const cycleKey = process.argv[2] ?? "cycle-1786942702140";
const candidateId = process.argv[3] ?? "96d65096-6390-4e2c-822d-cdcdd0d6fe17";

const { buildFavc1IdempotencyKey } = await import(
  "../lib/infinity/operator-console/favc1-cycle/types.ts"
);
const { loadCandidateBundlesForSelection } = await import(
  "../lib/infinity/venture-selection/load/load-candidates.ts"
);
const { buildAssumptionRegister, analyzeFatalAssumptions } = await import(
  "../lib/infinity/venture-selection/assumptions/register.ts"
);
const { executeAllowedValidationExperiments } = await import(
  "../lib/infinity/first-autonomous-venture-cycle/bounded-validation/experiments.ts"
);
const {
  evaluateAcquisitionVoi,
  selectEscalationBlocker,
  shouldEscalateRoundAfterSynthesis,
} = await import(
  "../lib/infinity/first-autonomous-venture-cycle/bounded-validation/escalation-policy.ts"
);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: selectionRun } = await admin
  .from("provider_runs")
  .select("organization_id, idempotency_key, output_payload")
  .like("idempotency_key", `%${cycleKey}%venture_selection%`)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

let orgId = selectionRun?.organization_id;
let monetizationRunId = null;

if (selectionRun?.idempotency_key) {
  const parsed = selectionRun.idempotency_key.match(/^first-autonomous-venture-v1:([^:]+):/);
  orgId = orgId ?? parsed?.[1];
}

const { data: monetizationRun } = await admin
  .from("provider_runs")
  .select("output_payload")
  .like("idempotency_key", `%${cycleKey}%monetization%`)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (monetizationRun?.output_payload && typeof monetizationRun.output_payload === "object") {
  monetizationRunId = monetizationRun.output_payload.monetizationRunId ?? null;
}

if (!orgId) {
  orgId = process.argv[4] ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
}

const bundles = await loadCandidateBundlesForSelection(admin, orgId, {
  candidateIds: [candidateId],
  monetizationRunId: monetizationRunId ?? undefined,
});

const bundle = bundles[0];
if (!bundle) {
  console.error("Candidate not found");
  process.exit(1);
}

const { data: adversarial } = await admin
  .from("adversarial_reviews")
  .select("risk_inputs, findings")
  .eq("opportunity_candidate_id", candidateId)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

const assumptions = buildAssumptionRegister(bundle, {
  adversarialRiskInputs: adversarial?.risk_inputs ?? undefined,
  adversarialFindings: Array.isArray(adversarial?.findings) ? adversarial.findings : [],
});
const fatal = analyzeFatalAssumptions(assumptions);

const synthesis = executeAllowedValidationExperiments({
  candidate: bundle,
  assumptions,
  maxExperiments: 2,
  providerCalls: 0,
});

const wouldEscalate = shouldEscalateRoundAfterSynthesis({
  assumptions,
  synthesisExperiments: synthesis.experiments,
  preFatalRisk: fatal.fatalAssumptionRiskScore,
});

const escalation = selectEscalationBlocker({
  assumptions,
  synthesisExperiments: synthesis.experiments,
  preFatalRisk: fatal.fatalAssumptionRiskScore,
});

console.log("=== HISTORICAL ESCALATION REPLAY ===");
console.log(JSON.stringify({
  cycleKey,
  candidateId,
  title: bundle.title,
  preFatalRisk: fatal.fatalAssumptionRiskScore,
  synthesisExperiments: synthesis.experiments.map((e) => ({
    assumption: e.blockingAssumptionId,
    relevanceClass: e.relevanceClass,
    validationResult: e.validationResult,
    newSourceCount: e.newSourceCount,
    reusedSourceCount: e.reusedSourceCount,
    uncertaintyReduction: e.uncertaintyReduction,
    synthesisOnly: e.synthesisOnly,
  })),
  wouldEscalateToProvider: wouldEscalate,
  acquisitionDecision: escalation?.decision ?? "SKIP",
  acquisitionReason: escalation?.reason ?? "No eligible blocker",
  prioritizedBlocker: escalation?.assumption.assumption ?? null,
  voi: escalation
    ? evaluateAcquisitionVoi({
        assumption: escalation.assumption,
        preFatalRisk: fatal.fatalAssumptionRiskScore,
      })
    : null,
}, null, 2));
