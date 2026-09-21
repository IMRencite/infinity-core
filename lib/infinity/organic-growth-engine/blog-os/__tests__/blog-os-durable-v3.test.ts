import { describe, expect, it } from "vitest";
import { CURRENT_BLOG_QC_VERSION, CURRENT_HOLD_ID, BLOG_BACKLOG_POLICY } from "../durable/types";
import {
  applyFounderHoldDecision,
  currentSecondQcHold,
  evaluateHoldActionabilityCheck,
  persistDurableHold,
  publicationProhibited,
  resetDurableHolds,
  watchHold,
} from "../durable/hold";
import {
  DurableBlogStore,
  evaluateDailyObligationFreshInstanceCheck,
  loadStoreFromSnapshot,
  requiresReQc,
  snapshotStore,
} from "../durable/store";
import { backfillKnownDay, createDailyBlogObligation, dueAtEndOfOperatingDay, operatingDateInTimezone } from "../durable/creator";
import { evaluateEscapedDefectRegressionCheck, evaluateSharedComponentSweep, KNOWN_GOOD_SECOND_QC_CTA, SHARED_COMPONENT } from "../durable/regression";
import { evaluateRenderedPageVerificationCheck } from "../durable/verifier";
import { evaluateIndependentCatalogCheck, oldestUnmetRequired } from "../durable/catalog-check";
import { evaluateReleaseIsolationCheck, inspectReleaseIsolationSource } from "../durable/isolation";
import { catalogAfterContainment, containPublishedArticle, evaluateTakedownPath, sitemapAfterContainment } from "../durable/containment";
import { reviewCamCandidate, selectPublicationOrder } from "../durable/backlog";
import { accountOccupancyNpvDays } from "../durable/accounting";
import { occupancynpvPublishedBlogPosts } from "../../continuous/occupancynpv-blog-catalog";

const NOW = "2026-09-21T04:53:00.000Z";

