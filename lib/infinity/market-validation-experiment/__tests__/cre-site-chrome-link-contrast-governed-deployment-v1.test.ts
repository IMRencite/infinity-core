import { describe, expect, it } from "vitest";
import { reconstructCreSiteChromeLinkContrastSuccessor } from "@/lib/infinity/venture-website-architecture/cre-site-chrome-link-contrast-successor";
import {
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
} from "../constants";
import {
  GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_V1,
  GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_V1_MISSION_ID,
} from "../cre-site-chrome-link-contrast-deploy";
import { SITE_CHROME_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID } from "../cre-site-chrome-link-contrast-deploy-authorization";
import { SITE_CHROME_CANONICAL_NAV_LINKS } from "../cre-site-chrome-link-contrast-live-verify";
import { parseCssColor, compositeRgb } from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate";
import {
  evaluateRenderedLinkContrastGate,
  FOUNDER_SITE_CHROME_NAV_NEAR_BLACK_BG_FIXTURE,
  FOUNDER_SITE_CHROME_NAV_REPAIRED_FIXTURE,
  FOUNDER_SITE_CHROME_SRGB_SURFACE_FIXTURE,
  isHiddenOrInertLinkSample,
  FOUNDER_SITE_CHROME_HIDDEN_DUPLICATE_FIXTURE,
} from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-link-contrast-gate";
import { evaluateHubQuestionBoardLayout, FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE, GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE } from "@/lib/infinity/venture-website-architecture/public-authority-standard/hub-discovery-rendered-quality";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { evaluateMissionRoomActivityProjectionGate } from "@/lib/infinity/mission-activity/mission-room-activity-projection-gate";
import { evaluateHqFrontLiveWorkVisibility } from "@/lib/infinity/mission-activity/hq-live-work-visibility";
import { ROOM_ACTIVITY_EMPTY } from "@/lib/infinity/operator-console/room-activity";
import { isCreValidationArtifactId } from "../current-cre-artifact";
import { evaluateProviderEquivalentDeploymentEligibility } from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import { SITE_CHROME_LINK_CONTRAST_MARKER } from "@/lib/infinity/venture-website-architecture/site-chrome-link-contrast-css";

describe("GOVERNED CRE SITE CHROME LINK CONTRAST DEPLOYMENT V1", () => {
  it("locks the chrome-contrast successor and keep-fail thresholds", async () => {
    const successor = await reconstructCreSiteChromeLinkContrastSuccessor();
    expect(GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_V1).toBe("GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_V1");
    expect(GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_V1_MISSION_ID).toBe("msn_cre_site_chrome_link_contrast_deploy_v1");
    expect(SITE_CHROME_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID).toBe("founder_ceiling_cre_site_chrome_link_contrast_deployment_v1");
    expect(SITE_CHROME_LINK_CONTRAST_DEPLOY_FOUNDER_AUTHORIZATION_ID).not.toMatch(/WAVE_2|OUTREACH|DNS|DOMAIN/);
    expect(successor.artifactId).toBe(CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.predecessorArtifactId).toBe(CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID);
    expect(successor.immutable).toBe(true);
    expect(successor.deployed).toBe(false);
    expect(successor.routes).toBe(93);
    expect(successor.hubLayout.overall).toBe("PASS");
    expect(successor.humanFirst.overall).toBe("PASS");
    expect(successor.pageLoop.overall).toBe("PASS");
    expect(isCreValidationArtifactId(CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID)).toBe(true);
    expect(
      evaluateProviderEquivalentDeploymentEligibility({
        artifactId: successor.artifactId,
        digest: successor.digest,
        files: successor.files,
      }).issues,
    ).not.toContain("SERVED_PRODUCTION_RENDERED_LAYOUT_GATE_REQUIRED");
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    expect(css).toContain(SITE_CHROME_LINK_CONTRAST_MARKER);
    expect(parseCssColor("color(srgb 1 1 1 / 0.92)")).toEqual({ r: 255, g: 255, b: 255, a: 0.92 });
    expect(compositeRgb({ r: 255, g: 255, b: 255, a: 0.92 }, { r: 255, g: 255, b: 255, a: 1 })).toEqual({
      r: 255,
      g: 255,
      b: 255,
      a: 1,
    });
    expect(evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_NAV_NEAR_BLACK_BG_FIXTURE).overall).toBe("FAIL");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_NAV_REPAIRED_FIXTURE).overall).toBe("PASS");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_SITE_CHROME_SRGB_SURFACE_FIXTURE).overall).toBe("PASS");
    expect(isHiddenOrInertLinkSample(FOUNDER_SITE_CHROME_HIDDEN_DUPLICATE_FIXTURE.samples[1])).toBe(true);
    expect(evaluateHubQuestionBoardLayout(FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE).overall).toBe("FAIL");
    expect(evaluateHubQuestionBoardLayout(GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE).overall).toBe("PASS");
    expect(SITE_CHROME_CANONICAL_NAV_LINKS).toHaveLength(7);
    expect(instrumentedRuntimeRegistry().runtimes.CreSiteChromeLinkContrastDeployRuntime.usesMissionWrapper).toBe(true);
    expect(instrumentedRuntimeRegistry().contracts.CreSiteChromeLinkContrastDeployRuntime.missionType).toBe(
      "GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_V1",
    );
    expect(
      evaluateMissionRoomActivityProjectionGate({
        openSteps: [{ stepType: "PUBLIC_ARTIFACT_QUALITY_GATE", engine: "market_validation" }],
        rooms: { quality_control: "ACTIVE_WORK", executive_office: "ACTIVE_WORK", launch_operations: "ACTIVE_WORK" },
        command: "ACTIVE_WORK",
        deploymentWriteCompleted: true,
        liveValidationOpen: true,
      }).overall,
    ).toBe("PASS");
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
              summary: "Coordinating the governed site-chrome link-contrast deployment",
              allowAmbientMotion: true,
              latestEventId: "mae_cmd",
            },
          } as never,
          nowInspecting: {
            currentMission: GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_V1,
            currentPhase: "QUALITY_REVIEW",
            currentStep: "QUALITY_REVIEW",
            currentRoom: "Validation Station",
            currentWorker: "Reviewer",
            currentTask: "Reconfirming site-chrome successor identity",
            status: "ACTIVE_WORK",
            why: null,
            startedAt: new Date().toISOString(),
            lastActivity: "Reconfirming site-chrome successor identity",
            lastActivityAt: new Date().toISOString(),
            nextExpectedStep: "PREPARE_SOURCE_BUNDLE",
            blocker: null,
            authorizationRequired: null,
          },
          systemView: {
            missionId: GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_V1_MISSION_ID,
            engine: "market_validation",
            step: "QUALITY_REVIEW",
            workerOrProvider: null,
            artifactId: CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
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
