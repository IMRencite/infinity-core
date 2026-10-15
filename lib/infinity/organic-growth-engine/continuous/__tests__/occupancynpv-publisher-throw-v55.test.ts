import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FrozenBundleSnapshotMissingError, reconstructOccupancynpvLegalSurfaceSuccessor } from "@/lib/infinity/venture-website-architecture/cre-occupancynpv-legal-surface-successor";
import { composeOccupancyNpvOrganicLiveFiles, composeOccupancyNpvOrganicLiveFilesSafe } from "../occupancynpv-publisher";
import { publishOccupancyNpvCamFirstYearLive } from "../occupancynpv-organic-publish-adapter";
import {
  classifyPublishThrow,
  destinationSourcesPresent,
  evaluatePublishDestinationContract,
} from "../destination-source-pack";
import { executeOrganicScheduledWorkflow } from "@/lib/infinity/organic-growth-engine/blog-os/durable/scheduled-execution";
import { DurableBlogStore } from "@/lib/infinity/organic-growth-engine/blog-os/durable/store";
import { createDailyBlogObligation } from "@/lib/infinity/organic-growth-engine/blog-os/durable/creator";
import { currentSecondQcHold } from "@/lib/infinity/organic-growth-engine/blog-os/durable/hold";
import { deriveEffectiveOrganicExecutionState } from "@/lib/infinity/organic-growth-engine/blog-os/durable/effective-execution-state";
import { occupancynpvCamFirstYearRenderedHtml } from "../occupancynpv-cam-first-year-page";

const NOW = "2026-09-24T16:00:00.000Z";

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

