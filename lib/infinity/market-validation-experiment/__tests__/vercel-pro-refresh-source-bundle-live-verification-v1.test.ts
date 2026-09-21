import { describe, expect, it, beforeEach } from "vitest";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import { ACTION_TYPE_REGISTRY_V1 } from "@/lib/infinity/launch-gateway/action-registry";
import { classifyVercelLiveCost } from "@/lib/infinity/governed-deployment-execution/vercel-live-config";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { CANONICAL_FOOTER_COPY } from "@/lib/infinity/venture-build-orchestration/constants";
import { classifyValidationDeploymentCost } from "../cost";
import { emptyCostFacts, evaluateCostProof } from "../cost-evidence";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  VERIFIED_HOSTING_CAPABILITIES,
} from "../constants";
import { evaluateValidationExperimentEag } from "../eag-policy";
import { evaluateEconomicEligibility } from "../economic-read-live";
import {
  getEconomicReadVerification,
  persistEconomicReadVerification,
  resetEconomicReadVerification,
} from "../economic-read-verification";
import { executeMarketValidationExperiment, rememberValidationDeployment, resetExperimentRuntime } from "../execute";
import { handlePublicValidationIngest, resetPublicIngestRuntime } from "../ingest";
import { evaluateProviderPlanEligibility, inspectFreshPlanEligibility, planReplacedStaleHobby } from "../plan-eligibility";
import { evaluateSourceBundlePreLiveGate } from "../pre-live-gate";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { evaluateSourceBundleLiveWriteGate, getSourceBundleVerification, resetSourceBundleVerification } from "../source-bundle-verification";
import { normalizeAccountPlan } from "../vercel-economic-read";
import type { ActionAuthorityGrant, TreasuryActionGrant } from "@/lib/infinity/governed-deployment-execution/types";

function eagGrant(): ActionAuthorityGrant {
  return { actionType: "DEPLOY_APPLICATION", authorizationId: "eag_pro", decision: "AUTO_AUTHORIZE" };
}

function treasuryGrant(): TreasuryActionGrant {
  return {
    actionType: "DEPLOY_APPLICATION",
    authorizationId: "tr_pro",
    decision: "AUTO_AUTHORIZE",
    authorizedAmountUsd: 5,
    costActuality: "ESTIMATE",
    reservationId: null,
  };
}

function persistPlan(plan: string) {
  return persistEconomicReadVerification({
    liveReadAttempted: true,
    planStatus: "READ_ONLY_VERIFIED",
    timestamp: new Date().toISOString(),
    snapshot: {
      ...getEconomicReadVerification().snapshot,
      plan: {
        teamId: "team_expected",
        teamSlug: "infinity-test",
        plan,
        billingPeriod: null,
        source: "GET /v2/teams/{teamId}",
      },
    },
  });
}

