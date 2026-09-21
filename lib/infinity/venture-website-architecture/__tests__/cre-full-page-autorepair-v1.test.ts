import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reconstructCreSearchDepthSuccessor } from "../cre-search-depth-successor";
import {
  AUTHORITY_PAGE_RENDER_VALIDATE_REPAIR_FLOW,
  FULL_PUBLIC_ROUTE_VALIDATION_GATE,
  PAGE_ADMISSION_CANONICAL_PRINCIPLE,
  PAGE_REPAIR_ITERATION_CEILING,
  RENDERED_LINK_CONTRAST_GATE,
  REPEATED_FAILURE_PROMOTION_GATE,
} from "../constants";
import { HARD_PUBLISHABILITY_GATES } from "../public-authority-standard/constants";
import { canAdmitPage, initialPageState, repairCeilingExceeded, transitionPageState } from "../public-authority-standard/page-build-state";
import { evaluateRenderedLinkContrastGate, FOUNDER_LINK_GOOD_FIXTURE, FOUNDER_LINK_HOVER_SAME_AS_BACKGROUND_FIXTURE, FOUNDER_LINK_NEAR_INVISIBLE_FIXTURE, FOUNDER_LINK_SAME_COLOR_FIXTURE, FOUNDER_NESTED_PALE_LINK_FIXTURE, FOUNDER_TRUSTED_SOURCES_MISSING_LINK_SAMPLE_FIXTURE } from "../public-authority-standard/rendered-link-contrast-gate";
import { evaluateFullPublicRouteValidationGate } from "../public-authority-standard/full-public-route-validation-gate";
import { evaluateRepeatedFailurePromotionGate } from "../public-authority-standard/repeated-failure-promotion-gate";
import { evaluateHumanFirstPublicLanguageGate, HUMAN_FIRST_BAD_FIXTURES } from "../human-first-public-language-gate";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";

function observerState() {
  return JSON.parse(readFileSync(".infinity/communication/inbound-observer-state.json", "utf8")) as {
    status: string;
    trackedConversationIds: string[];
    historyCheckpointId: string;
  };
}

