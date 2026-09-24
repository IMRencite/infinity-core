import { describe, expect, it } from "vitest";
import { createDailyBlogObligation } from "../creator";
import { currentSecondQcHold } from "../hold";
import { DurableBlogStore } from "../store";
import { deriveEffectiveOrganicExecutionState } from "../effective-execution-state";
import { executeOrganicScheduledWorkflow } from "../scheduled-execution";
import { evaluateBlogContentQualityGate, evaluateBlogVisualAssetGate } from "@/lib/infinity/organic-growth-engine/continuous/blog-quality-core";
import {
  occupancynpvCamFirstYearDraft,
  occupancynpvCamFirstYearRenderedHtml,
  OCCUPANCYNPV_CAM_FIRST_YEAR_MARKER,
  OCCUPANCYNPV_CAM_VISUALS,
} from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-cam-first-year-page";
import { projectOrganicRuntimeHq } from "@/lib/infinity/organic-growth-engine/obligation/hq";
import { replaceLastOrganicEffectiveExecutionState } from "@/lib/infinity/organic-growth-engine/obligation/persist";
import { freezeSchedulerAuthorizationProjection } from "../effective-execution-state";

const NOW = "2026-09-24T12:00:00.000Z";

function authorized() {
  return deriveEffectiveOrganicExecutionState({
    canonical: { hold_state: "CLEARED", execute_publish: true, hold_version: "N+1" },
    scheduler: { publishing_hold: "PAUSED_FOR_SECOND_QC_ESCAPE", execute_publish: false, hold_version: "N" },
  });
}

function blocked() {
  return deriveEffectiveOrganicExecutionState({
    canonical: { hold_state: "ACTIVE", execute_publish: false, hold_version: "N+1" },
    scheduler: { publishing_hold: null, execute_publish: true, hold_version: "N" },
  });
}

function clearedHold() {
  return {
    ...currentSecondQcHold(NOW),
    hold_state: "CLEARED" as const,
    execute_publish: true,
    resolved_at: NOW,
  };
}

function seedStore() {
  const store = new DurableBlogStore();
  createDailyBlogObligation({
    store,
    venture_id: "occupancynpv",
    now: NOW,
    candidate_id: "cand:cam-operating-year",
    expected_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
    actor: "VERCEL_CRON",
  });
  return store;
}

function htmlOk() {
  return occupancynpvCamFirstYearRenderedHtml();
}

