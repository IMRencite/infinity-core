import { describe, expect, it } from "vitest";
import { occupancynpvLeaseInputsDraft, occupancynpvLeaseInputsPageSource } from "../../continuous/occupancynpv-lease-inputs-page";
import { composeOccupancyNpvOrganicLiveFiles } from "../../continuous/occupancynpv-publisher";
import { OCCUPANCYNPV_BLOG_EDITORIAL_CSS } from "../../continuous/blog-ux";
import {
  contrastRatio,
  evaluateAboveFoldRedundancyGate,
  evaluateContentRedundancyGate,
  evaluateHumanResourceDepthGate,
  evaluateOrganicRenderedQualityGate,
  evaluateProductClaimTruthGate,
  evaluateProductMaturityTruthGate,
  evaluatePublicContentInternalLanguageGate,
  evaluateRepairedProductionContentCanaryGate,
  evaluateTextContrastGate,
  evaluateThinContentRiskGate,
  evaluateRenderedTextVisibilityGate,
  scanPublicMaturityLeaks,
} from "../qc-escape-gates";
import {
  executeOrganicGrowthSchedulerTick,
  pauseOrganicPublishingForQcRepair,
  resumeOrganicPublishingAfterRepairedCanary,
} from "../scheduler";
import {
  FIRST_AUTONOMOUS_CONTENT_CANARY_QC_ESCAPE,
  INITIAL_HUMAN_VALUE_GATE,
  INITIAL_ORGANIC_RENDERED_QUALITY_GATE,
  INITIAL_PRODUCTION_CONTENT_CANARY_GATE,
} from "@/lib/infinity/qc-escape/escaped-defect-registry";

const source = occupancynpvLeaseInputsPageSource();
const draft = occupancynpvLeaseInputsDraft();

