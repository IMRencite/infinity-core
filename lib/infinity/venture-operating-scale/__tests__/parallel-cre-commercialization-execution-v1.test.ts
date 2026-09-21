import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID, LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_RUNTIME,
  PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_V1,
  backfillCreVentureOperationalRecord,
  creDomainCandidateSeeds,
  evaluateMissionConcurrencyGate,
  evaluateParallelCreCommercializationConcurrency,
  executeCreProductionDomainAcquisition,
  executeCreStripeCapabilityAndPaymentReadiness,
  executeParallelCreCommercializationExecution,
  executeParallelCreCommercializationExecutionMission,
  inspectCreVentureNaming,
  reconcileCreCanonicalOffers,
  resetVentureOperatingScaleStore,
} from "..";

const NOW = "2026-09-05T09:32:00.000Z";

function mockAvailability(overrides: Record<string, Partial<{ available: boolean; registrationPriceUsd: number | null; renewalPriceUsd: number | null; premium: boolean }>> = {}) {
  return async (domains: string[]) =>
    domains.map((domain) => {
      const override = overrides[domain] ?? {};
      return {
        domain,
        available: override.available ?? true,
        registrationPriceUsd: override.registrationPriceUsd ?? 13.98,
        renewalPriceUsd: override.renewalPriceUsd ?? 15.98,
        premium: override.premium ?? false,
        provider: "namecheap.com_v1",
        evidenceTimestamp: NOW,
      };
    });
}

