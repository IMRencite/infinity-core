import {
  BLOG_PIPELINE_STATES,
  BLOG_TERMINAL_STATES,
  CURRENT_BLOG_QC_VERSION,
  type BlogObligationEvent,
  type BlogPipelineState,
  type BlogSchedulerEvent,
  type CheckResult,
  type DurableBlogObligation,
} from "./types";
import { publicationProhibited } from "./hold";
import { evaluatePublishAuthorization } from "./publish-hold-contract";
import type { DurableBlogHold } from "./types";

const ALLOWED: Record<BlogPipelineState, BlogPipelineState[]> = {
  PLANNED: ["DRAFTED", "MISSED_RECORDED"],
  DRAFTED: ["QC_PASSED", "PLANNED", "MISSED_RECORDED"],
  QC_PASSED: ["PUBLISHED", "DRAFTED", "MISSED_RECORDED"],
  PUBLISHED: ["LIVE_VERIFIED", "QC_PASSED"],
  LIVE_VERIFIED: [],
  MISSED_RECORDED: [],
};

export class DurableBlogStore {
  private obligations = new Map<string, DurableBlogObligation>();
  private events: BlogObligationEvent[] = [];
  private scheduler: BlogSchedulerEvent[] = [];

  reset(): void {
    this.obligations.clear();
    this.events = [];
    this.scheduler = [];
  }

  key(venture_id: string, operating_date: string): string {
    return `${venture_id}:${operating_date}`;
  }

  get(venture_id: string, operating_date: string): DurableBlogObligation | null {
    return this.obligations.get(this.key(venture_id, operating_date)) ?? null;
  }

  list(): DurableBlogObligation[] {
    return [...this.obligations.values()].sort((a, b) => a.operating_date.localeCompare(b.operating_date));
  }

  listProduction(): DurableBlogObligation[] {
    return this.list().filter((row) => row.is_test !== true && row.execution_class !== "STAGED_TEST" && row.provenance !== "STAGED_TEST_CREATED");
  }

  eventsFor(obligation_id: string): BlogObligationEvent[] {
    return this.events.filter((row) => row.obligation_id === obligation_id);
  }

  schedulerEvents(): BlogSchedulerEvent[] {
    return [...this.scheduler];
  }

  insertDailyObligation(input: DurableBlogObligation, opts: { silent?: boolean } = {}): { result: "INSERTED" | "CONFLICT_NOOP"; obligation: DurableBlogObligation } {
    const key = this.key(input.venture_id, input.operating_date);
    const existing = this.obligations.get(key);
    if (existing) return { result: "CONFLICT_NOOP", obligation: existing };
    this.obligations.set(key, input);
    if (opts.silent) return { result: "INSERTED", obligation: input };
    this.events.push({
      id: `evt:${input.id}:create`,
      obligation_id: input.id,
      from_state: null,
      to_state: input.pipeline_state,
      actor: "ORGANIC_SCHEDULER",
      invoked_by: "DAILY_CREATOR",
      event_type: "CREATED",
      at: input.created_at,
      deployment_id: null,
      evidence_ref: null,
    });
    return { result: "INSERTED", obligation: input };
  }

  recordSchedulerEvent(event: BlogSchedulerEvent): void {
    this.scheduler.push(event);
  }