describe("autonomous content QC escape v2", () => {
  it("preserves the historical PASS as an escaped defect", () => {
    expect(INITIAL_HUMAN_VALUE_GATE).toEqual({ result: "PASS", escaped: "ESCAPED_DEFECT" });
    expect(INITIAL_ORGANIC_RENDERED_QUALITY_GATE).toEqual({ result: "PASS", escaped: "ESCAPED_DEFECT" });
    expect(INITIAL_PRODUCTION_CONTENT_CANARY_GATE).toEqual({ result: "PASS", escaped: "ESCAPED_DEFECT" });
    expect(FIRST_AUTONOMOUS_CONTENT_CANARY_QC_ESCAPE.gates_that_passed).toContain("OrganicRenderedQualityGate");
  });

  it("fails white-on-white, inherited white-on-light, and low-opacity text", () => {
    expect(contrastRatio("#ffffff", "#ffffff")).toBeLessThan(4.5);
    expect(evaluateTextContrastGate([{ name: "white-pill", fg: "#f8fafc", bg: "#f7f4ee" }]).result).toBe("FAIL");
    expect(evaluateTextContrastGate([{ name: "eyebrow", fg: "#f7f4ee", bg: "#10232c" }]).result).toBe("PASS");
    expect(evaluateRenderedTextVisibilityGate({
      light_on_light: true,
      browser_evidence: true,
    }).result).toBe("FAIL");
  });

  it("rejects a thin checklist and accepts the rebuilt resource", () => {
    expect(evaluateHumanResourceDepthGate({
      asset_type: "CHECKLIST",
      direct_answer: true,
      primary_inputs_covered: 3,
      checklist: false,
      worked_example: false,
      mistakes: false,
      next_step: true,
      user_can_gather: false,
      hero_dominates: true,
    }).result).toBe("FAIL");
    expect(evaluateThinContentRiskGate({
      unique_sections: 4,
      repeated_ratio: 0.5,
      missing_obvious_subtopics: ["CAM", "move costs"],
    }).result).toBe("FAIL");
    expect(evaluateHumanResourceDepthGate({
      asset_type: "CHECKLIST",
      direct_answer: true,
      primary_inputs_covered: 8,
      checklist: true,
      worked_example: true,
      mistakes: true,
      next_step: true,
      user_can_gather: true,
    }).result).toBe("FAIL");
    expect(evaluateThinContentRiskGate({
      unique_sections: draft.headings.length,
      repeated_ratio: 0.05,
      missing_obvious_subtopics: [],
      asset_type: "CHECKLIST",
    }).result).toBe("FAIL");
  });

  it("rejects duplicated hero plus intro and internal or pilot leaks", () => {
    expect(evaluateAboveFoldRedundancyGate({
      hero_answer: "Collect the same cash figures from each lease.",
      intro: "Collect the same cash figures from each lease.",
    }).result).toBe("FAIL");
    expect(evaluateContentRedundancyGate([
      "Collect the same cash figures from each lease before you compare rent.",
      "Collect the same cash figures from each lease before you compare rent.",
    ]).result).toBe("FAIL");
    expect(evaluatePublicContentInternalLanguageGate("It is an input checklist, not a second process explainer.").result).toBe("FAIL");
    expect(evaluatePublicContentInternalLanguageGate("input checklist only").result).toBe("FAIL");
    expect(evaluateProductMaturityTruthGate({ copy: "OccupancyNPV is a validation / pilot concept." }).result).toBe("FAIL");
    expect(evaluateProductMaturityTruthGate({ copy: "This is an early validation concept." }).result).toBe("FAIL");
    expect(evaluateProductMaturityTruthGate({ copy: "OccupancyNPV is live. Start the 3-day free trial." }).result).toBe("PASS");
    expect(evaluateProductClaimTruthGate("OccupancyNPV is live. The 3-day free trial has no credit card and no automatic billing. Start at /pricing.").result).toBe("PASS");
    expect(source).not.toMatch(/pilot concept|validation \/ pilot|input checklist only|second process explainer/i);
    expect(scanPublicMaturityLeaks(source)).toEqual([]);
  });

  it("requires real browser evidence and pauses publish until the repaired canary passes", () => {
    expect(evaluateOrganicRenderedQualityGate({
      evidence: { screenshot: false, computed_contrast: false },
    }).result).toBe("FAIL");
    expect(evaluateOrganicRenderedQualityGate({
      desktop: { gate: "desktop", result: "PASS", reasons: [] },
      tablet: { gate: "tablet", result: "PASS", reasons: [] },
      mobile: { gate: "mobile", result: "PASS", reasons: [] },
      contrast: { gate: "TextContrastGate", result: "PASS", reasons: [] },
      visibility: { gate: "RenderedTextVisibilityGate", result: "PASS", reasons: [] },
      table_responsive: { gate: "table", result: "PASS", reasons: [] },
      evidence: {
        desktop_viewport: 1440,
        tablet_viewport: 768,
        mobile_viewport: 390,
        screenshot: true,
        computed_contrast: true,
        url: "https://occupancynpv.com/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
      },
    }).result).toBe("FAIL");
    pauseOrganicPublishingForQcRepair();
    const paused = executeOrganicGrowthSchedulerTick({
      now: "2026-09-20T08:00:00.000Z",
      trigger_source: "VERCEL_CRON",
      execute_publish: true,
    });
    expect(paused.execute_publish).toBe(false);
    expect(paused.state.publishing_hold).toBe("PAUSED_FOR_QC_REPAIR");
    resumeOrganicPublishingAfterRepairedCanary();
    const resumed = executeOrganicGrowthSchedulerTick({
      now: "2026-09-20T08:01:00.000Z",
      trigger_source: "VERCEL_CRON",
      execute_publish: true,
    });
    expect(resumed.execute_publish).toBe(true);
    expect(evaluateRepairedProductionContentCanaryGate({
      live_http: 200,
      required_content_gates: [{ gate: "HumanResourceDepthGate", result: "PASS", reasons: [] }],
      rendered: { gate: "OrganicRenderedQualityGate", result: "PASS", reasons: [] },
    }).result).toBe("FAIL");
  });

  it("injects shared contrast CSS and keeps the existing URL", () => {
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).toContain(".pv-hero-copy > p:not(.pv-eyebrow)");
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).toContain("background:#10232c");
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).toContain("color:#f7f4ee");
    const composed = composeOccupancyNpvOrganicLiveFiles();
    const page = composed.files.find((file) => file.path.replace(/\\/g, "/").includes("what-numbers-do-you-need-to-compare-two-commercial-leases"));
    expect(page?.content).toContain("Quick lease input checklist");
    expect(page?.content).toContain("/pricing");
    expect(page?.content).not.toContain("pilot concept");
    const chrome = composed.files.find((file) => file.path.replace(/\\/g, "/").endsWith("components/site-chrome.tsx"));
    expect(chrome?.content).toContain("pv-answer-label");
  });
});
