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
const { ensureFoundingMission, runDiscoveryCommandCycle } = await import(
  "../lib/infinity/orchestration.ts"
);
const { recordRuntimeValidationIntelligence } = await import(
  "../lib/infinity/intelligence/validation.ts"
);
const { calculateIntelligenceSummary } = await import(
  "../lib/infinity/intelligence/queries.ts"
);

const admin = createAdminClient();
const supabase = admin;

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

await ensureFoundingMission(supabase, org.id);

const beforeSummary = await calculateIntelligenceSummary(supabase, org.id);
console.log("Before command cycle:", beforeSummary);

const cycleResult = await runDiscoveryCommandCycle(
  supabase,
  org.id,
  "validation-script",
  "system",
);

console.log("Command cycle result:", cycleResult);

if (cycleResult.status !== "completed") {
  console.error("Command cycle did not complete:", cycleResult.message);
  process.exit(1);
}

const workerRunId = cycleResult.workerRunId;
const opportunityScanId = cycleResult.opportunityScanId;

const counts = await Promise.all([
  admin
    .from("evidence_sources")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("external_identifier", `worker_run:${workerRunId}`),
  admin
    .from("evidence_records")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("content_hash", `runtime-validation:${workerRunId}`),
  admin
    .from("claims")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("subject_type", "worker_run")
    .eq("subject_id", workerRunId)
    .eq("predicate", "runtime_execution"),
  admin
    .from("claim_evidence")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id),
  admin
    .from("memory_records")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("source_entity_type", "worker_run")
    .eq("source_entity_id", workerRunId),
  admin
    .from("opportunities")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id),
]);

const [
  sourceCount,
  evidenceCount,
  claimCount,
  claimEvidenceResult,
  memoryCount,
  opportunityCount,
] = counts;

const claimEvidenceCount = claimEvidenceResult.count ?? 0;

const duplicate = await recordRuntimeValidationIntelligence(admin, {
  organizationId: org.id,
  actorType: "system",
  sourceEntityType: "worker_run",
  sourceEntityId: workerRunId,
  workerRunId,
  engineJobId: cycleResult.jobId,
  opportunityScanId: opportunityScanId ?? "",
  scanType: "broad_market",
});

const afterSummary = await calculateIntelligenceSummary(supabase, org.id);

const checks = {
  evidenceSourceForWorkerRun: sourceCount.count === 1,
  evidenceRecordForWorkerRun: evidenceCount.count === 1,
  claimForWorkerRun: claimCount.count === 1,
  memoryForWorkerRun: memoryCount.count === 1,
  noOpportunities: opportunityCount.count === 0,
  idempotentReplay: duplicate.alreadyRecorded === true,
  summaryHasEvidence: afterSummary.evidenceCount >= beforeSummary.evidenceCount + 1,
  summaryHasMemory: afterSummary.memoryCount >= beforeSummary.memoryCount + 1,
};

console.log("Per-worker-run counts:", {
  evidenceSources: sourceCount.count,
  evidenceRecords: evidenceCount.count,
  claims: claimCount.count,
  claimEvidenceLinks: claimEvidenceCount,
  memoryRecords: memoryCount.count,
  opportunities: opportunityCount.count,
});

console.log("After summary:", afterSummary);
console.log("Idempotent replay:", duplicate);
console.log("Checks:", checks);

const failed = Object.entries(checks).filter(([, ok]) => !ok);

if (failed.length > 0) {
  console.error("Validation failed:", failed.map(([name]) => name).join(", "));
  process.exit(1);
}

console.log("Intelligence E2E validation passed.");
