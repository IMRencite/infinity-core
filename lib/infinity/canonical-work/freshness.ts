import type { CanonicalWorkExecutionContract } from "./types";
import {
  ACTIVE_WORK_FRESHNESS_GATE,
  ACTIVE_WORK_STALENESS_GATE,
  DEFAULT_ACTIVE_WORK_STALE_MS,
} from "./types";
import { markCanonicalWorkStatus } from "./store";
import { TERMINAL_WORK_STATUSES } from "./rows";

export function evaluateActiveWorkFreshnessGate(
  work: CanonicalWorkExecutionContract,
  now = Date.now(),
  staleMs = DEFAULT_ACTIVE_WORK_STALE_MS,
): { gate: typeof ACTIVE_WORK_FRESHNESS_GATE; result: "PASS" | "FAIL"; reasons: string[]; stale: boolean } {
  if (work.status !== "ACTIVE") {
    return { gate: ACTIVE_WORK_FRESHNESS_GATE, result: "PASS", reasons: [], stale: false };
  }
  if (work.completed_at && TERMINAL_WORK_STATUSES.includes(work.status) === false && work.status === "ACTIVE" && work.completed_at !== work.started_at) {
    const completedMs = Date.parse(work.completed_at);
    const updatedMs = Date.parse(work.updated_at);
    if (Number.isFinite(completedMs) && Number.isFinite(updatedMs) && completedMs >= updatedMs) {
      return {
        gate: ACTIVE_WORK_FRESHNESS_GATE,
        result: "FAIL",
        reasons: ["ACTIVE_WORK_HAS_COMPLETION_EVIDENCE"],
        stale: true,
      };
    }
  }
  const updated = Date.parse(work.updated_at);
  const timedOut = !Number.isFinite(updated) || now - updated > staleMs;
  return {
    gate: ACTIVE_WORK_FRESHNESS_GATE,
    result: timedOut && !work.latest_output ? "FAIL" : "PASS",
    reasons: timedOut && !work.latest_output ? ["ACTIVE_WORK_STALE"] : [],
    stale: timedOut && !work.latest_output,
  };
}

export function evaluateActiveWorkStalenessGate(input: {
  displayed_work_id?: string | null;
  displayed_status?: string | null;
  displayed_mission?: string | null;
  canonical_work_id?: string | null;
  canonical_status?: string | null;
  canonical_updated_at?: string | null;
  latest_completed_title?: string | null;
  latest_completed_at?: string | null;
}): { gate: typeof ACTIVE_WORK_STALENESS_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  const displayedAsCurrent = Boolean(input.displayed_mission)
    && !/IDLE|EMPTY|PRESENT_IDLE/i.test(input.displayed_status ?? "");
  const displayedActive = /ACTIVE/i.test(input.displayed_status ?? "");
  const canonicalTerminal = TERMINAL_WORK_STATUSES.includes(
    (input.canonical_status ?? "") as (typeof TERMINAL_WORK_STATUSES)[number],
  );
  if (displayedActive && canonicalTerminal) reasons.push("HQ_SHOWS_TERMINAL_WORK_AS_ACTIVE");
  if (displayedActive && !input.canonical_work_id) reasons.push("HQ_SHOWS_ACTIVE_WITHOUT_CANONICAL_WORK");
  if (
    input.displayed_work_id
    && input.canonical_work_id
    && input.displayed_work_id !== input.canonical_work_id
    && displayedActive
  ) {
    reasons.push("HQ_DISPLAYS_STALE_WORK_ID");
  }
  if (
    displayedAsCurrent
    && input.displayed_mission
    && /Global Page Depth QC|Pricing Hero Enhancement/i.test(input.displayed_mission)
    && input.canonical_status !== "ACTIVE"
  ) {
    reasons.push("HQ_DISPLAYS_OLDER_PARKED_MISSION_AS_CURRENT");
  }
  if (
    displayedAsCurrent
    && /Pricing Hero Enhancement/i.test(input.displayed_mission ?? "")
    && /Brand|Favicon|Logo/i.test(input.latest_completed_title ?? "")
  ) {
    reasons.push("HQ_DISPLAYS_HERO_OVER_LATER_BRAND_WORK");
  }
  return {
    gate: ACTIVE_WORK_STALENESS_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function reconcileStaleActiveWork(
  work: CanonicalWorkExecutionContract,
  now = new Date().toISOString(),
  staleMs = DEFAULT_ACTIVE_WORK_STALE_MS,
): CanonicalWorkExecutionContract {
  const gate = evaluateActiveWorkFreshnessGate(work, Date.parse(now), staleMs);
  if (!gate.stale) return work;
  return markCanonicalWorkStatus(work.work_id, "STALE", {
    updated_at: now,
    latest_output: `${work.latest_output} · marked STALE after freshness policy`,
    next_expected_transition: "Re-heartbeat or close the work record",
  }) ?? { ...work, status: "STALE", updated_at: now };
}
