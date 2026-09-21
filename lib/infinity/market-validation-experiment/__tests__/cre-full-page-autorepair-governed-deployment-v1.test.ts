import { describe, expect, it } from "vitest";
import { reconstructCreSearchDepthSuccessor } from "@/lib/infinity/venture-website-architecture/cre-search-depth-successor";
import {
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
} from "../constants";
import {
  GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_MISSION_ID,
  GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V1,
} from "../cre-full-page-autorepair-deploy";
import { FULL_PAGE_AUTOREPAIR_FOUNDER_AUTHORIZATION_ID } from "../cre-full-page-autorepair-authorization";
import { HARD_PUBLISHABILITY_GATES } from "@/lib/infinity/venture-website-architecture/public-authority-standard/constants";
import { evaluateHumanFirstPublicLanguageGate, HUMAN_FIRST_BAD_FIXTURES } from "@/lib/infinity/venture-website-architecture/human-first-public-language-gate";
import { evaluateRenderedLinkContrastGate, FOUNDER_LINK_SAME_COLOR_FIXTURE } from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-link-contrast-gate";
import { evaluateRenderedTextContrastGate, FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE } from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { evaluateHqFrontLiveWorkVisibility } from "@/lib/infinity/mission-activity/hq-live-work-visibility";
import { ROOM_ACTIVITY_EMPTY } from "@/lib/infinity/operator-console/room-activity";

describe("GOVERNED CRE FULL PAGE AUTOREPAIR DEPLOYMENT V1", () => {
  it("locks the same mission identity, immutable successor, and fail-closed gates", async () => {
    const successor = await reconstructCreSearchDepthSuccessor();
    expect(GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V1).toBe("GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V1");
    expect(GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_MISSION_ID).toBe("msn_cre_full_page_autorepair_deploy_v1");
    expect(FULL_PAGE_AUTOREPAIR_FOUNDER_AUTHORIZATION_ID).not.toMatch(/WAVE_2|OUTREACH|DNS|DOMAIN/);
    expect(successor.artifactId).toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.predecessorArtifactId).toBe(SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.routes).toBe(93);
    expect(successor.pageLoop.overall).toBe("PASS");
    expect(successor.pageLoop.missingEvidence).toBe(0);
    expect(successor.pageLoop.repairCeilingExceeded).toBe(0);
    expect(successor.pageLoop.finalFailed).toBe(0);
    expect(HARD_PUBLISHABILITY_GATES).toContain("FullPublicRouteValidationGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("RenderedLinkContrastGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("HumanFirstPublicLanguageGate");
    expect(evaluateRenderedTextContrastGate(FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE).overall).toBe("FAIL");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_LINK_SAME_COLOR_FIXTURE).overall).toBe("FAIL");
    for (const fixture of HUMAN_FIRST_BAD_FIXTURES) {
      expect(evaluateHumanFirstPublicLanguageGate(fixture).overall).toBe("FAIL");
    }
    expect(instrumentedRuntimeRegistry().runtimes.CreFullPageAutorepairDeployRuntime.usesMissionWrapper).toBe(true);
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
              summary: "Coordinating the governed full-page autorepair deployment",
              allowAmbientMotion: true,
              latestEventId: "mae_cmd",
            },
          } as never,
          nowInspecting: {
            currentMission: GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V1,
            currentPhase: "QUALITY_REVIEW",
            currentStep: "QUALITY_REVIEW",
            currentRoom: "Validation Station",
            currentWorker: "Reviewer",
            currentTask: "Reconfirming artifact identity",
            status: "ACTIVE_WORK",
            why: null,
            startedAt: new Date().toISOString(),
            lastActivity: "Reconfirming artifact identity",
            lastActivityAt: new Date().toISOString(),
            nextExpectedStep: "PREPARE_SOURCE_BUNDLE",
            blocker: null,
            authorizationRequired: null,
          },
          systemView: {
            missionId: GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_MISSION_ID,
            engine: "market_validation",
            step: "QUALITY_REVIEW",
            workerOrProvider: null,
            artifactId: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
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
