import {
  BLOG_REPAIR_STRATEGIES,
  DAILY_BLOG_TARGET,
  FACTORY_BLOG_DEFAULTS,
  MAX_OTHER_NEW_HIGH_VALUE_ASSETS_PER_DAY,
} from "./contract";
import { ensureVentureBlogOsState, replaceVentureBlogOsState } from "./store";
import type {
  BlogBuildAttempt,
  BlogCandidate,
  BlogFailureClass,
  DailyBlogObligation,
  DailyBlogState,
  DualContentLoopCadence,
  VentureBlogOsState,
} from "./types";

const ACTIVE_BUILD: DailyBlogState[] = [
  "PLANNED",
  "RESEARCHING",
  "DRAFTING",
  "VALIDATING",
  "REPAIRING",
  "READY_FOR_PUBLISH",
  "PUBLISHING",
  "VERIFYING",
];

function id(prefix: string, now: string, nonce = ""): string {
  return `${prefix}:${now.replace(/[^0-9]/g, "").slice(0, 14)}${nonce ? `:${nonce}` : ""}`;
}

export function inheritVentureBlogBlueprintDefaults() {
  return { ...FACTORY_BLOG_DEFAULTS, BLOG_DISABLED: false as const };
}

export function inheritRequiredBlogContent(requiredContent: string[]): string[] {
  return requiredContent.includes("public_blog") ? requiredContent : [...requiredContent, "public_blog"];
}

export function rankBlogCandidates(candidates: BlogCandidate[]): BlogCandidate[] {
  return [...candidates].sort((left, right) => {
    const score = (row: BlogCandidate) =>
      row.score * 0.35
      + row.geo_potential * 30
      + row.commercial_relevance * 25
      + (row.distinct_intent ? 10 : -20)
      + Math.min(10, row.provenance.length * 2);
    return score(right) - score(left);
  });
}

export function defaultOccupancyNpvCandidates(venture_id = "occupancynpv"): BlogCandidate[] {
  return rankBlogCandidates([
    {
      candidate_id: "cand:lease-inputs-refresh",
      venture_id,
      topic: "Lease comparison inputs",
      question: "What numbers do you need to compare two commercial leases?",
      score: 40,
      provenance: ["existing_page", "geo_canary"],
      distinct_intent: false,
      geo_potential: 0.9,
      commercial_relevance: 0.9,
    },
    {
      candidate_id: "cand:cam-operating-year",
      venture_id,
      topic: "CAM in the first operating year",
      question: "How should a tenant treat CAM in the first operating year?",
      score: 78,
      provenance: ["sales", "voc", "question_gap"],
      distinct_intent: true,
      geo_potential: 0.8,
      commercial_relevance: 0.85,
    },
    {
      candidate_id: "cand:free-rent-timing",
      venture_id,
      topic: "Free rent timing",
      question: "When does free rent change which lease costs less?",
      score: 74,
      provenance: ["product_workflow", "daily_improvement"],
      distinct_intent: true,
      geo_potential: 0.75,
      commercial_relevance: 0.8,
    },
  ]);
}

export function selectDailyBlogCandidate(candidates: BlogCandidate[]): BlogCandidate | null {
  return rankBlogCandidates(candidates).find((row) => row.distinct_intent && row.score >= 55) ?? null;
}

export function decideDualContentLoopCadence(input: {
  blogs_published_today: number;
  other_published_today: number;
  strong_other_opportunities: number;
}): DualContentLoopCadence {
  const blogs_allowed = Math.max(0, DAILY_BLOG_TARGET - input.blogs_published_today);
  const other_allowed = Math.min(
    MAX_OTHER_NEW_HIGH_VALUE_ASSETS_PER_DAY - input.other_published_today,
    input.strong_other_opportunities,
  );
  return {
    daily_blog_target: DAILY_BLOG_TARGET,
    max_other_new_high_value_assets: MAX_OTHER_NEW_HIGH_VALUE_ASSETS_PER_DAY,
    blogs_due: DAILY_BLOG_TARGET,
    blogs_allowed: Math.max(0, blogs_allowed),
    other_allowed: Math.max(0, other_allowed),
    refresh_and_expand_uncapped: true,
    reason: blogs_allowed > 0
      ? "daily_blog_slot_reserved_other_opportunity_driven"
      : "daily_blog_complete_other_opportunity_driven",
  };
}

