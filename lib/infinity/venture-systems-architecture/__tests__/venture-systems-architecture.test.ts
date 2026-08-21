import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ReadOnlyMutationBlockedError } from "@/lib/infinity/commercialization/probes/mode";
import { ART_MARKETPLACE_FIXTURE } from "@/lib/infinity/payment-architecture";
import {
  AI_SEO_PLATFORM_FIXTURE,
  ART_MARKETPLACE_SYSTEMS_FIXTURE,
  CONTENT_BUSINESS_FIXTURE,
  ECOMMERCE_FIXTURE,
  HOME_CONTRACTOR_FIXTURE,
  LEAD_GENERATION_FIXTURE,
  MARKETPLACE_FIXTURE,
  MATURE_DEDICATED_CRM_FIXTURE,
  PRE_REVENUE_CRM_COST_FIXTURE,
  SAAS_FIXTURE,
  SERVICE_PLATFORM_FIXTURE,
  SIMPLE_DIGITAL_PRODUCT_FIXTURE,
  SYSTEM_FAMILIES,
  UNKNOWN_COST_FIXTURE,
  VENTURE_SYSTEMS_WRITE_BOUNDARY,
  assertSystemsWritesBlocked,
  buildDependencyGraph,
  buildVentureSystemsContract,
  catalogProviderCandidates,
  classifyVentureOperatingModel,
  createBlockedSystemsAdapter,
  explainVentureSystems,
  resolveVentureSystems,
  selectTenancyStrategy,
  unknownCost,
} from "@/lib/infinity/venture-systems-architecture";

const ROOT = join(process.cwd(), "lib/infinity/venture-systems-architecture");

function domainSource(): string {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) files.push(path);
    }
  };
  walk(ROOT);
  return files.map((file) => readFileSync(file, "utf8")).join("\n");
}

function requiredFamilies(contract: ReturnType<typeof buildVentureSystemsContract>) {
  return contract.systemRequirements.filter((item) => item.required).map((item) => item.family);
}

