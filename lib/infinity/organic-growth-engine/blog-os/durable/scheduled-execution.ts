import { evaluateBlogContentQualityGate, evaluateBlogVisualAssetGate } from "@/lib/infinity/organic-growth-engine/continuous/blog-quality-core";
import { evaluateOrganicContentQualityGate } from "@/lib/infinity/organic-growth-engine/continuous/quality";
import {
  OCCUPANCYNPV_CAM_FIRST_YEAR_MARKER,
  OCCUPANCYNPV_CAM_FIRST_YEAR_PATH,
  OCCUPANCYNPV_CAM_VISUALS,
  evaluateOccupancyNpvBrandContentFit,
  occupancynpvCamFirstYearDraft,
  occupancynpvCamFirstYearRenderedHtml,
} from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-cam-first-year-page";
import type { EffectiveOrganicExecutionState } from "./effective-execution-state";
import { attemptLiveVerify, attemptPublish } from "./pipeline";
import { DurableBlogStore } from "./store";
import { CURRENT_BLOG_QC_VERSION, type DurableBlogHold, type DurableBlogObligation } from "./types";
import { evaluateRenderedPageVerificationCheck } from "./verifier";

export const ORGANIC_EXECUTION_LEASE_MS = 20 * 60 * 1000;

export type OrganicScheduledStage =
  | "IDLE"
  | "CLAIMED"
  | "DRAFTING"
  | "CONTENT_QC"
  | "BRAND_QC"
  | "VISUAL_QC"
  | "PRE_PUBLISH"
  | "AUTHORIZATION_RECHECK"
  | "PUBLISHING"
  | "DEPLOYING"
  | "LIVE_VERIFY"
  | "FINALIZED"
  | "BLOCKED_AUTHORIZATION"
  | "DRAFT_FAILED"
  | "CONTENT_QC_FAILED"
  | "BRAND_QC_FAILED"
  | "VISUAL_QC_FAILED"
  | "PRE_PUBLISH_FAILED"
  | "PUBLISH_FAILED"
  | "DEPLOY_FAILED"
  | "LIVE_VERIFY_FAILED"
  | "OWNED";

export type OrganicLivePublishResult = {
  ok: boolean;
  public_url: string;
  deployment_id?: string | null;
  aliased?: boolean;
  live_html?: string;
  live_status?: number;
  reason?: string | null;
  public_mutation?: boolean;
};

export type OrganicScheduledAdapters = {
  readCanonical: () => Promise<EffectiveOrganicExecutionState>;
  publishLive: (input: {
    obligation: DurableBlogObligation;
    html: string;
  }) => Promise<OrganicLivePublishResult>;
  fetchPublic?: (url: string) => Promise<{ status: number; html: string }>;
  draft?: () => ReturnType<typeof occupancynpvCamFirstYearDraft>;
  visuals?: {
    featured_image?: string;
    featured_alt?: string;
    supporting_visual?: boolean;
    broken?: boolean;
    generic_filler?: boolean;
  };
};

export type OrganicScheduledWorkflowResult = {
  stage: OrganicScheduledStage;
  obligation: DurableBlogObligation | null;
  claimed: boolean;
  public_mutation: boolean;
  public_url: string | null;
  live_verified: boolean;
  authorization: EffectiveOrganicExecutionState["result"] | "BLOCKED_AUTHORIZATION";
  reasons: string[];
};

function fail(
  store: DurableBlogStore,
  obligation: DurableBlogObligation,
  now: string,
  stage: OrganicScheduledStage,
  reasons: string[],
  extra: Partial<OrganicScheduledWorkflowResult> = {},
): OrganicScheduledWorkflowResult {
  store.markFailure({
    venture_id: obligation.venture_id,
    operating_date: obligation.operating_date,
    now,
    reason: `${stage}:${reasons.join(",")}`,
  });
  return {
    stage,
    obligation: store.get(obligation.venture_id, obligation.operating_date),
    claimed: true,
    public_mutation: false,
    public_url: obligation.live_url,
    live_verified: obligation.pipeline_state === "LIVE_VERIFIED",
    authorization: extra.authorization ?? "AUTHORIZED",
    reasons,
    ...extra,
  };
}

export function selectActionableDailyObligation(
  store: DurableBlogStore,
  now: string,
): DurableBlogObligation | null {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
  const today = store.get("occupancynpv", day);
  if (today && today.pipeline_state !== "LIVE_VERIFIED" && today.pipeline_state !== "MISSED_RECORDED") {
    return today;
  }
  return store.listProduction().find((row) =>
    row.expected_url?.includes("/blog/occupancy-costs/cam-first-year/")
    && row.pipeline_state !== "LIVE_VERIFIED"
    && row.pipeline_state !== "MISSED_RECORDED"
  ) ?? today ?? null;
}