  claimExecution(input: {
    venture_id: string;
    operating_date: string;
    owner: string;
    now: string;
    ttl_ms?: number;
  }): { ok: boolean; reason: string; obligation: DurableBlogObligation | null } {
    const current = this.get(input.venture_id, input.operating_date);
    if (!current) return { ok: false, reason: "OBLIGATION_MISSING", obligation: null };
    const ttl = input.ttl_ms ?? 20 * 60 * 1000;
    const expiry = current.next_attempt_at ? Date.parse(current.next_attempt_at) : 0;
    const owned = Boolean(current.decision_owner);
    const expired = !owned || !current.next_attempt_at || expiry <= Date.parse(input.now);
    if (owned && !expired && current.decision_owner !== input.owner) {
      return { ok: false, reason: "OWNED", obligation: current };
    }
    const next: DurableBlogObligation = {
      ...current,
      decision_owner: input.owner,
      last_attempt_at: input.now,
      next_attempt_at: new Date(Date.parse(input.now) + ttl).toISOString(),
      updated_at: input.now,
    };
    this.obligations.set(this.key(current.venture_id, current.operating_date), next);
    this.events.push({
      id: `evt:${current.id}:${input.now}:CLAIM`,
      obligation_id: current.id,
      from_state: current.pipeline_state,
      to_state: current.pipeline_state,
      actor: input.owner,
      invoked_by: "SCHEDULER",
      event_type: "CLAIM",
      at: input.now,
      deployment_id: null,
      evidence_ref: null,
    });
    return { ok: true, reason: owned && !expired ? "RECLAIMED" : "CLAIMED", obligation: next };
  }

  releaseExecution(input: {
    venture_id: string;
    operating_date: string;
    owner: string;
    now: string;
  }): DurableBlogObligation | null {
    const current = this.get(input.venture_id, input.operating_date);
    if (!current || current.decision_owner !== input.owner) return current;
    const next: DurableBlogObligation = {
      ...current,
      decision_owner: null,
      updated_at: input.now,
    };
    this.obligations.set(this.key(current.venture_id, current.operating_date), next);
    return next;
  }

  markFailure(input: {
    venture_id: string;
    operating_date: string;
    now: string;
    reason: string;
  }): DurableBlogObligation | null {
    const current = this.get(input.venture_id, input.operating_date);
    if (!current) return null;
    const next: DurableBlogObligation = {
      ...current,
      failure_reason: input.reason,
      last_attempt_at: input.now,
      updated_at: input.now,
    };
    this.obligations.set(this.key(current.venture_id, current.operating_date), next);
    return next;
  }

  transition(input: {
    venture_id: string;
    operating_date: string;
    to: BlogPipelineState;
    actor: string;
    invoked_by: string;
    now: string;
    hold?: DurableBlogHold | null;
    qc_version?: string | null;
    live_url?: string | null;
    published_at?: string | null;
    missed_reason?: string | null;
    decision_owner?: string | null;
    pre_publish?: "PASS" | "FAIL" | "NOT_RUN";
    live_post_publish?: "PASS" | "FAIL" | "NOT_RUN";
    execute_publish?: boolean;
  }): { ok: boolean; reason: string; obligation: DurableBlogObligation | null } {
    const current = this.get(input.venture_id, input.operating_date);
    if (!current) return { ok: false, reason: "OBLIGATION_MISSING", obligation: null };
    if (!BLOG_PIPELINE_STATES.includes(input.to)) return { ok: false, reason: "UNKNOWN_STATE", obligation: current };
    if (!ALLOWED[current.pipeline_state].includes(input.to)) {
      return { ok: false, reason: "ILLEGAL_TRANSITION", obligation: current };
    }
    if (input.to === "PUBLISHED") {
      const authorization = evaluatePublishAuthorization({
        hold: input.hold ?? null,
        source: input.hold ? "BLOG_PUBLISHING_HOLDS" : "MISSING",
      });
      if (authorization.result !== "ALLOW_NEXT_GATE" || publicationProhibited(input.hold ?? null) || input.execute_publish !== true) {
        return {
          ok: false,
          reason: authorization.result === "ALLOW_NEXT_GATE" && input.execute_publish !== true
            ? "BLOCKED_HOLD"
            : authorization.result,
          obligation: current,
        };
      }
    }
    if (input.to === "PUBLISHED" && current.qc_version && current.qc_version !== CURRENT_BLOG_QC_VERSION) {
      return { ok: false, reason: "RE_QC_REQUIRED", obligation: current };
    }
    if (input.to === "PUBLISHED" && input.pre_publish !== "PASS") {
      return { ok: false, reason: "PRE_PUBLISH_REQUIRED", obligation: current };
    }
    if (input.to === "LIVE_VERIFIED" && input.live_post_publish !== "PASS") {
      return { ok: false, reason: "LIVE_POST_PUBLISH_REQUIRED", obligation: current };
    }
    const next: DurableBlogObligation = {
      ...current,
      pipeline_state: input.to,
      updated_at: input.now,
      last_attempt_at: input.now,
      live_url: input.live_url ?? current.live_url,
      published_at: input.to === "PUBLISHED" ? input.published_at ?? input.now : current.published_at,
      live_verified_at: input.to === "LIVE_VERIFIED" ? input.now : current.live_verified_at,
      qc_version: input.qc_version ?? current.qc_version,
      missed_reason: input.missed_reason ?? current.missed_reason,
      decision_owner: input.decision_owner ?? current.decision_owner,
      decided_at: input.to === "MISSED_RECORDED" ? input.now : current.decided_at,
      recovered: input.to === "LIVE_VERIFIED" ? true : current.recovered,
      clean: false,
    };
    this.obligations.set(this.key(current.venture_id, current.operating_date), next);
    this.events.push({
      id: `evt:${current.id}:${input.now}:${input.to}`,
      obligation_id: current.id,
      from_state: current.pipeline_state,
      to_state: input.to,
      actor: input.actor,
      invoked_by: input.invoked_by,
      event_type: "TRANSITION",
      at: input.now,
      deployment_id: null,
      evidence_ref: null,
    });
    return { ok: true, reason: input.to, obligation: next };
  }
}

