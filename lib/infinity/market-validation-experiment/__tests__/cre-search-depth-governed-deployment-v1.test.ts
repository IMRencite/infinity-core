import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reconstructCreSearchDepthSuccessor } from "@/lib/infinity/venture-website-architecture/cre-search-depth-successor";
import { inspectExperimentClock } from "../experiment-clock";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import {
  DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEARCH_DEPTH_SUCCESSOR_URL,
  LOCKED_CRE_EXPERIMENT_ID,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
} from "../constants";
import { searchDepthRouteManifest } from "../cre-authority-expansion-routes";
import { GOVERNED_CRE_SEARCH_DEPTH_AND_SECTION_RHYTHM_DEPLOYMENT_V1 } from "../cre-search-depth-successor-deploy";
import { SEARCH_DEPTH_FOUNDER_AUTHORIZATION_ID } from "../cre-search-depth-authorization";
import { isCreValidationArtifactId } from "../current-cre-artifact";
import { topicDepthCoverageTable } from "@/lib/infinity/venture-website-architecture/search-demand-depth-research";
import {
  activateSearchDepthSuccessorPublicArtifact,
  getCanonicalActivePublicValidationState,
  isAuthorityWidthSuccessorPublicActive,
  isSearchDepthSuccessorPublicActive,
  searchDepthSuccessorActivationMutationsConsumed,
} from "../active-public-artifact";

function observerState() {
  return JSON.parse(readFileSync(".infinity/communication/inbound-observer-state.json", "utf8")) as {
    status: string;
    trackedConversationIds: string[];
    historyCheckpointId: string;
    mode: string;
    lastInboundProcessed: string | null;
  };
}

describe("GOVERNED CRE SEARCH DEPTH AND SECTION RHYTHM DEPLOYMENT V1", () => {
  it("locks exact frozen successor identity, digest, 93 routes, and depth gates", async () => {
    const successor = await reconstructCreSearchDepthSuccessor();
    expect(successor.artifactId).toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.artifactId).toBe("art_e6d2a3a1f46d117d61c9");
    expect(successor.digest).toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.digest).toBe("6f6393a8a9a9cb7b1c713fe396017b0da58903b70c842856a5cfd2bf2e55113f");
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    expect(searchDepthRouteManifest().intendedCount).toBe(93);
    expect(successor.routes).toBe(93);
    expect(successor.newStandaloneRoutes).toBe(36);
    expect(successor.publishability.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(successor.demand.overall).toBe("PASS");
    expect(successor.discovery.overall).toBe("PASS");
    expect(successor.cannibal.overall).toBe("PASS");
    expect(successor.rhythm.overall).toBe("PASS");
    expect(successor.contrast.overall).toBe("PASS");
    expect(successor.demand.thinPages).toBe(0);
    expect(successor.cannibal.cannibalizingPages).toBe(0);
    expect(topicDepthCoverageTable().every((row) => row.finalStandalone >= 10)).toBe(true);
    expect(GOVERNED_CRE_SEARCH_DEPTH_AND_SECTION_RHYTHM_DEPLOYMENT_V1).toBe(
      "GOVERNED_CRE_SEARCH_DEPTH_AND_SECTION_RHYTHM_DEPLOYMENT_V1",
    );
    expect(GOVERNED_CRE_SEARCH_DEPTH_AND_SECTION_RHYTHM_DEPLOYMENT_V1).not.toMatch(/WAVE_2|OUTREACH|COLD/);
    expect(SEARCH_DEPTH_FOUNDER_AUTHORIZATION_ID).not.toMatch(/WAVE_2|OUTREACH/);
  }, 180000);

  it("records exactly one deployment and one activation with width predecessor lineage", () => {
    const deploy = JSON.parse(readFileSync(".infinity/search-depth-deploy-result.json", "utf8")) as {
      deployments: number;
      deploymentId: string;
      publicUrl: string;
      providerFinalState: string;
      publiclyLaunched: boolean;
      latestCompleted: string;
    };
    const activate = JSON.parse(readFileSync(".infinity/search-depth-activate-result.json", "utf8")) as {
      passed: boolean;
      activated: boolean;
    };
    expect(DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_5zWCLA1rQLVLXed4Wi2ypvk9tfFj");
    expect(DEPLOYED_SEARCH_DEPTH_SUCCESSOR_URL).toBe(
      "https://infinity-validation-cre-lease-npv-e72beb7b-kd9ktl3qy.vercel.app",
    );
    expect(deploy.deployments).toBe(1);
    expect(deploy.deploymentId).toBe(DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID);
    expect(deploy.publicUrl).toBe(DEPLOYED_SEARCH_DEPTH_SUCCESSOR_URL);
    expect(deploy.providerFinalState).toBe("READY");
    expect(deploy.publiclyLaunched).toBe(false);
    expect(deploy.latestCompleted).toBe(GOVERNED_CRE_SEARCH_DEPTH_AND_SECTION_RHYTHM_DEPLOYMENT_V1);
    expect(activate.passed).toBe(true);
    expect(activate.activated).toBe(true);
    expect(getCanonicalActivePublicValidationState()).toEqual({
      activeArtifactId: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
      activeDigest: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
      activeDeploymentId: DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
      activeUrl: DEPLOYED_SEARCH_DEPTH_SUCCESSOR_URL,
    });
    expect(isSearchDepthSuccessorPublicActive()).toBe(true);
    expect(isAuthorityWidthSuccessorPublicActive()).toBe(false);
    expect(searchDepthSuccessorActivationMutationsConsumed()).toBe(1);
    expect(DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_2qx97rjBqkHMnFEiwyRWM9EA4ohe");
    expect(getCanonicalActivePublicValidationState().activeArtifactId).not.toBe(
      SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
    );
    expect(() =>
      activateSearchDepthSuccessorPublicArtifact({
        artifactId: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
        digest: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
        deploymentId: DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
        url: DEPLOYED_SEARCH_DEPTH_SUCCESSOR_URL,
      }),
    ).toThrow(/activation_authorization_already_consumed/);
    expect(searchDepthSuccessorActivationMutationsConsumed()).toBe(1);
  });

  it("preserves experiment clock, observer, no Wave 2, and PUBLICLY_LAUNCHED = NO", () => {
    const clock = inspectExperimentClock();
    const evidence = inspectRealMarketEvidence();
    const observer = observerState();
    expect(LOCKED_CRE_EXPERIMENT_ID).toBe("exp_e72beb7b6d35e7b20acf");
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(clock.restarted).toBe(false);
    expect(clock.evidenceStart).toBe("2026-08-29T15:18:52.131Z");
    expect(clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(observer.status).toBe("RUNNING");
    expect(observer.mode).toBe("GMAIL_HISTORY_BOUNDED_POLL");
    expect(observer.trackedConversationIds).toEqual(["cnv_ff749bc4cff5d045", "cnv_c0e5bd3a282977c0"]);
    expect(observer.lastInboundProcessed).toBe(null);
  });
});