describe("PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_V1", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
  });

  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetInboundCommunicationRuntime();
  });

  it("registers the parent mission wrapper", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.ParallelCreCommercializationExecutionRuntime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_RUNTIME].missionType).toBe(
      PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_V1,
    );
    expect(registry.contracts[PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_RUNTIME].authorizationSemantics).toBe(
      "MISSION_BLOCKED",
    );
  });

  it("allows observer plus domain plus Stripe verify and blocks conflicting mutations", () => {
    const gate = evaluateParallelCreCommercializationConcurrency();
    expect(gate.outcome).toBe("PASS");
    expect(gate.observerPlusDomain.outcome).toBe("ALLOWED");
    expect(gate.observerPlusStripe.outcome).toBe("ALLOWED");
    expect(gate.domainPlusStripeVerify.outcome).toBe("ALLOWED");
    expect(
      evaluateMissionConcurrencyGate({
        proposed: "DOMAIN_REGISTRATION_WRITE",
        active: ["DOMAIN_REGISTRATION_WRITE"],
      }).outcome,
    ).toBe("BLOCKED");
  });

  it("inspects naming without inventing a purchased brand", () => {
    const naming = inspectCreVentureNaming("candidate:7e7e924e-0741-4155-a729-8d529da77ea9");
    expect(naming.existingDurableVentureName).toBe("Commercial lease NPV comparison");
    expect(naming.confidence).toBe("MEDIUM");
    expect(naming.durablePurchasedBrand).toBe(false);
    const seeds = creDomainCandidateSeeds();
    expect(seeds.length).toBeGreaterThanOrEqual(5);
    expect(seeds.length).toBeLessThanOrEqual(12);
    expect(seeds.some((row) => row.domain === "imros.io" || row.domain === "infinitemediaresources.com")).toBe(false);
  });

  it("selects a domain without purchasing when no autonomous ceiling or LIVE_WRITE exists", async () => {
    const domain = await executeCreProductionDomainAcquisition({
      now: NOW,
      checkAvailability: mockAvailability({ "leasecomp.com": { available: false } }),
      verifyNamecheap: async () => ({ status: "READ_ONLY_VERIFIED", realProviderCall: true, domains: [] }),
      verifyCloudflare: async () => ({ status: "READ_ONLY_VERIFIED", realProviderCall: true }),
    });
    expect(domain.candidatesEvaluated).toBeGreaterThanOrEqual(5);
    expect(domain.purchaseAttempted).toBe(false);
    expect(domain.purchaseCount).toBe(0);
    expect(domain.purchaseAuthorizedByExistingPolicy).toBe(false);
    expect(domain.eag).toBe("AUTHORIZATION_REQUIRED");
    expect(domain.providers.registrationCapability).not.toBe("LIVE_WRITE_VERIFIED");
    expect(domain.dnsWrites).toBe(0);
    expect(domain.nextState).toBe("DOMAIN_SELECTION_READY_FINANCIAL_AUTHORIZATION_REQUIRED");
    expect(domain.decision.candidate).not.toBe("imros.io");
  });

  it("does not infer LIVE_WRITE from Namecheap or Stripe reads", async () => {
    const domain = await executeCreProductionDomainAcquisition({
      now: NOW,
      checkAvailability: mockAvailability(),
      verifyNamecheap: async () => ({ status: "READ_ONLY_VERIFIED", realProviderCall: true, domains: [] }),
      verifyCloudflare: async () => ({ status: "READ_ONLY_VERIFIED", realProviderCall: true }),
    });
    expect(domain.providers.Namecheap).toBe("READ_ONLY_VERIFIED");
    expect(domain.providers.capabilities.Namecheap["domain.registration"]).toBe("UNVERIFIED");
    const stripe = await executeCreStripeCapabilityAndPaymentReadiness({
      probePayments: async () => ({
        provider: "stripe.com_v1",
        balanceAccessible: true,
        mode: "LIVE",
        productsCapability: true,
        pricesCapability: true,
        checkoutCapability: false,
        subscriptionsCapability: false,
        webhooksCapability: true,
        productCount: 0,
        priceCount: 0,
        liveChargesAuthorized: false,
        mutationOccurred: false,
        normalization: "PASS",
        status: "READ_ONLY_VERIFIED",
        realProviderCall: true,
        failureCode: null,
      }),
      fetchImpl: async () => new Response(JSON.stringify({ error: { message: "denied" } }), { status: 403 }),
    });
    expect(stripe.capabilities["product.create"]).toBe("UNVERIFIED");
    expect(stripe.capabilities["price.create"]).toBe("UNVERIFIED");
    expect(stripe.capabilities["checkout/session.create"]).toBe("UNVERIFIED");
    expect(stripe.stripeWrites).toBe(0);
    expect(stripe.paymentActivations).toBe(0);
    expect(stripe.realCharges).toBe(0);
    expect(stripe.testCharges).toBe(0);
    expect(stripe.activationReady).toBe(false);
  });

  it("reconciles canonical CRE offers and builds a payment plan without writes", () => {
    const offers = reconcileCreCanonicalOffers();
    expect(offers.consistency).toBe("PASS");
    expect(offers.offers).toHaveLength(2);
    expect(offers.offers.map((row) => row.price)).toEqual(["$290 / year", "$149 / deal"]);
  });

  it("runs the parent mission in parallel with the experiment preserved", async () => {
    backfillCreVentureOperationalRecord();
    const result = await executeParallelCreCommercializationExecutionMission({
      observeInbound: false,
      domain: {
        now: NOW,
        checkAvailability: mockAvailability(),
        verifyNamecheap: async () => ({ status: "READ_ONLY_VERIFIED", realProviderCall: true, domains: [] }),
        verifyCloudflare: async () => ({ status: "READ_ONLY_VERIFIED", realProviderCall: true }),
      },
      stripe: {
        probePayments: async () => ({
          provider: "stripe.com_v1",
          balanceAccessible: true,
          mode: "LIVE",
          productsCapability: true,
          pricesCapability: true,
          checkoutCapability: false,
          subscriptionsCapability: false,
          webhooksCapability: true,
          productCount: 1,
          priceCount: 1,
          liveChargesAuthorized: false,
          mutationOccurred: false,
          normalization: "PASS",
          status: "READ_ONLY_VERIFIED",
          realProviderCall: true,
          failureCode: null,
        }),
        fetchImpl: async (url) => {
          if (String(url).includes("/v1/account")) {
            return new Response(
              JSON.stringify({
                id: "acct_1234abcd",
                livemode: true,
                country: "US",
                type: "standard",
                charges_enabled: true,
                payouts_enabled: true,
                business_profile: { name: null },
              }),
              { status: 200 },
            );
          }
          return new Response(JSON.stringify({ data: [] }), { status: 200 });
        },
      },
    });
    expect(result.mission).toBe(PARALLEL_CRE_COMMERCIALIZATION_EXECUTION_V1);
    expect(result.concurrency.outcome).toBe("PASS");
    expect(result.parallelExecution).toBe("PASS");
    expect(result.domain.purchaseCount).toBe(0);
    expect(result.external.dnsWrites).toBe(0);
    expect(result.external.stripeConfigurationWrites).toBe(0);
    expect(result.external.publiclyLaunched).toBe("NO");
    expect(result.record.public_launch_state).toBe("NO");
    expect(result.record.active_artifact).toBe("art_11bd5b74a925257a7319");
    expect(result.experiment.state).toBe("COLLECTING");
    expect(result.experiment.clockRestarted).toBe(false);
    expect(result.experiment.tracked).toBeGreaterThanOrEqual(4);
    expect(result.experiment.newColdOutreach).toBe(0);
    expect(result.experiment.wave2).toBe(0);
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(result.daily.commercializationWorkRecognized).toBe(true);
    expect(result.daily.externalWaitingRecognized).toBe(true);
    expect(result.readiness.result).toBe("MULTIPLE_ACTIONS_REQUIRED");
    expect(result.stripe.planStatus).toBe("BUILT");
    expect(result.stripe.configurationReady).toBe(true);
    expect(result.stripe.activationReady).toBe(false);
    expect(result.hqMission.fakeSerialization).toBe("NO");
    expect(result.hqMission.command).toBe("ACTIVE_WORK");
    expect(result.hqMission.researchGrid).toBe("ACTIVE_WORK");
    expect(result.hqMission.validationStation).toBe("ACTIVE_WORK");
    expect(result.hqMission.financialGovernanceRoom).toBe("ACTIVE_WORK");
    expect(result.hqMission.infinityDecisionCoreDuring).toBe("ACTIVE_WORK");
    expect(result.hqMission.after.active).toBe(0);
    expect(result.hqMission.after.infinityDecisionCore).toBe("PRESENT_IDLE");
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions).toBe(0);
    expect(inspectMailboxObserverHealth().trackedConversations).toBeGreaterThanOrEqual(4);
  });

  it("does not invent an autonomous spend ceiling", async () => {
    const result = await executeParallelCreCommercializationExecution({
      observeInbound: false,
      domain: {
        now: NOW,
        checkAvailability: mockAvailability(),
        verifyNamecheap: async () => ({ status: "READ_ONLY_VERIFIED", realProviderCall: true, domains: [] }),
        verifyCloudflare: async () => ({ status: "UNVERIFIED", realProviderCall: false }),
      },
      stripe: {
        probePayments: async () => ({
          provider: "stripe.com_v1",
          balanceAccessible: false,
          mode: "UNKNOWN",
          productsCapability: false,
          pricesCapability: false,
          checkoutCapability: false,
          subscriptionsCapability: false,
          webhooksCapability: false,
          productCount: null,
          priceCount: null,
          liveChargesAuthorized: false,
          mutationOccurred: false,
          normalization: "SKIPPED",
          status: "NOT_CONFIGURED",
          realProviderCall: false,
          failureCode: "NOT_CONFIGURED",
        }),
        fetchImpl: async () => new Response("{}", { status: 401 }),
      },
    });
    expect(result.domain.purchaseAuthorizedByExistingPolicy).toBe(false);
    expect(result.domain.eag).toBe("AUTHORIZATION_REQUIRED");
    expect(result.nextAuthorizations.PAYMENT_ACTIVATION).toContain("BLOCKED");
    expect(result.nextAuthorizations.PUBLIC_LAUNCH).toContain("BLOCKED");
  });
});
