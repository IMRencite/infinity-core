import { beforeEach, describe, expect, it } from "vitest";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { resetExperimentRuntime } from "@/lib/infinity/market-validation-experiment/execute";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import {
  DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
  DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST,
  RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID,
  RENDERED_LAYOUT_REPAIR_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { reconstructCreDirectResponseSuccessor } from "@/lib/infinity/venture-website-architecture/cre-dr-successor";
import { reconstructCreRenderedLayoutRepairSuccessor } from "@/lib/infinity/venture-website-architecture/cre-rendered-layout-successor";
import { auditSuccessorAuthorityArtifact } from "@/lib/infinity/venture-website-architecture/answer-authority/successor-audit";
import { runCreRenderedLayoutRepairMission } from "@/lib/infinity/venture-website-architecture/answer-authority/rendered-layout-mission";
import { workerRoleForStep } from "@/lib/infinity/mission-activity/worker-roles";
import {
  HUMAN_DESIGNER_ADVERSARIAL_QUESTION,
  PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD,
  RENDERED_LAYOUT_QUALITY_GATE,
  RENDERED_LAYOUT_REPAIR_REASON,
  auditRenderedLayoutQualityGate,
  renderedLayoutPassesPremiumAuthority,
} from "../rendered-layout";
import { PREMIUM_AUTHORITY_VALIDATION_READY } from "../constants";
import { produceVentureDesignTokens, creDesignContext } from "../design-intelligence";
import { withRenderedLayoutTokens } from "../rendered-layout";

describe("RENDERED LAYOUT QUALITY + RESPONSIVE SPACING + PREMIUM COMPOSITION QC V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetExecutableBuildRuntime();
    resetExperimentRuntime();
  });

  it("adds a global rendered-layout gate that fails the current CRE successor", async () => {
    expect(RENDERED_LAYOUT_QUALITY_GATE).toBe("RenderedLayoutQualityGate");
    expect(HUMAN_DESIGNER_ADVERSARIAL_QUESTION).toMatch(/experienced web designer/);
    const tokens = withRenderedLayoutTokens(produceVentureDesignTokens(creDesignContext()));
    expect(tokens.spacing.gutter).toBe("1.5rem");
    expect(tokens.spacing.gutterTablet).toBe("1.25rem");
    expect(tokens.container.wide).toBe("80rem");
    const current = await reconstructCreDirectResponseSuccessor();
    expect(current.artifactId).toBe(DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID);
    expect(current.digest).toBe(DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST);
    const layout = auditRenderedLayoutQualityGate(current.files);
    expect(layout.global).toBe(true);
    expect(layout.creOnly).toBe(false);
    expect(layout.bodyGutter).toBe("FAIL");
    expect(layout.footerPadding).toBe("FAIL");
    expect(layout.fullBleedInnerPadding).toBe("FAIL");
    expect(layout.premiumComposition).toBe("FAIL");
    expect(layout.overall).toBe("FAIL");
    expect(layout.failReasons).toEqual(
      expect.arrayContaining([
        "BODY_GUTTER_INSUFFICIENT",
        "FOOTER_INNER_PADDING_INSUFFICIENT",
        "FULL_BLEED_INNER_PADDING_MISSING",
      ]),
    );
    expect(renderedLayoutPassesPremiumAuthority(layout)).toBe(false);
    const how = layout.pages.find((page) => page.route === "/how-it-works");
    const free = layout.pages.find((page) => page.route === "/resources/free-rent");
    expect(how?.sectionComposition).toBe("FAIL");
    expect(free?.sectionComposition).toBe("FAIL");
    const audit = await auditSuccessorAuthorityArtifact({
      files: current.files,
      architecture: current.architecture,
      graph: current.graph,
      artifactId: current.artifactId,
      digest: current.digest,
    });
    expect(audit.newClassification).toBe(PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD);
    expect(audit.previousClassificationTooPermissive).toBe(true);
    expect(audit.highConfidenceQuestions).toBe(38);
    expect(audit.coverage.answeredQuestions).toBeGreaterThanOrEqual(36);
    expect(audit.coverage.deeplyAnsweredQuestions).toBeGreaterThanOrEqual(13);
    expect(audit.citationReadyChunks).toBeGreaterThanOrEqual(13);
    expect(audit.unmappedHighPriority).toBe(0);
  }, 180000);

  it("creates an immutable unpublished repair successor that passes rendered layout", async () => {
    const successor = await reconstructCreRenderedLayoutRepairSuccessor();
    expect(successor.predecessorArtifactId).toBe(DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID);
    expect(successor.predecessorDigest).toBe(DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.repairReason).toBe(RENDERED_LAYOUT_REPAIR_REASON);
    expect(successor.artifactId).not.toBe(DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).not.toBe(DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.artifactId).toBe(RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(RENDERED_LAYOUT_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.immutable).toBe(true);
    expect(successor.deployed).toBe(false);
    const css = successor.files.find((item) => item.path === "styles/globals.css")?.content ?? "";
    expect(css).toContain("--pv-gutter-page");
    expect(css).toContain("2 * var(--pv-gutter-page)");
    expect(css).toContain(".vg-legal-footer");
    expect(css).not.toMatch(/padding-left:\s*37px/);
    const footer = successor.files.find((item) => item.path.includes("venture-footer"))?.content ?? "";
    expect(footer).toContain("vg-legal-footer-inner");
    expect(footer).toContain("Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR");
    const layout = auditRenderedLayoutQualityGate(successor.files);
    expect(layout.bodyGutter).toBe("PASS");
    expect(layout.fullBleedInnerPadding).toBe("PASS");
    expect(layout.footerPadding).toBe("PASS");
    expect(layout.headerPadding).toBe("PASS");
    expect(layout.containerAlignment).toBe("PASS");
    expect(layout.textMeasure).toBe("PASS");
    expect(layout.verticalRhythm).toBe("PASS");
    expect(layout.sectionComposition).toBe("PASS");
    expect(layout.horizontalOverflow).toBe(0);
    expect(layout.mobile).toBe("PASS");
    expect(layout.premiumComposition).toBe("PASS");
    expect(layout.overall).toBe("PASS");
    expect(renderedLayoutPassesPremiumAuthority(layout)).toBe(true);
    const audit = await auditSuccessorAuthorityArtifact({
      files: successor.files,
      architecture: successor.architecture,
      graph: successor.graph,
      artifactId: successor.artifactId,
      digest: successor.digest,
      predecessorArtifactId: successor.predecessorArtifactId,
      repairReason: successor.repairReason,
    });
    expect(audit.newClassification).toBe(PREMIUM_AUTHORITY_VALIDATION_READY);
    expect(audit.hardFailPages).toBe(0);
    expect(audit.highConfidenceQuestions).toBe(38);
    expect(audit.coverage.answeredQuestions).toBe(36);
    expect(audit.citationReadyChunks).toBeGreaterThanOrEqual(13);
    const viz = successor.files
      .map((item) => item.content)
      .join("\n")
      .match(/data-visualization/g)?.length ?? 0;
    expect(viz).toBeGreaterThanOrEqual(56);
  }, 180000);

  it("runs the repair through HQ with truthful rooms and no deployment", async () => {
    expect(workerRoleForStep("RENDERED_LAYOUT_AUDIT", "creative_media")).toBe("Design Planner");
    expect(workerRoleForStep("DESIGN_SYSTEM_REPAIR", "venture_systems_architecture")).toBe("Frontend Implementer");
    expect(workerRoleForStep("COMPOSITION_REPAIR", "creative_media")).toBe("Creative Planner");
    expect(workerRoleForStep("ARTIFACT_GENERATION", "product_asset_builder")).toBe("Frontend Implementer");
    expect(workerRoleForStep("ADVERSARIAL_VISUAL_REVIEW", "market_validation")).toBe("Adversarial Reviewer");
    const run = await runCreRenderedLayoutRepairMission();
    expect(run.commandLiveProof.missionId).toBe("msn_cre_rendered_layout_qc_v1");
    expect(run.commandLiveProof.command).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.designCore).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.creationLab).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.validationStation).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.systemsArchitect).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.researchGrid).toBe("PRESENT_IDLE");
    expect(run.commandLiveProof.deploymentDepot).toBe("PRESENT_IDLE");
    expect(run.deployed).toBe(false);
    expect(run.liveArtifactMutated).toBe(false);
    const evidence = inspectRealMarketEvidence({ now: new Date("2026-08-30T16:57:00.000Z") });
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.clock.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(evidence.clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(evidence.clock.restarted).toBe(false);
    expect(evidence.counts.qualifiedVisitors).toBe(0);
    expect(evidence.decision.buildReady).toBe(false);
  }, 180000);
});