describe("Per-page render/validate/repair + full-site contrast enforcement", () => {
  it("locks the page state machine, admission rule, and repair ceiling", () => {
    let state = initialPageState();
    expect(state).toBe("GENERATED");
    state = transitionPageState(state, "render");
    state = transitionPageState(state, "validate");
    state = transitionPageState(state, "fail");
    state = transitionPageState(state, "repair");
    state = transitionPageState(state, "retry");
    state = transitionPageState(state, "validate");
    state = transitionPageState(state, "pass");
    state = transitionPageState(state, "pass");
    expect(state).toBe("READY_FOR_ARTIFACT");
    expect(canAdmitPage("VALIDATED")).toBe(false);
    expect(canAdmitPage("READY_FOR_ARTIFACT")).toBe(true);
    expect(canAdmitPage("FAILED_BOUNDED_REPAIR")).toBe(false);
    expect(repairCeilingExceeded(2)).toBe(false);
    expect(repairCeilingExceeded(3)).toBe(true);
    expect(PAGE_REPAIR_ITERATION_CEILING).toBe(3);
    expect(PAGE_ADMISSION_CANONICAL_PRINCIPLE).toMatch(/before it may enter a publishable artifact/i);
    expect(AUTHORITY_PAGE_RENDER_VALIDATE_REPAIR_FLOW[0]).toBe("PAGE_COMPOSE");
    expect(HARD_PUBLISHABILITY_GATES).toContain(RENDERED_LINK_CONTRAST_GATE);
    expect(HARD_PUBLISHABILITY_GATES).toContain(FULL_PUBLIC_ROUTE_VALIDATION_GATE);
    expect(HARD_PUBLISHABILITY_GATES).toContain(REPEATED_FAILURE_PROMOTION_GATE);
  });

  it("fails the founder link-contrast fixtures and passes the good card", () => {
    expect(evaluateRenderedLinkContrastGate(FOUNDER_LINK_SAME_COLOR_FIXTURE).overall).toBe("FAIL");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_LINK_NEAR_INVISIBLE_FIXTURE).overall).toBe("FAIL");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_LINK_HOVER_SAME_AS_BACKGROUND_FIXTURE).hoverFocusFailures).toBeGreaterThan(0);
    expect(evaluateRenderedLinkContrastGate(FOUNDER_NESTED_PALE_LINK_FIXTURE).overall).toBe("FAIL");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_TRUSTED_SOURCES_MISSING_LINK_SAMPLE_FIXTURE).missingSamples).toBeGreaterThan(0);
    expect(evaluateRenderedLinkContrastGate(FOUNDER_LINK_GOOD_FIXTURE).overall).toBe("PASS");
    for (const fixture of HUMAN_FIRST_BAD_FIXTURES) {
      expect(evaluateHumanFirstPublicLanguageGate(fixture).overall).toBe("FAIL");
    }
  });

  it("blocks artifact admission when a route has no evidence", () => {
    const gate = evaluateFullPublicRouteValidationGate({
      expectedRoutes: ["/a", "/b"],
      records: [
        {
          route: "/a",
          state: "READY_FOR_ARTIFACT",
          renderEvidence: true,
          viewportEvidence: ["1280"],
          gateResults: { RenderedTextContrastGate: "PASS" },
          failures: [],
          families: [],
          repairHistory: [],
          repairIterations: 0,
          missingEvidence: 0,
          finalState: "READY_FOR_ARTIFACT",
        },
      ],
    });
    expect(gate.overall).toBe("FAIL");
    expect(gate.routesWithoutEvidence).toContain("/b");
  });

  it("promotes a shared repair when the same family hits two pages", () => {
    const promotion = evaluateRepeatedFailurePromotionGate([
      {
        route: "/one",
        state: "REPAIR_REQUIRED",
        renderEvidence: true,
        viewportEvidence: ["1280"],
        gateResults: { RenderedTextContrastGate: "FAIL" },
        failures: ["contrast"],
        families: ["CONTRAST"],
        repairHistory: [],
        repairIterations: 1,
        missingEvidence: 0,
        finalState: "REPAIR_REQUIRED",
      },
      {
        route: "/two",
        state: "REPAIR_REQUIRED",
        renderEvidence: true,
        viewportEvidence: ["1280"],
        gateResults: { RenderedTextContrastGate: "FAIL" },
        failures: ["contrast"],
        families: ["CONTRAST"],
        repairHistory: [],
        repairIterations: 1,
        missingEvidence: 0,
        finalState: "REPAIR_REQUIRED",
      },
    ]);
    expect(promotion.sharedFixesRequired).toBeGreaterThan(0);
    expect(promotion.promotions[0]?.promoteTo).toMatch(/shared|global/);
  });

  it("admits all public routes only after the per-page loop passes", async () => {
    const successor = await reconstructCreSearchDepthSuccessor();
    const manifest = searchDepthRouteManifest();
    expect(successor.routes).toBe(93);
    expect(manifest.intendedCount).toBe(93);
    expect(successor.pageLoop.rendered).toBe(93);
    expect(successor.pageLoop.validated).toBe(93);
    expect(successor.pageLoop.finalFailed).toBe(0);
    expect(successor.pageLoop.missingEvidence).toBe(0);
    expect(successor.pageLoop.fullRoute.overall).toBe("PASS");
    expect(successor.pageLoop.overall).toBe("PASS");
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(successor.demand.thinPages).toBe(0);
    expect(successor.cannibal.cannibalizingPages).toBe(0);
    expect(successor.deployed).toBe(false);
  }, 180000);

  it("preserves experiment clock, observer, and no deployment", () => {
    const clock = inspectExperimentClock();
    const evidence = inspectRealMarketEvidence();
    const observer = observerState();
    expect(LOCKED_CRE_EXPERIMENT_ID).toBe("exp_e72beb7b6d35e7b20acf");
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(clock.restarted).toBe(false);
    expect(observer.status).toBe("RUNNING");
    expect(observer.trackedConversationIds).toHaveLength(2);
  });
});
