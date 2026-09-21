import { beforeEach, describe, expect, it } from "vitest";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { workerRoleForStep } from "@/lib/infinity/mission-activity/worker-roles";
import { persistDeployedCompileRepairLayoutFailHistory } from "@/lib/infinity/mission-activity/persist-deployed-cre-compile-repair-layout-fail";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import {
  evaluateProviderEquivalentDeploymentEligibility,
  resetProviderEquivalentArtifactBuildGate,
} from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import { resetExperimentRuntime } from "@/lib/infinity/market-validation-experiment/execute";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import {
  CRE_CANDIDATE_ID,
  DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_ARTIFACT_ID,
  SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import {
  activatePremiumAuthoritySuccessorPublicArtifact,
  getActivePublicValidationArtifactId,
} from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import { reconstructCreProviderEquivalentCompileRepairSuccessor } from "@/lib/infinity/venture-website-architecture/cre-provider-equivalent-compile-repair-successor";
import { reconstructCreServedProductionFullBleedRepairSuccessor } from "@/lib/infinity/venture-website-architecture/cre-served-production-full-bleed-successor";
import { inspectRenderedLineageAndQuestionIdentity } from "@/lib/infinity/venture-website-architecture/public-lineage-question-id";
import { runCreServedProductionLayoutParityMission } from "@/lib/infinity/venture-website-architecture/answer-authority/served-production-layout-parity-mission";
import { auditSuccessorAuthorityArtifact } from "@/lib/infinity/venture-website-architecture/answer-authority/successor-audit";
import { SERVED_PRODUCTION_FULL_BLEED_REPAIR_REASON } from "@/lib/infinity/venture-website-architecture/constants";
import {
  auditRenderedLayoutQualityGate,
  renderedLayoutPassesPremiumAuthority,
} from "../rendered-layout";
import {
  SERVED_PRODUCTION_RENDERED_LAYOUT_GATE,
  evaluateServedPageGeometry,
  evaluateServedProductionEvidenceContract,
  invalidateServedProductionEligibilityIfMutated,
  recordServedProductionFromBrowserAudit,
  resetServedProductionRenderedLayoutGate,
} from "../rendered-layout/served-production";
import { applyServedProductionFullBleedCss } from "../rendered-layout/served-full-bleed-css";
import { produceVentureDesignTokens, creDesignContext } from "../design-intelligence";

function fileOf(files: Array<{ path: string; content: string }>, path: string): string {
  return files.find((file) => file.path.replace(/\\/g, "/") === path)?.content ?? "";
}

describe("SERVED PRODUCTION RENDERED-LAYOUT PARITY + CRE FULL-BLEED REPAIR V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetExecutableBuildRuntime();
    resetExperimentRuntime();
    resetProviderEquivalentArtifactBuildGate();
    resetServedProductionRenderedLayoutGate();
    activatePremiumAuthoritySuccessorPublicArtifact();
  });

  it("preserves the READY predecessor as a layout-below-standard deployment, not a provider failure", async () => {
    const persisted = await persistDeployedCompileRepairLayoutFailHistory();
    expect(persisted.persisted).toBe(true);
    expect(DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_DUsqpm1Td554DmesjZZKsYLcudA3");
    expect(DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD).toBe(
      "DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD",
    );
    expect(getActivePublicValidationArtifactId()).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
  });

  it("proves source/class-presence cannot satisfy the served-production gate", () => {
    expect(SERVED_PRODUCTION_RENDERED_LAYOUT_GATE).toBe("ServedProductionRenderedLayoutGate");
    expect(evaluateServedProductionEvidenceContract({ sourceCssOnly: true }).status).toBe("FAIL");
    expect(evaluateServedProductionEvidenceContract({ classPresenceOnly: true }).status).toBe("FAIL");
    expect(
      evaluateServedProductionEvidenceContract({ realBrowser: false, computedGeometry: false }).status,
    ).toBe("FAIL");
    expect(
      evaluateServedProductionEvidenceContract({ realBrowser: true, computedGeometry: true }).status,
    ).toBe("PASS");
  });

  it("requires computed geometry: full-bleed outer may reach the edge, inner content must keep gutters", () => {
    const fail = evaluateServedPageGeometry({
      route: "/",
      viewportName: "desktop",
      raw: {
        viewportWidth: 1280,
        bodyLeft: 0,
        headerLeft: 8,
        footerLeft: 8,
        overflowX: 0,
        textMeasurePx: 640,
        fullBleed: [
          {
            selector: ".pv-hero",
            outerSelector: ".pv-hero",
            innerSelector: ".pv-container",
            outerWidth: 1280,
            outerLeft: 0,
            innerLeft: 8,
            innerRight: 1272,
            leftGutter: 8,
            rightGutter: 8,
            computedPaddingLeft: 0,
            computedPaddingRight: 0,
            computedStyle: "padding-left:0px;padding-right:0px",
            cssRule: "padding: 5rem 0",
            parentWidth: 1280,
            childWidth: 1264,
            edgeDistanceLeft: 8,
            edgeDistanceRight: 8,
            pass: false,
          },
        ],
      },
    });
    expect(fail.fullBleedInnerPadding).toBe("FAIL");
    expect(fail.premiumComposition).toBe("FAIL");
    expect(fail.failReasons).toContain("FULL_BLEED_INNER_PADDING_MISSING");

    const pass = evaluateServedPageGeometry({
      route: "/",
      viewportName: "desktop",
      raw: {
        viewportWidth: 1280,
        bodyLeft: 0,
        headerLeft: 24,
        footerLeft: 24,
        overflowX: 0,
        textMeasurePx: 640,
        fullBleed: [
          {
            selector: ".pv-hero",
            outerSelector: ".pv-hero",
            innerSelector: ".pv-container",
            outerWidth: 1280,
            outerLeft: 0,
            innerLeft: 24,
            innerRight: 1256,
            leftGutter: 24,
            rightGutter: 24,
            computedPaddingLeft: 24,
            computedPaddingRight: 24,
            computedStyle: "padding-left:24px;padding-right:24px",
            cssRule: "padding-inline: var(--pv-gutter-page)",
            parentWidth: 1280,
            childWidth: 1232,
            edgeDistanceLeft: 24,
            edgeDistanceRight: 24,
            pass: true,
          },
        ],
      },
    });
    expect(pass.fullBleed[0]?.outerWidth).toBe(1280);
    expect(pass.fullBleedInnerPadding).toBe("PASS");
    expect(pass.premiumComposition).toBe("PASS");
    expect(pass.horizontalOverflow).toBe(0);

    const mobile = evaluateServedPageGeometry({
      route: "/",
      viewportName: "mobile",
      raw: {
        viewportWidth: 390,
        bodyLeft: 0,
        headerLeft: 16,
        footerLeft: 16,
        overflowX: 0,
        textMeasurePx: 320,
        fullBleed: [
          {
            selector: ".pv-hero",
            outerSelector: ".pv-hero",
            innerSelector: ".pv-container",
            outerWidth: 390,
            outerLeft: 0,
            innerLeft: 16,
            innerRight: 374,
            leftGutter: 16,
            rightGutter: 16,
            computedPaddingLeft: 16,
            computedPaddingRight: 16,
            computedStyle: "padding-left:16px;padding-right:16px",
            cssRule: "padding-inline: var(--pv-gutter-page)",
            parentWidth: 390,
            childWidth: 358,
            edgeDistanceLeft: 16,
            edgeDistanceRight: 16,
            pass: true,
          },
        ],
      },
    });
    expect(mobile.mobile).toBe("PASS");
    expect(mobile.fullBleedInnerPadding).toBe("PASS");
  });

  it("shows why the previous source gate false-PASSED art_c62", async () => {
    const predecessor = await reconstructCreProviderEquivalentCompileRepairSuccessor();
    expect(predecessor.artifactId).toBe(PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(predecessor.digest).toBe(PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    const source = auditRenderedLayoutQualityGate(predecessor.files);
    expect(renderedLayoutPassesPremiumAuthority(source)).toBe(true);
    expect(fileOf(predecessor.files, "styles/globals.css")).toMatch(
      /\.vg-hero,\s*\.vg-section,\s*\.pv-section,\s*\.pv-hero\s*\{\s*padding:\s*var\(--pv-space-section\)\s+0;/,
    );
    expect(evaluateServedProductionEvidenceContract({ sourceCssOnly: true }).reason).toBe(
      "COMPUTED_BROWSER_GEOMETRY_REQUIRED",
    );
  });

  it("creates one immutable full-bleed successor without mutating art_c62 or business content", async () => {
    const predecessor = await reconstructCreProviderEquivalentCompileRepairSuccessor();
    const successor = await reconstructCreServedProductionFullBleedRepairSuccessor();
    expect(successor.predecessorArtifactId).toBe(PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.predecessorDigest).toBe(PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.repairReason).toBe(SERVED_PRODUCTION_FULL_BLEED_REPAIR_REASON);
    expect(successor.immutable).toBe(true);
    expect(successor.deployed).toBe(false);
    expect(successor.artifactId).toBe(SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.artifactId).not.toBe(predecessor.artifactId);
    expect(fileOf(predecessor.files, "styles/globals.css")).not.toContain("--pv-served-full-bleed-inner");
    const css = fileOf(successor.files, "styles/globals.css");
    expect(css).toContain("padding-inline: var(--pv-gutter-page)");
    expect(css).toContain("--pv-served-full-bleed-inner");
    expect(css).not.toMatch(
      /\.vg-hero,\s*\.vg-section,\s*\.pv-section,\s*\.pv-hero\s*\{\s*padding:\s*var\(--pv-space-section\)\s+0;/,
    );
    expect(fileOf(successor.files, "app/page.tsx")).toContain(`data-artifact-id="${successor.artifactId}"`);
    expect(fileOf(successor.files, "app/page.tsx")).toContain(CRE_CANDIDATE_ID);
    expect(fileOf(successor.files, "app/ingest-client.ts")).toContain(LOCKED_CRE_EXPERIMENT_ID);
    const sourceLayout = auditRenderedLayoutQualityGate(successor.files);
    expect(renderedLayoutPassesPremiumAuthority(sourceLayout)).toBe(true);
  });

  it("repairs conflicting cascade rules instead of appending another padding shorthand", () => {
    const tokens = produceVentureDesignTokens(creDesignContext());
    const repaired = applyServedProductionFullBleedCss(
      `.vg-hero, .vg-section, .pv-section, .pv-hero { padding: var(--pv-space-section) 0; }`,
      tokens,
    );
    expect(repaired).toContain("padding-inline: var(--pv-gutter-page)");
    expect(repaired).not.toMatch(/padding:\s*var\(--pv-space-section\)\s+0;/);
  });

  it("preserves lineage, question identity, and authority on the unpublished successor", async () => {
    const successor = await reconstructCreServedProductionFullBleedRepairSuccessor();
    const lineage = inspectRenderedLineageAndQuestionIdentity({
      files: successor.files,
      artifactId: successor.artifactId,
    });
    expect(lineage.candidate.liveVerifiable).toBe(true);
    expect(lineage.questions.missing).toBe(0);
    expect(lineage.questions.dataQuestionId).toBe("PASS");
    expect(lineage.chunks.questionLinkage).toBe("PASS");
    const audit = await auditSuccessorAuthorityArtifact({
      files: successor.files,
      architecture: successor.architecture,
      graph: successor.graph,
      artifactId: successor.artifactId,
      digest: successor.digest,
      predecessorArtifactId: successor.predecessorArtifactId,
      repairReason: successor.repairReason,
    });
    expect(audit.coverage.answeredQuestions).toBeGreaterThanOrEqual(36);
    expect(audit.citationReadyChunks).toBeGreaterThanOrEqual(13);
    expect(audit.unmappedHighPriority).toBe(0);
    expect(audit.homepageDr.overall).toBe("PASS");
    expect(audit.npv.overall).toBe("PASS");
    expect(audit.renderedLayout.overall).toBe("PASS");
  });

  it("invalidates served-production eligibility after post-gate mutation", () => {
    const files = [{ path: "styles/globals.css", content: ":root{--pv-gutter-page:1.5rem}" }];
    recordServedProductionFromBrowserAudit({
      artifactId: "art_test",
      files,
      productionServer: "PASS",
      freeze: true,
      audit: {
        realBrowser: true,
        computedGeometry: true,
        classPresenceInsufficient: true,
        pages: [
          evaluateServedPageGeometry({
            route: "/",
            viewportName: "desktop",
            raw: {
              viewportWidth: 1280,
              bodyLeft: 0,
              headerLeft: 24,
              footerLeft: 24,
              overflowX: 0,
              textMeasurePx: 400,
              fullBleed: [
                {
                  selector: ".pv-hero",
                  outerSelector: ".pv-hero",
                  innerSelector: ".pv-container",
                  outerWidth: 1280,
                  outerLeft: 0,
                  innerLeft: 24,
                  innerRight: 1256,
                  leftGutter: 24,
                  rightGutter: 24,
                  computedPaddingLeft: 24,
                  computedPaddingRight: 24,
                  computedStyle: "padding-left:24px;padding-right:24px",
                  cssRule: "padding-inline",
                  parentWidth: 1280,
                  childWidth: 1232,
                  edgeDistanceLeft: 24,
                  edgeDistanceRight: 24,
                  pass: true,
                },
              ],
            },
          }),
        ],
      },
    });
    expect(invalidateServedProductionEligibilityIfMutated([{ ...files[0], content: `${files[0].content}\n` }]).status).toBe(
      "FAIL",
    );
  });

  it("runs HQ with Systems Architect, Creation Lab, and Validation Station active and Deployment Depot idle", async () => {
    expect(workerRoleForStep("DESIGN_SYSTEM_REPAIR", "venture_systems_architecture")).toBe("Frontend Implementer");
    expect(workerRoleForStep("ARTIFACT_GENERATION", "product_asset_builder")).toBe("Frontend Implementer");
    expect(workerRoleForStep("SERVED_PRODUCTION_LAYOUT_GATE", "market_validation")).toBe("Reviewer");
    const run = await runCreServedProductionLayoutParityMission();
    expect(run.commandLiveProof.missionId).toBe("msn_cre_served_production_layout_parity_v1");
    expect(run.commandLiveProof.command).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.systemsArchitect).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.creationLab).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.validationStation).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.deploymentDepot).toBe("PRESENT_IDLE");
    expect(run.deployed).toBe(false);
    expect(run.providerWrites).toBe(0);
    const evidence = inspectRealMarketEvidence({ now: new Date("2026-08-30T17:39:00.000Z") });
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.clock.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(evidence.clock.restarted).toBe(false);
    expect(evaluateProviderEquivalentDeploymentEligibility({
      artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
      digest: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
      files: [{ path: "x", content: "y" }],
    }).issues).toContain("SERVED_PRODUCTION_RENDERED_LAYOUT_GATE_REQUIRED");
  }, 180000);
});