describe("blog-os durable v3", () => {
  it("HoldActionabilityCheck has owner, due, review, frozen exit, evidence path", () => {
    resetDurableHolds();
    const hold = persistDurableHold(currentSecondQcHold(NOW));
    expect(evaluateHoldActionabilityCheck(hold).result).toBe("FAIL");
    expect(evaluateHoldActionabilityCheck(hold).reasons).toContain("LOCALHOST_NOT_EXTERNAL");
    expect(hold.exit_condition_version).toBe("second-qc-escape-v2");
    expect(hold.engineering_owner).toBe("OrganicRelease");
    expect(hold.founder_decision_owner).toBe("FOUNDER");
    expect(hold.exit_condition_hash).toHaveLength(64);
    expect(publicationProhibited(hold)).toBe(true);
    expect(applyFounderHoldDecision({
      hold,
      actor: "CURSOR_REPAIR",
      decision: "CLEAR",
      evidence_complete: true,
      now: NOW,
    }).accepted).toBe(false);
    expect(applyFounderHoldDecision({
      hold,
      actor: "FOUNDER",
      decision: "CLEAR",
      evidence_complete: false,
      now: NOW,
    }).reason).toBe("EXIT_CONDITION_UNSATISFIED");
    const escalated = watchHold(hold, "2026-09-22T05:00:00.000Z");
    expect(escalated.escalation_count).toBe(1);
    expect(escalated.resolved_at).toBeNull();
  });

  it("EscapedDefectRegressionCheck rejects known-bad CTA and accepts owned colors", () => {
    expect(evaluateEscapedDefectRegressionCheck().result).toBe("PASS");
    expect(evaluateSharedComponentSweep([
      { name: "lease-comparison", elements: [KNOWN_GOOD_SECOND_QC_CTA] },
      { name: "blog-article", elements: [KNOWN_GOOD_SECOND_QC_CTA] },
    ]).result).toBe("PASS");
    expect(SHARED_COMPONENT).toContain("a.vg-cta");
  });

  it("daily creator is unique, hold blocks publish, and a fresh instance reloads", () => {
    const first = new DurableBlogStore();
    const hold = persistDurableHold(currentSecondQcHold(NOW));
    backfillKnownDay({
      store: first,
      operating_date: "2026-09-20",
      now: NOW,
      candidate_id: "cand:cam-operating-year",
      expected_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
      created_at: "2026-09-20T07:00:00.000Z",
    });
    const today = createDailyBlogObligation({ store: first, venture_id: "occupancynpv", now: NOW, hold_id: CURRENT_HOLD_ID });
    const again = createDailyBlogObligation({ store: first, venture_id: "occupancynpv", now: NOW, hold_id: CURRENT_HOLD_ID });
    expect(today.result).toBe("INSERTED");
    expect(again.result).toBe("CONFLICT_NOOP");
    expect(first.list()).toHaveLength(2);
    expect(first.transition({
      venture_id: "occupancynpv",
      operating_date: "2026-09-21",
      to: "DRAFTED",
      actor: "ORGANIC_WORKER",
      invoked_by: "TEST",
      now: NOW,
      hold,
    }).ok).toBe(true);
    expect(first.transition({
      venture_id: "occupancynpv",
      operating_date: "2026-09-21",
      to: "QC_PASSED",
      actor: "QC_WORKER",
      invoked_by: "TEST",
      now: NOW,
      qc_version: CURRENT_BLOG_QC_VERSION,
      hold,
    }).ok).toBe(true);
    expect(first.transition({
      venture_id: "occupancynpv",
      operating_date: "2026-09-21",
      to: "PUBLISHED",
      actor: "PUBLISHER",
      invoked_by: "TEST",
      now: NOW,
      hold,
    }).reason).toBe("HOLD_BLOCKS_PUBLISH");
    expect(requiresReQc({ qc_version: "blog-render-qc-v2" })).toBe(true);
    const second = loadStoreFromSnapshot(snapshotStore(first));
    createDailyBlogObligation({ store: second, venture_id: "occupancynpv", now: NOW });
    expect(evaluateDailyObligationFreshInstanceCheck({
      first,
      second,
      dates: ["2026-09-20", "2026-09-21"],
    }).result).toBe("PASS");
    expect(second.list()).toHaveLength(2);
    expect(operatingDateInTimezone(NOW)).toBe("2026-09-21");
    expect(dueAtEndOfOperatingDay("2026-09-21")).toContain("2026-09-21T23:59:59");
  });

  it("RenderedPageVerificationCheck reuses one rule set and does not overclaim visuals", () => {
    const html = `<html><head><title>What numbers do you need to compare two commercial leases?</title><link rel="canonical" href="https://occupancynpv.com/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/"></head><body><h1>What numbers do you need to compare two commercial leases?</h1><p>Starting rent, term, CAM, and free rent belong on the same timeline.</p></body></html>`;
    expect(evaluateRenderedPageVerificationCheck({
      mode: "CANARY",
      url: "https://occupancynpv.com/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
      status: 200,
      html,
      expected_h1: "compare two commercial leases",
      expected_marker: "Starting rent",
      expected_canonical: "https://occupancynpv.com/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
      links: [{ href: "/pricing", ok: true }],
      background_kind: "SOLID",
      contrast_proven: true,
    }).result).toBe("PASS");
    expect(evaluateRenderedPageVerificationCheck({
      mode: "PRE_PUBLISH",
      url: "https://example.test/preview",
      status: 200,
      html: `${html}<p>TODO lorem ipsum</p>`,
      expected_h1: "compare two commercial leases",
    }).outcome).toBe("CONTENT_DEFECT");
    expect(evaluateRenderedPageVerificationCheck({
      mode: "LIVE_POST_PUBLISH",
      url: "https://occupancynpv.com/blog/x/",
      status: 200,
      html,
      expected_h1: "compare two commercial leases",
      background_kind: "IMAGE",
      contrast_proven: false,
    }).result).toBe("HUMAN_REVIEW_REQUIRED");
  });

  it("IndependentCatalogCheck stays MANUAL_RUN_ONLY until scheduled", () => {
    const store = new DurableBlogStore();
    backfillKnownDay({
      store,
      operating_date: "2026-09-20",
      now: NOW,
      candidate_id: "cand:cam-operating-year",
      expected_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
      created_at: "2026-09-20T07:00:00.000Z",
    });
    const check = evaluateIndependentCatalogCheck({
      scheduled: false,
      last_scheduled_run: null,
      live_verified: [],
      oldest_unmet: oldestUnmetRequired(store.list()),
    });
    expect(check.reasons).toContain("MANUAL_RUN_ONLY");
    expect(oldestUnmetRequired(store.list())?.operating_date).toBe("2026-09-20");
  });

  it("ReleaseIsolationCheck and takedown path stay isolated from Communication", () => {
    const source = inspectReleaseIsolationSource();
    expect(source.blog_imports_communication_runtime).toBe(false);
    expect(source.communication_imports_blog_os_store).toBe(false);
    expect(source.isolation_stubbed).toBe(true);
    expect(evaluateReleaseIsolationCheck({
      blog_os_typecheck: "PASS",
      blog_os_build: "PASS",
      communication_isolated: "PASS",
      communication_isolated_build: "PASS",
      shared_contract: "PASS",
      ...source,
    }).result).toBe("PASS");
    expect(evaluateReleaseIsolationCheck({
      blog_os_typecheck: "PASS",
      communication_isolated: "PASS",
      shared_contract: "PASS",
      ...source,
    }).result).toBe("NOT_PROVEN");
    const contained = containPublishedArticle({ path: "/blog/occupancy-costs/cam-first-year/" });
    const catalog = catalogAfterContainment([
      { path: "/blog/valuation/how-interest-rates-affect-commercial-property-values/" },
      { path: "/blog/occupancy-costs/cam-first-year/" },
    ], contained);
    const sitemap = sitemapAfterContainment([
      "https://occupancynpv.com/blog/valuation/how-interest-rates-affect-commercial-property-values/",
      "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
    ], contained);
    expect(evaluateTakedownPath({
      before_catalog: 2,
      after_catalog: catalog.length,
      before_sitemap: 2,
      after_sitemap: sitemap.length,
    }).result).toBe("PASS");
  });

  it("accounts Sep 18-21 and keeps CAM distinct for later recovery", () => {
    const days = accountOccupancyNpvDays({
      now: NOW,
      public: {
        blog_index_ok: true,
        sitemap: "https://occupancynpv.com/blog/valuation/how-interest-rates-affect-commercial-property-values/",
        cam_status: 404,
        interest_status: 200,
        index_has_sep18: false,
        index_has_sep19: false,
        index_has_sep17: true,
      },
    });
    expect(days.find((row) => row.operating_date === "2026-09-18")?.status).toBe("MISSED");
    expect(days.find((row) => row.operating_date === "2026-09-19")?.status).toBe("MISSED");
    expect(days.find((row) => row.operating_date === "2026-09-20")?.status).toBe("MISSED");
    expect(days.find((row) => row.operating_date === "2026-09-21")?.status).toBe("DUE");
    expect(reviewCamCandidate({
      existing_topics: occupancynpvPublishedBlogPosts().map((row) => row.title),
      candidate_topic: "CAM in the first operating year",
    }).decision).toBe("RECOVER_AND_PUBLISH");
    const store = new DurableBlogStore();
    backfillKnownDay({
      store,
      operating_date: "2026-09-20",
      now: NOW,
      candidate_id: "cand:cam-operating-year",
      expected_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
      created_at: "2026-09-20T07:00:00.000Z",
    });
    createDailyBlogObligation({ store, venture_id: "occupancynpv", now: NOW });
    const order = selectPublicationOrder({ now_date: "2026-09-21", obligations: store.list() });
    expect(order.current?.operating_date).toBe("2026-09-21");
    expect(order.catchup?.operating_date).toBe("2026-09-20");
    expect(BLOG_BACKLOG_POLICY.MAX_CATCHUP_PUBLICATIONS_PER_DAY).toBe(1);
  });
});
