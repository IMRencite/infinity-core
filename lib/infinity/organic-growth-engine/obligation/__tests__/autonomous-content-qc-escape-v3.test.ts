import { describe, expect, it } from "vitest";
import { occupancynpvLeaseInputsDraft, occupancynpvLeaseInputsPageSource } from "../../continuous/occupancynpv-lease-inputs-page";
import { composeOccupancyNpvOrganicLiveFiles } from "../../continuous/occupancynpv-publisher";
import { OCCUPANCYNPV_BLOG_EDITORIAL_CSS } from "../../continuous/blog-ux";
import { semanticPageTitle } from "@/lib/infinity/venture-website-architecture/page-sources";
import {
  evaluateHumanResourceDepthGate,
  evaluateOrganicRenderedQualityGate,
  evaluateProductMaturityTruthGate,
  evaluateRepairedProductionContentCanaryGate,
  evaluateTextContrastGate,
  evaluateThinContentRiskGate,
  contrastRatio,
} from "../qc-escape-gates";
import {
  SECOND_ESCAPED_V2_GATES,
  buildIntentCoverageGraph,
  classifyIntentCoverage,
  evaluateAdversarialRenderedQC,
  evaluateButtonThemeOwnershipGate,
  evaluateContentDensityVisualGate,
  evaluateElementLevelContrastGate,
  evaluateGateEvidenceIntegrityGate,
  evaluateGateEvidenceProvenance,
  evaluateIntentCoverageDepthGate,
  evaluateMetadataBrandDuplicationGate,
  evaluateRenderedDeploymentIdentityGate,
  evaluateScreenshotCaptureGate,
  evaluateUniqueInformationDensityGate,
  evaluateVisualScreenshotInspectionGate,
  leaseInputsIntentCoverageSpecs,
  resolveEffectiveRenderedBackground,
  scoreUniqueInformationDensity,
  type RenderedTextElement,
} from "../qc-escape-v3-gates";
import {
  executeOrganicGrowthSchedulerTick,
  pauseOrganicPublishingForSecondQcEscape,
  resumeOrganicPublishingAfterV3RepairedCanary,
} from "../scheduler";
import {
  SECOND_AUTONOMOUS_CONTENT_QC_ESCAPE,
  V2_REPAIRED_PRODUCTION_CONTENT_CANARY_GATE,
  V2_TEXT_CONTRAST_GATE,
} from "@/lib/infinity/qc-escape/escaped-defect-registry";

const source = occupancynpvLeaseInputsPageSource();
const draft = occupancynpvLeaseInputsDraft();
const body = `${source} ${draft.body}`;
const coverage = buildIntentCoverageGraph(body);
const density = evaluateUniqueInformationDensityGate(scoreUniqueInformationDensity(body));

function textEl(partial: Partial<RenderedTextElement> & { selector: string; contrast_ratio: number | null }): RenderedTextElement {
  return {
    text_sample: "sample",
    tag: "P",
    font_size: 16,
    font_weight: 400,
    computed_color: "#102033",
    computed_background: "rgba(0,0,0,0)",
    effective_background: "#ffffff",
    background_kind: "SOLID",
    opacity: 1,
    parent_opacity: 1,
    visibility: "visible",
    display: "block",
    bounding_box: { x: 0, y: 0, width: 120, height: 24 },
    z_index: "1",
    overflow: "visible",
    required: true,
    ...partial,
  };
}

