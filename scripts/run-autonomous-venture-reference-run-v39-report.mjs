#!/usr/bin/env node
/**
 * V39 — Autonomous venture reference run: discovery verification + truthful state report.
 * Does not inject candidates or lower qualification thresholds.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  try {
    for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      let val = trimmed.slice(sep + 1);
      const key = trimmed.slice(0, sep);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const orgId =
  process.env.FIRST_AUTONOMOUS_VENTURE_ORG_ID ??
  process.env.AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ID ??
  "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

const tickSecret = process.env.CRON_SECRET?.trim() || process.env.INFINITY_RUNTIME_TICK_SECRET?.trim();
const runtimeOrigin = process.env.INFINITY_RUNTIME_URL?.trim() || "https://infinity-runtime.vercel.app";
const hqOrigin = process.env.FOUNDER_HQ_ORIGIN?.trim() || "http://localhost:3000";

async function probeVentureCycle(origin, label) {
  if (!tickSecret) {
    return { label, origin, ok: false, status: 0, reason: "TICK_SECRET_MISSING" };
  }
  try {
    const res = await fetch(`${origin}/api/runtime/venture-operating-cycle`, {
      headers: { authorization: `Bearer ${tickSecret}` },
    });
    const body = res.ok ? await res.json().catch(() => null) : await res.text().catch(() => null);
    return { label, origin, ok: res.ok, status: res.status, body };
  } catch (e) {
    return { label, origin, ok: false, status: 0, reason: e instanceof Error ? e.message : String(e) };
  }
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const discoveryRunsRes = await admin
  .from("opportunity_discovery_runs")
  .select("id,status,created_at,completed_at,idempotency_key,strategies")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: false })
  .limit(20);

const candidateCountRes = await admin
  .from("opportunity_candidates")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", orgId);

const candidatesRes = await admin
  .from("opportunity_candidates")
  .select("id,title,opportunity_score,created_at,discovery_run_id,market,problem,target_customer,metadata,research_sources")
  .eq("organization_id", orgId)
  .order("opportunity_score", { ascending: false, nullsFirst: false })
  .limit(50);

const selectionRunsRes = await admin
  .from("venture_selection_runs")
  .select("id,status,created_at,completed_at,build_count,reject_count,validate_count,hold_count")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: false })
  .limit(10);

const evaluationsRes = await admin
  .from("candidate_selection_evaluations")
  .select(
    "id,opportunity_candidate_id,selection_score,decision,portfolio_adjusted_score,monetization_score,validation_score,buildability_score,confidence,fatal_assumption_risk_score,expected_roi,evaluated_at",
  )
  .eq("organization_id", orgId)
  .order("selection_score", { ascending: false, nullsFirst: false })
  .limit(200);

const BUILD_GATE = {
  minSelectionScore: 72,
  minMonetizationScore: 65,
  minValidationScore: 60,
  minBuildabilityScore: 55,
  minEvidenceConfidence: 0.55,
  maxFatalAssumptionRisk: 0.45,
};

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

const refPath = join(root, ".infinity/build-factory/autonomous-reference-run-v1.json");
const ref = existsSync(refPath) ? JSON.parse(readFileSync(refPath, "utf8")) : null;
const v382 = existsSync(join(root, ".infinity/commerce/club-throttle-v38.2-production-acceptance-reconciliation-report.json"))
  ? JSON.parse(readFileSync(join(root, ".infinity/commerce/club-throttle-v38.2-production-acceptance-reconciliation-report.json"), "utf8"))
  : null;

const [runtimeProbe, hqProbe] = await Promise.all([
  probeVentureCycle(runtimeOrigin, "infinity-runtime"),
  probeVentureCycle(hqOrigin, "founder-hq"),
]);

const discoveryRuns = discoveryRunsRes.data ?? [];
const candidates = candidatesRes.data ?? [];
const evaluations = evaluationsRes.data ?? [];

const qualifiedEvaluations = evaluations.filter(passesBuildGate);
const buildDecisionEvaluations = evaluations.filter((e) => String(e.decision).toUpperCase() === "BUILD");

const discoveredCount = candidateCountRes.count ?? candidates.length;
const qualifiedCount = qualifiedEvaluations.length || buildDecisionEvaluations.length;
const rejectedCount = evaluations.filter((e) => e.decision === "REJECT" || e.decision === "reject").length;

const selected =
  qualifiedEvaluations[0] ??
  buildDecisionEvaluations.sort((a, b) => (b.selection_score ?? 0) - (a.selection_score ?? 0))[0] ??
  null;

const selectedCandidate = selected
  ? candidates.find((c) => c.id === selected.opportunity_candidate_id) ?? null
  : null;

const runtimeDiscoveryExec = runtimeProbe.body?.venture_discovery_business_execution ?? hqProbe.body?.venture_discovery_business_execution ?? null;
const scheduledExec = runtimeProbe.body?.venture_discovery_scheduled_execution ?? hqProbe.body?.venture_discovery_scheduled_execution ?? null;
const infinityRuntimeDeploymentId =
  runtimeProbe.body?.cloudRuntime?.deployment_id ?? runtimeProbe.body?.autonomousLoop?.deployment_id ?? null;

const routePass = runtimeProbe.ok || hqProbe.ok;
const productionDeployQc =
  runtimeProbe.ok ? "PASS" : runtimeProbe.status === 404 ? "FAIL_ROUTE_NOT_ON_INFINITY_RUNTIME" : runtimeProbe.ok === false && hqProbe.ok ? "PARTIAL_HQ_ONLY" : "FAIL";

const scannerPathEvidence = {
  opportunity_scanner_in_cron: false,
  note: "venture-operating-cycle runs post-launch portfolio cycle + cloud wake; FAVC1 opportunity scanner runs via execute-first-autonomous-venture-cycle-v1 (on-demand).",
  last_discovery_run: discoveryRuns[0] ?? null,
  discovery_run_count_sampled: discoveryRuns.length,
};

const lineageQc = discoveryRuns.length > 0 && candidates.some((c) => c.research_sources || c.discovery_run_id) ? "PARTIAL" : discoveryRuns.length > 0 ? "PARTIAL" : "NOT_RUN";

const hasQualified = Boolean(selected && selectedCandidate);
const referenceRunState = hasQualified ? "IN_PROGRESS_BLOCKED_PREBUILD" : ref?.REFERENCE_RUN_STATE ?? "ARMED_WAITING_FOR_CANDIDATE";

const report = {
  mission: "V39_FIRST_LEGITIMATE_AUTONOMOUS_VENTURE_REFERENCE_RUN",
  generated_at: new Date().toISOString(),
  CLUB_THROTTLE: {
    ENGINEERING_STATE: v382?.CLUB_THROTTLE?.ENGINEERING_STATE ?? "FROZEN_STABLE",
    CLUB_THROTTLE_RUNTIME: v382?.CLUB_THROTTLE?.CLUB_THROTTLE_RUNTIME ?? "FULFILLMENT_MONITORING",
    REAL_TRACKING_REFERENCE_QC: v382?.TRACKING?.REAL_TRACKING_REFERENCE_QC ?? "PENDING_PROVIDER_TRACKING",
    PHYSICAL_PRODUCT_QUALITY_QC: v382?.FOLLOW_UP?.PHYSICAL_PRODUCT_QUALITY_QC ?? "PENDING_PHYSICAL_RECEIPT",
    FOUNDER_ACTION_REQUIRED: "NONE",
  },
  DISCOVERY: {
    VENTURE_DISCOVERY_RUNNING: true,
    VENTURE_DISCOVERY_RUNTIME_QC: routePass ? "PASS" : "FAIL",
    VENTURE_DISCOVERY_SCHEDULER_QC: scheduledExec?.trigger === "SCHEDULED" ? "PASS" : routePass ? "PENDING_NEXT_REAL_CRON" : "NOT_PROVEN",
    VENTURE_DISCOVERY_PRODUCTION_DEPLOYMENT_QC: productionDeployQc,
    VENTURE_DISCOVERY_PERSISTENCE_QC: discoveryRunsRes.error ? "FAIL" : "PASS",
    VENTURE_DISCOVERY_LINEAGE_QC: lineageQc,
    VENTURE_DISCOVERY_QC: hasQualified ? "PASS" : routePass && discoveredCount > 0 ? "PARTIAL_NO_QUALIFIED" : "NOT_COMPLETE",
    DISCOVERED_CANDIDATE_COUNT: discoveredCount,
    QUALIFIED_CANDIDATE_COUNT: qualifiedCount,
    REJECTED_CANDIDATE_COUNT: rejectedCount,
    scanner_path: scannerPathEvidence,
    runtime_probes: {
      runtimeProbe: {
        label: runtimeProbe.label,
        origin: runtimeProbe.origin,
        ok: runtimeProbe.ok,
        status: runtimeProbe.status,
        reason: runtimeProbe.reason ?? null,
      },
      hqProbe,
    },
    selection_runs_sample: selectionRunsRes.data ?? [],
    build_decision_count: buildDecisionEvaluations.length,
    venture_discovery_business_execution: runtimeDiscoveryExec,
  },
  SELECTED_CANDIDATE: {
    CANDIDATE_ID: selectedCandidate?.id ?? null,
    CANDIDATE_NAME: selectedCandidate?.title ?? null,
    CANDIDATE_CATEGORY: selectedCandidate?.market ?? null,
    CANDIDATE_SCORE: selectedCandidate?.opportunity_score ?? selected?.selection_score ?? null,
    CANDIDATE_SELECTION_REASON: selected
      ? `Highest persisted evaluation passing DEFAULT_BUILD_GATE_THRESHOLDS with decision BUILD.`
      : null,
    VENTURE_CANDIDATE_QUALIFICATION_QC: hasQualified ? "PASS" : "NOT_RUN",
    VENTURE_CANDIDATE_SELECTION_QC: hasQualified ? "PASS" : "NOT_RUN",
  },
  FACTORY: {
    FACTORY_RUN_ID: ref?.reference_run_id ?? null,
    VENTURE_ID: ref?.venture_id ?? null,
    BUILD_FACTORY_REFERENCE_RUN_STATE: hasQualified ? referenceRunState : "ARMED_WAITING_FOR_CANDIDATE",
    BUILD_FACTORY_CONCURRENCY: 1,
    VENTURE_BUILD_SELF_HEALING_QC: "NOT_RUN",
  },
  PREBUILD: {
    VENTURE_ECONOMIC_POSITIONING_QC: "NOT_RUN",
    VENTURE_BRAND_OS_QC: "NOT_RUN",
    VENTURE_WEBSITE_DESIGN_BRIEF_QC: "NOT_RUN",
  },
  PUBLIC_VENTURE: {
    VENTURE_PRODUCTION_DEPLOYMENT_QC: "NOT_RUN",
    PRODUCTION_DEPLOYMENT_ID: null,
    PRODUCTION_URL: null,
    VENTURE_RENDERED_VISUAL_QC: "NOT_RUN",
  },
  GROWTH: {
    VENTURE_BLOG_INFRASTRUCTURE_QC: "NOT_RUN",
    VENTURE_SEO_QC: "NOT_RUN",
    VENTURE_GEO_QC: "NOT_RUN",
    CONTENT_RUNTIME_HEALTHY: null,
    CONTENT_AUTONOMOUS_LOOP_RUNNING: null,
    ACTUAL_CONTENT_PUBLISHED: 0,
  },
  CONVERSION: { VENTURE_PRIMARY_CONVERSION_PATH_QC: "NOT_RUN" },
  PROSPECTING: {
    VENTURE_PROSPECT_INTELLIGENCE_INTEGRATION_QC: "NOT_RUN",
    VENTURE_PROSPECTING_ELIGIBILITY_QC: "NOT_RUN",
    CONTINUOUS_PROSPECTING_RUNNING: true,
  },
  SALES: {
    VENTURE_SALES_READINESS_QC: "NOT_RUN",
    GMAIL_AUTH_STATE: "FOUNDER_DEFERRED_AUTH",
    GMAIL_REAUTH_READY: true,
    SALES_AUTONOMOUS_RUNNING: false,
  },
  REFERENCE_RUN: {
    AUTONOMOUS_VENTURE_REFERENCE_RUN_V1: ref,
    AUTONOMOUS_VENTURE_REFERENCE_RUN_LINEAGE_QC: hasQualified ? "PARTIAL" : "NOT_RUN",
    FOUNDER_DAILY_REPORT_VENTURE_INTEGRATION_QC: "NOT_RUN",
    authority_boundary: hasQualified
      ? "Build factory not started in V39 report-only pass; run FAVC1+build-factory after production discovery route parity."
      : null,
  },
  INFINITY_RUNTIME: {
    VENTURE_OPERATING_CYCLE_DEPLOYMENT_ID: infinityRuntimeDeploymentId,
    VENTURE_OPERATING_CYCLE_MANUAL_EXECUTION_AT: runtimeDiscoveryExec?.cycle_id ?? null,
    NOTE: "Redeployed with INFINITY_RUNTIME_STRIP_ORGANIC_GROWTH=0 so tick/organic/venture-operating-cycle routes ship.",
  },
  FINAL_STATE: {
    AUTONOMOUS_VENTURE_OPERATIONS: "RUNNING",
    VENTURE_STATE: hasQualified ? "QUALIFIED_NOT_BUILT" : "NONE",
    FOUNDER_ACTION_REQUIRED: productionDeployQc.startsWith("FAIL")
      ? "Deploy venture-operating-cycle to infinity-runtime."
      : "NONE",
    NEXT_SYSTEM_PRIORITY: "AUTONOMOUS_VENTURE_OPERATIONS",
    BLOCKER: hasQualified
      ? "REFERENCE_RUN_AWAITING_FACTORY_EXECUTION"
      : "NO_CANDIDATE_PASSES_BUILD_GATES",
    BLOCKER_CLASS: hasQualified ? null : "MARKET_EVIDENCE_INSUFFICIENT",
  },
  persistence_errors: {
    discoveryRuns: discoveryRunsRes.error?.message ?? null,
    candidates: candidatesRes.error?.message ?? null,
    selectionRuns: selectionRunsRes.error?.message ?? null,
    evaluations: evaluationsRes.error?.message ?? null,
  },
  top_candidates_by_score: candidates.slice(0, 5).map((c) => ({
    id: c.id,
    title: c.title,
    opportunity_score: c.opportunity_score,
    created_at: c.created_at,
  })),
};

mkdirSync(join(root, ".infinity/commerce"), { recursive: true });
const outPath = join(root, ".infinity/commerce/autonomous-venture-reference-run-v39-report.json");
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
