import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ReadOnlyMutationBlockedError } from "@/lib/infinity/commercialization/probes/mode";
import {
  ART_MARKETPLACE_FIXTURE,
  allocateMarketplaceSettlement,
  assertConnectWriteUnauthorized,
  buildPaymentArchitectureContract,
  classifyPaymentBusinessModel,
  createStripeConnectAdapter,
  evidenceFromMonetizationPlan,
  explainPaymentArchitecture,
  marketplaceTreasurySemantics,
  resolveConnectWriteReadiness,
  resolvePaymentArchitecture,
  selectPaymentArchitecture,
  STRIPE_CONNECT_FOUNDATION,
  validatePaymentArchitecture,
} from "@/lib/infinity/payment-architecture";
import { isMarketplaceProviderCandidate } from "@/lib/infinity/payment-architecture/provider-capabilities";
import { BLOCKED_CONNECT_WRITES } from "@/lib/infinity/payment-architecture/constants";
import type { MonetizationPlanDraft } from "@/lib/infinity/monetization-engine/types";

const ROOT = join(process.cwd(), "lib/infinity/payment-architecture");

function domainSource(): string {
  const files = [
    "constants.ts",
    "selector.ts",
    "stripe-connect.ts",
    "write-authority.ts",
    "build-contract.ts",
    "hq/read-model.ts",
  ];
  return files.map((file) => readFileSync(join(ROOT, file), "utf8")).join("\n");
}