export function planDailyBlogObligation(input: {
  venture_id: string;
  public_name?: string;
  now: string;
  candidates?: BlogCandidate[];
}): DailyBlogObligation {
  const state = ensureVentureBlogOsState(input.venture_id, input.public_name, input.now);
  const day = input.now.slice(0, 10);
  if (state.obligation && state.obligation.operating_day === day) return state.obligation;
  const pool = rankBlogCandidates(input.candidates?.length ? input.candidates : defaultOccupancyNpvCandidates(input.venture_id));
  const selected = selectDailyBlogCandidate(pool);
  const obligation: DailyBlogObligation = {
    obligation_id: id("blog", input.now, input.venture_id),
    venture_id: input.venture_id,
    operating_day: day,
    candidate_id: selected?.candidate_id ?? null,
    topic: selected?.topic ?? "unassigned_daily_blog",
    state: "PLANNED",
    owner: "VentureBlogWorker",
    due_at: `${day}T23:59:59.000Z`,
    next_action: selected ? "RESEARCH_CANDIDATE" : "REPLENISH_CANDIDATE_POOL",
    next_action_at: input.now,
    attempt_count: 0,
    live_url: null,
    live_title: null,
    blocker_reason: null,
    blocker_evidence: null,
    created_at: input.now,
    updated_at: input.now,
  };
  replaceVentureBlogOsState({
    ...state,
    operating_day: day,
    obligation,
    candidates: pool,
    updated_at: input.now,
  });
  return obligation;
}

export function transitionDailyBlogObligation(input: {
  venture_id: string;
  to: DailyBlogState;
  now: string;
  next_action: string;
  live_url?: string | null;
  live_title?: string | null;
  blocker_reason?: string | null;
  blocker_evidence?: string | null;
}): DailyBlogObligation {
  if (input.to === ("FAILED" as DailyBlogState)) {
    throw new Error("FAILED is not a DailyBlogObligation state");
  }
  const state = ensureVentureBlogOsState(input.venture_id, input.venture_id, input.now);
  const current = state.obligation ?? planDailyBlogObligation({ venture_id: input.venture_id, now: input.now });
  const next: DailyBlogObligation = {
    ...current,
    state: input.to,
    next_action: input.next_action,
    next_action_at: input.now,
    live_url: input.live_url ?? current.live_url,
    live_title: input.live_title ?? current.live_title,
    blocker_reason: input.to === "ESCALATED_EXTERNAL_BLOCKER" ? input.blocker_reason ?? "EXTERNAL_BLOCKER" : null,
    blocker_evidence: input.to === "ESCALATED_EXTERNAL_BLOCKER" ? input.blocker_evidence ?? "external_outage" : null,
    updated_at: input.now,
  };
  replaceVentureBlogOsState({
    ...ensureVentureBlogOsState(input.venture_id, input.venture_id, input.now),
    obligation: next,
    blogs_live_verified_today: input.to === "LIVE_VERIFIED"
      ? Math.max(1, ensureVentureBlogOsState(input.venture_id).blogs_live_verified_today)
      : ensureVentureBlogOsState(input.venture_id).blogs_live_verified_today,
    updated_at: input.now,
  });
  return next;
}

