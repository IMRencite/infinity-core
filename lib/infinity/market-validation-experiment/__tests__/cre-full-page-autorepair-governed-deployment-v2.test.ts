import { describe, expect, it } from "vitest";
import { reconstructCrePricingPrerenderRepairSuccessor } from "@/lib/infinity/venture-website-architecture/cre-pricing-prerender-repair-successor";
import {
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
} from "../constants";
import {
  GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V2,
  GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V2_MISSION_ID,
} from "../cre-full-page-autorepair-deploy-v2";
import { FULL_PAGE_AUTOREPAIR_V2_FOUNDER_AUTHORIZATION_ID } from "../cre-full-page-autorepair-v2-authorization";
import { HARD_PUBLISHABILITY_GATES } from "@/lib/infinity/venture-website-architecture/public-authority-standard/constants";
import { evaluateHumanFirstPublicLanguageGate, HUMAN_FIRST_BAD_FIXTURES } from "@/lib/infinity/venture-website-architecture/human-first-public-language-gate";
import { evaluateRenderedLinkContrastGate, FOUNDER_LINK_SAME_COLOR_FIXTURE } from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-link-contrast-gate";
import { evaluateRenderedTextContrastGate, FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE } from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { evaluateHqFrontLiveWorkVisibility } from "@/lib/infinity/mission-activity/hq-live-work-visibility";
import { ROOM_ACTIVITY_EMPTY } from "@/lib/infinity/operator-console/room-activity";
import { isCreValidationArtifactId } from "../current-cre-artifact";

describe("GOVERNED CRE FULL PAGE AUTOREPAIR DEPLOYMENT V2", () => {
  it("locks the pricing-prerender successor, fail-closed gates, and single-use V2 ceiling", async () => {
    const successor = await reconstructCrePricingPrerenderRepairSuccessor();
    expect(GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V2).toBe("GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V2");
    expect(GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V2_MISSION_ID).toBe("msn_cre_full_page_autorepair_deploy_v2");
    expect(FULL_PAGE_AUTOREPAIR_V2_FOUNDER_AUTHORIZATION_ID).toBe("founder_ceiling_cre_full_page_autorepair_deployment_v2");
    expect(FULL_PAGE_AUTOREPAIR_V2_FOUNDER_AUTHORIZATION_ID).not.toMatch(/WAVE_2|OUTREACH|DNS|DOMAIN/);
    expect(successor.artifactId).toBe(CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.predecessorArtifactId).toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.immutable).toBe(true);
    expect(successor.deployed).toBe(false);
    expect(successor.routes).toBe(93);
    expect(successor.pageLoop.overall).toBe("PASS");
    expect(successor.pageLoop.missingEvidence).toBe(0);
    expect(successor.pageLoop.repairCeilingExceeded).toBe(0);
    expect(successor.pageLoop.finalFailed).toBe(0);
    expect(successor.hookBoundary.overall).toBe("PASS");
    expect(isCreValidationArtifactId(CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID)).toBe(true);
    expect(HARD_PUBLISHABILITY_GATES).toContain("FullPublicRouteValidationGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("RenderedLinkContrastGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("HumanFirstPublicLanguageGate");
    expect(evaluateRenderedTextContrastGate(FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE).overall).toBe("FAIL");
    expect(evaluateRenderedLinkContrastGate(FOUNDER_LINK_SAME_COLOR_FIXTURE).overall).toBe("FAIL");
    for (const fixture of HUMAN_FIRST_BAD_FIXTURES) {
      expect(evaluateHumanFirstPublicLanguageGate(fixture).overall).toBe("FAIL");
    }
    expect(instrumentedRuntimeRegistry().runtimes.CreFullPageAutorepairDeployV2Runtime.usesMissionWrapper).toBe(true);
    expect(instrumentedRuntimeRegistry().contracts.CreFullPageAutorepairDeployV2Runtime.missionType).toBe(
      "GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V2",
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
              summary: "Coordinating the governed full-page autorepair deployment",
              allowAmbientMotion: true,
              latestEventId: "mae_cmd",
            },
          } as never,
          nowInspecting: {
            currentMission: GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V2,
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
            missionId: GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V2_MISSION_ID,
            engine: "market_validation",
            step: "QUALITY_REVIEW",
            workerOrProvider: null,
            artifactId: CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
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