describe("VERCEL PRO REFRESH + SOURCE-BUNDLE LIVE VERIFICATION + CRE VALIDATION DEPLOY V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetPublicIngestRuntime();
    resetSourceBundleVerification();
    resetEconomicReadVerification();
  });

  it("replaces stale Hobby with a fresh Pro plan read and only clears the plan gate", () => {
    const stale = persistPlan("hobby");
    expect(inspectFreshPlanEligibility().marketValidationExperiment).toBe("FAIL");
    expect(inspectFreshPlanEligibility().commercialUse).toBe("NO");
    const fresh = persistPlan("pro");
    expect(planReplacedStaleHobby({ previous: stale.snapshot.plan, fresh: fresh.snapshot.plan })).toBe(true);
    const eligibility = inspectFreshPlanEligibility("hobby");
    expect(eligibility.plan).toBe("pro");
    expect(eligibility.commercialUse).toBe("YES");
    expect(eligibility.marketValidationExperiment).toBe("PASS");
    expect(eligibility.authorizesDeployment).toBe(false);
    expect(eligibility.costImpliedByPlan).toBe(false);
    expect(evaluateProviderPlanEligibility("hobby").reason).toContain("PLAN_REFRESH_DID_NOT_CONFIRM_PRO");
    expect(normalizeAccountPlan({
      id: "team_expected",
      billing: { plan: "pro" },
    }, "team_expected")?.plan).toBe("pro");
  });

  it("reruns the cost classifier and keeps Pro from implying known or zero cost", async () => {
    persistPlan("pro");
    const cost = classifyValidationDeploymentCost();
    expect(cost.finalClassification).toBe("UNKNOWN");
    expect(cost.unknownTreatedAsZero).toBe(false);
    expect(cost.adapterEstimateAcceptedAsKnownZero).toBe(false);
    expect(cost.registryDefaultAcceptedAsKnownZero).toBe(false);
    expect(classifyVercelLiveCost()).toBe("UNKNOWN");
    const estimate = await vercelAdapter.estimate();
    expect(estimate.estimatedCostUsd).toBe(0);
    expect(ACTION_TYPE_REGISTRY_V1[SOURCE_BUNDLE_CAPABILITY]?.estimatedCostUsd).toBe(0);
    expect(evaluateCostProof({
      ...emptyCostFacts(),
      accountPlanObserved: true,
      accountPlanValue: "pro",
      accountPlanSource: "GET /v2/teams/{teamId}",
    }).classification).toBe("UNKNOWN");
    const eligibility = evaluateEconomicEligibility(cost.finalClassification);
    expect(eligibility.economicallyEligible).toBe(false);
    expect(eligibility.treasuryMutated).toBe(false);
  });

  it("reevaluates EAG and keeps the source-bundle write fail-closed while cost is UNKNOWN", async () => {
    persistPlan("pro");
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const files = result.artifact?.files ?? [];
    const blob = files.map((file) => file.content).join("\n");
    expect(result.authorization.artifactValidation).toBe("PASS");
    expect(result.authorization.formBackendReady).toBe(true);
    expect(result.authorization.analyticsBackendReady).toBe(true);
    expect(result.authorization.secretSafety).toBe("PASS");
    expect(blob).toContain(CANONICAL_FOOTER_COPY);
    expect(result.authorization.costClassification).toBe("UNKNOWN");
    expect(result.authorization.eag).not.toBe("APPROVED");
    expect(result.authorization.eagBypassed).toBe(false);
    const eag = evaluateValidationExperimentEag({
      artifactEligible: true,
      purpose: MARKET_VALIDATION_PURPOSE,
      providerCapabilityVerified: true,
      deployInputCompatible: true,
      newCapabilityRequired: true,
      newCapabilityVerified: false,
      formReady: true,
      analyticsReady: true,
      secretSafety: "PASS",
      costClassification: "UNKNOWN",
      unknownCost: true,
      treasuryAuthorized: true,
      customDomainRequested: false,
      dnsRequested: false,
      paymentsRequested: false,
      treasuryRequested: false,
      adsRequested: false,
      existingDeploymentCount: 0,
      eagGrants: [eagGrant()],
      treasuryGrants: [treasuryGrant()],
    });
    expect(eag.decision).not.toBe("APPROVED");
    const plan = inspectFreshPlanEligibility();
    const gate = evaluateSourceBundlePreLiveGate({
      adapterPass: true,
      artifactPass: true,
      formPass: true,
      analyticsPass: true,
      secretSafety: "PASS",
      planPass: plan.marketValidationExperiment === "PASS",
      commercialEligibilityPass: plan.commercialUse === "YES",
      deployPackagePass: true,
      costClassification: "UNKNOWN",
      unknownCost: true,
      economicAuthorizationPass: false,
      eagApproved: false,
      eagPermitsBoundedVerification: false,
    });
    expect(gate.plan).toBe("PASS");
    expect(gate.commercialEligibility).toBe("PASS");
    expect(gate.cost).toBe("FAIL");
    expect(gate.readyForLiveProviderCall).toBe(false);
    expect(evaluateSourceBundleLiveWriteGate({
      adapterImplemented: true,
      capabilityVerified: false,
      unknownCost: true,
      eagApproved: false,
      sourceIntegrity: "PASS",
      secretSafety: "PASS",
    }).allowed).toBe(false);
    expect(getSourceBundleVerification().status).toBe("UNVERIFIED");
    expect((VERIFIED_HOSTING_CAPABILITIES as readonly string[]).includes(SOURCE_BUNDLE_CAPABILITY)).toBe(false);
    expect(result.deployed).toBe(false);
    expect(result.fullProductBuildExecuted).toBe(false);
    expect(result.writeBoundary.domainPurchases).toBe(0);
    expect(result.writeBoundary.dnsWrites).toBe(0);
    expect(result.writeBoundary.stripeWrites).toBe(0);
    expect(result.writeBoundary.treasuryMovement).toBe(0);
    expect(result.writeBoundary.adSpend).toBe(0);
    const synthetic = handlePublicValidationIngest({
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      body: { kind: "event", type: "PAGE_VIEW", synthetic: true },
      byteLength: 64,
      clientKey: "pro-refresh-synthetic",
    });
    expect(synthetic.ok).toBe(true);
    expect(synthetic.productionAccepted).toBe(0);
    const first = rememberValidationDeployment({
      provider: "vercel",
      project: "infinity-validation-cre-lease-npv-e72beb7b",
      deploymentId: "dpl_pro_replay",
      url: "https://example.vercel.app",
      artifactId: LOCKED_CRE_ARTIFACT_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
    });
    expect(rememberValidationDeployment({ ...first, deploymentId: "dpl_other" }).deploymentId).toBe("dpl_pro_replay");
  });
});