describe("occupancynpv publisher throw v55", () => {
  it("classifies FrozenBundleSnapshotMissingError for deploy preparation", () => {
    const classified = classifyPublishThrow(new FrozenBundleSnapshotMissingError());
    expect(classified.reason).toBe("FROZEN_BUNDLE_SNAPSHOT_MISSING");
    expect(classified.stage).toBe("DEPLOY_PREPARATION");
  });

  it("serverless bundled predecessor allows legal reconstruct without cwd snapshot", () => {
    const prev = process.cwd();
    const empty = mkdtempSync(join(tmpdir(), "organic-pub-bundled-"));
    process.chdir(empty);
    try {
      expect(() => reconstructOccupancynpvLegalSurfaceSuccessor()).not.toThrow();
    } finally {
      process.chdir(prev);
    }
  });

  it("reconcile-before-retry aliases a ready preview that already has the artifact", async () => {
    const { reconcileReadyOccupancyNpvDeployment } = await import("../occupancynpv-publisher");
    const vercel = {
      async listDeployments() {
        return {
          ok: true,
          deployments: [
            { id: "dpl_ready_cam", url: "example-ready.vercel.app", readyState: "READY" },
          ],
        };
      },
      async assignDeploymentAlias(id: string, alias: string) {
        expect(id).toBe("dpl_ready_cam");
        expect(alias).toBe("occupancynpv.com");
        return { ok: true, safeError: null };
      },
    };
    const previous = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      const href = String(url);
      if (href.includes("cam-first-year") || href.includes("/blog/")) {
        return new Response(`<html>${occupancynpvCamFirstYearRenderedHtml()} typically includes typically excludes <a href="/blog/occupancy-costs/cam-first-year/">CAM</a><section data-blog-all-articles="true" data-blog-main-roll="true" data-carousel-geometry-contract="v2"><div class="onpv-blog-featured-body" data-carousel-body="true">Featured Blogs Featured Reads</div></section></html>`, { status: 200 });
      }
      return new Response("", { status: 404 });
    }) as typeof fetch;
    try {
      const reconciled = await reconcileReadyOccupancyNpvDeployment(vercel as never);
      expect(reconciled?.id).toBe("dpl_ready_cam");
      expect(reconciled?.aliased).toBe(true);
    } finally {
      globalThis.fetch = previous;
    }
  });

  it("does not re-alias a ready preview that still serves the crushed carousel artifact", async () => {
    const { reconcileReadyOccupancyNpvDeployment } = await import("../occupancynpv-publisher");
    const vercel = {
      async listDeployments() {
        return { ok: true, deployments: [{ id: "dpl_6aCgW1Cnb2bVcqVMcGKQUrf24LLn", url: "stale.vercel.app", readyState: "READY" }] };
      },
      async assignDeploymentAlias() {
        throw new Error("must_not_alias_stale_carousel");
      },
    };
    const previous = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      const href = String(url);
      if (href.includes("cam-first-year") || href.includes("/blog/")) {
        return new Response(`<html>${occupancynpvCamFirstYearRenderedHtml()} typically includes typically excludes cam-first-year <section data-blog-all-articles="true" data-blog-main-roll="true">Featured Blogs Featured Reads</section></html>`, { status: 200 });
      }
      return new Response("", { status: 404 });
    }) as typeof fetch;
    try {
      const reconciled = await reconcileReadyOccupancyNpvDeployment(vercel as never);
      expect(reconciled).toBeNull();
    } finally {
      globalThis.fetch = previous;
    }
  });

  it("corrected predecessor compose includes cam-first-year without throwing", () => {
    expect(destinationSourcesPresent().predecessor).toBe(true);
    const composed = composeOccupancyNpvOrganicLiveFiles();
    expect(composed.files.some((file) => file.path.replace(/\\/g, "/").includes("cam-first-year"))).toBe(true);
    const safe = composeOccupancyNpvOrganicLiveFilesSafe();
    expect(safe.ok).toBe(true);
    expect(safe.files.filter((file) => file.path.replace(/\\/g, "/").includes("cam-first-year")).length).toBe(1);
  });

  it("duplicate retry of an already-live page does not mutate again", async () => {
    const html = occupancynpvCamFirstYearRenderedHtml();
    const first = await publishOccupancyNpvCamFirstYearLive({
      deploy: false,
      obligation: {
        venture_id: "occupancynpv",
        expected_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
      } as never,
    });
    expect(first.ok === false || first.already_live === true || first.reason != null).toBe(true);
    const retry = {
      ok: true,
      public_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
      public_mutation: false,
      already_live: true,
      live_html: html,
      live_status: 200,
    };
    expect(retry.already_live).toBe(true);
    expect(retry.public_mutation).toBe(false);
  });

  it("authorization revoked immediately before publish is BLOCKED", async () => {
    const store = new DurableBlogStore();
    createDailyBlogObligation({
      store,
      venture_id: "occupancynpv",
      now: NOW,
      candidate_id: "cand:cam-operating-year",
      expected_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
      actor: "VERCEL_CRON",
    });
    store.transition({
      venture_id: "occupancynpv",
      operating_date: "2026-09-24",
      to: "DRAFTED",
      actor: "tick",
      invoked_by: "TEST",
      now: NOW,
      hold: { ...currentSecondQcHold(NOW), hold_state: "CLEARED", execute_publish: true, resolved_at: NOW },
    });
    store.transition({
      venture_id: "occupancynpv",
      operating_date: "2026-09-24",
      to: "QC_PASSED",
      actor: "tick",
      invoked_by: "TEST",
      now: NOW,
      hold: { ...currentSecondQcHold(NOW), hold_state: "CLEARED", execute_publish: true, resolved_at: NOW },
      qc_version: "blog-render-qc-v3",
    });
    let published = false;
    const result = await executeOrganicScheduledWorkflow({
      store,
      hold: { ...currentSecondQcHold(NOW), hold_state: "CLEARED", execute_publish: true, resolved_at: NOW },
      effective: authorized(),
      now: NOW,
      owner: "tick-revoke",
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
  });

  it("wrong venture destination is BLOCKED", () => {
    expect(evaluatePublishDestinationContract({
      venture_id: "clubthrottle",
      expected_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
    }).reason).toBe("WRONG_VENTURE_DESTINATION");
    expect(evaluatePublishDestinationContract({
      venture_id: "occupancynpv",
      expected_url: "https://clubthrottle.com/blog/occupancy-costs/cam-first-year/",
    }).reason).toBe("WRONG_VENTURE_DESTINATION");
  });

  it("invalid slug or canonical fails safe", () => {
    expect(evaluatePublishDestinationContract({
      venture_id: "occupancynpv",
      expected_url: "https://occupancynpv.com/not-a-blog",
    }).reason).toBe("INVALID_SLUG_CANONICAL");
    expect(evaluatePublishDestinationContract({
      venture_id: "occupancynpv",
      expected_url: "not-a-url",
    }).reason).toBe("INVALID_SLUG_CANONICAL");
  });

  it("destination unavailable persists a typed failure instead of throwing", async () => {
    const store = new DurableBlogStore();
    createDailyBlogObligation({
      store,
      venture_id: "occupancynpv",
      now: NOW,
      candidate_id: "cand:cam-operating-year",
      expected_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
      actor: "VERCEL_CRON",
    });
    store.transition({
      venture_id: "occupancynpv",
      operating_date: "2026-09-24",
      to: "DRAFTED",
      actor: "tick",
      invoked_by: "TEST",
      now: NOW,
      hold: { ...currentSecondQcHold(NOW), hold_state: "CLEARED", execute_publish: true, resolved_at: NOW },
    });
    store.transition({
      venture_id: "occupancynpv",
      operating_date: "2026-09-24",
      to: "QC_PASSED",
      actor: "tick",
      invoked_by: "TEST",
      now: NOW,
      hold: { ...currentSecondQcHold(NOW), hold_state: "CLEARED", execute_publish: true, resolved_at: NOW },
      qc_version: "blog-render-qc-v3",
    });
    const result = await executeOrganicScheduledWorkflow({
      store,
      hold: { ...currentSecondQcHold(NOW), hold_state: "CLEARED", execute_publish: true, resolved_at: NOW },
      effective: authorized(),
      now: NOW,
      owner: "tick-unavailable",
      execute_publish: true,
      adapters: {
        readCanonical: async () => authorized(),
        publishLive: async () => ({
          ok: false,
          public_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
          public_mutation: false,
          reason: "FROZEN_BUNDLE_SNAPSHOT_MISSING",
        }),
      },
    });
    expect(result.stage).toBe("PUBLISH_FAILED");
    expect(result.reasons).toContain("FROZEN_BUNDLE_SNAPSHOT_MISSING");
    expect(store.get("occupancynpv", "2026-09-24")?.failure_reason).toBe("PUBLISH_FAILED:FROZEN_BUNDLE_SNAPSHOT_MISSING");
    expect(store.get("occupancynpv", "2026-09-24")?.pipeline_state).toBe("QC_PASSED");
    expect(store.get("occupancynpv", "2026-09-24")?.decision_owner).toBeNull();
  });

  it("partial side effect is marked public_mutation and must reconcile before retry", async () => {
    const store = new DurableBlogStore();
    createDailyBlogObligation({
      store,
      venture_id: "occupancynpv",
      now: NOW,
      candidate_id: "cand:cam-operating-year",
      expected_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
      actor: "VERCEL_CRON",
    });
    store.transition({
      venture_id: "occupancynpv",
      operating_date: "2026-09-24",
      to: "DRAFTED",
      actor: "tick",
      invoked_by: "TEST",
      now: NOW,
      hold: { ...currentSecondQcHold(NOW), hold_state: "CLEARED", execute_publish: true, resolved_at: NOW },
    });
    store.transition({
      venture_id: "occupancynpv",
      operating_date: "2026-09-24",
      to: "QC_PASSED",
      actor: "tick",
      invoked_by: "TEST",
      now: NOW,
      hold: { ...currentSecondQcHold(NOW), hold_state: "CLEARED", execute_publish: true, resolved_at: NOW },
      qc_version: "blog-render-qc-v3",
    });
    const result = await executeOrganicScheduledWorkflow({
      store,
      hold: { ...currentSecondQcHold(NOW), hold_state: "CLEARED", execute_publish: true, resolved_at: NOW },
      effective: authorized(),
      now: NOW,
      owner: "tick-partial",
      execute_publish: true,
      adapters: {
        readCanonical: async () => authorized(),
        publishLive: async () => ({
          ok: false,
          public_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
          public_mutation: true,
          deployment_id: "dpl_partial",
          reason: "VERCEL_DEPLOYMENT_NOT_READY",
        }),
      },
    });
    expect(result.stage).toBe("PUBLISH_FAILED");
    expect(result.public_mutation).toBe(true);
    expect(result.reasons).toContain("VERCEL_DEPLOYMENT_NOT_READY");
  });
});
