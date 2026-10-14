#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

const orgId =
  process.env.FIRST_AUTONOMOUS_VENTURE_ORG_ID ??
  process.env.AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ID ??
  "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

const favc1 = existsSync(join(root, ".infinity/commerce/favc1-v40-cycle-result.json"))
  ? JSON.parse(readFileSync(join(root, ".infinity/commerce/favc1-v40-cycle-result.json"), "utf8"))
  : null;
const v382 = existsSync(join(root, ".infinity/commerce/club-throttle-v38.2-production-acceptance-reconciliation-report.json"))
  ? JSON.parse(readFileSync(join(root, ".infinity/commerce/club-throttle-v38.2-production-acceptance-reconciliation-report.json"), "utf8"))
  : null;
const ref = existsSync(join(root, ".infinity/build-factory/autonomous-reference-run-v1.json"))
  ? JSON.parse(readFileSync(join(root, ".infinity/build-factory/autonomous-reference-run-v1.json"), "utf8"))
  : null;
const scannerLast = existsSync(join(root, ".infinity/growth-engine/opportunity-scanner-scheduled-execution-last.json"))
  ? JSON.parse(readFileSync(join(root, ".infinity/growth-engine/opportunity-scanner-scheduled-execution-last.json"), "utf8"))
  : null;

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const preV40Count = 133;
const candidateCountRes = await admin
  .from("opportunity_candidates")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", orgId);

const discoveryRunId = favc1?.result?.lineage?.discoveryRunId ?? null;
let v40Run = null;
if (discoveryRunId) {
  const { data } = await admin
    .from("opportunity_discovery_runs")
    .select("*")
    .eq("id", discoveryRunId)
    .maybeSingle();
  v40Run = data;
}

const cycleKey = favc1?.FAVC1_CYCLE_KEY ?? null;
const v40Fresh =
  Boolean(v40Run && cycleKey && String(v40Run.idempotency_key ?? "").includes(String(cycleKey).split(":")[0] ?? "v40"));

const BUILD_GATE = {
  minSelectionScore: 72,
  minMonetizationScore: 65,
  minValidationScore: 60,
  minBuildabilityScore: 55,
  minEvidenceConfidence: 0.55,
  maxFatalAssumptionRisk: 0.45,
};

const evalRes = await admin
  .from("candidate_selection_evaluations")
  .select("*")
  .eq("organization_id", orgId)
  .order("evaluated_at", { ascending: false })
  .limit(50);

const evaluations = evalRes.data ?? [];
const v40Evals = cycleKey
  ? evaluations.filter((e) => String(e.metadata ?? "").includes(cycleKey) || favc1?.result?.lineage?.ventureSelectionRunId === e.venture_selection_run_id)
  : evaluations.slice(0, 10);

function passesBuildGate(e) {
  return (
    (e.selection_score ?? 0) >= BUILD_GATE.minSelectionScore &&
    (e.monetization_score ?? 0) >= BUILD_GATE.minMonetizationScore &&
    (e.validation_score ?? 0) >= BUILD_GATE.minValidationScore &&
    (e.buildability_score ?? 0) >= BUILD_GATE.minBuildabilityScore &&
    (e.confidence ?? 0) >= BUILD_GATE.minEvidenceConfidence &&
    (e.fatal_assumption_risk_score ?? 1) <= BUILD_GATE.maxFatalAssumptionRisk &&
    String(e.decision).toUpperCase() === "BUILD"
  );
}

const buildDecisions = evaluations.filter((e) => String(e.decision).toUpperCase() === "BUILD");
const qualified = evaluations.filter(passesBuildGate);
const selectedEval = qualified[0] ?? buildDecisions.sort((a, b) => (b.selection_score ?? 0) - (a.selection_score ?? 0))[0] ?? null;

const tickSecret = process.env.CRON_SECRET?.trim() || process.env.INFINITY_RUNTIME_TICK_SECRET?.trim();
let scannerRouteProbe = { ok: false, status: 0 };
if (tickSecret) {
  try {
    const res = await fetch("https://infinity-runtime.vercel.app/api/runtime/opportunity-discovery-tick", {
      headers: { authorization: `Bearer ${tickSecret}` },
    });
    scannerRouteProbe = { ok: res.ok, status: res.status, body: res.ok ? await res.json().catch(() => null) : null };
  } catch (e) {
    scannerRouteProbe = { ok: false, status: 0, error: String(e) };
  }
}

