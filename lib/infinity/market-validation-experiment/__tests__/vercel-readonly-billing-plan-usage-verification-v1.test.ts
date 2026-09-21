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
  factsFromEconomicVerification,
} from "../cost-evidence";
import {
  CRE_CANDIDATE_ID,
  UNVERIFIED_HOSTING_CAPABILITIES,
  VERIFIED_HOSTING_CAPABILITIES,
} from "../constants";
import { evaluateEconomicEligibility } from "../economic-read-live";
import {
  getEconomicReadVerification,
  persistEconomicReadVerification,
  resetEconomicReadVerification,
} from "../economic-read-verification";
import { USAGE_READ_CAPABILITY } from "../economic-read-types";
import { executeMarketValidationExperiment, resetExperimentRuntime } from "../execute";
import { resetPublicIngestRuntime } from "../ingest";
import { getSourceBundleVerification, resetSourceBundleVerification } from "../source-bundle-verification";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import {
  normalizeAccountPlan,
  normalizeBillingCharges,
  relevantDeploymentCharges,
} from "../vercel-economic-read";

describe("VERCEL READ-ONLY BILLING + PLAN + USAGE VERIFICATION V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetPublicIngestRuntime();
    resetSourceBundleVerification();
    resetEconomicReadVerification();
  });

  it("types account.plan.read and billing.read separately from write billing and usage.read", () => {
    const initial = getEconomicReadVerification();
    expect(initial.planCapability).toBe(ACCOUNT_PLAN_READ_CAPABILITY);
    expect(initial.billingCapability).toBe(BILLING_READ_CAPABILITY);
    expect(initial.usageCapability).toBe(USAGE_READ_CAPABILITY);
    expect(initial.usageRequired).toBe(false);
    expect(initial.usageStatus).toBe("NOT_REQUIRED");
    expect(initial.planStatus).toBe("UNVERIFIED");
    expect(initial.billingStatus).toBe("UNVERIFIED");
    expect(initial.writeCapabilitiesChanged).toBe(false);
    expect(initial.sourceBundleRemainsUnverified).toBe(true);
    expect(inspectReadOnlyCostCapability().writeCapability).toBe(BILLING_WRITE_CAPABILITY);
    expect(UNVERIFIED_HOSTING_CAPABILITIES.includes(BILLING_READ_CAPABILITY)).toBe(true);
    expect(UNVERIFIED_HOSTING_CAPABILITIES.includes(ACCOUNT_PLAN_READ_CAPABILITY)).toBe(true);
    expect((VERIFIED_HOSTING_CAPABILITIES as readonly string[]).includes(BILLING_READ_CAPABILITY)).toBe(false);
    expect((VERCEL_LIVE_ALLOWED_ACTIONS as readonly string[]).includes(BILLING_READ_CAPABILITY)).toBe(false);
    expect((VERCEL_LIVE_ALLOWED_ACTIONS as readonly string[]).includes(SOURCE_BUNDLE_CAPABILITY)).toBe(false);
    expect(writeBillingWasInvoked()).toBe(false);
  });

  it("normalizes plan and billing and rejects the wrong team", () => {
    const ok = normalizeAccountPlan({
      id: "team_expected",
      slug: "infinity-test",
      billing: { plan: "hobby" },
    }, "team_expected");
    expect(ok?.plan).toBe("hobby");
    expect(ok?.teamId).toBe("team_expected");
    expect(ok?.source).toBe("GET /v2/teams/{teamId}");
    expect(normalizeAccountPlan({ id: "team_other", billing: { plan: "pro" } }, "team_expected")).toBeNull();
    const billing = normalizeBillingCharges(
      JSON.stringify({
        ServiceName: "Vercel Functions",
        BilledCost: 0.12,
        EffectiveCost: 0.1,
        ListUnitPrice: 0.4,
      }) + "\n",
      "2026-07-01T00:00:00.000Z",
      "2026-07-31T00:00:00.000Z",
    );
    expect(billing.chargeCount).toBe(1);
    expect(relevantDeploymentCharges(billing)).toHaveLength(1);
    expect(billing.source).toBe("GET /v1/billing/charges");
  });

  it("treats plan-only and historical no-charge as insufficient for NO_INCREMENTAL_COST", () => {
    const planOnly = evaluateCostProof({
      ...emptyCostFacts(),
      accountPlanObserved: true,
      accountPlanValue: "pro",
      accountPlanSource: "GET /v2/teams/{teamId}",
    });
    expect(planOnly.classification).toBe("UNKNOWN");
    const noCharge = persistEconomicReadVerification({
      liveReadAttempted: true,
      planStatus: "READ_ONLY_VERIFIED",
      billingStatus: "READ_ONLY_VERIFIED",
      snapshot: {
        ...getEconomicReadVerification().snapshot,
        plan: {
          teamId: "team_expected",
          teamSlug: "infinity-test",
          plan: "hobby",
          billingPeriod: null,
          source: "GET /v2/teams/{teamId}",
        },
        billing: {
          periodFrom: "2026-07-01T00:00:00.000Z",
          periodTo: "2026-07-31T00:00:00.000Z",
          chargeCount: 0,
          charges: [],
          billedCostSum: null,
          effectiveCostSum: null,
          unitPricesObserved: [],
          source: "GET /v1/billing/charges",
        },
      },
    });
    const facts = factsFromEconomicVerification(noCharge);
    expect(facts.accountPlanObserved).toBe(true);
    expect(facts.billingObservationPresent).toBe(true);
    expect(facts.providerGuaranteeNoIncrementalCharge).toBe(false);
    expect(evaluateCostProof(facts).classification).toBe("UNKNOWN");
    expect(evaluateCostProof(facts).missingEvidence).toContain("included_usage_allowance");
    expect(evaluateCostProof({
      ...emptyCostFacts(),
      accountPlanObserved: true,
      accountPlanValue: "pro",
      accountPlanSource: "provider",
      usageAllowanceObserved: true,
      usageConsumptionObserved: true,
      usageSource: "provider",
      providerGuaranteeNoIncrementalCharge: true,
    }).classification).toBe("NO_INCREMENTAL_COST");
    expect(evaluateCostProof({
      ...emptyCostFacts(),
      providerUpperBound: 4.2,
      providerUpperBoundBasis: "provider_invoice_line_item",
    }).classification).toBe("BOUNDED");
    expect(evaluateCostProof({
      ...emptyCostFacts(),
      meteredRateKnown: true,
      meteredRateBasis: "provider_list_unit_price",
    }).classification).toBe("METERED");
  });

  it("keeps deployment action cost separate from 14-day runtime and fails closed on UNKNOWN", async () => {
    const record = persistEconomicReadVerification({
      liveReadAttempted: true,
      planStatus: "READ_ONLY_VERIFIED",
      billingStatus: "READ_ONLY_VERIFIED",
      timestamp: new Date().toISOString(),
    });
    expect(record.snapshot.deploymentRuntime.deploymentActionSeparatedFromRuntime).toBe(true);
    expect(record.snapshot.deploymentRuntime.durationDays).toBe(14);
    expect(record.snapshot.deploymentRuntime.deploymentActionCost).toBe("UNKNOWN");
    expect(record.snapshot.deploymentRuntime.validationRuntimeCost).toBe("UNKNOWN");
    expect(record.freshness).not.toBe("NOT_VERIFIED");
    const cost = classifyValidationDeploymentCost();
    expect(cost.finalClassification).toBe("UNKNOWN");
    expect(cost.unknownTreatedAsZero).toBe(false);
    expect(classifyVercelLiveCost()).toBe("UNKNOWN");
    expect(cost.adapterEstimateAcceptedAsKnownZero).toBe(false);
    expect(cost.registryDefaultAcceptedAsKnownZero).toBe(false);
    const estimate = await vercelAdapter.estimate();
    expect(estimate.estimatedCostUsd).toBe(0);
    expect(ACTION_TYPE_REGISTRY_V1[SOURCE_BUNDLE_CAPABILITY]?.estimatedCostUsd).toBe(0);
    const eligibility = evaluateEconomicEligibility(cost.finalClassification);
    expect(eligibility.economicallyEligible).toBe(false);
    expect(eligibility.eagWriteExecuted).toBe(false);
    expect(eligibility.treasuryMutated).toBe(false);
  });

  it("does not treat a live economic read as hosting.deploy_source_bundle verification or a deploy", async () => {
    persistEconomicReadVerification({
      liveReadAttempted: true,
      planStatus: "READ_ONLY_VERIFIED",
      billingStatus: "READ_ONLY_VERIFIED",
      providerCalls: 3,
      mutations: 0,
    });
    expect(getSourceBundleVerification().status).toBe("UNVERIFIED");
    expect(getSourceBundleVerification().liveWriteAttempted).toBe(false);
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    expect(result.deployed).toBe(false);
    expect(result.url).toBeNull();
    expect(result.customDomain).toBe(false);
    expect(result.writeBoundary.domainPurchases).toBe(0);
    expect(result.writeBoundary.dnsWrites).toBe(0);
    expect(result.writeBoundary.stripeWrites).toBe(0);
    expect(result.writeBoundary.treasuryMovement).toBe(0);
    expect(result.writeBoundary.adSpend).toBe(0);
    expect(vercelAdapter.capabilities.supportedActions).not.toContain(BILLING_READ_CAPABILITY);
    expect(vercelAdapter.capabilities.supportedActions).not.toContain(ACCOUNT_PLAN_READ_CAPABILITY);
  });
});