export function recordBlogBuildAttempt(input: {
  venture_id: string;
  now: string;
  stage: DailyBlogState;
  failure_class?: BlogFailureClass | null;
  failure_reason?: string | null;
  evidence?: string[];
  recovered?: boolean;
}): BlogBuildAttempt {
  const state = ensureVentureBlogOsState(input.venture_id, input.venture_id, input.now);
  const obligation = state.obligation ?? planDailyBlogObligation({ venture_id: input.venture_id, now: input.now });
  const attempt_no = state.attempts.filter((row) => row.obligation_id === obligation.obligation_id).length + 1;
  const failure = input.failure_class ?? null;
  const attempt: BlogBuildAttempt = {
    attempt_id: id("attempt", input.now, String(attempt_no)),
    obligation_id: obligation.obligation_id,
    attempt_no,
    venture_id: input.venture_id,
    candidate_id: obligation.candidate_id,
    topic: obligation.topic,
    stage: input.stage,
    failure_class: failure,
    failure_reason: input.failure_reason ?? null,
    evidence: input.evidence ?? [],
    repair_strategy: failure ? BLOG_REPAIR_STRATEGIES[failure] : null,
    started_at: input.now,
    completed_at: input.now,
    next_action: failure ? BLOG_REPAIR_STRATEGIES[failure] : "CONTINUE",
    recovered: Boolean(input.recovered),
    created_at: input.now,
  };
  const nextObligation: DailyBlogObligation = {
    ...obligation,
    attempt_count: attempt_no,
    state: failure
      ? (obligation.state === "ESCALATED_EXTERNAL_BLOCKER" ? "ESCALATED_EXTERNAL_BLOCKER" : "REPAIRING")
      : obligation.state,
    next_action: attempt.next_action,
    next_action_at: input.now,
    updated_at: input.now,
  };
  replaceVentureBlogOsState({
    ...state,
    obligation: nextObligation,
    attempts: [...state.attempts, attempt],
    updated_at: input.now,
  });
  return attempt;
}

export function recoverBlogBuildFailure(input: {
  venture_id: string;
  failure_class: BlogFailureClass;
  now: string;
  better_candidate?: BlogCandidate;
}): { obligation: DailyBlogObligation; attempt: BlogBuildAttempt; strategy: string } {
  const attempt = recordBlogBuildAttempt({
    venture_id: input.venture_id,
    now: input.now,
    stage: "REPAIRING",
    failure_class: input.failure_class,
    failure_reason: input.failure_class,
    evidence: [`recover:${input.failure_class}`],
  });
  const strategy = BLOG_REPAIR_STRATEGIES[input.failure_class];
  const state = ensureVentureBlogOsState(input.venture_id);
  if (input.failure_class === "TOPIC_QUALITY" && input.better_candidate) {
    const obligation = {
      ...state.obligation!,
      candidate_id: input.better_candidate.candidate_id,
      topic: input.better_candidate.topic,
      state: "PLANNED" as const,
      next_action: "RESEARCH_CANDIDATE",
      updated_at: input.now,
    };
    replaceVentureBlogOsState({
      ...state,
      obligation,
      candidates: rankBlogCandidates([input.better_candidate, ...state.candidates]),
      updated_at: input.now,
    });
    return { obligation, attempt, strategy };
  }
  const obligation = transitionDailyBlogObligation({
    venture_id: input.venture_id,
    to: "REPAIRING",
    now: input.now,
    next_action: strategy,
  });
  return { obligation, attempt, strategy };
}

export function escalateExternalBlogBlocker(input: {
  venture_id: string;
  now: string;
  reason: string;
  evidence: string;
}): DailyBlogObligation {
  recordBlogBuildAttempt({
    venture_id: input.venture_id,
    now: input.now,
    stage: "ESCALATED_EXTERNAL_BLOCKER",
    failure_class: "DEPLOYMENT",
    failure_reason: input.reason,
    evidence: [input.evidence],
  });
  return transitionDailyBlogObligation({
    venture_id: input.venture_id,
    to: "ESCALATED_EXTERNAL_BLOCKER",
    now: input.now,
    next_action: "WAIT_EXTERNAL_THEN_RETRY",
    blocker_reason: input.reason,
    blocker_evidence: input.evidence,
  });
}