describe("organic scheduled execution v54", () => {
  it("1 authorized tick can enter the workflow", async () => {
    const store = seedStore();
    const result = await executeOrganicScheduledWorkflow({
      store,
      hold: clearedHold(),
      effective: authorized(),
      now: NOW,
      owner: "tick-a",
      execute_publish: true,
      adapters: {
        readCanonical: async () => authorized(),
        publishLive: async () => ({
          ok: true,
          public_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
          public_mutation: true,
          live_html: htmlOk(),
          live_status: 200,
        }),
        fetchPublic: async () => ({ status: 200, html: htmlOk() }),
      },
    });
    expect(result.claimed).toBe(true);
    expect(result.stage).not.toBe("BLOCKED_AUTHORIZATION");
    expect(result.obligation?.pipeline_state).toBe("LIVE_VERIFIED");
  });

  it("2 paused tick cannot draft or publish", async () => {
    const store = seedStore();
    const result = await executeOrganicScheduledWorkflow({
      store,
      hold: currentSecondQcHold(NOW),
      effective: blocked(),
      now: NOW,
      owner: "tick-b",
      execute_publish: true,
      adapters: {
        readCanonical: async () => blocked(),
        publishLive: async () => ({ ok: true, public_url: "https://occupancynpv.com/x", public_mutation: true }),
      },
    });
    expect(result.stage).toBe("BLOCKED_AUTHORIZATION");
    expect(result.public_mutation).toBe(false);
    expect(store.get("occupancynpv", "2026-09-24")?.pipeline_state).toBe("PLANNED");
  });

  it("3 authorization revoked immediately before publish blocks public mutation", async () => {
    const store = seedStore();
    let published = false;
    const result = await executeOrganicScheduledWorkflow({
      store,
      hold: clearedHold(),
      effective: authorized(),
      now: NOW,
      owner: "tick-c",
      execute_publish: true,
      adapters: {
        readCanonical: async () => blocked(),
        publishLive: async () => {
          published = true;
          return { ok: true, public_url: "https://occupancynpv.com/x", public_mutation: true };
        },
      },
    });
    expect(published).toBe(false);
    expect(result.stage).toBe("BLOCKED_AUTHORIZATION");
    expect(result.public_mutation).toBe(false);
    expect(store.get("occupancynpv", "2026-09-24")?.pipeline_state).toBe("QC_PASSED");
    expect(store.get("occupancynpv", "2026-09-24")?.failure_reason).toContain("BLOCKED_AUTHORIZATION");
  });

  it("4 duplicate scheduler invocation cannot double-own the obligation", async () => {
    const store = seedStore();
    const first = store.claimExecution({
      venture_id: "occupancynpv",
      operating_date: "2026-09-24",
      owner: "tick-d",
      now: NOW,
    });
    const second = await executeOrganicScheduledWorkflow({
      store,
      hold: clearedHold(),
      effective: authorized(),
      now: NOW,
      owner: "tick-e",
      execute_publish: true,
      adapters: {
        readCanonical: async () => authorized(),
        publishLive: async () => ({ ok: true, public_url: "https://occupancynpv.com/x", public_mutation: true }),
      },
    });
    expect(first.ok).toBe(true);
    expect(second.stage).toBe("OWNED");
    expect(second.claimed).toBe(false);
    expect(second.public_mutation).toBe(false);
  });

  it("5 duplicate invocation cannot double-publish", async () => {
    const store = seedStore();
    let publishes = 0;
    const adapters = {
      readCanonical: async () => authorized(),
      publishLive: async () => {
        publishes += 1;
        return {
          ok: true,
          public_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
          public_mutation: true,
          live_html: htmlOk(),
          live_status: 200,
        };
      },
      fetchPublic: async () => ({ status: 200, html: htmlOk() }),
    };
    const first = await executeOrganicScheduledWorkflow({
      store,
      hold: clearedHold(),
      effective: authorized(),
      now: NOW,
      owner: "tick-f",
      execute_publish: true,
      adapters,
    });
    const second = await executeOrganicScheduledWorkflow({
      store,
      hold: clearedHold(),
      effective: authorized(),
      now: "2026-09-24T12:20:00.000Z",
      owner: "tick-g",
      execute_publish: true,
      adapters,
    });
    expect(first.live_verified).toBe(true);
    expect(second.live_verified).toBe(true);
    expect(second.public_mutation).toBe(false);
    expect(publishes).toBe(1);
  });

  it("6 known bad content fails content QC", async () => {
    const thin = {
      ...occupancynpvCamFirstYearDraft(),
      headings: ["Thin"],
      body: "short filler text without examples or checklists. ".repeat(20),
      word_count: 220,
      internal_links: [],
      citations: [],
    };
    expect(evaluateBlogContentQualityGate(thin).result).toBe("FAIL");
    const store = seedStore();
    const result = await executeOrganicScheduledWorkflow({
      store,
      hold: clearedHold(),
      effective: authorized(),
      now: NOW,
      owner: "tick-h",
      execute_publish: true,
      adapters: {
        readCanonical: async () => authorized(),
        publishLive: async () => ({ ok: true, public_url: "https://occupancynpv.com/x", public_mutation: true }),
        draft: () => thin,
      },
    });
    expect(result.stage).toBe("CONTENT_QC_FAILED");
    expect(result.public_mutation).toBe(false);
    expect(store.get("occupancynpv", "2026-09-24")?.pipeline_state).toBe("DRAFTED");
  });

  it("7 known bad visual fails visual QC", async () => {
    expect(evaluateBlogVisualAssetGate({ featured_image: "", featured_alt: "", supporting_visual: false }).result).toBe("FAIL");
    const store = seedStore();
    const result = await executeOrganicScheduledWorkflow({
      store,
      hold: clearedHold(),
      effective: authorized(),
      now: NOW,
      owner: "tick-i",
      execute_publish: true,
      adapters: {
        readCanonical: async () => authorized(),
        publishLive: async () => ({ ok: true, public_url: "https://occupancynpv.com/x", public_mutation: true }),
        visuals: { featured_image: undefined, supporting_visual: false },
      },
    });
    expect(result.stage).toBe("VISUAL_QC_FAILED");
    expect(result.public_mutation).toBe(false);
  });

  it("8 known good content and visual reach PRE_PUBLISH through the shared service", async () => {
    expect(evaluateBlogContentQualityGate(occupancynpvCamFirstYearDraft()).result).toBe("PASS");
    expect(evaluateBlogVisualAssetGate(OCCUPANCYNPV_CAM_VISUALS).result).toBe("PASS");
    const store = seedStore();
    const result = await executeOrganicScheduledWorkflow({
      store,
      hold: clearedHold(),
      effective: authorized(),
      now: NOW,
      owner: "tick-j",
      execute_publish: true,
      adapters: {
        readCanonical: async () => blocked(),
        publishLive: async () => ({ ok: true, public_url: "https://occupancynpv.com/x", public_mutation: true }),
      },
    });
    expect(result.stage).toBe("BLOCKED_AUTHORIZATION");
    expect(store.get("occupancynpv", "2026-09-24")?.pipeline_state).toBe("QC_PASSED");
  });

  it("9 PRE_PUBLISH is reachable through the same shared execution service", async () => {
    const store = seedStore();
    await executeOrganicScheduledWorkflow({
      store,
      hold: clearedHold(),
      effective: authorized(),
      now: NOW,
      owner: "tick-k",
      execute_publish: true,
      adapters: {
        readCanonical: async () => blocked(),
        publishLive: async () => ({ ok: true, public_url: "https://occupancynpv.com/x", public_mutation: true }),
      },
    });
    expect(store.get("occupancynpv", "2026-09-24")?.qc_version).toBe("blog-render-qc-v3");
    expect(htmlOk()).toContain(OCCUPANCYNPV_CAM_FIRST_YEAR_MARKER);
  });

  it("10 LIVE verification fails if the public artifact is absent or wrong", async () => {
    const store = seedStore();
    const result = await executeOrganicScheduledWorkflow({
      store,
      hold: clearedHold(),
      effective: authorized(),
      now: NOW,
      owner: "tick-l",
      execute_publish: true,
      adapters: {
        readCanonical: async () => authorized(),
        publishLive: async () => ({
          ok: true,
          public_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
          public_mutation: true,
          live_status: 404,
          live_html: "<html><title>missing</title></html>",
        }),
        fetchPublic: async () => ({ status: 404, html: "<html><title>missing</title></html>" }),
      },
    });
    expect(result.stage).toBe("LIVE_VERIFY_FAILED");
    expect(result.live_verified).toBe(false);
  });

  it("11 LIVE verification passes only for the correct public content", async () => {
    const store = seedStore();
    const result = await executeOrganicScheduledWorkflow({
      store,
      hold: clearedHold(),
      effective: authorized(),
      now: NOW,
      owner: "tick-m",
      execute_publish: true,
      adapters: {
        readCanonical: async () => authorized(),
        publishLive: async () => ({
          ok: true,
          public_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
          public_mutation: true,
          live_html: htmlOk(),
          live_status: 200,
        }),
        fetchPublic: async () => ({ status: 200, html: htmlOk() }),
      },
    });
    expect(result.live_verified).toBe(true);
    expect(result.public_url).toContain("/blog/occupancy-costs/cam-first-year/");
  });

  it("12 self-healing regression remains PASS and HQ does not treat legacy hold as authority", () => {
    const stalePause = deriveEffectiveOrganicExecutionState({
      canonical: { hold_state: "CLEARED", execute_publish: true, hold_version: "N+1" },
      scheduler: { publishing_hold: "PAUSED_FOR_SECOND_QC_ESCAPE", execute_publish: false, hold_version: "N" },
    });
    expect(stalePause.result).toBe("AUTHORIZED");
    const frozen = freezeSchedulerAuthorizationProjection(
      { publishing_hold: "PAUSED_FOR_SECOND_QC_ESCAPE", execute_publish: false },
      { publishing_hold: null, execute_publish: true },
    );
    expect(frozen.publishing_hold).toBe("PAUSED_FOR_SECOND_QC_ESCAPE");
    replaceLastOrganicEffectiveExecutionState(stalePause);
    const hq = projectOrganicRuntimeHq(NOW);
    expect(hq.execute_publish).toBe(true);
    expect(hq.publishing).toBe("LIVE");
    expect(hq.publishing).not.toBe("PAUSED_FOR_SECOND_QC_ESCAPE");
    replaceLastOrganicEffectiveExecutionState(null);
  });
});