describe("Payment Architecture + Stripe Connect Foundation V1", () => {
  it("classifies canonical payment-relevant business models", () => {
    expect(classifyPaymentBusinessModel({ monetizationModelType: "ecommerce" })).toBe("DIRECT_COMMERCE");
    expect(classifyPaymentBusinessModel({ monetizationModelType: "saas_subscription" })).toBe("SAAS_SUBSCRIPTION");
    expect(classifyPaymentBusinessModel({ monetizationModelType: "two_sided_marketplace" })).toBe("MARKETPLACE");
    expect(classifyPaymentBusinessModel({ monetizationModelType: "service_product_hybrid", sellersReceivePlatformPayouts: true })).toBe(
      "SERVICE_PLATFORM",
    );
    expect(classifyPaymentBusinessModel({ monetizationModelType: "digital_products" })).toBe("DIGITAL_PRODUCT");
    expect(classifyPaymentBusinessModel({ monetizationModelType: "usage_based_saas" })).toBe("USAGE_BASED");
    expect(classifyPaymentBusinessModel({ monetizationModelType: "lead_generation" })).toBe("LEAD_GENERATION");
    expect(classifyPaymentBusinessModel({ monetizationModelType: "display_advertising" })).toBe("NO_DIRECT_PAYMENT");
  });

  it("selects provider-backed architectures without making Stripe the only marketplace forever", () => {
    expect(selectPaymentArchitecture({ monetizationModelType: "two_sided_marketplace" }).selectedArchitecture).toBe(
      "STRIPE_CONNECT_MARKETPLACE",
    );
    expect(selectPaymentArchitecture({ monetizationModelType: "saas_subscription" }).selectedArchitecture).toBe(
      "STRIPE_BILLING_SUBSCRIPTIONS",
    );
    expect(selectPaymentArchitecture({ monetizationModelType: "ecommerce" }).selectedArchitecture).toBe("DIRECT_STRIPE_PAYMENTS");
    expect(selectPaymentArchitecture({ monetizationModelType: "usage_based_saas" }).selectedArchitecture).toBe(
      "STRIPE_USAGE_BASED_BILLING",
    );
    const marketplace = selectPaymentArchitecture({ monetizationModelType: "consumer_marketplace" });
    expect(marketplace.architectureKind).toBe("MARKETPLACE_MULTI_PARTY");
    expect(marketplace.providerCandidates[0]?.capability).toBe("MARKETPLACE_PAYMENTS");
    expect(isMarketplaceProviderCandidate(marketplace.providerCandidates[0]!)).toBe(true);
    expect(selectPaymentArchitecture({ monetizationModelType: "digital_products" }).architectureKind).toBe("DIRECT_PAYMENTS");
    expect(
      selectPaymentArchitecture({
        monetizationModelType: "digital_products",
        hasDistinctSellers: true,
        hasDistinctBuyers: true,
      }).architectureKind,
    ).toBe("MARKETPLACE_MULTI_PARTY");
    expect(
      selectPaymentArchitecture({
        monetizationModelType: "service_product_hybrid",
        sellersReceivePlatformPayouts: true,
        hasDistinctBuyers: true,
        hasDistinctSellers: true,
      }).architectureKind,
    ).toBe("MARKETPLACE_MULTI_PARTY");
    expect(selectPaymentArchitecture({ monetizationModelType: "lead_generation" }).architectureKind).toBe("NO_CUSTOMER_PAYMENT");
    expect(
      selectPaymentArchitecture({ monetizationModelType: "lead_generation", revenueMechanism: "invoice fee" }).architectureKind,
    ).toBe("DIRECT_INVOICING");
  });

  it("classifies the art marketplace fixture without baking art into the selector", () => {
    const resolved = resolvePaymentArchitecture(ART_MARKETPLACE_FIXTURE, {
      stripeVerification: "READ_ONLY_VERIFIED",
      stripeEnvironment: "LIVE",
    });
    expect(resolved.selection.businessModel).toBe("MARKETPLACE");
    expect(ART_MARKETPLACE_FIXTURE.buyerRole).toBe("COLLECTORS");
    expect(ART_MARKETPLACE_FIXTURE.sellerRole).toBe("ARTISTS");
    expect(ART_MARKETPLACE_FIXTURE.revenueMechanism).toBe("PLATFORM_COMMISSION");
    expect(resolved.selection.selectedArchitecture).toBe("STRIPE_CONNECT_MARKETPLACE");
    expect(resolved.selection.requiredCapabilities).toEqual(
      expect.arrayContaining([
        "BUYER_CHECKOUT",
        "SELLER_ONBOARDING",
        "MULTI_PARTY_PAYMENT",
        "PLATFORM_FEE",
        "SELLER_PAYOUT",
        "REFUND_SUPPORT",
        "DISPUTE_SUPPORT",
      ]),
    );
    expect(domainSource()).not.toMatch(/art marketplace is the only/i);
  });

  it("keeps GMV, platform revenue, seller earnings, fees, refunds, and disputes distinct", () => {
    const flow = allocateMarketplaceSettlement({
      gmvUsd: 1000,
      takeRatePercent: 15,
      processorFeeUsd: 29,
      refundAmountUsd: 100,
      disputeAmountUsd: 50,
    });
    expect(flow.gmvUsd).toBe(1000);
    expect(flow.platformRevenueUsd).toBe(127.5);
    expect(flow.platformRevenueUsd).not.toBe(flow.gmvUsd);
    expect(flow.sellerEarningsUsd).toBe(693.5);
    expect(flow.sellerEarningsUsd).not.toBe(flow.platformRevenueUsd);
    expect(flow.processorFeeUsd).toBe(29);
    expect(flow.processorFeeUsd).not.toBe(flow.platformRevenueUsd);
    expect(flow.refundAmountUsd).toBe(100);
    expect(flow.disputeAmountUsd).toBe(50);
    const treasury = marketplaceTreasurySemantics(flow);
    expect(treasury.platformRevenueUsd).toBe(127.5);
    expect(treasury.externalBankMovementAuthorized).toBe(false);
  });

  it("maps monetization commission/take-rate evidence without rewriting the engine", () => {
    const plan = {
      modelType: "marketplace_commissions",
      pricingModel: "take rate",
      billingFrequency: "per_transaction",
      payer: "collector",
      beneficiary: "artist",
      revenueStreams: [
        {
          streamRole: "primary",
          streamName: "Commission",
          modelType: "marketplace_commissions",
          description: "Platform take rate",
          payer: "collector",
          pricingModel: "commission",
          estimatedPriceBase: null,
          billingFrequency: "per_transaction",
          estimatedShareOfRevenuePercent: 12,
          estimatedCustomersYear1: null,
        },
      ],
    } as MonetizationPlanDraft;
    const evidence = evidenceFromMonetizationPlan(plan);
    expect(evidence.takeRatePercent).toBe(12);
    expect(classifyPaymentBusinessModel(evidence)).toBe("MARKETPLACE");
  });

  it("does not treat Stripe READ_ONLY_VERIFIED as Connect write authority", () => {
    const readiness = resolveConnectWriteReadiness({
      stripeVerification: "READ_ONLY_VERIFIED",
      stripeEnvironment: "LIVE",
    });
    expect(readiness.stripeVerification).toBe("READ_ONLY_VERIFIED");
    expect(readiness.connectWriteReadiness).toBe("LIVE_WRITE_GATED");
    expect(readiness.readOnlyVerificationGrantsConnectWrites).toBe(false);
    expect(readiness.liveWriteAuthority).toBe(false);
    expect(readiness.marketplacePaymentReadiness).toBe("FOUNDATION");
  });

  it("leaves Connect account type unresolved unless policy is supplied", () => {
    const selection = selectPaymentArchitecture(ART_MARKETPLACE_FIXTURE);
    expect(selection.connectAccountType).toBe("REQUIRES_PLATFORM_POLICY_CHOICE");
    expect(selection.unresolvedPolicy.map((item) => item.code)).toContain("CONNECT_ACCOUNT_TYPE");
    expect(selection.unresolvedPolicy.length).toBeGreaterThan(3);
  });

  it("records validation gaps instead of inventing marketplace assumptions", () => {
    const selection = selectPaymentArchitecture({ monetizationModelType: "two_sided_marketplace" });
    const gaps = validatePaymentArchitecture(
      {
        monetizationModelType: "two_sided_marketplace",
        takeRatePercent: 120,
        currency: "dollars",
        hasDistinctSellers: true,
        sellersReceivePlatformPayouts: false,
        sellerCountryConstraints: ["UNKNOWN"],
      },
      selection,
    );
    expect(gaps.map((gap) => gap.code)).toEqual(
      expect.arrayContaining([
        "PLATFORM_FEE_EXCEEDS_100",
        "UNKNOWN_CURRENCY",
        "MARKETPLACE_WITHOUT_BUYER_SELLER_DISTINCTION",
        "SELLER_WITHOUT_PAYOUT_MODEL",
        "COMMISSION_WITHOUT_SELLER_ALLOCATION",
        "UNRESOLVED_SELLER_COUNTRY_CONSTRAINTS",
      ]),
    );
    expect(validatePaymentArchitecture({ takeRatePercent: -1 }, selection).some((gap) => gap.code === "NEGATIVE_TAKE_RATE")).toBe(
      true,
    );
  });

  it("supplies a build contract so Cursor does not choose payment architecture independently", () => {
    const selection = selectPaymentArchitecture(ART_MARKETPLACE_FIXTURE);
    const contract = buildPaymentArchitectureContract(selection, ART_MARKETPLACE_FIXTURE);
    expect(contract.infinitySuppliesArchitecture).toBe(true);
    expect(contract.cursorChoosesArchitectureIndependently).toBe(false);
    expect(contract.architecture).toBe("STRIPE_CONNECT_MARKETPLACE");
    expect(contract.liveWriteAuthorityRequired).toBe(false);
    expect(contract.testModeRequired).toBe(true);
    expect(contract.buyerModel?.label).toBe("COLLECTORS");
    expect(contract.sellerModel?.label).toBe("ARTISTS");
    expect(contract.commissionModel.kind).toBe("PLATFORM_COMMISSION");
  });

  it("blocks every Stripe Connect write and does not persist KYC or bank details", async () => {
    const writes = { count: 0 };
    const adapter = createStripeConnectAdapter(writes);
    const blocked = await assertConnectWriteUnauthorized(adapter);
    for (const operation of BLOCKED_CONNECT_WRITES) {
      expect(blocked[operation]).toBe("BLOCKED");
    }
    await expect(adapter.createConnectedAccount({ email: "seller@example.com" })).rejects.toBeInstanceOf(ReadOnlyMutationBlockedError);
    expect(writes.count).toBe(0);
    expect(STRIPE_CONNECT_FOUNDATION.liveWriteAuthority).toBe(false);
    expect(STRIPE_CONNECT_FOUNDATION.modeled.sellerOnboarding).toBe(true);
    const source = domainSource();
    expect(source).not.toMatch(/fetch\("https:\/\/api\.stripe\.com/);
    expect(source).not.toMatch(/method:\s*"POST"/);
    expect(source).not.toMatch(/bankAccount|ssn|passport|kycDocument/);
  });

  it("exposes a read-only HQ model with live write authority NO", () => {
    const resolved = resolvePaymentArchitecture(ART_MARKETPLACE_FIXTURE, {
      stripeVerification: "READ_ONLY_VERIFIED",
    });
    expect(resolved.hq.architecture).toBe("STRIPE_CONNECT_MARKETPLACE");
    expect(resolved.hq.businessModel).toBe("MARKETPLACE");
    expect(resolved.hq.liveWriteAuthority).toBe(false);
    expect(explainPaymentArchitecture(resolved.selection)).toMatch(/marketplace/);
    expect(explainPaymentArchitecture(resolved.selection)).toMatch(/Live write authority is not granted/);
  });
});
