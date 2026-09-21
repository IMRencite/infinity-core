import { describe, expect, it, beforeEach } from "vitest";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import { ACTION_TYPE_REGISTRY_V1 } from "@/lib/infinity/launch-gateway/action-registry";
import { VERCEL_LIVE_ALLOWED_ACTIONS } from "@/lib/infinity/governed-deployment-execution/vercel-live";
import { classifyVercelLiveCost } from "@/lib/infinity/governed-deployment-execution/vercel-live-config";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { inspectReadOnlyCostCapability, writeBillingWasInvoked } from "../billing-read-capability";
import { classifyValidationDeploymentCost } from "../cost";
import {
  ACCOUNT_PLAN_READ_CAPABILITY,
  BILLING_READ_CAPABILITY,
  BILLING_WRITE_CAPABILITY,
  emptyCostFacts,
  evaluateCostProof,
  inspectDeploymentCostEvidence,
  inspectExistingCostFacts,
} from "../cost-evidence";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  UNVERIFIED_HOSTING_CAPABILITIES,
  VERIFIED_HOSTING_CAPABILITIES,
} from "../constants";
import { eagAllowsClassification, inspectEagEconomicPolicy } from "../eag-economics";
import { evaluateValidationExperimentEag } from "../eag-policy";
import { executeMarketValidationExperiment, rememberValidationDeployment, resetExperimentRuntime } from "../execute";
import { handlePublicValidationIngest, resetPublicIngestRuntime } from "../ingest";
import { evaluateSourceBundlePreLiveGate } from "../pre-live-gate";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { evaluateSourceBundleLiveWriteGate, resetSourceBundleVerification } from "../source-bundle-verification";
import type { ActionAuthorityGrant, TreasuryActionGrant } from "@/lib/infinity/governed-deployment-execution/types";

function eagGrant(): ActionAuthorityGrant {
  return { actionType: "DEPLOY_APPLICATION", authorizationId: "eag_cost", decision: "AUTO_AUTHORIZE" };
}

function treasuryGrant(): TreasuryActionGrant {
  return {
    actionType: "DEPLOY_APPLICATION",
    authorizationId: "tr_cost",
    decision: "AUTO_AUTHORIZE",
    authorizedAmountUsd: 5,
    costActuality: "ESTIMATE",
    reservationId: null,
  };
}

