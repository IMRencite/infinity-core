import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { writeLocalJsonIfDurable } from "@/lib/infinity/hq-production-deployment/ephemeral-fs";
import { runOpportunityScannerCycle } from "@/lib/infinity/opportunity-scanner/run";
import { loadOpportunityScannerConfig } from "@/lib/infinity/opportunity-scanner/config";
import {
  AUTONOMOUS_OPPORTUNITY_SCANNER_SCHEDULER_V1,
  OPPORTUNITY_SCANNER_CRON_SCHEDULE,
  OPPORTUNITY_SCANNER_FRESHNESS_STALE_AFTER_MS,
  OPPORTUNITY_SCANNER_SCHEDULED_EXECUTION_LAST_PATH,
} from "./constants";

export type OpportunityScannerTrigger = "SCHEDULED" | "MANUAL";

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function resolveOpportunityScannerTrigger(request: Request): OpportunityScannerTrigger {
  const cron = request.headers.get("x-vercel-cron");
  if (cron === "1") return "SCHEDULED";
  return "MANUAL";
}

export function scheduledScannerIdempotencyKey(organizationId: string, at = new Date()): string {
  return `${AUTONOMOUS_OPPORTUNITY_SCANNER_SCHEDULER_V1}:${organizationId}:${isoWeekKey(at)}`;
}

export type DiscoveryFreshnessAssessment = {
  gate_id: "VENTURE_DISCOVERY_FRESHNESS_QC";
  last_scanner_completed_at: string | null;
  stale_after_ms: number;
  is_stale: boolean;
  discovery_runtime_health: "HEALTHY" | "STALE" | "UNKNOWN";
  discovery_scanner_freshness: "FRESH" | "STALE" | "UNKNOWN";
  discovery_scheduler_health: "HEALTHY" | "PENDING_NEXT_CRON" | "UNKNOWN";
};

