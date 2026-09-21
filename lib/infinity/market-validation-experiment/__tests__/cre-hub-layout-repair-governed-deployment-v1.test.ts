import { describe, expect, it } from "vitest";
import { reconstructCreHubQuestionBoardLayoutSuccessor } from "@/lib/infinity/venture-website-architecture/cre-hub-question-board-layout-successor";
import {
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
} from "../constants";
import {
  GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1,
  GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1_MISSION_ID,
} from "../cre-hub-layout-repair-deploy";
import { HUB_LAYOUT_REPAIR_DEPLOY_FOUNDER_AUTHORIZATION_ID } from "../cre-hub-layout-repair-deploy-authorization";
import { evaluateHubQuestionBoardLayout, FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE, GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE } from "@/lib/infinity/venture-website-architecture/public-authority-standard/hub-discovery-rendered-quality";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { evaluateHqFrontLiveWorkVisibility } from "@/lib/infinity/mission-activity/hq-live-work-visibility";
import { ROOM_ACTIVITY_EMPTY } from "@/lib/infinity/operator-console/room-activity";
import { isCreValidationArtifactId } from "../current-cre-artifact";
import { pageContent } from "@/lib/infinity/venture-website-architecture/answer-authority/page-inspect";
import { evaluateProviderEquivalentDeploymentEligibility } from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";

describe("GOVERNED CRE HUB LAYOUT REPAIR DEPLOYMENT V1", () => {
  it("locks the hub-layout successor and fail-closed leftover fixture", async () => {
    const successor = await reconstructCreHubQuestionBoardLayoutSuccessor();
    expect(GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1).toBe("GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1");
    expect(GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1_MISSION_ID).toBe("msn_cre_hub_layout_repair_deploy_v1");
    expect(HUB_LAYOUT_REPAIR_DEPLOY_FOUNDER_AUTHORIZATION_ID).toBe("founder_ceiling_cre_hub_layout_repair_deployment_v1");
    expect(HUB_LAYOUT_REPAIR_DEPLOY_FOUNDER_AUTHORIZATION_ID).not.toMatch(/WAVE_2|OUTREACH|DNS|DOMAIN/);
    expect(successor.artifactId).toBe(CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.predecessorArtifactId).toBe(CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.immutable).toBe(true);
    expect(successor.deployed).toBe(false);
    expect(successor.routes).toBe(93);
    expect(successor.hubLayout.overall).toBe("PASS");
    expect(successor.discovery.overall).toBe("PASS");
    expect(successor.pageLoop.overall).toBe("PASS");
    expect(successor.hookBoundary.overall).toBe("PASS");
    expect(isCreValidationArtifactId(CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID)).toBe(true);
    expect(
      evaluateProviderEquivalentDeploymentEligibility({
        artifactId: successor.artifactId,
        digest: successor.digest,
        files: successor.files,
      }).issues,
    ).not.toContain("SERVED_PRODUCTION_RENDERED_LAYOUT_GATE_REQUIRED");
    expect(evaluateHubQuestionBoardLayout(FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE).overall).toBe("FAIL");
    expect(evaluateHubQuestionBoardLayout(GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE).overall).toBe("PASS");
    const founder = pageContent(successor.files, "/commercial-lease-npv");
    expect(founder).toContain("pv-discovery-band");
    expect(founder.split("pv-discovery-band")[0]).not.toContain("FOR_YOUR_ROLE");
    expect(instrumentedRuntimeRegistry().runtimes.CreHubLayoutRepairDeployRuntime.usesMissionWrapper).toBe(true);
    expect(instrumentedRuntimeRegistry().contracts.CreHubLayoutRepairDeployRuntime.missionType).toBe(
      "GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1",
    );
    expect(
      evaluateHqFrontLiveWorkVisibility({
        view: {
          generatedAt: new Date().toISOString(),
          counts: { activeMissions: 1, blockedMissions: 0, waitingMissions: 0, authorizationRequired: 0 },
          rooms: {
            executive_office: {
              room: "executive_office",
              roomLabel: "Command",
              status: "ACTIVE_WORK",
              summary: "Coordinating the governed hub-layout repair deployment",
              allowAmbientMotion: true,
              latestEventId: "mae_cmd",
            },
          } as never,
          nowInspecting: {
            currentMission: GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1,
            currentPhase: "QUALITY_REVIEW",
            currentStep: "QUALITY_REVIEW",
            currentRoom: "Validation Station",
            currentWorker: "Reviewer",
            currentTask: "Reconfirming hub-layout successor identity",
            status: "ACTIVE_WORK",
            why: null,
            startedAt: new Date().toISOString(),
            lastActivity: "Reconfirming hub-layout successor identity",
            lastActivityAt: new Date().toISOString(),
            nextExpectedStep: "PREPARE_SOURCE_BUNDLE",
            blocker: null,
            authorizationRequired: null,
          },
          systemView: {
            missionId: GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1_MISSION_ID,
            engine: "market_validation",
            step: "QUALITY_REVIEW",
            workerOrProvider: null,
            artifactId: CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
            deploymentId: null,
            experimentId: null,
            traceId: null,
            startedAt: null,
            durationMs: null,
            latestEvent: "STEP_STARTED",
            failureCode: null,
            costState: null,
          },
          latestCompleted: null,
          recentEvents: [],
          activeWorkers: [],
          executionClass: "VENTURE_EXECUTION",
        },
        commandNowSentence: ROOM_ACTIVITY_EMPTY,
      }),
    ).toBe("FAIL");
  }, 180000);
});
