import { CANONICAL_WORK_EXECUTION_CONTRACT, type CanonicalWorkExecutionContract } from "./types";
import { completeCanonicalWork, listCanonicalWork, upsertCanonicalWork } from "./store";

export const HQ_CURRENT_IMPLEMENTATION_WORK_ID = "work:infinity:hq-current-implementation" as const;
export const HQ_CURRENT_IMPLEMENTATION_WORK_TITLE =
  "Infinity implementation work" as const;
/** Prior standing titles must not keep Command on a finished mission. */
export const STALE_STANDING_IMPLEMENTATION_TITLES = [
  "Infinity — HQ Live Current-Work Visibility",
  "HQ live current-work wiring",
  "Infinity implementation work",
] as const;
/** Safety only. Stop/sessionEnd idle the turn. Reads must not complete work. */
export const IMPLEMENTATION_WORK_IDLE_AFTER_MS = 15_000;
export const HQ_LIVE_TICK_PATH = ".infinity/canonical-work/hq-live-tick.json" as const;

const DEFAULT_ROOMS = [
  "operations",
  "systems_architect",
  "quality_control",
] as CanonicalWorkExecutionContract["assigned_rooms"];

export function isStaleStandingImplementationTitle(title: string | null | undefined): boolean {
  if (!title) return true;
  return (STALE_STANDING_IMPLEMENTATION_TITLES as readonly string[]).includes(title);
}

export function keepStandingImplementationTitle(title: string | null | undefined): string | null {
  if (!title || isStaleStandingImplementationTitle(title)) return null;
  return title;
}

export function startCurrentImplementationWork(input: {
  title?: string;
  description: string;
  output?: string;
  assigned_rooms?: CanonicalWorkExecutionContract["assigned_rooms"];
  assigned_workers?: string[];
  now?: string;
}): CanonicalWorkExecutionContract {
  const now = input.now ?? new Date().toISOString();
  const existing = listCanonicalWork().find((row) => row.work_id === HQ_CURRENT_IMPLEMENTATION_WORK_ID);
  return upsertCanonicalWork({
    contract: CANONICAL_WORK_EXECUTION_CONTRACT,
    work_id: HQ_CURRENT_IMPLEMENTATION_WORK_ID,
    mission_id: "mission:infinity:hq-current-implementation",
    venture_id: null,
    work_type: "SYSTEM_ARCHITECTURE",
    title: input.title ?? keepStandingImplementationTitle(existing?.title) ?? HQ_CURRENT_IMPLEMENTATION_WORK_TITLE,
    description: input.description,
    stage: "SYSTEM_ARCHITECTURE / QC",
    status: "ACTIVE",
    assigned_rooms: input.assigned_rooms ?? DEFAULT_ROOMS,
    assigned_workers: input.assigned_workers ?? [
      "Venture Operator",
      "Systems Architect",
      "Validation Station",
    ],
    source: "EXTERNAL_IMPLEMENTATION_AGENT",
    started_at: existing?.started_at ?? now,
    updated_at: now,
    completed_at: null,
    blocked_reason: null,
    authorization_state: null,
    progress: input.description,
    latest_output: input.output ?? input.description,
    artifact_refs: [],
    evidence_refs: [],
    parent_work_id: existing?.parent_work_id ?? null,
    traceability_links: existing?.traceability_links ?? [HQ_CURRENT_IMPLEMENTATION_WORK_ID],
    requires_infinity_worker_execution: false,
    classification: "SYSTEM_INFRASTRUCTURE",
    next_expected_transition: "WORK_COMPLETES_THEN_IDLE",
  });
}

export function completeCurrentImplementationWork(
  output: string,
  now = new Date().toISOString(),
): CanonicalWorkExecutionContract | null {
  const existing = listCanonicalWork().find((row) => row.work_id === HQ_CURRENT_IMPLEMENTATION_WORK_ID);
  if (!existing) return null;
  if (existing.status !== "ACTIVE") return existing;
  return completeCanonicalWork(HQ_CURRENT_IMPLEMENTATION_WORK_ID, output, now);
}

export function idleCurrentImplementationWorkIfQuiet(
  now = new Date().toISOString(),
  idleAfterMs = IMPLEMENTATION_WORK_IDLE_AFTER_MS,
): CanonicalWorkExecutionContract | null {
  const existing = listCanonicalWork().find((row) => row.work_id === HQ_CURRENT_IMPLEMENTATION_WORK_ID);
  if (!existing || existing.status !== "ACTIVE") return null;
  const updated = Date.parse(existing.updated_at);
  if (!Number.isFinite(updated) || Date.parse(now) - updated < idleAfterMs) return null;
  return completeCurrentImplementationWork("No further implementation updates · IDLE", now);
}
