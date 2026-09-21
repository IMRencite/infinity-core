import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  COMMERCIAL_PROVIDER_MUTATION_POLICY_VERSION,
  CRE_OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1,
  CRE_OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1_RUNTIME,
  DEFAULT_FIRST_VENTURE_PAYMENT_ACTIVATION_POLICY,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  backfillCreVentureOperationalRecord,
  evaluateCommercialProviderMutation,
  evaluatePaymentActivationPolicy,
  evaluatePostActivationCustomerPayment,
  executeCreOccupancynpvDurableCommercialProviderMutationAuthorityV1Mission,
  outboundSpendRemainsTreasuryGoverned,
  projectVentureOperatingScaleHq,
  publicLaunchIsSeparateFromPaymentActivation,
  resetOccupancynpvDurableAuthorityStore,
  resetVentureOperatingScaleStore,
  writeVentureOperationalRecord,
} from "..";
import type { ProviderMutationProposal } from "../commercial-provider-mutation-authority";
import { occupancynpvPaymentActivationEnabled } from "../occupancynpv-payment-reactivation-evidence";
import { occupancynpvPubliclyLaunched } from "../occupancynpv-public-launch-evidence";

function seedOccupancynpvRecord() {
  const existing = backfillCreVentureOperationalRecord();
  return writeVentureOperationalRecord({
    ...existing,
    primary_domain: OCCUPANCYNPV_DOMAIN,
    canonical_url: "https://occupancynpv.com",
    public_url: "https://occupancynpv.com",
    public_launch_state: "NO",
    dns_state: "CONFIGURED",
    ssl_state: "VERIFIED",
    legal_configuration_state: "LEGAL_CONFIGURATION_COMPLETE",
    privacy_policy_url: "https://occupancynpv.com/privacy-policy/",
    terms_of_service_url: "https://occupancynpv.com/terms-of-service/",
    payment_provider: "stripe",
    payment_account_binding: { kind: "PROVIDER_BINDING", key: OCCUPANCYNPV_STRIPE_ACCOUNT_ID, rawSecretStored: false },
    pricing_state: "CONFIGURED",
    checkout_state: "CONFIGURED",
    analytics_provider: "infinity.performance_intelligence",
    revenue_state: "UNCONFIGURED",
    payment_webhooks: { kind: "PROVIDER_BINDING", key: "we_1UCssQLdvXKx7R7GcHonT3rh", rawSecretStored: false },
    payment_products: [
      { id: "prod_VDIjmRpY19C9HZ", name: "OccupancyNPV Professional", providerProductRef: { kind: "PROVIDER_BINDING", key: "prod_VDIjmRpY19C9HZ", rawSecretStored: false } },
    ],
    payment_prices: [
      { id: "price_1UCs7hLdvXKx7R7GF2TPmwGL", productId: "prod_VDIjmRpY19C9HZ", amountUsd: 290, providerPriceRef: { kind: "PROVIDER_BINDING", key: "price_1UCs7hLdvXKx7R7GF2TPmwGL", rawSecretStored: false } },
    ],
    blocked_actions: ["PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"],
  });
}

function routine(overrides: Partial<ProviderMutationProposal> & Pick<ProviderMutationProposal, "mutationClass">): ProviderMutationProposal {
  return {
    venture: "occupancynpv",
    provider: "dns",
    resource: "example",
    providerIdentityVerified: true,
    providerAccountKnown: true,
    credentialScopeClear: true,
    resourceOwnershipClear: true,
    ventureOwnershipVerified: true,
    canonicalPlanExists: true,
    mutationBounded: true,
    duplicateProtected: true,
    readbackAvailable: true,
    traceabilityEnabled: true,
    riskKnown: true,
    legalIdentityClear: true,
    accountMatch: true,
    financialExposure: { kind: "NONE" },
    ...overrides,
  };
}

