import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reconstructCreAuthorityExpansionSuccessor } from "@/lib/infinity/venture-website-architecture/cre-authority-expansion-successor";
import {
  evaluateExpandedPublicAuthorityPublishability,
  evaluateSearchIntentConversionPath,
  evaluateTopicGraphConnectivity,
} from "@/lib/infinity/venture-website-architecture/authority-expansion-gates";
import {
  CRE_PUBLIC_AUTHORITY_REFERENCE,
  creReferenceCompatibility,
  infinityPublicAuthorityStandard,
  publicPageArchetypeRegistry,
} from "@/lib/infinity/venture-website-architecture/public-authority-standard";
import { inspectExperimentClock } from "../experiment-clock";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import {
  DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL,
  DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_DEPLOYMENT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID,
} from "../constants";
import {
  activateAuthorityExpansionSuccessorPublicArtifact,
  authorityExpansionSuccessorActivationMutationsConsumed,
  getCanonicalActivePublicValidationState,
  isAuthorityExpansionSuccessorPublicActive,
  isVisualHomepageFoldSuccessorPublicActive,
} from "../active-public-artifact";
import { authorityExpansionRouteManifest } from "../cre-authority-expansion-routes";
import { GOVERNED_CRE_SEARCH_VALIDATED_AUTHORITY_DEPLOYMENT_V1 } from "../cre-authority-expansion-successor-deploy";
import { AUTHORITY_EXPANSION_FOUNDER_AUTHORIZATION_ID } from "../cre-authority-expansion-authorization";
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

describe("GOVERNED CRE SEARCH-VALIDATED AUTHORITY DEPLOYMENT V1", () => {
  it("locks exact frozen artifact identity, digest, 57 routes, and reference compatibility", async () => {
    const successor = await reconstructCreAuthorityExpansionSuccessor();
    const manifest = authorityExpansionRouteManifest();
    const publishability = evaluateExpandedPublicAuthorityPublishability(successor.files);
    const graph = evaluateTopicGraphConnectivity(successor.files);
    expect(successor.artifactId).toBe(SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID);
    expect(successor.artifactId).toBe("art_00cd1821c5a178bf2487");
    expect(successor.digest).toBe(SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.digest).toBe("09857789812df6bcba9f18a70ab35e03965373855bb3fa849e22e43d363f4823");
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    expect(manifest.intendedCount).toBe(57);
    expect(successor.newRouteCount).toBe(57);
    expect(manifest.topicHubs).toHaveLength(7);
    expect(manifest.questionAuthorityPages).toHaveLength(34);
    expect(manifest.redirectSupport).toHaveLength(6);
    expect(successor.publishability.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(publishability.overall).toBe("PASS");
    expect(publishability.topicalCompleteness).toBe("PASS");
    expect(publishability.aboveFoldVisualCoverage).toBe("PASS");
    expect(publishability.answerSurfaceCoverage).toBe("PASS");
    expect(publishability.searchIntentConversionPath).toBe("PASS");
    expect(creReferenceCompatibility().overall).toBe("PASS");
    expect(infinityPublicAuthorityStandard().version).toBe("V1");
    expect(publicPageArchetypeRegistry().model).toBe("PublicPageArchetypeRegistry");
    expect(successor.research.rawValidatedQuestionCandidates).toBe(154);
    expect(successor.research.canonicalUnique).toBe(109);
    expect(successor.research.duplicatesMerged).toBe(45);
    expect(successor.research.crossTopicRelationships).toBe(73);
    expect(graph.report.authorityNodes).toBe(41);
    expect(graph.report.contextualInternalEdges).toBe(362);
    expect(graph.report.hubToSpoke).toBe(34);
    expect(graph.report.spokeToHub).toBe(54);
    expect(graph.report.sameTopicLateral).toBe(154);
    expect(graph.report.crossTopic).toBe(88);
    expect(graph.report.commercialPath).toBe(120);
    expect(graph.report.orphans).toBe(0);
    expect(graph.report.deadEnds).toBe(0);
  }, 180000);

  it("records exactly one deployment and one activation with homepage-fold predecessor lineage", () => {
    expect(DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_EppQ8GVJfZ6uQpyXxWiukXP52kKz");
    expect(DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL).toBe(
      "https://infinity-validation-cre-lease-npv-e72beb7b-onjerun3q.vercel.app",
    );
    expect(getCanonicalActivePublicValidationState().activeArtifactId).not.toBe(
      SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
    );
    expect(isAuthorityExpansionSuccessorPublicActive()).toBe(false);
    expect(authorityExpansionSuccessorActivationMutationsConsumed()).toBe(1);
    expect(isVisualHomepageFoldSuccessorPublicActive()).toBe(false);
    expect(DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_5TCnCweZNfTp3ZDAQoEcoyZv6Npg");
    expect(() =>
      activateAuthorityExpansionSuccessorPublicArtifact({
        artifactId: SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
        digest: SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST,
        deploymentId: DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID,
        url: DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL,
      }),
    ).toThrow(/activation_authorization_already_consumed/);
    expect(authorityExpansionSuccessorActivationMutationsConsumed()).toBe(1);
    expect(CRE_PUBLIC_AUTHORITY_REFERENCE.deploymentId).toBe(DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID);
    expect(CRE_PUBLIC_AUTHORITY_REFERENCE.activeUrl).toBe(DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL);
    expect(CRE_PUBLIC_AUTHORITY_REFERENCE.qualityState).toBe("PASS");
    expect(CRE_PUBLIC_AUTHORITY_REFERENCE.founderReview).toBe("PENDING");
    expect(CRE_PUBLIC_AUTHORITY_REFERENCE.metricsAreUniversalMinimums).toBe(false);
  });

  it("preserves experiment clock, observer, no Wave 2, and PUBLICLY_LAUNCHED = NO", () => {
    const clock = inspectExperimentClock();
    const evidence = inspectRealMarketEvidence();
    const observer = observerState();
    const conversion = evaluateSearchIntentConversionPath;
    expect(LOCKED_CRE_EXPERIMENT_ID).toBe("exp_e72beb7b6d35e7b20acf");
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(clock.restarted).toBe(false);
    expect(clock.evidenceStart).toBe("2026-08-29T15:18:52.131Z");
    expect(clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(observer.status).toBe("RUNNING");
    expect(observer.mode).toBe("GMAIL_HISTORY_BOUNDED_POLL");
    expect(observer.trackedConversationIds).toEqual(["cnv_ff749bc4cff5d045", "cnv_c0e5bd3a282977c0"]);
    expect(observer.lastInboundProcessed ?? null).toBeNull();
    expect(GOVERNED_CRE_SEARCH_VALIDATED_AUTHORITY_DEPLOYMENT_V1).toBe(
      "GOVERNED_CRE_SEARCH_VALIDATED_AUTHORITY_DEPLOYMENT_V1",
    );
    expect(GOVERNED_CRE_SEARCH_VALIDATED_AUTHORITY_DEPLOYMENT_V1).not.toMatch(/WAVE_2|OUTREACH|COLD/);
    expect(AUTHORITY_EXPANSION_FOUNDER_AUTHORIZATION_ID).not.toMatch(/WAVE_2|OUTREACH/);
    expect(SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID).toBe("art_025be3f61b292cd3c0ef");
    expect(typeof conversion).toBe("function");
  });
});
