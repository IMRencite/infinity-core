import { beforeEach, describe, expect, it } from "vitest";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { listMissionActivityEvents } from "@/lib/infinity/mission-activity/store";
import { persistDeployedCompileRepairLayoutFailHistory } from "@/lib/infinity/mission-activity/persist-deployed-cre-compile-repair-layout-fail";
import { persistCompileRepairLayoutFalseNegativeCorrection } from "@/lib/infinity/mission-activity/persist-cre-layout-false-negative-correction";
import { workerRoleForStep } from "@/lib/infinity/mission-activity/worker-roles";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { resetExperimentRuntime } from "@/lib/infinity/market-validation-experiment/execute";
import {
  activatePremiumAuthoritySuccessorPublicArtifact,
  getActivePublicValidationArtifactId,
} from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import {
  DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE,
  LIVE_ORG,
  OPTIONAL_DEFENSIVE_HARDENING,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY,
  REQUIRED_FOR_CORRECTNESS,
} from "../constants";
import { reAdjudicateDeployedCompileRepairSuccessor } from "../cre-compile-repair-successor-readjudication";
import {
  adjudicateRenderedLayout,
  classifyUnpublishedLayoutSuccessor,
  RENDERED_LAYOUT_ADJUDICATION_PRECEDENCE,
  textualCssParserCannotOverrideBrowserGeometry,
} from "@/lib/infinity/public-venture-design/rendered-layout/adjudication-precedence";
import { resetServedProductionRenderedLayoutGate } from "@/lib/infinity/public-venture-design/rendered-layout/served-production-gate";
import { runCreDeployedSuccessorReadjudicationMission } from "@/lib/infinity/venture-website-architecture/answer-authority/deployed-successor-readjudication-mission";