describe("DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetOccupancynpvDurableAuthorityStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
  });

  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetOccupancynpvDurableAuthorityStore();
    resetInboundCommunicationRuntime();
  });

  it("registers the HQ wrapper without granting HQ decision authority", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreOccupancynpvDurableCommercialProviderMutationAuthorityV1Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1_RUNTIME].missionType).toBe(
      CRE_OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1,
    );
  });

  it("allows routine DNS create autonomously", () => {
    const result = evaluateCommercialProviderMutation(routine({ mutationClass: "DNS_RECORD_CREATE", resource: "txt_verify" }));
    expect(result.decision).toBe("ALLOW_AUTONOMOUS");
    expect(result.policyVersion).toBe(COMMERCIAL_PROVIDER_MUTATION_POLICY_VERSION);
    expect(result.traceId).toBeTruthy();
  });

  it("allows canonical Stripe product create autonomously", () => {
    expect(evaluateCommercialProviderMutation(routine({
      mutationClass: "STRIPE_PRODUCT_CREATE",
      provider: "payments",
      resource: "canonical_product",
    })).decision).toBe("ALLOW_AUTONOMOUS");
  });

  it("allows canonical Stripe webhook create autonomously", () => {
    expect(evaluateCommercialProviderMutation(routine({
      mutationClass: "STRIPE_WEBHOOK_CREATE",
      provider: "payments",
      resource: "canonical_webhook",
    })).decision).toBe("ALLOW_AUTONOMOUS");
  });

  it("allows zone create, domain binding, SSL, checkout, and analytics autonomously", () => {
    for (const mutationClass of [
      "ZONE_CREATE",
      "DOMAIN_BINDING_CREATE",
      "SSL_PROVISION",
      "CHECKOUT_CONFIGURATION",
      "ANALYTICS_CONFIGURATION",
      "STRIPE_PRICE_CREATE",
      "STRIPE_WEBHOOK_UPDATE",
      "DNS_RECORD_UPDATE",
      "DOMAIN_BINDING_UPDATE",
    ] as const) {
      expect(evaluateCommercialProviderMutation(routine({ mutationClass })).decision).toBe("ALLOW_AUTONOMOUS");
    }
  });

  it("allows domain purchase below a configured ceiling", () => {
    expect(evaluateCommercialProviderMutation(routine({
      mutationClass: "DOMAIN_REGISTRATION",
      provider: "registrar",
      resource: "example.com",
      financialExposure: { kind: "KNOWN", amountUsd: 10 },
      domainSpendCeilingUsd: 15,
      approvedRegistrar: true,
      availabilityEvidence: true,
      pricingEvidence: true,
      treasuryPass: true,
      eagPass: true,
    })).decision).toBe("ALLOW_AUTONOMOUS");
  });

  it("requires authorization for domain purchase without a ceiling", () => {
    expect(evaluateCommercialProviderMutation(routine({
      mutationClass: "DOMAIN_REGISTRATION",
      provider: "registrar",
      resource: "example.com",
      financialExposure: { kind: "KNOWN", amountUsd: 10 },
      domainSpendCeilingUsd: null,
      approvedRegistrar: true,
      availabilityEvidence: true,
      pricingEvidence: true,
      treasuryPass: true,
      eagPass: true,
    })).decision).toBe("REQUIRE_AUTHORIZATION");
  });

  it("requires authorization for domain purchase above the configured ceiling", () => {
    expect(evaluateCommercialProviderMutation(routine({
      mutationClass: "DOMAIN_REGISTRATION",
      provider: "registrar",
      resource: "example.com",
      financialExposure: { kind: "KNOWN", amountUsd: 25 },
      domainSpendCeilingUsd: 15,
      approvedRegistrar: true,
      availabilityEvidence: true,
      pricingEvidence: true,
      treasuryPass: true,
      eagPass: true,
    })).decision).toBe("REQUIRE_AUTHORIZATION");
  });

  it("allows provider plan purchase inside a configured recurring ceiling", () => {
    expect(evaluateCommercialProviderMutation(routine({
      mutationClass: "PROVIDER_PLAN_PURCHASE",
      provider: "hosting",
      resource: "pro_plan",
      financialExposure: { kind: "KNOWN", amountUsd: 20 },
      recurringSpendCeilingUsd: 50,
      budgetExists: true,
      treasuryPass: true,
      eagPass: true,
      planEconomicsMatch: true,
    })).decision).toBe("ALLOW_AUTONOMOUS");
  });

  it("requires authorization for provider plan spend above the recurring ceiling", () => {
    expect(evaluateCommercialProviderMutation(routine({
      mutationClass: "PROVIDER_PLAN_UPGRADE",
      provider: "hosting",
      resource: "enterprise_plan",
      financialExposure: { kind: "KNOWN", amountUsd: 80 },
      recurringSpendCeilingUsd: 50,
      budgetExists: true,
      treasuryPass: true,
      eagPass: true,
      planEconomicsMatch: true,
    })).decision).toBe("REQUIRE_AUTHORIZATION");
  });

  it("escalates a price change outside canonical economics", () => {
    expect(evaluateCommercialProviderMutation(routine({
      mutationClass: "PRICE_CHANGE",
      provider: "payments",
      resource: "professional_price",
      financialExposure: { kind: "KNOWN", amountUsd: 390 },
      withinApprovedEconomicBounds: false,
    })).decision).toBe("ESCALATE");
  });

  it("escalates a destructive provider delete", () => {
    expect(evaluateCommercialProviderMutation(routine({
      mutationClass: "PROVIDER_RESOURCE_DELETE",
      provider: "dns",
      resource: "production_cname",
      destructive: true,
    })).decision).toBe("ESCALATE");
  });

  it("requires authorization for a legal entity change", () => {
    expect(evaluateCommercialProviderMutation(routine({
      mutationClass: "LEGAL_CONFIGURATION_CHANGE",
      provider: "legal",
      resource: "legal_entity",
      legalIdentityMutation: true,
    })).decision).toBe("REQUIRE_AUTHORIZATION");
  });

  it("blocks a provider identity mismatch", () => {
    expect(evaluateCommercialProviderMutation(routine({
      mutationClass: "DNS_RECORD_CREATE",
      providerAccountId: "acct_other",
      expectedProviderAccountId: OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
    })).decision).toBe("BLOCK");
  });

  it("requires founder approval for first payment activation", () => {
    const activation = evaluatePaymentActivationPolicy({
      venture: "occupancynpv",
      provider: "payments",
      policy: DEFAULT_FIRST_VENTURE_PAYMENT_ACTIVATION_POLICY,
      paymentActivated: false,
      publicLaunch: "NO",
    });
    expect(activation.policy).toBe("FOUNDER_APPROVAL_REQUIRED");
    expect(activation.durablePolicySupported).toBe(true);
    expect(activation.decision.decision).toBe("REQUIRE_AUTHORIZATION");
    expect(activation.perCustomerFounderApprovalRequired).toBe(false);
  });

  it("allows post-activation customer checkout autonomously", () => {
    expect(evaluatePostActivationCustomerPayment({
      mutationClass: "CUSTOMER_CHECKOUT_EXECUTION",
      venture: "occupancynpv",
      provider: "payments",
      resource: "checkout_session",
      paymentActivated: true,
    }).decision).toBe("ALLOW_AUTONOMOUS");
  });

  it("allows subscription renewal after activation autonomously", () => {
    expect(evaluatePostActivationCustomerPayment({
      mutationClass: "CUSTOMER_SUBSCRIPTION_RENEWAL",
      venture: "occupancynpv",
      provider: "payments",
      resource: "invoice_paid",
      paymentActivated: true,
    }).decision).toBe("ALLOW_AUTONOMOUS");
  });

  it("allows customer payment webhook processing after activation autonomously", () => {
    expect(evaluatePostActivationCustomerPayment({
      mutationClass: "CUSTOMER_PAYMENT_WEBHOOK",
      venture: "occupancynpv",
      provider: "payments",
      resource: "evt_verified",
      paymentActivated: true,
    }).decision).toBe("ALLOW_AUTONOMOUS");
  });

  it("keeps public launch separate from payment activation", () => {
    const launch = evaluateCommercialProviderMutation(routine({
      mutationClass: "PUBLIC_LAUNCH",
      provider: "launch",
      resource: "occupancynpv.com",
    }));
    const activation = evaluatePaymentActivationPolicy({
      venture: "occupancynpv",
      provider: "payments",
      paymentActivated: false,
    });
    expect(publicLaunchIsSeparateFromPaymentActivation()).toBe(true);
    expect(launch.decision).toBe("REQUIRE_AUTHORIZATION");
    expect(launch.reason).toContain("public_launch_separate");
    expect(activation.publicLaunchSeparate).toBe(true);
    expect(activation.publicLaunch).toBe("NO");
    expect(activation.class).toBe("PAYMENT_ACTIVATION");
  });

  it("treats unknown material cost as not zero and blocks", () => {
    const result = evaluateCommercialProviderMutation(routine({
      mutationClass: "DOMAIN_REGISTRATION",
      financialExposure: { kind: "UNKNOWN_MATERIAL" },
      domainSpendCeilingUsd: 15,
      approvedRegistrar: true,
      availabilityEvidence: true,
      pricingEvidence: true,
      treasuryPass: true,
      eagPass: true,
    }));
    expect(result.decision).toBe("BLOCK");
    expect(result.reason).toContain("unknown_material_cost");
    expect(result.financialExposure.kind).not.toBe("NONE");
    expect(result.financialExposure).not.toEqual({ kind: "KNOWN", amountUsd: 0 });
  });

  it("blocks expired authority", () => {
    expect(evaluateCommercialProviderMutation(routine({
      mutationClass: "DNS_RECORD_CREATE",
      authorityStatus: "EXPIRED",
    })).decision).toBe("BLOCK");
  });

  it("keeps outbound spend treasury-governed and instantiates OccupancyNPV without activating payments", async () => {
    seedOccupancynpvRecord();
    const result = await executeCreOccupancynpvDurableCommercialProviderMutationAuthorityV1Mission();
    expect(outboundSpendRemainsTreasuryGoverned()).toBe(true);
    expect(result.mission).toBe(CRE_OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1);
    expect(result.authorityFoundation).toBe("BUILT");
    expect(result.state.provider_mutation_policy).toBe("AUTONOMOUS_WITHIN_POLICY");
    expect(result.state.payment_activation_policy).toBe("FOUNDER_APPROVAL_REQUIRED");
    expect(result.state.payment_activation).toBe("NO");
    expect(result.state.publicly_launched).toBe("NO");
    expect(result.paymentReadiness.gate).toBe("BLOCKED");
    expect(result.paymentReadiness.paymentsActive).toBe(false);
    expect(result.commercialization.remaining).toEqual(["FULFILLMENT_CONFIGURATION", "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"]);
    expect(result.record.blocked_actions).toEqual(["FULFILLMENT_CONFIGURATION", "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"]);
    expect(result.record.public_launch_state).toBe("NO");
    expect(result.nextState).toBe("DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_COMPLETE");
    expect(result.nextGovernedAction).toBe("OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_AUTHORIZATION");
    expect(result.writes).toEqual({
      stripe: 0,
      customers: 0,
      checkoutSessions: 0,
      paymentIntents: 0,
      charges: 0,
      subscriptions: 0,
      webhookMutations: 0,
      dnsWrites: 0,
      domainPurchases: 0,
      vercelMutations: 0,
      paymentActivation: 0,
      publicLaunch: 0,
    });
    expect(result.hq.hqDecides).toBe(false);
    expect(result.hqMission.after.fakeContinuousActiveWork).toBe(false);
  });

  it("exposes read-only authority visibility in HQ without making HQ the decision engine", async () => {
    seedOccupancynpvRecord();
    await executeCreOccupancynpvDurableCommercialProviderMutationAuthorityV1Mission();
    const hq = projectVentureOperatingScaleHq({
      latestCompletedMission: CRE_OCCUPANCYNPV_DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_V1,
    });
    expect(hq.authorityVisibility.hqDecides).toBe(false);
    expect(hq.authorityVisibility.mutationPolicy).toBe("AUTONOMOUS_WITHIN_POLICY");
    expect(hq.authorityVisibility.publicLaunch).toBe(occupancynpvPubliclyLaunched() ? "YES" : "NO");
    if (occupancynpvPubliclyLaunched()) {
      expect(hq.authorityVisibility.founderActionRequired).toBe(false);
      expect(hq.authorityVisibility.remainingBlockers).not.toContain("PUBLIC_LAUNCH");
    } else {
      expect(hq.authorityVisibility.founderActionRequired).toBe(true);
    }
    if (occupancynpvPaymentActivationEnabled()) {
      expect(hq.authorityVisibility.paymentActivation).toBe("YES");
      expect(hq.authorityVisibility.paymentActivationState).toBe("YES");
      expect(hq.authorityVisibility.paymentActivationPolicy).toBe("AUTONOMOUS_WITHIN_POLICY");
      if (!occupancynpvPubliclyLaunched()) {
        expect(hq.authorityVisibility.remainingBlockers).toEqual(expect.arrayContaining(["PUBLIC_LAUNCH"]));
      }
      expect(hq.authorityVisibility.remainingBlockers).not.toContain("PAYMENT_ACTIVATION");
    } else {
      expect(hq.authorityVisibility.paymentActivationPolicy).toBe("FOUNDER_APPROVAL_REQUIRED");
      expect(hq.authorityVisibility.paymentActivation).toBe("NO");
      expect(hq.authorityVisibility.paymentActivationState).toBe("BLOCKED");
      expect(hq.authorityVisibility.remainingBlockers).toEqual(expect.arrayContaining(["PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"]));
    }
    const strip = readFileSync("components/dashboard/operator-console/venture-operating-scale-strip.tsx", "utf8");
    expect(strip).toContain('data-hq-region="provider-mutation-authority"');
    expect(strip).toContain("HQ decides");
    expect(strip).toContain("Founder action");
  });
});
