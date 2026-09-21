import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reconstructCreAuthorityFinalPolishSuccessor } from "@/lib/infinity/venture-website-architecture/cre-authority-final-polish-successor";
import {
  evaluateSemanticInternalLinkDensity,
  evaluateTopicGraphConnectivity,
} from "@/lib/infinity/venture-website-architecture/authority-expansion-gates";
import { pageContent } from "@/lib/infinity/venture-website-architecture/answer-authority/page-inspect";
import { CANONICAL_PUBLIC_FOOTER_ATTRIBUTION } from "@/lib/infinity/venture-website-architecture/public-authority-standard/constants";
import { inspectExperimentClock } from "../experiment-clock";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import {
  DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_URL,
  LOCKED_CRE_EXPERIMENT_ID,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST,
} from "../constants";
import {
  activateAuthorityFinalPolishSuccessorPublicArtifact,
  authorityFinalPolishSuccessorActivationMutationsConsumed,
  getCanonicalActivePublicValidationState,
  isAuthorityFinalPolishSuccessorPublicActive,
} from "../active-public-artifact";
import { clarifyAuthorityGraphCounts } from "../cre-authority-final-polish-graph";
import { authorityExpansionRouteManifest } from "../cre-authority-expansion-routes";
import { GOVERNED_CRE_FINAL_AUTHORITY_POLISH_DEPLOYMENT_V1 } from "../cre-authority-final-polish-successor-deploy";
import { AUTHORITY_FINAL_POLISH_FOUNDER_AUTHORIZATION_ID } from "../cre-authority-final-polish-authorization";
import { isCreValidationArtifactId } from "../current-cre-artifact";

function observerState() {
  return JSON.parse(readFileSync(".infinity/communication/inbound-observer-state.json", "utf8")) as {
    status: string;
    trackedConversationIds: string[];
    historyCheckpointId: string;
    mode: string;
    lastInboundProcessed: string | null;
  };
}

describe("GOVERNED CRE FINAL AUTHORITY POLISH DEPLOYMENT V1", () => {
  it("locks exact frozen polish identity, digest, 57 routes, and graph clarification", async () => {
    const successor = await reconstructCreAuthorityFinalPolishSuccessor();
    const manifest = authorityExpansionRouteManifest();
    const graph = evaluateTopicGraphConnectivity(successor.files);
    const counts = clarifyAuthorityGraphCounts(successor.files);
    const density = evaluateSemanticInternalLinkDensity(successor.files);
    const cam = pageContent(successor.files, "/occupancy-costs/what-is-cam-in-a-commercial-lease");
    expect(successor.artifactId).toBe(SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.artifactId).toBe("art_3b428a17dfca6e047550");
    expect(successor.digest).toBe(SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.digest).toBe("d35578c714c2556998e4f548c214aad045ca2cefc157496c4ead2334f2d0f953");
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    expect(manifest.intendedCount).toBe(57);
    expect(successor.routes).toBe(57);
    expect(successor.predecessorArtifactId).toBe(SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID);
    expect(successor.publishability.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(CANONICAL_PUBLIC_FOOTER_ATTRIBUTION).toBe("An Infinity OS Venture");
    expect(successor.files.some((file) => file.encoding !== "base64" && file.content.includes("An Infinity OS Venture"))).toBe(true);
    expect(successor.files.some((file) => file.encoding !== "base64" && file.content.includes("An Infinite OS Venture"))).toBe(false);
    expect(cam).not.toMatch(/The sample treats CAM as tenant-paid on a net path[\s\S]{0,240}The sample treats CAM as tenant-paid on a net path/);
    expect(cam).not.toMatch(/Using one CAM number for two buildings[\s\S]{0,240}Using one CAM number for two buildings/);
    expect(graph.report.authorityNodes).toBe(41);
    expect(graph.report.orphans).toBe(0);
    expect(graph.report.deadEnds).toBe(0);
    expect(counts.orphans).toBe(0);
    expect(counts.deadEnds).toBe(0);
    expect(counts.totalUniqueAuthorityGraphEdges).toBe(counts.connectivityEdges);
    expect(counts.rawSemanticNavInstances).toBeGreaterThan(0);
    expect(counts.uniqueSemanticNavGraphEdges).toBeGreaterThan(0);
    expect(density.overall).toBe("PASS");
    expect(successor.navigation.blocks).toBe(54);
    expect(successor.navigation.cards).toBe(253);
    expect(successor.navigation.uniqueDestinations).toBe(38);
    expect(successor.highlights.sourcedQuotes).toBe(0);
  }, 180000);

  it("records exactly one deployment and one activation with expansion predecessor lineage", () => {
    expect(DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_5cFWWuPZYkJcUfmwSqGCMG8zS8hY");
    expect(DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_URL).toBe(
      "https://infinity-validation-cre-lease-npv-e72beb7b-3mxvegjtz.vercel.app",
    );
    expect(getCanonicalActivePublicValidationState().activeArtifactId).not.toBe(
      SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
    );
    expect(isAuthorityFinalPolishSuccessorPublicActive()).toBe(false);
    expect(authorityFinalPolishSuccessorActivationMutationsConsumed()).toBe(1);
    expect(GOVERNED_CRE_FINAL_AUTHORITY_POLISH_DEPLOYMENT_V1).toBe(
      "GOVERNED_CRE_FINAL_AUTHORITY_POLISH_DEPLOYMENT_V1",
    );
    expect(GOVERNED_CRE_FINAL_AUTHORITY_POLISH_DEPLOYMENT_V1).not.toMatch(/WAVE_2|OUTREACH|COLD/);
    expect(AUTHORITY_FINAL_POLISH_FOUNDER_AUTHORIZATION_ID).not.toMatch(/WAVE_2|OUTREACH/);
    expect(() =>
      activateAuthorityFinalPolishSuccessorPublicArtifact({
        artifactId: SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
        digest: SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST,
        deploymentId: DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_DEPLOYMENT_ID,
        url: DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_URL,
      }),
    ).toThrow(/activation_authorization_already_consumed/);
    expect(authorityFinalPolishSuccessorActivationMutationsConsumed()).toBe(1);
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
  });
});
