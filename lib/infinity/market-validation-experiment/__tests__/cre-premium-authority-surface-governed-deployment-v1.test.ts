import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reconstructCreSeoGeoDigitalRealEstateSuccessor } from "@/lib/infinity/venture-website-architecture/cre-digital-real-estate-successor";
import { seoGeoPageRouteManifest } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import { inspectExperimentClock } from "../experiment-clock";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import {
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEO_GEO_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEO_GEO_SUCCESSOR_URL,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST,
} from "../constants";
import { isCreValidationArtifactId } from "../current-cre-artifact";
import {
  SEO_GEO_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  evaluateSeoGeoSuccessorFounderAuthorization,
  priorSeoGeoDeploymentAuthorizationsAreNotReusable,
  seoGeoSuccessorFounderScope,
} from "../cre-seo-geo-successor-authorization";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { getCanonicalActivePublicValidationState } from "../active-public-artifact";

function observerState() {
  return JSON.parse(readFileSync(".infinity/communication/inbound-observer-state.json", "utf8")) as {
    status: string;
    trackedConversationIds: string[];
    historyCheckpointId: string;
  };
}

describe("CRE premium authority surface governed deployment v1", () => {
  it("locks exact successor identity and a new single-use authorization", async () => {
    const clockBefore = inspectExperimentClock();
    const evidenceBefore = inspectRealMarketEvidence();
    const observerBefore = observerState();
    const successor = await reconstructCreSeoGeoDigitalRealEstateSuccessor();
    expect(successor.artifactId).toBe(SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.publishability.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(seoGeoPageRouteManifest().pageRoutes).toHaveLength(33);
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    const founder = evaluateSeoGeoSuccessorFounderAuthorization();
    expect(founder.recognized).toBe(true);
    expect(founder.authorization?.authorizationId).toBe(SEO_GEO_SUCCESSOR_FOUNDER_AUTHORIZATION_ID);
    expect(founder.authorization?.maximumExecutions).toBe(1);
    expect(founder.founderCeilingTreatedAsProviderCost).toBe(false);
    const scope = seoGeoSuccessorFounderScope();
    expect(scope.capability).toBe(SOURCE_BUNDLE_CAPABILITY);
    expect(scope.artifactId).toBe(SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID);
    expect(priorSeoGeoDeploymentAuthorizationsAreNotReusable().reusedPriorId).toBe(false);
    expect(SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID).toBe("art_ba6e91dc5e569f6c13a9");
    expect(DEPLOYED_SEO_GEO_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_9ZHwftxcxH3K6dVM6oYREb4vqrJj");
    expect(DEPLOYED_SEO_GEO_SUCCESSOR_URL).toBe(
      "https://infinity-validation-cre-lease-npv-e72beb7b-1gk4q1cm7.vercel.app",
    );
    expect(getCanonicalActivePublicValidationState().activeArtifactId).not.toBe(
      SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
    );
    expect(PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID).toBe("art_c62f12bc59759bdbf3d1");
    expect(DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_DUsqpm1Td554DmesjZZKsYLcudA3");
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(inspectExperimentClock().evidenceStart).toBe(clockBefore.evidenceStart);
    expect(inspectRealMarketEvidence().counts).toEqual(evidenceBefore.counts);
    const observerAfter = observerState();
    expect(observerAfter.status).toBe("RUNNING");
    expect(observerAfter.trackedConversationIds).toHaveLength(2);
    expect(observerAfter.historyCheckpointId).toBe(observerBefore.historyCheckpointId);
  }, 180000);
});