describe("CRE DEPLOYED SUCCESSOR RE-ADJUDICATION + ACTIVATION READINESS V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetExecutableBuildRuntime();
    resetExperimentRuntime();
    resetServedProductionRenderedLayoutGate();
    activatePremiumAuthoritySuccessorPublicArtifact();
  });

  it("preserves the original verifier FAIL and appends a false-negative correction", async () => {
    await persistDeployedCompileRepairLayoutFailHistory();
    const first = await persistCompileRepairLayoutFalseNegativeCorrection();
    const second = await persistCompileRepairLayoutFalseNegativeCorrection();
    const events = listMissionActivityEvents({
      organizationId: LIVE_ORG,
      missionId: "msn_cre_compile_repair_successor_deploy_v1",
    });
    expect(first.initialFailurePreserved).toBe(true);
    expect(first.correctionAppended).toBe(true);
    expect(second.alreadyPresent).toBe(true);
    expect(events.some((event) => event.failureCode === DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD)).toBe(true);
    expect(events.some((event) => event.failureCode === LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE)).toBe(true);
    expect(events.filter((event) => event.eventType === "STEP_FAILED").length).toBeGreaterThanOrEqual(1);
    expect(first.resolution).toBe(RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY);
    expect(DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_DUsqpm1Td554DmesjZZKsYLcudA3");
  });

  it("locks served browser geometry above compiled or source CSS text", () => {
    expect(RENDERED_LAYOUT_ADJUDICATION_PRECEDENCE).toEqual([
      "SERVED_PRODUCTION_BROWSER_GEOMETRY",
      "COMPILED_CSS_TEXT_INFERENCE",
      "SOURCE_CSS_INSPECTION",
    ]);
    expect(textualCssParserCannotOverrideBrowserGeometry()).toBe(true);
    const corrected = adjudicateRenderedLayout({
      servedBrowserGeometry: "PASS",
      compiledCssText: "FAIL",
      sourceCss: "PASS",
    });
    expect(corrected.status).toBe("PASS");
    expect(corrected.source).toBe("SERVED_PRODUCTION_BROWSER_GEOMETRY");
    expect(corrected.classification).toBe(LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE);
    const realFail = adjudicateRenderedLayout({
      servedBrowserGeometry: "FAIL",
      compiledCssText: "PASS",
      sourceCss: "PASS",
    });
    expect(realFail.status).toBe("FAIL");
    expect(realFail.source).toBe("SERVED_PRODUCTION_BROWSER_GEOMETRY");
  });

  it("classifies the unpublished CSS successor as optional defensive hardening when live geometry PASSes", () => {
    expect(
      classifyUnpublishedLayoutSuccessor({
        deployedServedGeometry: "PASS",
        deterministicLayoutDefect: false,
      }),
    ).toBe(OPTIONAL_DEFENSIVE_HARDENING);
    expect(
      classifyUnpublishedLayoutSuccessor({
        deployedServedGeometry: "FAIL",
        deterministicLayoutDefect: true,
      }),
    ).toBe(REQUIRED_FOR_CORRECTNESS);
  });

  it("runs HQ with Command, Validation Station, and Systems Architect active; Creation Lab and Deployment Depot idle", async () => {
    expect(workerRoleForStep("ORCHESTRATE_DEPLOYED_SUCCESSOR_READJUDICATION", "mission_runtime")).toBe("Command");
    expect(workerRoleForStep("DESIGN_SYSTEM_REPAIR", "venture_systems_architecture")).toBe("Frontend Implementer");
    const run = await runCreDeployedSuccessorReadjudicationMission({ executeLive: false });
    expect(run.commandLiveProof.command).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.systemsArchitect).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.validationStation).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.creationLab).toBe("PRESENT_IDLE");
    expect(run.commandLiveProof.deploymentDepot).toBe("PRESENT_IDLE");
    expect(run.activated).toBe(false);
    expect(run.providerWrites).toBe(0);
    expect(getActivePublicValidationArtifactId()).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
  });

  it("re-adjudicates the live READY deployment with ServedProductionRenderedLayoutGate", async () => {
    const result = await reAdjudicateDeployedCompileRepairSuccessor();
    expect(result.artifactId).toBe("art_c62f12bc59759bdbf3d1");
    expect(result.deploymentId).toBe("dpl_DUsqpm1Td554DmesjZZKsYLcudA3");
    expect(result.providerState).toBe("READY");
    expect(result.actualArtifactDefect).toBe(false);
    expect(result.verifierFalseNegative).toBe(true);
    expect(result.correctedClassification).toBe(LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE);
    expect(result.historyPreserved).toBe(true);
    expect(result.historyStillContainsOriginalFail).toBe(true);
    expect(result.served.status).toBe("PASS");
    expect(result.served.realBrowser).toBe("PASS");
    expect(result.served.productionServer).toBe("PASS");
    expect(result.served.routesChecked).toBe(17);
    expect(result.served.routesFailed).toBe(0);
    expect(result.served.fullBleedInnerPadding).toBe("PASS");
    expect(result.served.premiumComposition).toBe("PASS");
    expect(result.served.horizontalOverflow).toBe(0);
    expect(result.served.mobile).toBe("PASS");
    expect(result.live.homepageHttp).toBe("PASS");
    expect(result.live.allIntendedPages).toBe("PASS");
    expect(result.live.sitemapHttp).toBe("PASS");
    expect(result.live.robots).toBe("PASS");
    expect(result.live.form.earlyAccessRoute).toBe("PASS");
    expect(result.functionalPass).toBe(true);
    expect(result.layoutPass).toBe(true);
    expect(result.readyForActivation).toBe(true);
    expect(result.activated).toBe(false);
    expect(result.activeArtifact).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(result.unpublishedSuccessor.classification).toBe(OPTIONAL_DEFENSIVE_HARDENING);
    expect(result.unpublishedSuccessor.deploymentRequiredBeforeActivation).toBe(false);
    expect(result.experiment.state).toBe("COLLECTING");
    expect(result.experiment.clockRestarted).toBe(false);
    expect(result.providerWrites).toBe(0);
    expect(result.activation).toBe(0);
    expect(result.served.representativeFullBleed.desktop?.leftGutter).toBeGreaterThanOrEqual(24);
    expect(result.served.representativeFullBleed.mobile?.leftGutter).toBeGreaterThanOrEqual(16);
  }, 300000);
});