describe("autonomous content QC escape v3", () => {
  it("records the second escape without overwriting V2 history", () => {
    expect(V2_TEXT_CONTRAST_GATE).toEqual({ result: "PASS", escaped: "ESCAPED_DEFECT" });
    expect(V2_REPAIRED_PRODUCTION_CONTENT_CANARY_GATE).toEqual({ result: "PASS", escaped: "ESCAPED_DEFECT" });
    expect(SECOND_ESCAPED_V2_GATES.TextContrastGate.escaped).toBe("ESCAPED_DEFECT");
    expect(SECOND_AUTONOMOUS_CONTENT_QC_ESCAPE.defect_class).toContain("SECOND_LOW_CONTRAST_ESCAPE_AFTER_QC_HARDENING");
    expect(SECOND_AUTONOMOUS_CONTENT_QC_ESCAPE.defect_class).toContain("SECOND_THIN_RESOURCE_ESCAPE_AFTER_DEPTH_GATE");
  });

  it("1 fails dark text on a medium-blue button", () => {
    expect(contrastRatio("#122033", "#1d4e78")).toBeLessThan(4.5);
    expect(evaluateTextContrastGate([{ name: "cta", fg: "#122033", bg: "#1d4e78" }]).result).toBe("FAIL");
  });

  it("2 fails inherited article text color inside a button", () => {
    const inherited = textEl({ selector: "a.vg-cta", computed_color: "#122033", effective_background: "#1d4e78", contrast_ratio: contrastRatio("#122033", "#1d4e78") });
    expect(evaluateElementLevelContrastGate([inherited]).result).toBe("FAIL");
  });

  it("3 fails white-on-white badges", () => {
    expect(evaluateElementLevelContrastGate([textEl({ selector: ".vg-badge", contrast_ratio: contrastRatio("#ffffff", "#ffffff") })]).result).toBe("FAIL");
  });

  it("4 walks through a transparent parent to a real backing", () => {
    const bg = resolveEffectiveRenderedBackground([
      { color: "rgba(0, 0, 0, 0)", selector: "span" },
      { color: "#102033", selector: ".pv-cta-panel" },
    ]);
    expect(bg.kind).toBe("SOLID");
    expect(bg.color).toBe("#102033");
  });

  it("5 refuses deterministic contrast on image backgrounds", () => {
    const bg = resolveEffectiveRenderedBackground([{ color: "rgba(0,0,0,0)", image: "/hero.webp", selector: "header" }]);
    expect(bg.deterministic).toBe(false);
    expect(evaluateElementLevelContrastGate([textEl({ selector: "h1", background_kind: "IMAGE", contrast_ratio: null })]).result).toBe("FAIL");
  });

  it("6 treats overlay opacity as non-deterministic until a solid backing exists", () => {
    const bg = resolveEffectiveRenderedBackground([
      { color: "rgba(16, 32, 51, 0.2)", selector: ".overlay" },
      { color: "#102033", selector: ".panel" },
    ]);
    expect(bg.source).toBe(".panel");
  });

  it("7 treats screenshot capture as distinct from visual PASS", () => {
    expect(evaluateScreenshotCaptureGate({ rendered: true, screenshot_exists: true }).result).toBe("PASS");
    expect(evaluateVisualScreenshotInspectionGate({ screenshot_exists: true }).result).toBe("FAIL");
    expect(evaluateVisualScreenshotInspectionGate({
      screenshot_exists: true,
      visual_inspection: "FAIL",
      buttons_actionable: false,
    }).result).toBe("FAIL");
  });

  it("8 rejects a stale screenshot from a prior deployment", () => {
    expect(evaluateRenderedDeploymentIdentityGate({
      expected_deployment_id: "dpl_new",
      observed_deployment_id: "dpl_old",
      screenshot_host: "occupancynpv.com",
      claimed_environment: "production",
      stale: true,
    }).result).toBe("FAIL");
  });

  it("9 rejects a preview screenshot claimed as production", () => {
    expect(evaluateRenderedDeploymentIdentityGate({
      expected_deployment_id: "dpl_live",
      observed_deployment_id: "dpl_live",
      screenshot_host: "occupancynpv-git-preview.vercel.app",
      claimed_environment: "production",
    }).result).toBe("FAIL");
  });

  it("10 fails missing QC evidence", () => {
    expect(evaluateGateEvidenceProvenance({ gate: "TextContrastGate" }).result).toBe("FAIL");
    expect(evaluateOrganicRenderedQualityGate({
      evidence: { screenshot: true, computed_contrast: true, desktop_viewport: 1440, tablet_viewport: 768, mobile_viewport: 390 },
    }).result).toBe("FAIL");
  });

  it("11 fails mismatched deployment evidence", () => {
    expect(evaluateGateEvidenceIntegrityGate({
      parent: "RepairedProductionContentCanaryGate",
      asset_id: "lease-inputs",
      deployment_id: "dpl_live",
      gate_version: "content-qc-escape-v3",
      children: [{ gate: "TextContrastGate", result: "PASS", deployment_id: "dpl_old", evidence_type: "screenshot" }],
    }).result).toBe("FAIL");
  });

  it("12 fails the whole contrast gate when one required text element fails", () => {
    const ok = textEl({ selector: "p", contrast_ratio: 7 });
    const bad = textEl({ selector: "a.vg-cta", contrast_ratio: 2.1 });
    expect(evaluateElementLevelContrastGate([ok, bad]).result).toBe("FAIL");
  });

  it("13 fails a thin table page that only has structure", () => {
    expect(evaluateThinContentRiskGate({
      unique_sections: 10,
      repeated_ratio: 0.05,
      missing_obvious_subtopics: [],
      asset_type: "CHECKLIST",
      table_only_body: true,
      mention_only_ratio: 0.4,
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
    }).reasons).toContain("STRUCTURE_ONLY_NOT_SUBSTANCE");
  });

  it("14 fails mention-only coverage", () => {
    const nodes = leaseInputsIntentCoverageSpecs().map((spec) => classifyIntentCoverage("rent term cam move", spec));
    expect(evaluateIntentCoverageDepthGate(nodes).result).toBe("FAIL");
  });

  it("15 passes the rebuilt substantive resource", () => {
    expect(evaluateIntentCoverageDepthGate(coverage).result).toBe("PASS");
    expect(density.result).toBe("PASS");
    expect(evaluateHumanResourceDepthGate({
      asset_type: "CHECKLIST",
      direct_answer: true,
      primary_inputs_covered: 8,
      checklist: true,
      worked_example: true,
      mistakes: true,
      next_step: true,
      user_can_gather: true,
      coverage,
      unique_information_density: density.result === "PASS" ? "PASS" : "FAIL",
    }).result).toBe("PASS");
    expect(evaluateThinContentRiskGate({
      unique_sections: draft.headings.length,
      repeated_ratio: 0.05,
      missing_obvious_subtopics: [],
      asset_type: "CHECKLIST",
      mention_only_ratio: 0,
      unique_information_density: "PASS",
    }).result).toBe("PASS");
    expect(source).toContain("$480,000");
    expect(source).toContain("Recurring / One-time");
    expect(source).toContain("What to do when a number is missing");
    expect(source).toContain("Start free trial");
  });

  it("16 fails large whitespace / unfinished visual composition", () => {
    expect(evaluateContentDensityVisualGate({
      empty_canvas_ratio: 0.7,
      table_carries_body: true,
      hierarchy_present: false,
      unfinished: true,
    }).result).toBe("FAIL");
  });

  it("17 fails duplicate brand in the title", () => {
    expect(evaluateMetadataBrandDuplicationGate(["What numbers — OccupancyNPV · OccupancyNPV"]).result).toBe("FAIL");
    expect(semanticPageTitle("What numbers do you need to compare two commercial leases? — OccupancyNPV")).toBe(
      "What numbers do you need to compare two commercial leases?",
    );
    expect(draft.title).not.toMatch(/OccupancyNPV/);
  });

  it("18-19 replace obsolete pilot CTA with the current trial CTA", () => {
    expect(evaluateProductMaturityTruthGate({ copy: "Request Pilot Access" }).result).toBe("FAIL");
    expect(evaluateProductMaturityTruthGate({ copy: "Start the 3-day free trial at /pricing. No credit card." }).result).toBe("PASS");
    const composed = composeOccupancyNpvOrganicLiveFiles();
    const footer = composed.files.find((file) => file.path.replace(/\\/g, "/").endsWith("components/venture-footer.tsx"));
    expect(footer?.content).not.toContain("Request Pilot Access");
    expect(source).toContain("/pricing");
    expect(source).not.toMatch(/Request Pilot Access|pilot concept/i);
  });

  it("20 fails when post-publish production differs from the candidate", () => {
    expect(evaluateRenderedDeploymentIdentityGate({
      expected_deployment_id: "dpl_candidate",
      observed_deployment_id: "dpl_live_old",
      expected_content_hash: "aaa",
      observed_content_hash: "bbb",
      screenshot_host: "occupancynpv.com",
      claimed_environment: "production",
    }).result).toBe("FAIL");
  });

  it("21 fails adversarial review when a planted defect is found", () => {
    expect(evaluateAdversarialRenderedQC({ hunt_performed: true, planted_or_found_defects: ["low-contrast-cta"] }).result).toBe("FAIL");
    expect(evaluateAdversarialRenderedQC({ hunt_performed: true, planted_or_found_defects: [] }).result).toBe("PASS");
  });

  it("22 keeps autonomous publishing paused after a failed repair", () => {
    pauseOrganicPublishingForSecondQcEscape();
    const paused = executeOrganicGrowthSchedulerTick({
      now: "2026-09-20T09:00:00.000Z",
      trigger_source: "VERCEL_CRON",
      execute_publish: true,
    });
    expect(paused.execute_publish).toBe(false);
    expect(paused.state.publishing_hold).toBe("PAUSED_FOR_SECOND_QC_ESCAPE");
  });

  it("23 resumes autonomous publishing only after a true V3 PASS", () => {
    resumeOrganicPublishingAfterV3RepairedCanary();
    const resumed = executeOrganicGrowthSchedulerTick({
      now: "2026-09-20T09:01:00.000Z",
      trigger_source: "VERCEL_CRON",
      execute_publish: true,
    });
    expect(resumed.execute_publish).toBe(true);
    expect(evaluateRepairedProductionContentCanaryGate({
      live_http: 200,
      required_content_gates: [{ gate: "IntentCoverageDepthGate", result: "PASS", reasons: [] }],
      rendered: { gate: "OrganicRenderedQualityGate", result: "PASS", reasons: [] },
      evidence_integrity: { gate: "GateEvidenceIntegrityGate", result: "PASS", reasons: [] },
    }).result).toBe("PASS");
  });

  it("owns button colors on dark panels and enumerates CTA CSS", () => {
    expect(evaluateButtonThemeOwnershipGate(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).result).toBe("PASS");
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).toContain(".pv-cta-panel a.vg-cta");
    expect(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).toContain("color:#102033");
  });
});