describe("VERCEL DEPLOYMENT COST EVIDENCE + SOURCE-BUNDLE LIVE VERIFICATION V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetPublicIngestRuntime();
    resetSourceBundleVerification();
  });

  it("inspects existing account/plan/usage/billing evidence and keeps UNKNOWN", () => {
    const facts = inspectExistingCostFacts();
    expect(facts.accountPlanObserved).toBe(false);
    expect(facts.usageAllowanceObserved).toBe(false);
    expect(facts.billingObservationPresent).toBe(false);
    expect(facts.historicalVerificationCostState).toBe("UNKNOWN");
    expect(facts.historicalCostTelemetryPresent).toBe(false);
    const evidence = inspectDeploymentCostEvidence();
    expect(evidence.classification).toBe("UNKNOWN");
    expect(evidence.existingAccountPlanEvidence).toBe(false);
    expect(evidence.existingUsageEvidence).toBe(false);
    expect(evidence.existingBillingEvidence).toBe(false);
    expect(evidence.accountPlanSource).toBe("NONE");
    expect(evidence.usageSource).toBe("NONE");
    expect(evidence.billingSource).toBe("NONE");
    expect(evidence.missingEvidence).toContain("account_plan");
    expect(evidence.missingEvidence).toContain("included_usage_allowance");
    expect(evidence.missingEvidence).toContain("current_usage_consumption");
    expect(evidence.adapterEstimateAcceptedAsKnownZero).toBe(false);
    expect(evidence.registryDefaultAcceptedAsKnownZero).toBe(false);
    expect(evidence.historicalVerificationReinterpretedAsZero).toBe(false);
    expect(evidence.retrospectiveSpendInvented).toBe(false);
    const cost = classifyValidationDeploymentCost();
    expect(cost.finalClassification).toBe("UNKNOWN");
    expect(cost.estimatedAmount).toBeNull();
    expect(cost.upperBound).toBeNull();
    expect(cost.currency).toBe("USD");
    expect(cost.confidence).toBe("NONE");
    expect(cost.usageSnapshot.incrementalChargeKnown).toBe(false);
    expect(cost.unknownTreatedAsZero).toBe(false);
    expect(classifyVercelLiveCost()).toBe("UNKNOWN");
  });

  it("does not accept adapter zero, registry zero, or plan name alone as proof", async () => {
    const estimate = await vercelAdapter.estimate();
    expect(estimate.estimatedCostUsd).toBe(0);
    expect(ACTION_TYPE_REGISTRY_V1[SOURCE_BUNDLE_CAPABILITY]?.estimatedCostUsd).toBe(0);
    const zeros = evaluateCostProof({
      ...emptyCostFacts(),
      adapterEstimateUsd: 0,
      registryDefaultUsd: 0,
    });
    expect(zeros.classification).toBe("UNKNOWN");
    const planOnly = evaluateCostProof({
      ...emptyCostFacts(),
      accountPlanObserved: true,
      accountPlanValue: "hobby",
      accountPlanSource: "GET /v2/teams billing.plan",
    });
    expect(planOnly.classification).toBe("UNKNOWN");
    expect(planOnly.basis).toContain("Plan name alone");
  });

  it("requires plan plus usage plus no-incremental guarantee for NO_INCREMENTAL_COST", () => {
    const proven = evaluateCostProof({
      ...emptyCostFacts(),
      accountPlanObserved: true,
      accountPlanValue: "pro",
      accountPlanSource: "provider_account_record",
      usageAllowanceObserved: true,
      usageConsumptionObserved: true,
      usageSource: "provider_usage_snapshot",
      providerGuaranteeNoIncrementalCharge: true,
    });
    expect(proven.classification).toBe("NO_INCREMENTAL_COST");
    const incomplete = evaluateCostProof({
      ...emptyCostFacts(),
      accountPlanObserved: true,
      accountPlanValue: "pro",
      accountPlanSource: "provider_account_record",
    });
    expect(incomplete.classification).toBe("UNKNOWN");
  });

  it("requires a provider-supplied ceiling for BOUNDED and known rate semantics for METERED", () => {
    const invented = evaluateCostProof({
      ...emptyCostFacts(),
      providerUpperBound: 1,
      providerUpperBoundBasis: "historical_verification_ceiling",
    });
    expect(invented.classification).toBe("UNKNOWN");
    expect(invented.upperBound).toBeNull();
    const bounded = evaluateCostProof({
      ...emptyCostFacts(),
      providerUpperBound: 4.2,
      providerUpperBoundBasis: "provider_invoice_line_item",
    });
    expect(bounded.classification).toBe("BOUNDED");
    expect(bounded.upperBound).toBe(4.2);
    const noCeiling = evaluateCostProof(emptyCostFacts());
    expect(noCeiling.classification).toBe("UNKNOWN");
    expect(noCeiling.upperBound).toBeNull();
    const metered = evaluateCostProof({
      ...emptyCostFacts(),
      meteredRateKnown: true,
      meteredRateBasis: "provider_published_build_minute_rate",
    });
    expect(metered.classification).toBe("METERED");
    expect(metered.upperBound).toBeNull();
  });

  it("separates unverified billing.read from write billing and does not invoke either", () => {
    const capability = inspectReadOnlyCostCapability();
    expect(capability.capability).toBe(BILLING_READ_CAPABILITY);
    expect(capability.companionCapability).toBe(ACCOUNT_PLAN_READ_CAPABILITY);
    expect(capability.writeCapability).toBe(BILLING_WRITE_CAPABILITY);
    expect(capability.alreadyVerified).toBe(false);
    expect(capability.liveReadAttempted).toBe(false);
    expect(capability.providerCalls).toBe(0);
    expect(capability.mutations).toBe(0);
    expect(capability.currentlyAuthorizedToInvoke).toBe(false);
    expect(capability.invoked).toBe(false);
    expect(capability.hostingVerifiedReads).toEqual(["getUser", "listProjects", "listDeployments", "listDomains"]);
    expect(capability.hostingVerifiedReads).not.toContain(BILLING_READ_CAPABILITY);
    expect(capability.writeBillingAmongUnverified).toBe(true);
    expect(UNVERIFIED_HOSTING_CAPABILITIES.includes(BILLING_READ_CAPABILITY)).toBe(true);
    expect(UNVERIFIED_HOSTING_CAPABILITIES.includes(BILLING_WRITE_CAPABILITY)).toBe(true);
    expect((VERIFIED_HOSTING_CAPABILITIES as readonly string[]).includes(BILLING_READ_CAPABILITY)).toBe(false);
    expect((VERCEL_LIVE_ALLOWED_ACTIONS as readonly string[]).includes(BILLING_READ_CAPABILITY)).toBe(false);
    expect((VERCEL_LIVE_ALLOWED_ACTIONS as readonly string[]).includes(SOURCE_BUNDLE_CAPABILITY)).toBe(false);
    expect(writeBillingWasInvoked()).toBe(false);
    expect(classifyValidationDeploymentCost().readOnlyBillingAction).toBe("NONE");
  });

  it("keeps EAG UNKNOWN forbidden and does not change economic policy", () => {
    const policy = inspectEagEconomicPolicy();
    expect(policy.unknownAllowed).toBe(false);
    expect(policy.boundedAllowed).toBe(true);
    expect(policy.meteredAllowed).toBe(true);
    expect(policy.noIncrementalCostAllowed).toBe(true);
    expect(policy.policyChanged).toBe(false);
    expect(policy.treasuryMovement).toBe(0);
    expect(eagAllowsClassification("UNKNOWN")).toBe(false);
    expect(eagAllowsClassification("BOUNDED")).toBe(true);
    expect(eagAllowsClassification("METERED")).toBe(true);
    expect(eagAllowsClassification("NO_INCREMENTAL_COST")).toBe(true);
    const blocked = evaluateValidationExperimentEag({
      artifactEligible: true,
      purpose: MARKET_VALIDATION_PURPOSE,
      providerCapabilityVerified: true,
      deployInputCompatible: true,
      newCapabilityRequired: true,
      newCapabilityVerified: true,
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
    expect(blocked.decision).toBe("BLOCKED_BY_UNKNOWN_COST");
    expect(blocked.hardcodedDenied).toBe(false);
  });

  it("blocks the source-bundle pre-live gate while cost is UNKNOWN and does not deploy", async () => {
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const gate = evaluateSourceBundlePreLiveGate({
      adapterPass: true,
      artifactPass: result.authorization.artifactValidation === "PASS",
      formPass: result.authorization.formBackendReady,
      analyticsPass: result.authorization.analyticsBackendReady,
      secretSafety: result.authorization.secretSafety,
      costClassification: result.authorization.costClassification,
      unknownCost: result.authorization.unknownCost,
      economicAuthorizationPass: false,
      eagPermitsBoundedVerification: false,
    });
    expect(gate.adapter).toBe("PASS");
    expect(gate.artifact).toBe("PASS");
    expect(gate.form).toBe("PASS");
    expect(gate.analytics).toBe("PASS");
    expect(gate.secretSafety).toBe("PASS");
    expect(gate.cost).toBe("FAIL");
    expect(gate.economicAuthorization).toBe("FAIL");
    expect(gate.readyForLiveProviderCall).toBe(false);
    expect(evaluateSourceBundleLiveWriteGate({
      adapterImplemented: true,
      capabilityVerified: false,
      unknownCost: true,
      eagApproved: false,
      sourceIntegrity: "PASS",
      secretSafety: "PASS",
    }).liveVerificationAttempted).toBe(false);
    expect(result.deployed).toBe(false);
    expect(result.url).toBeNull();
    expect(result.customDomain).toBe(false);
    expect(result.state).toBe("EXPERIMENT_READY_BUT_EXTERNAL_ACTION_BLOCKED");
    expect(result.counts.qualifiedVisitors).toBe(0);
    expect(result.counts.strongIntent).toBe(0);
    expect(result.counts.qualifiedSubmissions).toBe(0);
    const synthetic = handlePublicValidationIngest({
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      body: { kind: "event", type: "PAGE_VIEW", synthetic: true },
      byteLength: 64,
      clientKey: "cost-evidence-synthetic",
    });
    expect(synthetic.ok).toBe(true);
    expect(synthetic.productionAccepted).toBe(0);
    const first = rememberValidationDeployment({
      provider: "vercel",
      project: "infinity-validation-cre-lease-npv-e72beb7b",
      deploymentId: "dpl_cost_replay",
      url: "https://example.vercel.app",
      artifactId: LOCKED_CRE_ARTIFACT_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
    });
    const second = rememberValidationDeployment({ ...first, deploymentId: "dpl_other" });
    expect(second.deploymentId).toBe("dpl_cost_replay");
    expect(result.writeBoundary.domainPurchases).toBe(0);
    expect(result.writeBoundary.dnsWrites).toBe(0);
    expect(result.writeBoundary.stripeWrites).toBe(0);
    expect(result.writeBoundary.treasuryMovement).toBe(0);
    expect(result.writeBoundary.adSpend).toBe(0);
  });
});
