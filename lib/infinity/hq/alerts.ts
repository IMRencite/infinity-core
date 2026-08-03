import type { HqAlert, HqDashboardSnapshot, HqSystemHealth, HqWorkerHealth } from "./types";
import { HQ_ROUTES } from "./constants";

export function buildHqAlerts(input: {
  health: HqSystemHealth;
  workerHealth: HqWorkerHealth;
  blockedMissionCount: number | null;
}): HqAlert[] {
  const alerts: HqAlert[] = [];
  const now = new Date().toISOString();

  if (input.health.supabase === "offline") {
    alerts.push({
      id: "supabase-offline",
      severity: "critical",
      source: "database",
      relatedLabel: "Supabase",
      relatedHref: null,
      reason: "Organization probe query failed.",
      occurredAt: now,
      recommendedAction: "Verify Supabase connectivity and credentials server-side.",
    });
  }

  if ((input.health.failedJobCount ?? 0) > 0) {
    alerts.push({
      id: "failed-jobs",
      severity: "warning",
      source: "engine_jobs",
      relatedLabel: "Failed engine jobs",
      relatedHref: HQ_ROUTES.runtime,
      reason: `${input.health.failedJobCount} failed job(s) recorded.`,
      occurredAt: now,
      recommendedAction: "Inspect failed jobs and worker runs on the Runtime page.",
    });
  }

  if ((input.blockedMissionCount ?? 0) > 0) {
    alerts.push({
      id: "blocked-runtimes",
      severity: "warning",
      source: "mission_runtime",
      relatedLabel: "Blocked runtimes",
      relatedHref: HQ_ROUTES.runtime,
      reason: `${input.blockedMissionCount} mission runtime(s) are blocked.`,
      occurredAt: now,
      recommendedAction: "Review blocking reason and prerequisites on Runtime diagnostics.",
    });
  }

  if (input.health.aiProviderConfigured === "not_configured" && input.health.aiProviderMode !== "disabled") {
    alerts.push({
      id: "ai-not-configured",
      severity: "info",
      source: "ai_reasoning",
      relatedLabel: "OpenAI provider",
      relatedHref: HQ_ROUTES.reasoning,
      reason: "AI reasoning mode is not disabled but OPENAI_API_KEY is not configured.",
      occurredAt: now,
      recommendedAction: "Configure server-only OPENAI_API_KEY or set AI_REASONING_MODE=disabled.",
    });
  }

  if (input.workerHealth.latestWorkerFailure) {
    alerts.push({
      id: "latest-worker-failure",
      severity: "warning",
      source: "worker_runs",
      relatedLabel: "Latest worker failure",
      relatedHref: HQ_ROUTES.runtime,
      reason: input.workerHealth.latestWorkerFailure,
      occurredAt: now,
      recommendedAction: "Inspect the latest worker run error on Runtime.",
    });
  }

  return alerts.sort((a, b) => {
    const rank = { critical: 0, warning: 1, info: 2 };
    return rank[a.severity] - rank[b.severity];
  });
}

export function filterActivityBySeverity<T extends { severity: string }>(
  items: T[],
  severity: string | null | undefined,
): T[] {
  if (!severity?.trim()) {
    return items;
  }
  return items.filter((item) => item.severity === severity);
}

export function filterMissionsByStage<T extends { currentStage: string }>(
  missions: T[],
  stage: string | null | undefined,
): T[] {
  if (!stage?.trim()) {
    return missions;
  }
  return missions.filter((m) => m.currentStage === stage);
}

export function applyDashboardFilters(
  snapshot: HqDashboardSnapshot,
  filters: { eventSeverity?: string | null; missionStage?: string | null },
): HqDashboardSnapshot {
  return {
    ...snapshot,
    activity: filterActivityBySeverity(snapshot.activity, filters.eventSeverity),
    missions: filterMissionsByStage(snapshot.missions, filters.missionStage),
  };
}