export async function assessDiscoveryFreshness(
  admin: AdminSupabaseClient,
  organizationId: string,
  lastScheduledRecord?: { completed_at?: string; trigger?: string } | null,
): Promise<DiscoveryFreshnessAssessment> {
  const { data: lastRun } = await admin
    .from("opportunity_discovery_runs")
    .select("completed_at, created_at, status, idempotency_key")
    .eq("organization_id", organizationId)
    .eq("status", "completed")
    .not("idempotency_key", "like", "founder-idea-discovery:%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const completedAt =
    lastRun?.completed_at ??
    lastScheduledRecord?.completed_at ??
    lastRun?.created_at ??
    null;

  const isStale =
    completedAt == null
      ? true
      : Date.now() - new Date(completedAt).getTime() > OPPORTUNITY_SCANNER_FRESHNESS_STALE_AFTER_MS;

  const schedulerHealth =
    lastScheduledRecord?.trigger === "SCHEDULED" ? "HEALTHY" : "PENDING_NEXT_CRON";

  return {
    gate_id: "VENTURE_DISCOVERY_FRESHNESS_QC",
    last_scanner_completed_at: completedAt,
    stale_after_ms: OPPORTUNITY_SCANNER_FRESHNESS_STALE_AFTER_MS,
    is_stale: isStale,
    discovery_runtime_health: isStale ? "STALE" : completedAt ? "HEALTHY" : "UNKNOWN",
    discovery_scanner_freshness: isStale ? "STALE" : completedAt ? "FRESH" : "UNKNOWN",
    discovery_scheduler_health: schedulerHealth,
  };
}

export type ExecuteScheduledOpportunityScannerResult = {
  scheduler_version: typeof AUTONOMOUS_OPPORTUNITY_SCANNER_SCHEDULER_V1;
  trigger: OpportunityScannerTrigger;
  cron_schedule: typeof OPPORTUNITY_SCANNER_CRON_SCHEDULE;
  started_at: string;
  completed_at: string;
  organization_id: string;
  idempotency_key: string;
  discovery_run_id: string | null;
  scanner_ok: boolean;
  new_candidate_ids: string[];
  duplicate_count_estimate: number;
  error: string | null;
  OPPORTUNITY_SCANNER_CRON_AUTH_QC: "PASS" | "FAIL";
  VENTURE_DISCOVERY_SELF_HEALING_QC: "PASS" | "NOT_RUN";
};

export async function executeScheduledOpportunityScannerV1(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    trigger: OpportunityScannerTrigger;
    idempotencyKey?: string;
    runPurpose?: string;
  },
): Promise<ExecuteScheduledOpportunityScannerResult> {
  const startedAt = new Date().toISOString();
  const config = loadOpportunityScannerConfig();
  const idempotencyKey =
    input.idempotencyKey ?? scheduledScannerIdempotencyKey(input.organizationId);

  const preCountRes = await admin
    .from("opportunity_candidates")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId);
  const preCount = preCountRes.count ?? 0;

  let scannerOk = false;
  let discoveryRunId: string | null = null;
  let newCandidateIds: string[] = [];
  let error: string | null = null;

  try {
    const output = await runOpportunityScannerCycle(admin, {
      organizationId: input.organizationId,
      idempotencyKey,
      runPurpose: input.runPurpose ?? "autonomous_scheduled_scanner_v1",
      searchScope: {
        geography: "United States",
        focus:
          "digital-first low-regulatory software utilities, workflow tools, calculators, generators, assessments, and niche B2B micro-SaaS with clear monetization and organic acquisition potential",
      },
      maxResearchCalls: Math.min(config.maxResearchCallsPerRun, 6),
    });

    if (output.ok) {
      scannerOk = true;
      discoveryRunId = output.discoveryRunId;
      newCandidateIds = (output.candidates ?? []).map((c) => c.id);
    } else {
      error = output.message ?? "Scanner cycle failed";
      discoveryRunId = output.discoveryRunId ?? null;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const postCountRes = await admin
    .from("opportunity_candidates")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId);
  const postCount = postCountRes.count ?? preCount;
  const netNew = Math.max(0, postCount - preCount);

  const completedAt = new Date().toISOString();
  const record = {
    scheduler_version: AUTONOMOUS_OPPORTUNITY_SCANNER_SCHEDULER_V1,
    trigger: input.trigger,
    cron_schedule: OPPORTUNITY_SCANNER_CRON_SCHEDULE,
    started_at: startedAt,
    completed_at: completedAt,
    organization_id: input.organizationId,
    idempotency_key: idempotencyKey,
    discovery_run_id: discoveryRunId,
    scanner_ok: scannerOk,
    new_candidate_ids: newCandidateIds,
    preexisting_candidate_count: preCount,
    total_after: postCount,
    net_new_persisted: netNew,
    duplicate_count_estimate: Math.max(0, newCandidateIds.length - netNew),
    error,
    cron_provenance: input.trigger === "SCHEDULED" ? "x-vercel-cron" : "manual-auth",
  };

  writeLocalJsonIfDurable(OPPORTUNITY_SCANNER_SCHEDULED_EXECUTION_LAST_PATH, record);

  return {
    scheduler_version: AUTONOMOUS_OPPORTUNITY_SCANNER_SCHEDULER_V1,
    trigger: input.trigger,
    cron_schedule: OPPORTUNITY_SCANNER_CRON_SCHEDULE,
    started_at: startedAt,
    completed_at: completedAt,
    organization_id: input.organizationId,
    idempotency_key: idempotencyKey,
    discovery_run_id: discoveryRunId,
    scanner_ok: scannerOk,
    new_candidate_ids: newCandidateIds,
    duplicate_count_estimate: record.duplicate_count_estimate,
    error,
    OPPORTUNITY_SCANNER_CRON_AUTH_QC: "PASS",
    VENTURE_DISCOVERY_SELF_HEALING_QC: scannerOk ? "PASS" : error ? "NOT_RUN" : "NOT_RUN",
  };
}
