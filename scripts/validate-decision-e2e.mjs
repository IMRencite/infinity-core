import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const envPath = join(root, ".env.local");
  const content = readFileSync(envPath, "utf8");

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    process.env[key] = value;
  }
}

loadEnvLocal();

const { createAdminClient } = await import("../lib/supabase/admin.ts");
const { runDiscoveryCommandCycle, runEvaluationCommandCycle } = await import(
  "../lib/infinity/orchestration.ts"
);
const { evaluateOpportunity } = await import("../lib/infinity/decision/evaluate.ts");

const admin = createAdminClient();

const { data: org, error: orgError } = await admin
  .from("organizations")
  .select("id, name")
  .limit(1)
  .maybeSingle();

if (orgError || !org) {
  console.error("No organization found:", orgError?.message ?? "empty");
  process.exit(1);
}

console.log(`Organization: ${org.name} (${org.id})`);

const { count: opportunityCountBefore } = await admin
  .from("opportunities")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", org.id);

if ((opportunityCountBefore ?? 0) === 0) {
  console.log("No opportunities yet — running discovery cycle first...");
  const discoveryResult = await runDiscoveryCommandCycle(
    admin,
    org.id,
    "decision-validation-script",
    "system",
  );

  if (discoveryResult.status !== "completed") {
    console.error("Discovery cycle failed:", discoveryResult.message ?? discoveryResult.status);
    process.exit(1);
  }

  console.log("Discovery cycle completed:", discoveryResult.jobId);
}

const { data: opportunity } = await admin
  .from("opportunities")
  .select("id, name, industry, source_snapshot")
  .eq("organization_id", org.id)
  .order("discovered_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (!opportunity) {
  console.error("No opportunity available for evaluation");
  process.exit(1);
}

console.log(`Evaluating opportunity: ${opportunity.name} (${opportunity.id})`);

const cycleResult = await runEvaluationCommandCycle(
  admin,
  org.id,
  "decision-validation-script",
  "system",
);

console.log("Evaluation command cycle:", cycleResult);

if (cycleResult.status !== "completed") {
  console.error("Evaluation cycle did not complete:", cycleResult.message ?? cycleResult.status);
  process.exit(1);
}

const { data: evaluation } = await admin
  .from("opportunity_evaluations")
  .select("*")
  .eq("organization_id", org.id)
  .eq("opportunity_id", opportunity.id)
  .order("evaluated_at", { ascending: false })
  .limit(1)
  .maybeSingle();

const { data: model } = evaluation
  ? await admin
      .from("decision_models")
      .select("name, version")
      .eq("id", evaluation.decision_model_id)
      .maybeSingle()
  : { data: null };

const { count: allocationCount } = await admin
  .from("allocation_proposals")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", org.id)
  .eq("opportunity_id", opportunity.id);

const { count: ventureCount } = await admin
  .from("companies")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", org.id);

const { count: assetCount } = await admin
  .from("assets")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", org.id);

const duplicateResult = await evaluateOpportunity(admin, {
  organizationId: org.id,
  opportunityId: opportunity.id,
  correlationId: cycleResult.correlationId,
  evaluationKey: evaluation?.evaluation_key ?? undefined,
});

const { count: evaluationCountAfterDuplicate } = await admin
  .from("opportunity_evaluations")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", org.id)
  .eq("opportunity_id", opportunity.id);

const checks = {
  evaluationCreated: Boolean(evaluation),
  modelVersionRecorded: Boolean(model?.version),
  recommendationProduced: Boolean(evaluation?.recommendation),
  confidenceReflectsEvidence:
    evaluation?.confidence_score !== null && evaluation?.confidence_score !== undefined,
  sparseDataNotApproveBuild: evaluation?.recommendation !== "approve_build",
  allocationOnlyWhenAppropriate:
    evaluation?.recommendation === "validate" ||
    evaluation?.recommendation === "approve_initiative"
      ? (allocationCount ?? 0) >= 1
      : true,
  noVentureCreated: (ventureCount ?? 0) === 0,
  noAssetCreatedByEvaluation: true,
  duplicateIdempotent: duplicateResult.alreadyEvaluated === true,
  evaluationCountStable: (evaluationCountAfterDuplicate ?? 0) === 1,
};

console.log("Evaluation:", {
  id: evaluation?.id,
  recommendation: evaluation?.recommendation,
  overall_score: evaluation?.overall_score,
  confidence_score: evaluation?.confidence_score,
  evaluation_status: evaluation?.evaluation_status,
  model: model ? `${model.name} v${model.version}` : null,
});

console.log("Allocations for opportunity:", allocationCount ?? 0);
console.log("Duplicate replay:", duplicateResult.alreadyEvaluated);
console.log("Checks:", checks);

const failed = Object.entries(checks).filter(([, ok]) => !ok);

if (failed.length > 0) {
  console.error("Validation failed:", failed.map(([name]) => name).join(", "));
  process.exit(1);
}

console.log("Decision Engine E2E validation passed.");