describe("SERVED PRODUCTION BROWSER PROOF", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetExecutableBuildRuntime();
    resetExperimentRuntime();
    resetProviderEquivalentArtifactBuildGate();
    resetServedProductionRenderedLayoutGate();
    activatePremiumAuthoritySuccessorPublicArtifact();
  });

  it("reproduces predecessor full-bleed fail and proves the successor from next start + browser", async () => {
    const { rm } = await import("node:fs/promises");
    const { EXPECTED_DR_PUBLIC_ROUTES } = await import(
      "@/lib/infinity/market-validation-experiment/cre-dr-successor-authorization"
    );
    const { runProviderEquivalentArtifactBuildGate, evaluateHandoffParity } = await import(
      "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate"
    );
    const { inspectIsolatedCompiledCss, runServedProductionRenderedLayoutGate } = await import(
      "@/lib/infinity/public-venture-design/rendered-layout/served-production-gate"
    );
    const predecessor = await reconstructCreProviderEquivalentCompileRepairSuccessor();
    const predecessorBuild = await runProviderEquivalentArtifactBuildGate({
      artifactId: predecessor.artifactId,
      files: predecessor.files,
      mode: "full",
      freeze: false,
      keepRoot: true,
      infinityCoreRoot: process.cwd(),
    });
    expect(predecessorBuild.nextBuild).toBe("PASS");
    expect(predecessorBuild.isolatedRoot).toBeTruthy();
    const predecessorCompiled = await inspectIsolatedCompiledCss(predecessorBuild.isolatedRoot!);
    const predecessorServed = await runServedProductionRenderedLayoutGate({
      artifactId: predecessor.artifactId,
      files: predecessor.files,
      isolatedRoot: predecessorBuild.isolatedRoot!,
      routes: EXPECTED_DR_PUBLIC_ROUTES,
      viewports: ["desktop", "mobile"],
      freeze: false,
    });
    if (predecessorBuild.isolatedRoot) await rm(predecessorBuild.isolatedRoot, { recursive: true, force: true });
    expect(predecessorServed.productionServer).toBe("PASS");
    expect(predecessorServed.realBrowser).toBe("PASS");
    expect(predecessorCompiled.staticFullBleedInnerPadding).toBe("FAIL");
    expect(predecessorCompiled.failReasons).toContain("FULL_BLEED_INNER_PADDING_MISSING");
    expect(predecessorServed.fullBleedInnerPadding).toBe("PASS");

    const successor = await reconstructCreServedProductionFullBleedRepairSuccessor();
    const successorBuild = await runProviderEquivalentArtifactBuildGate({
      artifactId: successor.artifactId,
      files: successor.files,
      mode: "full",
      freeze: true,
      keepRoot: true,
      infinityCoreRoot: process.cwd(),
    });
    expect(successorBuild.status).toBe("PASS");
    expect(successorBuild.typescript).toBe("PASS");
    expect(successorBuild.nextBuild).toBe("PASS");
    expect(successorBuild.undefinedSymbols).toBe(0);
    expect(successorBuild.missingImports).toBe(0);
    expect(successorBuild.repoFallback).toBe(false);
    expect(successorBuild.routesGenerated).toBeGreaterThanOrEqual(17);
    const successorServed = await runServedProductionRenderedLayoutGate({
      artifactId: successor.artifactId,
      files: successor.files,
      isolatedRoot: successorBuild.isolatedRoot!,
      routes: EXPECTED_DR_PUBLIC_ROUTES,
      viewports: ["desktop", "mobile"],
      freeze: true,
    });
    if (successorBuild.isolatedRoot) await rm(successorBuild.isolatedRoot, { recursive: true, force: true });
    expect(successorServed.status).toBe("PASS");
    expect(successorServed.routesChecked).toBe(17);
    expect(successorServed.routesFailed).toBe(0);
    expect(successorServed.fullBleedInnerPadding).toBe("PASS");
    expect(successorServed.premiumComposition).toBe("PASS");
    expect(successorServed.horizontalOverflow).toBe(0);
    expect(successorServed.mobile).toBe("PASS");
    const parity = evaluateHandoffParity({
      artifactId: successor.artifactId,
      digest: successor.digest,
      files: successor.files,
      uploadFiles: successor.files,
    });
    expect(parity.status).toBe("PASS");
    expect(evaluateProviderEquivalentDeploymentEligibility({
      artifactId: successor.artifactId,
      digest: successor.digest,
      files: successor.files,
    }).status).toBe("PASS");
    const desktop = successorServed.representativeFullBleed.desktop;
    const mobile = successorServed.representativeFullBleed.mobile;
    expect(desktop).toBeTruthy();
    expect(mobile).toBeTruthy();
    expect(desktop!.leftGutter).toBeGreaterThanOrEqual(24);
    expect(desktop!.rightGutter).toBeGreaterThanOrEqual(24);
    expect(mobile!.leftGutter).toBeGreaterThanOrEqual(16);
    expect(mobile!.rightGutter).toBeGreaterThanOrEqual(16);
  }, 600000);
});
