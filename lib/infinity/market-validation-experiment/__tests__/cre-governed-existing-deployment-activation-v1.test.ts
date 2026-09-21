import { beforeEach, describe, expect, it } from "vitest";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { workerRoleForStep } from "@/lib/infinity/mission-activity/worker-roles";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { resetExperimentRuntime } from "../execute";
import {
  activateCompileRepairSuccessorPublicArtifact,
  activatePremiumAuthoritySuccessorPublicArtifact,
  compileRepairActivationMutationsConsumed,
  getActivePublicValidationArtifactId,
  getActivePublicValidationDeploymentId,
  getActivePublicValidationUrl,
  getCanonicalActivePublicValidationState,
  isCompileRepairSuccessorPublicActive,
} from "../active-public-artifact";
import {
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_ARTIFACT_ID,
} from "../constants";
import {
  COMPILE_REPAIR_SUCCESSOR_ACTIVATION_AUTHORIZATION_ID,
  evaluateCompileRepairSuccessorActivationIdentity,
  executeCompileRepairSuccessorAuthorizedActivation,
} from "../cre-compile-repair-successor-activation";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "../experiment-clock";
import { inspectRealMarketEvidence } from "../real-market-evidence";

describe("GOVERNED CRE EXISTING DEPLOYMENT ACTIVATION V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetExecutableBuildRuntime();
    resetExperimentRuntime();
    activatePremiumAuthoritySuccessorPublicArtifact();
  });

  it("activates only the authorized compile-repair artifact and deployment", () => {
    expect(getActivePublicValidationArtifactId()).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    const clockBefore = inspectExperimentClock();
    const activated = activateCompileRepairSuccessorPublicArtifact();
    expect(activated.activeArtifact).toBe(PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(activated.activeDeploymentId).toBe(DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID);
    expect(activated.activeUrl).toBe(DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL);
    expect(activated.predecessor).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(getActivePublicValidationArtifactId()).toBe("art_c62f12bc59759bdbf3d1");
    expect(getActivePublicValidationDeploymentId()).toBe("dpl_DUsqpm1Td554DmesjZZKsYLcudA3");
    expect(getActivePublicValidationUrl()).toBe(
      "https://infinity-validation-cre-lease-npv-e72beb7b-id9w3e8nb.vercel.app",
    );
    expect(isCompileRepairSuccessorPublicActive()).toBe(true);
    expect(compileRepairActivationMutationsConsumed()).toBe(1);
    expect(inspectExperimentClock().evidenceStart).toBe(clockBefore.evidenceStart);
    expect(inspectExperimentClock().deadline).toBe(clockBefore.deadline);
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(inspectExperimentClock().evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(inspectRealMarketEvidence().experiment.state).toBe("COLLECTING");
  });

  it("refuses the unpublished hardening successor and a second mutation", () => {
    expect(() =>
      activateCompileRepairSuccessorPublicArtifact({
        artifactId: SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_ARTIFACT_ID,
      }),
    ).toThrow(/unpublished_hardening_successor_not_authorized/);
    expect(getActivePublicValidationArtifactId()).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(compileRepairActivationMutationsConsumed()).toBe(0);
    expect(() =>
      activateCompileRepairSuccessorPublicArtifact({
        digest: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      }),
    ).toThrow(/activation_identity_mismatch/);
    expect(() =>
      activateCompileRepairSuccessorPublicArtifact({
        deploymentId: "dpl_CVsp18qH7JS5RgegJwCEX5Yznb5q",
      }),
    ).toThrow(/activation_identity_mismatch/);
    activateCompileRepairSuccessorPublicArtifact();
    expect(() => activateCompileRepairSuccessorPublicArtifact()).toThrow(/activation_authorization_already_consumed/);
    expect(compileRepairActivationMutationsConsumed()).toBe(1);
    expect(getCanonicalActivePublicValidationState().activeArtifactId).toBe(
      PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
    );
  });

  it("passes reconstruct identity for the authorized artifact only", async () => {
    const ok = await evaluateCompileRepairSuccessorActivationIdentity();
    expect(ok.artifactIdentity).toBe("PASS");
    expect(ok.digest).toBe("PASS");
    expect(ok.deploymentIdentity).toBe("PASS");
    expect(ok.reconstructed.artifactId).toBe(PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(ok.reconstructed.digest).toBe(PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    const mismatch = await evaluateCompileRepairSuccessorActivationIdentity({
      artifactId: SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_ARTIFACT_ID,
    });
    expect(mismatch.artifactIdentity).toBe("FAIL");
    expect(mismatch.pass).toBe(false);
  });

  it("runs HQ with Command, Deployment Depot, and Validation Station active; Creation Lab and Systems Architect idle", async () => {
    expect(workerRoleForStep("ORCHESTRATE_COMPILE_REPAIR_SUCCESSOR_ACTIVATE", "mission_runtime")).toBe("Command");
    expect(workerRoleForStep("ACTIVATE_PUBLIC_ARTIFACT", "launch_gateway")).toBe("Deployment Operator");
    const run = await executeCompileRepairSuccessorAuthorizedActivation({ executeLive: false });
    expect(run.authorizationId).toBe(COMPILE_REPAIR_SUCCESSOR_ACTIVATION_AUTHORIZATION_ID);
    expect(run.commandLiveProof.command).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.deploymentDepot).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.validationStation).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.creationLab).toBe("PRESENT_IDLE");
    expect(run.commandLiveProof.systemsArchitect).toBe("PRESENT_IDLE");
    expect(run.hq.command).toBe("PASS");
    expect(run.hq.deploymentDepot).toBe("PASS");
    expect(run.hq.validationStation).toBe("PASS");
    expect(run.hq.completion).toBe("PASS");
    expect(run.authorizationConsumed).toBe("NO");
    expect(run.activationMutations).toBe(0);
    expect(run.providerWrites).toBe(0);
    expect(run.deployments).toBe(0);
    expect(run.retries).toBe(0);
    expect(getActivePublicValidationArtifactId()).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(run.experiment.clockRestarted).toBe(false);
    expect(run.experiment.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(run.publicState.publiclyLaunched).toBe("NO");
    expect(run.historical.correctedClassification).toBe("LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE");
    expect(run.historical.actualArtifactDefect).toBe("NO");
    expect(run.result).toBe("DEFERRED");
  });

  it.skip("activates the existing READY compile-repair deployment exactly once — authorization already consumed", async () => {
    const run = await executeCompileRepairSuccessorAuthorizedActivation({ executeLive: true });
    expect(run.authorizationConsumed).toBe("YES");
    expect(run.activationMutations).toBe(1);
    expect(run.providerWrites).toBe(0);
    expect(run.deployments).toBe(0);
    expect(run.retries).toBe(0);
    expect(run.beforeActiveArtifact).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(run.afterActiveArtifact).toBe(PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(run.readback.activeArtifactId).toBe("art_c62f12bc59759bdbf3d1");
    expect(run.readback.activeDeploymentId).toBe("dpl_DUsqpm1Td554DmesjZZKsYLcudA3");
    expect(run.readback.activeUrl).toBe(
      "https://infinity-validation-cre-lease-npv-e72beb7b-id9w3e8nb.vercel.app",
    );
    expect(run.readbackMatchesMutation).toBe("YES");
    expect(run.publicState.deployed).toBe("YES");
    expect(run.publicState.active).toBe("YES");
    expect(run.publicState.publiclyLaunched).toBe("NO");
    expect(run.experiment.clockRestarted).toBe(false);
    expect(run.historical.originalFailurePreserved).toBe("YES");
    expect(
      [
        "YES — VERIFIED CRE DEPLOYMENT ACTIVATED; VALIDATION EXPERIMENT CONTINUES",
        "PARTIAL — ACTIVATION SUCCEEDED BUT POST-ACTIVATION READBACK OR LIVE VERIFICATION IS INCOMPLETE",
      ].includes(run.result),
    ).toBe(true);
    console.log(JSON.stringify({
      result: run.result,
      authorizationConsumed: run.authorizationConsumed,
      activationMutations: run.activationMutations,
      beforeActiveArtifact: run.beforeActiveArtifact,
      afterActiveArtifact: run.afterActiveArtifact,
      readback: run.readback,
      pre: {
        artifactIdentity: run.pre.identity.artifactIdentity,
        digest: run.pre.identity.digest,
        deploymentIdentity: run.pre.identity.deploymentIdentity,
        providerReady: "providerReady" in run.pre ? run.pre.providerReady : null,
        served: "served" in run.pre && run.pre.served ? run.pre.served.status : null,
        routes: "served" in run.pre && run.pre.served ? run.pre.served.routesChecked : null,
        lineage: "lineage" in run.pre ? run.pre.lineage : null,
        questionIdentity: "questionIdentity" in run.pre ? run.pre.questionIdentity : null,
        authority: "authority" in run.pre ? run.pre.authority : null,
      },
      post: {
        providerReady: run.post.provider?.readyState ?? null,
        served: run.post.served?.status ?? null,
        routes: run.post.served?.routesChecked ?? null,
        homepage: run.post.live?.homepageHttp ?? null,
        earlyAccess: run.post.live?.form.earlyAccessRoute ?? null,
        candidate: run.post.live?.form.candidate ?? null,
        experiment: run.post.live?.form.experiment ?? null,
        artifactLineage: run.post.live?.form.successorArtifactLineage ?? null,
      },
      experiment: run.experiment,
      hq: run.hq,
      publicState: run.publicState,
      historical: run.historical,
      activationCost: run.activationCost,
    }, null, 2));
  }, 360000);
});