export function syncBlogRollAfterPublish(input: {
  venture_id: string;
  now: string;
  article_id: string;
  title: string;
  url: string;
  published: string;
  category: string;
  tags: string[];
}): VentureBlogOsState {
  const state = ensureVentureBlogOsState(input.venture_id, input.venture_id, input.now);
  const roll = {
    featured_latest_id: input.article_id,
    featured_latest_title: input.title,
    featured_latest_url: input.url,
    featured_latest_published: input.published,
    carousel_ids: [input.article_id, ...state.roll.carousel_ids.filter((id) => id !== input.article_id)].slice(0, 8),
    sidebar_recent_ids: [input.article_id, ...state.roll.sidebar_recent_ids.filter((id) => id !== input.article_id)].slice(0, 6),
    topic_cloud: [...new Set([...input.tags, ...state.roll.topic_cloud])].slice(0, 12),
    category_discovery: [...new Set([input.category, ...state.roll.category_discovery])],
    search_enabled: state.roll.search_enabled,
    newest_first: true,
    last_synced_at: input.now,
    content_hash: `blog:${input.article_id}:${input.published}`,
  };
  return replaceVentureBlogOsState({
    ...state,
    roll,
    first_canary_live: true,
    blogs_live_verified_today: Math.max(1, state.blogs_live_verified_today + (state.obligation?.state === "LIVE_VERIFIED" ? 0 : 1)),
    updated_at: input.now,
  });
}

export function verifyDailyBlogLive(input: {
  venture_id: string;
  now: string;
  title: string;
  url: string;
  category: string;
  tags: string[];
}): DailyBlogObligation {
  syncBlogRollAfterPublish({
    venture_id: input.venture_id,
    now: input.now,
    article_id: input.url,
    title: input.title,
    url: input.url,
    published: input.now.slice(0, 10),
    category: input.category,
    tags: input.tags,
  });
  return transitionDailyBlogObligation({
    venture_id: input.venture_id,
    to: "LIVE_VERIFIED",
    now: input.now,
    next_action: "PLAN_NEXT_OPERATING_DAY",
    live_url: input.url,
    live_title: input.title,
  });
}

export function recordOtherHighValueAsset(venture_id: string, now: string): DualContentLoopCadence {
  const state = ensureVentureBlogOsState(venture_id, venture_id, now);
  const next = replaceVentureBlogOsState({
    ...state,
    other_high_value_today: state.other_high_value_today + 1,
    updated_at: now,
  });
  return decideDualContentLoopCadence({
    blogs_published_today: next.blogs_live_verified_today,
    other_published_today: next.other_high_value_today,
    strong_other_opportunities: 2,
  });
}

export function advanceVentureBlogOperatingSystem(input: {
  venture_id: string;
  public_name?: string;
  now: string;
  published_blog?: { title: string; url: string; category: string; tags: string[] } | null;
  other_high_value?: boolean;
  failure?: { class: BlogFailureClass; reason?: string } | null;
  external_blocker?: { reason: string; evidence: string } | null;
}): VentureBlogOsState {
  planDailyBlogObligation({ venture_id: input.venture_id, public_name: input.public_name, now: input.now });
  if (input.external_blocker) {
    escalateExternalBlogBlocker({
      venture_id: input.venture_id,
      now: input.now,
      reason: input.external_blocker.reason,
      evidence: input.external_blocker.evidence,
    });
  } else if (input.failure) {
    recoverBlogBuildFailure({
      venture_id: input.venture_id,
      failure_class: input.failure.class,
      now: input.now,
    });
  } else if (input.published_blog) {
    verifyDailyBlogLive({
      venture_id: input.venture_id,
      now: input.now,
      ...input.published_blog,
    });
  } else {
    const current = ensureVentureBlogOsState(input.venture_id).obligation;
    if (current && ACTIVE_BUILD.includes(current.state)) {
      transitionDailyBlogObligation({
        venture_id: input.venture_id,
        to: current.state === "PLANNED" ? "RESEARCHING" : current.state,
        now: input.now,
        next_action: current.next_action,
      });
    }
  }
  if (input.other_high_value) recordOtherHighValueAsset(input.venture_id, input.now);
  const state = ensureVentureBlogOsState(input.venture_id);
  return replaceVentureBlogOsState({
    ...state,
    always_on_proven: Boolean(state.obligation) && state.candidates.length > 0,
    updated_at: input.now,
  });
}

export function strandedBlogObligations(states: VentureBlogOsState[] = []): DailyBlogObligation[] {
  return states
    .map((row) => row.obligation)
    .filter((row): row is DailyBlogObligation => Boolean(row && row.state !== "LIVE_VERIFIED" && row.state !== "ESCALATED_EXTERNAL_BLOCKER" && !row.owner));
}