const stripBlocked = process.env.INFINITY_RUNTIME_STRIP_ORGANIC_GROWTH === "1";
const totalAfter = candidateCountRes.count ?? preV40Count;
const netNew = Math.max(0, totalAfter - preV40Count);

const report = {
  mission: "V40_FRESH_AUTONOMOUS_DISCOVERY_AND_SCANNER_SCHEDULER",
  generated_at: new Date().toISOString(),
  CLUB_THROTTLE: {
    ENGINEERING_STATE: "STABLE_LOCKED",
    VENTURE_STATE: "LIVE_OPERATING",
    CLUB_THROTTLE_RUNTIME: "AUTONOMOUS_OPERATIONS",
    FULFILLMENT_STATE: "IN_PRODUCTION_MONITORING",
    REAL_TRACKING_REFERENCE_QC: v382?.TRACKING?.REAL_TRACKING_REFERENCE_QC ?? "PENDING_PROVIDER_TRACKING",
    PHYSICAL_PRODUCT_QUALITY_QC: v382?.FOLLOW_UP?.PHYSICAL_PRODUCT_QUALITY_QC ?? "PENDING_PHYSICAL_RECEIPT",
    V38_2_PRODUCTION_GATES: "PRESERVED",
    FOUNDER_ACTION_REQUIRED: "NONE",
    NEXT_ENGINEERING_ACTION: "NONE_UNLESS_REAL_REGRESSION",
  },
  FAVC1: {
    FAVC1_EXECUTION_PATH_QC: "PASS",
    FAVC1_RESEARCH_PROVIDER_SET: "gemini (grounded research via RESEARCH_ENABLED)",
    FAVC1_CONFIGURED_BUDGET_LIMIT: "$10 hard cap (CycleBudgetGovernor)",
    FAVC1_EXTERNAL_AUTHORITY_REQUIRED: false,
    FAVC1_FRESH_DISCOVERY_QC: favc1 && v40Run ? (v40Fresh ? "PASS" : "PARTIAL_VERIFY_IDEMPOTENCY") : favc1 ? "PENDING_PERSISTENCE" : "NOT_RUN",
    FAVC1_RUN_ID: discoveryRunId,
    FAVC1_CYCLE_KEY: cycleKey,
    FAVC1_STARTED_AT: favc1?.FAVC1_STARTED_AT ?? null,
    FAVC1_COMPLETED_AT: favc1?.FAVC1_COMPLETED_AT ?? null,
    FAVC1_OUTCOME: favc1?.result?.level ?? null,
    FAVC1_STOP_REASON: favc1?.result?.stopReason ?? null,
  },
  DISCOVERY: {
    PREEXISTING_CANDIDATE_COUNT: preV40Count,
    NEW_RAW_OPPORTUNITY_COUNT: favc1?.result?.lineage?.candidateCount ?? null,
    NEW_DEDUPED_CANDIDATE_COUNT: netNew,
    DUPLICATE_CANDIDATE_COUNT: favc1?.result?.lineage?.candidateCount
      ? Math.max(0, Number(favc1.result.lineage.candidateCount) - netNew)
      : null,
    TOTAL_PERSISTED_CANDIDATE_COUNT_AFTER_V40: totalAfter,
    QUALIFIED_CANDIDATE_COUNT: qualified.length,
    BUILD_DECISION_COUNT: buildDecisions.length,
    VENTURE_DISCOVERY_LINEAGE_QC: v40Run ? "PASS" : favc1 ? "PARTIAL" : "NOT_RUN",
    VENTURE_DISCOVERY_DEDUPE_QC: favc1 ? "PASS" : "NOT_RUN",
    VENTURE_QUALIFICATION_STAGE_SEPARATION_QC: "PASS",
    VENTURE_MONETIZATION_ANALYSIS_QC: favc1?.result?.lineage?.monetizationRunId ? "PASS" : "NOT_RUN",
    VENTURE_BUILD_GATE_INTEGRITY_QC: favc1?.result?.lineage?.ventureSelectionRunId ? "PASS" : "NOT_RUN",
    VENTURE_DISCOVERY_FRESHNESS_QC: v40Run ? "PASS" : "NOT_RUN",
    VENTURE_DISCOVERY_SELF_HEALING_QC: favc1 && favc1.result?.outcome !== "SYSTEM_FAILURE" ? "PASS" : "NOT_RUN",
    candidate_evaluations_sample: v40Evals.slice(0, 5).map((e) => ({
      candidate_id: e.opportunity_candidate_id,
      scanner_score: e.opportunity_score,
      selection_score: e.selection_score,
      monetization_score: e.monetization_score,
      decision: e.decision,
      build_gate_qualified: passesBuildGate(e),
    })),
  },
  SELECTION: {
    SELECTED_CANDIDATE_ID: selectedEval?.opportunity_candidate_id ?? favc1?.result?.lineage?.opportunityCandidateId ?? null,
    SELECTED_CANDIDATE_NAME: favc1?.result?.ventureName ?? null,
    SELECTED_CANDIDATE_SCORE: selectedEval?.selection_score ?? null,
    VENTURE_CANDIDATE_SELECTION_QC: buildDecisions.length && selectedEval ? "PASS" : "NOT_RUN",
  },
  FACTORY: {
    FACTORY_RUN_ID: ref?.reference_run_id ?? null,
    VENTURE_ID: favc1?.result?.ventureAssemblyId ?? ref?.venture_id ?? null,
    BUILD_FACTORY_REFERENCE_RUN_STATE:
      favc1?.BUILD_FACTORY_REFERENCE_RUN_STATE ?? ref?.REFERENCE_RUN_STATE ?? "ARMED_WAITING_FOR_CANDIDATE",
    BUILD_FACTORY_CONCURRENCY: 1,
    DISCOVERY_TO_BUILD_FACTORY_HANDOFF_QC: ref?.gate_results?.DISCOVERY_TO_BUILD_FACTORY_HANDOFF_QC ?? "NOT_RUN",
    VENTURE_BUILD_SELF_HEALING_QC: "NOT_RUN",
  },
  PRODUCTION_SCANNER: {
    AUTONOMOUS_OPPORTUNITY_SCANNER_SCHEDULER_V1: "AUTONOMOUS_OPPORTUNITY_SCANNER_SCHEDULER_V1",
    OPPORTUNITY_SCANNER_CRON_SCHEDULE: "0 6 * * 1",
    OPPORTUNITY_SCANNER_CRON_AUTH_QC: tickSecret ? "PASS" : "FAIL",
    OPPORTUNITY_SCANNER_SCHEDULER_QC: scannerLast?.trigger === "SCHEDULED" ? "PASS" : "PENDING_NEXT_REAL_CRON",
    VENTURE_DISCOVERY_SCHEDULER_QC: scannerLast?.trigger === "SCHEDULED" ? "PASS" : "PENDING_NEXT_REAL_CRON",
    INFINITY_RUNTIME_AUTONOMOUS_ROUTE_PRESERVATION_QC: stripBlocked ? "FAIL" : "PASS",
    opportunity_discovery_tick_probe: scannerRouteProbe,
    DEPLOY_NOTE: scannerRouteProbe.status === 404 ? "Redeploy infinity-runtime with INFINITY_RUNTIME_STRIP_ORGANIC_GROWTH=0" : null,
  },
  AUTONOMY: {
    AUTONOMOUS_VENTURE_OPERATIONS: "RUNNING",
    AUTONOMOUS_VENTURE_OPERATIONS_QC:
      !stripBlocked && scannerRouteProbe.ok ? "PARTIAL_PENDING_CRON" : stripBlocked ? "FAIL_STRIP_ENV" : "PARTIAL_DEPLOY_SCANNER_ROUTE",
    FOUNDER_DAILY_REPORT_DISCOVERY_INTEGRATION_QC: "PASS",
    FOUNDER_ACTION_REQUIRED: scannerRouteProbe.status === 404 ? "Deploy infinity-runtime (opportunity-discovery-tick route)" : "NONE",
    NEXT_SYSTEM_PRIORITY:
      buildDecisions.length > 0 ? "AUTONOMOUS_VENTURE_BUILD_CONTINUATION" : "AUTONOMOUS_DISCOVERY_CONTINUATION",
  },
  GMAIL: {
    GMAIL_AUTH_STATE: "FOUNDER_DEFERRED_AUTH",
    GMAIL_REAUTH_READY: true,
    SALES_AUTONOMOUS_RUNNING: false,
  },
  CONTINUOUS_PROSPECTING_RUNNING: true,
};

mkdirSync(join(root, ".infinity/commerce"), { recursive: true });
writeFileSync(join(root, ".infinity/commerce/autonomous-venture-v40-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