export function requiresReQc(obligation: Pick<DurableBlogObligation, "qc_version">, current = CURRENT_BLOG_QC_VERSION): boolean {
  return Boolean(obligation.qc_version) && obligation.qc_version !== current;
}

export function dayStatus(obligation: DurableBlogObligation, now: string): "DUE" | "LIVE_VERIFIED" | "MISSED" | "MISSED_RECORDED" {
  if (obligation.pipeline_state === "LIVE_VERIFIED") return "LIVE_VERIFIED";
  if (obligation.pipeline_state === "MISSED_RECORDED") return "MISSED_RECORDED";
  if (Date.parse(now) > Date.parse(obligation.due_at)) return "MISSED";
  return "DUE";
}

export function evaluateObligationWatchdog(obligation: DurableBlogObligation): CheckResult {
  const missing: string[] = [];
  if (!obligation.owner) missing.push("OWNER");
  if (!obligation.pipeline_state) missing.push("PIPELINE");
  if (!BLOG_TERMINAL_STATES.includes(obligation.pipeline_state) && !obligation.next_attempt_at && !obligation.hold_id) {
    missing.push("NEXT_ACTION");
  }
  return {
    check: "ObligationWatchdog",
    result: missing.length ? "FAIL" : "PASS",
    reasons: missing.length ? missing : ["OWNED"],
  };
}

export function evaluateDailyObligationFreshInstanceCheck(input: {
  first: DurableBlogStore;
  second: DurableBlogStore;
  dates: string[];
}): CheckResult {
  const reasons: string[] = [];
  for (const date of input.dates) {
    const original = input.first.get("occupancynpv", date);
    const reloaded = input.second.get("occupancynpv", date);
    if (!original || !reloaded) reasons.push(`MISSING_${date}`);
    else if (original.id !== reloaded.id || original.pipeline_state !== reloaded.pipeline_state) reasons.push(`DRIFT_${date}`);
  }
  const dupes = input.second.list().length !== new Set(input.second.list().map((row) => `${row.venture_id}:${row.operating_date}`)).size;
  if (dupes) reasons.push("DUPLICATES");
  return {
    check: "DailyObligationFreshInstanceCheck",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["FRESH_INSTANCE_RELOADED"],
  };
}

export function snapshotStore(store: DurableBlogStore): DurableBlogObligation[] {
  return store.list().map((row) => ({ ...row }));
}

export function loadStoreFromSnapshot(rows: DurableBlogObligation[]): DurableBlogStore {
  const next = new DurableBlogStore();
  for (const row of rows) next.insertDailyObligation(row);
  return next;
}