describe("Venture Systems Architecture V1", () => {
  it("supports the required provider-neutral system families", () => {
    expect(SYSTEM_FAMILIES).toEqual(
      expect.arrayContaining([
        "PAYMENTS",
        "CRM",
        "LEAD_CAPTURE",
        "CUSTOMER_ACQUISITION",
        "TRANSACTIONAL_EMAIL",
        "MARKETING_EMAIL",
        "SMS",
        "SCHEDULING",
        "IDENTITY_AND_ACCOUNTS",
        "AUTHORIZATION_AND_ROLES",
        "ENTITLEMENTS",
        "CONTENT_AND_DISTRIBUTION",
        "SEO",
        "SOCIAL_DISTRIBUTION",
        "ANALYTICS",
        "ATTRIBUTION",
        "CUSTOMER_SUPPORT",
        "CUSTOMER_SUCCESS",
        "REPUTATION_AND_REVIEWS",
        "OPERATIONS",
        "COMMERCE_AND_FULFILLMENT",
        "LEGAL_AND_COMPLIANCE",
        "SECURITY_AND_RISK",
        "LIFECYCLE_AUTOMATION",
        "EXPERIMENTATION",
        "AFFILIATE_AND_PARTNERS",
        "LOCALIZATION",
        "HUMAN_OPERATIONS",
      ]),
    );
  });

  it("classifies the home contractor fixture and requires CRM, pipeline, scheduling, and local SEO", () => {
    const resolved = resolveVentureSystems(HOME_CONTRACTOR_FIXTURE);
    expect(resolved.contract.businessModel).toBe("HOME_CONTRACTOR");
    expect(HOME_CONTRACTOR_FIXTURE.primaryConversion).toBe("REQUEST_ESTIMATE");
    expect(resolved.contract.crmArchitecture.required).toBe(true);
    expect(resolved.contract.crmArchitecture.pipelineModeled).toBe(true);
    expect(resolved.contract.crmArchitecture.leadLifecycleModeled).toBe(true);
    expect(requiredFamilies(resolved.contract)).toEqual(
      expect.arrayContaining([
        "LEAD_CAPTURE",
        "CRM",
        "SCHEDULING",
        "TRANSACTIONAL_EMAIL",
        "REPUTATION_AND_REVIEWS",
        "SEO",
        "CONTENT_AND_DISTRIBUTION",
        "ATTRIBUTION",
        "ANALYTICS",
        "PAYMENTS",
      ]),
    );
    expect(resolved.contract.schedulingArchitecture.capabilities).toEqual(expect.arrayContaining(["ESTIMATE_SCHEDULING", "JOB_SCHEDULING"]));
    expect(resolved.contract.contentArchitecture.capabilities).toEqual(expect.arrayContaining(["SERVICE_PAGES", "LOCATION_PAGES"]));
    expect(resolved.contract.communicationsArchitecture.sms).toBe(false);
    expect(resolved.contract.communicationsArchitecture.smsOptional).toBe(true);
    expect(resolved.contract.communicationsArchitecture.reviewRequests).toBe(true);
    expect(resolved.contract.systemRequirements.find((item) => item.family === "PAYMENTS")?.requiredCapabilities).toEqual(
      expect.arrayContaining(["DEPOSIT_PAYMENT", "FINAL_PAYMENT"]),
    );
    expect(resolved.contract.providerTenancy).toBe("DEDICATED_PER_VENTURE");
    expect(resolved.gaps).toEqual([]);
  });

  it("consumes the art marketplace payment contract and adds marketplace operating systems", () => {
    const resolved = resolveVentureSystems(ART_MARKETPLACE_SYSTEMS_FIXTURE);
    expect(resolved.contract.businessModel).toBe("MARKETPLACE");
    expect(resolved.payment.contract.architecture).toBe("STRIPE_CONNECT_MARKETPLACE");
    expect(resolved.contract.paymentArchitecture.architecture).toBe("STRIPE_CONNECT_MARKETPLACE");
    expect(ART_MARKETPLACE_SYSTEMS_FIXTURE.paymentEvidence).toBe(ART_MARKETPLACE_FIXTURE);
    expect(resolved.contract.identityArchitecture.models).toEqual(
      expect.arrayContaining(["ARTIST_IDENTITY", "COLLECTOR_IDENTITY", "BUYER", "SELLER"]),
    );
    expect(requiredFamilies(resolved.contract)).toEqual(
      expect.arrayContaining([
        "PAYMENTS",
        "REPUTATION_AND_REVIEWS",
        "CUSTOMER_SUPPORT",
        "MARKETING_EMAIL",
        "ANALYTICS",
        "ATTRIBUTION",
        "LIFECYCLE_AUTOMATION",
      ]),
    );
    expect(resolved.contract.reputationArchitecture.capabilities).toEqual(expect.arrayContaining(["SELLER_RATINGS", "MODERATION"]));
    expect(resolved.contract.lifecycleAutomations).toContain("SELLER_ONBOARDING_INCOMPLETE");
    expect(resolved.contract.providerTenancy).toBe("DEDICATED_PER_VENTURE");
  });

  it("models an AI SEO platform as SaaS with entitlements and reused payment architecture", () => {
    const resolved = resolveVentureSystems(AI_SEO_PLATFORM_FIXTURE);
    expect(resolved.contract.businessModel).toBe("SAAS");
    expect(resolved.contract.paymentArchitecture.architectureKind).toBe("BILLING_SUBSCRIPTIONS");
    expect(requiredFamilies(resolved.contract)).toEqual(
      expect.arrayContaining([
        "IDENTITY_AND_ACCOUNTS",
        "AUTHORIZATION_AND_ROLES",
        "ENTITLEMENTS",
        "PAYMENTS",
        "CRM",
        "TRANSACTIONAL_EMAIL",
        "MARKETING_EMAIL",
        "ANALYTICS",
        "ATTRIBUTION",
        "CUSTOMER_SUPPORT",
        "LIFECYCLE_AUTOMATION",
        "CONTENT_AND_DISTRIBUTION",
        "SEO",
      ]),
    );
    expect(resolved.contract.systemRequirements.find((item) => item.family === "ENTITLEMENTS")?.requiredCapabilities).toContain(
      "PAGES_PER_MONTH_ENTITLEMENT",
    );
    expect(resolved.contract.supportArchitecture.capabilities).toContain("KNOWLEDGE_BASE");
    expect(resolved.contract.securityRequirements).toContain("ERROR_MONITORING");
    expect(resolved.contract.identityArchitecture.models).toEqual(expect.arrayContaining(["CUSTOMER_ACCOUNT", "ADMIN_ACCOUNT"]));
    expect(resolved.contract.identityArchitecture.roleBasedAccess).toBe(true);
  });

  it("does not overbuild a simple one-time digital product", () => {
    const resolved = resolveVentureSystems(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    expect(resolved.contract.businessModel).toBe("DIGITAL_PRODUCT");
    expect(requiredFamilies(resolved.contract)).toEqual(
      expect.arrayContaining(["PAYMENTS", "TRANSACTIONAL_EMAIL", "COMMERCE_AND_FULFILLMENT", "ANALYTICS"]),
    );
    expect(resolved.contract.crmArchitecture.required).toBe(false);
    expect(resolved.contract.communicationsArchitecture.sms).toBe(false);
    expect(resolved.contract.schedulingArchitecture.required).toBe(false);
    expect(resolved.contract.identityArchitecture.models).not.toContain("SELLER");
    expect(resolved.contract.supportArchitecture.complexStackRequired).toBe(false);
    expect(requiredFamilies(resolved.contract)).not.toContain("CRM");
    expect(requiredFamilies(resolved.contract)).not.toContain("SMS");
    expect(requiredFamilies(resolved.contract)).not.toContain("SCHEDULING");
    expect(resolved.gaps).toEqual([]);
  });

  it("classifies SaaS, ecommerce, lead generation, service platform, marketplace, and content businesses", () => {
    expect(requiredFamilies(buildVentureSystemsContract(SAAS_FIXTURE))).toEqual(
      expect.arrayContaining(["IDENTITY_AND_ACCOUNTS", "ENTITLEMENTS", "PAYMENTS", "CRM"]),
    );
    expect(requiredFamilies(buildVentureSystemsContract(ECOMMERCE_FIXTURE))).toEqual(
      expect.arrayContaining(["COMMERCE_AND_FULFILLMENT", "PAYMENTS", "MARKETING_EMAIL"]),
    );
    expect(buildVentureSystemsContract(ECOMMERCE_FIXTURE).systemRequirements.find((item) => item.family === "COMMERCE_AND_FULFILLMENT")?.requiredCapabilities).toEqual(
      expect.arrayContaining(["INVENTORY", "PHYSICAL_FULFILLMENT"]),
    );
    expect(requiredFamilies(buildVentureSystemsContract(LEAD_GENERATION_FIXTURE))).toEqual(
      expect.arrayContaining(["LEAD_CAPTURE", "CRM", "ATTRIBUTION", "SEO", "MARKETING_EMAIL", "ANALYTICS"]),
    );
    expect(requiredFamilies(buildVentureSystemsContract(SERVICE_PLATFORM_FIXTURE))).toEqual(
      expect.arrayContaining(["IDENTITY_AND_ACCOUNTS", "PAYMENTS", "SCHEDULING", "REPUTATION_AND_REVIEWS"]),
    );
    expect(requiredFamilies(buildVentureSystemsContract(MARKETPLACE_FIXTURE))).toContain("PAYMENTS");
    expect(requiredFamilies(buildVentureSystemsContract(CONTENT_BUSINESS_FIXTURE))).toEqual(
      expect.arrayContaining(["CONTENT_AND_DISTRIBUTION", "SEO", "ANALYTICS"]),
    );
    expect(buildVentureSystemsContract(CONTENT_BUSINESS_FIXTURE).crmArchitecture.required).toBe(false);
  });

  it("does not invent systems when the business model is ambiguous", () => {
    const resolved = resolveVentureSystems({ businessConcept: "" });
    expect(classifyVentureOperatingModel({})).toBe("AMBIGUOUS");
    expect(requiredFamilies(resolved.contract).every((family) => family === "LEGAL_AND_COMPLIANCE" || family === "SECURITY_AND_RISK")).toBe(true);
    expect(resolved.contract.unresolvedPolicies.map((item) => item.code)).toContain("BUSINESS_MODEL_AMBIGUOUS");
    expect(resolved.gaps).toEqual([]);
  });

  it("keeps CRM, SMS, email, analytics, and support provider-neutral", () => {
    const contractor = buildVentureSystemsContract(HOME_CONTRACTOR_FIXTURE);
    expect(contractor.crmArchitecture.required).toBe(true);
    expect(contractor.vendorProcurementRequirements.find((item) => item.providerCategory === "CRM")?.providerId).not.toBe("hubspot");
    expect(catalogProviderCandidates("CRM").map((item) => item.providerId)).toEqual(expect.arrayContaining(["hubspot", "gohighlevel", "salesforce", "internal_crm"]));
    expect(catalogProviderCandidates("SMS").map((item) => item.providerId)).toContain("twilio");
    expect(catalogProviderCandidates("EMAIL").map((item) => item.providerId)).toEqual(expect.arrayContaining(["resend", "postmark", "klaviyo"]));
    expect(catalogProviderCandidates("ANALYTICS").map((item) => item.providerId)).toContain("ga4");
    const source = domainSource();
    expect(source).not.toMatch(/HubSpot is required/i);
    expect(source).not.toMatch(/must use Twilio/i);
    expect(source).not.toMatch(/must use Resend/i);
    expect(source).not.toMatch(/must use GA4/i);
    expect(contractor.analyticsArchitecture.performanceIntelligenceIsCanonical).toBe(true);
    expect(contractor.contentArchitecture.organicGrowthIsCanonical).toBe(true);
  });

  it("selects stage-aware tenancy without creating purchase authority", () => {
    expect(
      selectTenancyStrategy({
        stage: "PRE_REVENUE",
        sensitivity: "STANDARD",
        paidMonthlyCostUsd: 500,
        freeAlternativeExists: true,
      }),
    ).toBe("SHARED");
    expect(
      selectTenancyStrategy({
        stage: "MATURE",
        sensitivity: "STANDARD",
        dedicatedIsolationValuable: true,
      }),
    ).toBe("DEDICATED_PER_VENTURE");
    expect(selectTenancyStrategy({ stage: "EXPERIMENTAL", sensitivity: "REGULATED" })).toBe("DEDICATED_PER_VENTURE");
    expect(selectTenancyStrategy({ stage: "SPINOUT_CANDIDATE", sensitivity: "STANDARD", spinoutLikelihood: "HIGH" })).toBe(
      "DEDICATED_PER_COMPANY",
    );

    const cheap = resolveVentureSystems(PRE_REVENUE_CRM_COST_FIXTURE);
    const crm = cheap.contract.vendorProcurementRequirements.find((item) => item.providerCategory === "CRM");
    expect(crm?.procurementStatus).toBe("FREE_TIER");
    expect(crm?.livePurchaseAuthority).toBe(false);
    expect(cheap.contract.providerTenancy).not.toBe("DEDICATED_PER_VENTURE");
    expect(cheap.contract.providerRequirements.find((item) => item.providerCategory === "CRM")?.dedicatedRequired).toBe(false);

    const mature = resolveVentureSystems(MATURE_DEDICATED_CRM_FIXTURE);
    expect(mature.contract.providerTenancy).toBe("DEDICATED_PER_VENTURE");
    expect(mature.contract.providerRequirements.some((item) => item.dedicatedRequired)).toBe(true);
    expect(mature.contract.liveAuthorityRequirements.livePurchaseAuthority).toBe(false);
    expect(["TREASURY_ELIGIBLE", "LIVE_PURCHASE_GATED"]).toContain(
      mature.contract.vendorProcurementRequirements.find((item) => item.providerCategory === "CRM")?.procurementStatus,
    );
  });

  it("never treats unknown cost as zero and never purchases", () => {
    const resolved = resolveVentureSystems(UNKNOWN_COST_FIXTURE);
    const crm = resolved.contract.vendorProcurementRequirements.find((item) => item.providerCategory === "CRM");
    expect(crm?.monthlyCost).toEqual(unknownCost());
    expect(crm?.monthlyCost.value).not.toBe(0);
    expect(crm?.procurementStatus).toBe("BUDGET_REVIEW_REQUIRED");
    expect(resolved.hq.estimatedRecurringSoftwareCost.actuality).toBe("UNKNOWN");
    expect(resolved.hq.liveProvisioningAuthority).toBe(false);
    expect(VENTURE_SYSTEMS_WRITE_BOUNDARY.paidSubscriptions).toBe(0);
  });

  it("produces a deterministic implementation dependency graph", () => {
    const contract = buildVentureSystemsContract(SAAS_FIXTURE);
    const graph = buildDependencyGraph(contract.systemRequirements);
    const identity = graph.find((item) => item.family === "IDENTITY_AND_ACCOUNTS");
    const payments = graph.find((item) => item.family === "PAYMENTS");
    const entitlements = graph.find((item) => item.family === "ENTITLEMENTS");
    const crm = graph.find((item) => item.family === "CRM");
    const analytics = graph.find((item) => item.family === "ANALYTICS");
    expect(identity).toBeTruthy();
    expect(payments?.dependsOn).toContain("IDENTITY_AND_ACCOUNTS");
    expect(entitlements?.dependsOn).toEqual(expect.arrayContaining(["PAYMENTS", "IDENTITY_AND_ACCOUNTS"]));
    expect(crm?.dependsOn).toContain("PAYMENTS");
    expect(analytics?.dependsOn).toContain("CRM");
    expect(contract.liveAuthorityRequirements.cursorChoosesSystemsIndependently).toBe(false);
    expect(contract.liveAuthorityRequirements.infinitySuppliesSystemsArchitecture).toBe(true);
  });

  it("exposes a read-only HQ model and leaves legal conclusions unresolved", () => {
    const resolved = resolveVentureSystems(HOME_CONTRACTOR_FIXTURE);
    expect(resolved.hq.requiredSystems).toContain("CRM");
    expect(resolved.hq.tenancyStrategy).toBe("DEDICATED_PER_VENTURE");
    expect(resolved.hq.liveProvisioningAuthority).toBe(false);
    expect(resolved.hq.unresolvedPolicyGaps).toEqual(
      expect.arrayContaining(["PROFESSIONAL_LICENSING", "TAX_LIABILITY", "MERCHANT_OF_RECORD_LEGAL_STATUS"]),
    );
    expect(explainVentureSystems(resolved.contract)).toMatch(/crm/i);
    expect(explainVentureSystems(resolved.contract)).toMatch(/Live provisioning authority is not granted/);
  });

  it("blocks every provider write and records zero side effects", async () => {
    const adapter = createBlockedSystemsAdapter();
    const blocked = await assertSystemsWritesBlocked(adapter);
    expect(Object.values(blocked).every((value) => value === "BLOCKED")).toBe(true);
    await expect(adapter.purchaseSubscription()).rejects.toBeInstanceOf(ReadOnlyMutationBlockedError);
    expect(VENTURE_SYSTEMS_WRITE_BOUNDARY).toMatchObject({
      crmWrites: 0,
      emailSends: 0,
      smsSends: 0,
      providerAccountCreations: 0,
      paidSubscriptions: 0,
      cardBankCharges: 0,
      stripeWrites: 0,
      treasuryExternalMovements: 0,
      dnsWrites: 0,
      registrarWrites: 0,
      deploymentWrites: 0,
      eagActions: 0,
    });
    const source = domainSource();
    expect(source).not.toMatch(/fetch\("https:\/\//);
    expect(source).not.toMatch(/method:\s*"POST"/);
  });
});
