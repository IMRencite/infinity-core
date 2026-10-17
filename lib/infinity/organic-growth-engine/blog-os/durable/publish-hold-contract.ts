import type { DurableBlogHold } from "./types";
import { currentSecondQcHold, publicationProhibited } from "./hold";

export type PublishHoldRead = {
  source: "BLOG_PUBLISHING_HOLDS" | "CLOUD_RUNTIME_STATE" | "SCHEDULER_PUBLISHING_HOLD" | "MISSING" | "UNAVAILABLE" | "MALFORMED";
  hold: DurableBlogHold | null;
};

export type PublishAuthorization = {
  result: "BLOCKED_HOLD" | "BLOCKED_HOLD_UNKNOWN_STATE" | "ALLOW_NEXT_GATE" | "DENY";
  reason: string;
};

export function isIsolatedTestAuthorization(hold: DurableBlogHold | null | undefined): boolean {
  if (!hold) return false;
  return /^test:/.test(hold.hold_id)
    || hold.hold_id.startsWith("hold:synthetic:")
    || hold.venture_id === "synthetic-hold-fixture"
    || /:test:/.test(hold.hold_id);
}

export type AllowSourceAssertion = {
  authorization_source: PublishHoldRead["source"] | "SYNTHETIC_FIXTURE";
  decision_source: "FOUNDER_DECISION" | "SYNTHETIC_TEST" | "UNKNOWN";
  classification: "PRODUCTION" | "STAGED_TEST";
  caller_identity: string;
  evidence_binding: string | null;
  artifact_qc_binding: string | null;
  production_runtime_can_manufacture_inputs: boolean;
};

export function evaluateAllowSourceAssertion(input: {
  hold: DurableBlogHold;
  source?: PublishHoldRead["source"];
  caller_identity?: string;
}): AllowSourceAssertion {
  const isolated = isIsolatedTestAuthorization(input.hold);
  return {
    authorization_source: isolated ? "SYNTHETIC_FIXTURE" : (input.source ?? "CLOUD_RUNTIME_STATE"),
    decision_source: isolated ? "SYNTHETIC_TEST" : "UNKNOWN",
    classification: isolated ? "STAGED_TEST" : "PRODUCTION",
    caller_identity: input.caller_identity ?? "organic_runtime",
    evidence_binding: input.hold.exit_condition_hash || null,
    artifact_qc_binding: input.hold.exit_condition_version || null,
    production_runtime_can_manufacture_inputs: isolated ? false : true,
  };
}

export const ORGANIC_HOLD_STAGE_ORDER = "HOLD_PREVENTS_DOWNSTREAM_CREATION_AND_QC" as const;
export const ORGANIC_HOLD_ACCEPTANCE_MODEL = ["OBLIGATION", "HOLD_CHECK", "BLOCKED_HOLD"] as const;

export function evaluatePublishAuthorization(input: {
  hold: DurableBlogHold | null;
  source?: PublishHoldRead["source"];
  db_available?: boolean;
  production_runtime?: boolean;
}): PublishAuthorization {
  if (input.db_available === false || input.source === "UNAVAILABLE") {
    return { result: "BLOCKED_HOLD_UNKNOWN_STATE", reason: "DB_UNAVAILABLE" };
  }
  if (input.source === "MISSING" || !input.hold) {
    return { result: "BLOCKED_HOLD_UNKNOWN_STATE", reason: "HOLD_MISSING" };
  }
  if (input.source === "MALFORMED" || !input.hold.hold_id || !input.hold.hold_state) {
    return { result: "BLOCKED_HOLD_UNKNOWN_STATE", reason: "HOLD_MALFORMED" };
  }
  if (input.production_runtime && isIsolatedTestAuthorization(input.hold)) {
    return { result: "BLOCKED_HOLD_UNKNOWN_STATE", reason: "TEST_AUTHORIZATION_REFUSED" };
  }
  if (input.hold.hold_state === "ACTIVE" || publicationProhibited(input.hold) || input.hold.execute_publish !== true) {
    return { result: "BLOCKED_HOLD", reason: "HOLD_ACTIVE_OR_EXECUTE_FALSE" };
  }
  if (input.hold.hold_state === "CLEARED" && input.hold.execute_publish === true && input.hold.resolved_at) {
    return { result: "ALLOW_NEXT_GATE", reason: "HOLD_CLEARED" };
  }
  return { result: "BLOCKED_HOLD", reason: "INVALID_OR_EXPIRED_APPROVAL" };
}

export function holdFromSchedulerPublishingHold(value?: string | null, now = new Date().toISOString()): DurableBlogHold | null {
  if (value === "PAUSED_FOR_SECOND_QC_ESCAPE" || value === "PAUSED_FOR_QC_REPAIR") {
    return productionLikeActiveHold(now);
  }
  return null;
}

export function readPublishHoldFromKnownSources(input: {
  table_hold?: DurableBlogHold | null;
  runtime_hold?: DurableBlogHold | null;
  scheduler_publishing_hold?: string | null;
  table_error?: string | null;
  runtime_error?: string | null;
}): PublishHoldRead {
  if (input.table_error && /unavailable|network|timeout/i.test(input.table_error)) {
    return { source: "UNAVAILABLE", hold: null };
  }
  if (input.table_hold?.hold_id) return { source: "BLOG_PUBLISHING_HOLDS", hold: input.table_hold };
  if (input.runtime_hold?.hold_id) return { source: "CLOUD_RUNTIME_STATE", hold: input.runtime_hold };
  const scheduler = holdFromSchedulerPublishingHold(input.scheduler_publishing_hold);
  if (scheduler) return { source: "SCHEDULER_PUBLISHING_HOLD", hold: scheduler };
  if (input.table_error && /could not find the table|does not exist|schema cache/i.test(input.table_error)) {
    return { source: input.runtime_hold ? "CLOUD_RUNTIME_STATE" : "MISSING", hold: input.runtime_hold ?? null };
  }
  return { source: "MISSING", hold: null };
}

export function productionLikeActiveHold(now = new Date().toISOString()): DurableBlogHold {
  return {
    ...currentSecondQcHold(now),
    hold_state: "ACTIVE",
    execute_publish: false,
    resolved_at: null,
  };
}

export function syntheticClearedHold(now = new Date().toISOString()): DurableBlogHold {
  return {
    ...currentSecondQcHold(now),
    venture_id: "synthetic-hold-fixture",
    hold_id: "hold:synthetic:clear-v1",
    hold_state: "CLEARED",
    execute_publish: true,
    resolved_at: now,
    founder_review_status: "CLEAR",
  };
}