export async function executeOrganicScheduledWorkflow(input: {
  store: DurableBlogStore;
  hold: DurableBlogHold;
  effective: EffectiveOrganicExecutionState;
  now: string;
  owner: string;
  adapters: OrganicScheduledAdapters;
  execute_publish?: boolean;
}): Promise<OrganicScheduledWorkflowResult> {
  const obligation = selectActionableDailyObligation(input.store, input.now);
  if (!obligation) {
    return {
      stage: "IDLE",
      obligation: null,
      claimed: false,
      public_mutation: false,
      public_url: null,
      live_verified: false,
      authorization: input.effective.result,
      reasons: ["NO_ACTIONABLE_OBLIGATION"],
    };
  }
  if (input.effective.result !== "AUTHORIZED" || input.execute_publish !== true) {
    input.store.markFailure({
      venture_id: obligation.venture_id,
      operating_date: obligation.operating_date,
      now: input.now,
      reason: "BLOCKED_AUTHORIZATION",
    });
    return {
      stage: "BLOCKED_AUTHORIZATION",
      obligation: input.store.get(obligation.venture_id, obligation.operating_date),
      claimed: false,
      public_mutation: false,
      public_url: obligation.live_url,
      live_verified: false,
      authorization: input.effective.result,
      reasons: ["TICK_NOT_AUTHORIZED"],
    };
  }
  if (obligation.pipeline_state === "LIVE_VERIFIED") {
    return {
      stage: "FINALIZED",
      obligation,
      claimed: false,
      public_mutation: false,
      public_url: obligation.live_url,
      live_verified: true,
      authorization: "AUTHORIZED",
      reasons: ["ALREADY_LIVE_VERIFIED"],
    };
  }

  const claim = input.store.claimExecution({
    venture_id: obligation.venture_id,
    operating_date: obligation.operating_date,
    owner: input.owner,
    now: input.now,
    ttl_ms: ORGANIC_EXECUTION_LEASE_MS,
  });
  if (!claim.ok || !claim.obligation) {
    return {
      stage: "OWNED",
      obligation: claim.obligation,
      claimed: false,
      public_mutation: false,
      public_url: obligation.live_url,
      live_verified: false,
      authorization: "AUTHORIZED",
      reasons: [claim.reason],
    };
  }
  let current = claim.obligation;

  if (current.pipeline_state === "PLANNED") {
    const draft = input.adapters.draft?.() ?? occupancynpvCamFirstYearDraft();
    if (!draft.body || draft.word_count < 200) {
      return fail(input.store, current, input.now, "DRAFT_FAILED", ["EMPTY_DRAFT"]);
    }
    const drafted = input.store.transition({
      venture_id: current.venture_id,
      operating_date: current.operating_date,
      to: "DRAFTED",
      actor: input.owner,
      invoked_by: "ORGANIC_SCHEDULED_WORKFLOW",
      now: input.now,
      hold: input.hold,
    });
    if (!drafted.ok || !drafted.obligation) {
      return fail(input.store, current, input.now, "DRAFT_FAILED", [drafted.reason]);
    }
    current = drafted.obligation;
  }

  if (current.pipeline_state === "DRAFTED") {
    const draft = input.adapters.draft?.() ?? occupancynpvCamFirstYearDraft();
    const content = evaluateBlogContentQualityGate(draft);
    const organic = evaluateOrganicContentQualityGate(draft, { complexity: "MODERATE" });
    if (content.result !== "PASS" || organic.result !== "PASS") {
      return fail(input.store, current, input.now, "CONTENT_QC_FAILED", [...content.reasons, ...organic.reasons]);
    }
    const brand = evaluateOccupancyNpvBrandContentFit(`${draft.body} ${draft.h1} OccupancyNPV`);
    if (brand.result !== "PASS") {
      return fail(input.store, current, input.now, "BRAND_QC_FAILED", brand.reasons);
    }
    const visual = evaluateBlogVisualAssetGate(input.adapters.visuals ?? OCCUPANCYNPV_CAM_VISUALS);
    if (visual.result !== "PASS") {
      return fail(input.store, current, input.now, "VISUAL_QC_FAILED", visual.reasons);
    }
    const passed = input.store.transition({
      venture_id: current.venture_id,
      operating_date: current.operating_date,
      to: "QC_PASSED",
      actor: input.owner,
      invoked_by: "ORGANIC_SCHEDULED_WORKFLOW",
      now: input.now,
      hold: input.hold,
      qc_version: CURRENT_BLOG_QC_VERSION,
    });
    if (!passed.ok || !passed.obligation) {
      return fail(input.store, current, input.now, "CONTENT_QC_FAILED", [passed.reason]);
    }
    current = passed.obligation;
  }

  const preHtml = occupancynpvCamFirstYearRenderedHtml();
  const prePublish = evaluateRenderedPageVerificationCheck({
    mode: "PRE_PUBLISH",
    url: `https://occupancynpv.com${OCCUPANCYNPV_CAM_FIRST_YEAR_PATH}`,
    status: 200,
    html: preHtml,
    expected_h1: "CAM in the first operating year",
    expected_marker: OCCUPANCYNPV_CAM_FIRST_YEAR_MARKER,
    expected_canonical: `https://occupancynpv.com${OCCUPANCYNPV_CAM_FIRST_YEAR_PATH}`,
    contrast_proven: true,
    background_kind: "IMAGE",
    overflow: false,
    truncated: false,
  });
  if (prePublish.result !== "PASS") {
    return fail(input.store, current, input.now, "PRE_PUBLISH_FAILED", prePublish.reasons);
  }

  const recheck = await input.adapters.readCanonical();
  if (recheck.result !== "AUTHORIZED") {
    return fail(input.store, current, input.now, "BLOCKED_AUTHORIZATION", ["REVOKED_BEFORE_PUBLISH"], {
      authorization: recheck.result,
    });
  }

  if (current.pipeline_state === "QC_PASSED") {
    let live: OrganicLivePublishResult;
    try {
      live = await input.adapters.publishLive({
        obligation: current,
        html: preHtml,
      });
    } catch {
      return fail(input.store, current, input.now, "PUBLISH_FAILED", ["PUBLISH_THREW"]);
    }
    if (!live.ok || live.public_mutation === false) {
      return fail(input.store, current, input.now, live.reason === "BLOCKED_AUTHORIZATION" ? "BLOCKED_AUTHORIZATION" : "PUBLISH_FAILED", [live.reason ?? "PUBLISH_FAILED"], {
        authorization: live.reason === "BLOCKED_AUTHORIZATION" ? "BLOCKED_HOLD" : "AUTHORIZED",
      });
    }
    const published = attemptPublish({
      store: input.store,
      venture_id: current.venture_id,
      operating_date: current.operating_date,
      now: input.now,
      hold: {
        ...input.hold,
        hold_state: "CLEARED",
        execute_publish: true,
        resolved_at: input.hold.resolved_at ?? input.now,
      },
      pre_publish: {
        mode: "PRE_PUBLISH",
        url: live.public_url,
        status: 200,
        html: preHtml,
        expected_h1: "CAM in the first operating year",
        expected_marker: OCCUPANCYNPV_CAM_FIRST_YEAR_MARKER,
        expected_canonical: `https://occupancynpv.com${OCCUPANCYNPV_CAM_FIRST_YEAR_PATH}`,
        contrast_proven: true,
        background_kind: "IMAGE",
      },
    });
    if (!published.ok) {
      return fail(input.store, current, input.now, "PUBLISH_FAILED", [published.reason], {
        public_mutation: true,
      });
    }
    current = input.store.get(current.venture_id, current.operating_date) ?? current;
    const publicUrl = live.public_url || `https://occupancynpv.com${OCCUPANCYNPV_CAM_FIRST_YEAR_PATH}`;
    const fetched = input.adapters.fetchPublic
      ? await input.adapters.fetchPublic(publicUrl)
      : { status: live.live_status ?? 0, html: live.live_html ?? "" };
    const verified = attemptLiveVerify({
      store: input.store,
      venture_id: current.venture_id,
      operating_date: current.operating_date,
      now: input.now,
      live: {
        mode: "LIVE_POST_PUBLISH",
        url: publicUrl,
        status: fetched.status,
        html: fetched.html,
        expected_h1: "CAM in the first operating year",
        expected_marker: OCCUPANCYNPV_CAM_FIRST_YEAR_MARKER,
        expected_canonical: `https://occupancynpv.com${OCCUPANCYNPV_CAM_FIRST_YEAR_PATH}`,
        contrast_proven: true,
        background_kind: "IMAGE",
      },
    });
    if (!verified.ok) {
      return fail(input.store, current, input.now, "LIVE_VERIFY_FAILED", [verified.reason], {
        public_mutation: true,
        public_url: publicUrl,
      });
    }
    current = input.store.get(current.venture_id, current.operating_date) ?? current;
    input.store.releaseExecution({
      venture_id: current.venture_id,
      operating_date: current.operating_date,
      owner: input.owner,
      now: input.now,
    });
    return {
      stage: "FINALIZED",
      obligation: input.store.get(current.venture_id, current.operating_date),
      claimed: true,
      public_mutation: true,
      public_url: publicUrl,
      live_verified: true,
      authorization: "AUTHORIZED",
      reasons: ["LIVE_VERIFIED"],
    };
  }

  return {
    stage: "IDLE",
    obligation: current,
    claimed: true,
    public_mutation: false,
    public_url: current.live_url,
    live_verified: current.pipeline_state === "LIVE_VERIFIED",
    authorization: "AUTHORIZED",
    reasons: [current.pipeline_state],
  };
}
