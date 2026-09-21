import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { CommercializationStore } from "../store";
import { createMockProviderBundle } from "../providers/mock";
import { runCommercializationDryRun } from "../run-dry-run";
import { registerDomainWithAuthority, createDomainRequirement } from "../domain/register-domain";
import { buildDomainCandidates, selectTopDomainCandidate } from "../domain/candidate-engine";
import { createSpendIntent, authorizeSpendIntent, ensureVentureBudget } from "../treasury/spend-authority";
import { ingestPaymentWebhookEvent, fulfillPaymentEvent, sanitizePaymentPayload } from "../revenue/webhook-ingest";
import { buildCommercializationArtifacts } from "../hq/build-commercialization-artifacts";
import { evaluateCommercialHealth } from "../health/commercial-health";
import { MockRegistrarProvider } from "../providers/mock";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const VENTURE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function lineage() {
  return {
    monetizationPlanId: randomUUID(),
    monetizationRunId: randomUUID(),
    candidateId: randomUUID(),
    plannedPriceUsd: 19,
    billingFrequency: "monthly",
    modelType: "SaaS",
  };
}

describe("Commercialization Control Plane v1 dry-run", () => {
  it("runs end-to-end commercialization pipeline with complete lineage", async () => {
    const store = new CommercializationStore();
    const providers = createMockProviderBundle();

    const result = await runCommercializationDryRun({
      store,
      providers,
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      brandName: "OpsFlow",
      authorizedBudgetUsd: 500,
      lineage: lineage(),
    });

    expect(result.plan.status).toBe("ACTIVE");
    expect(result.stage).toBe("READY");
    expect(result.domainAssetId).toBeTruthy();
    expect(result.deploymentAssetId).toBeTruthy();
    expect(result.productId).toBeTruthy();
    expect(result.paymentEventId).toBeTruthy();
    expect(result.entitlementId).toBeTruthy();
    expect(result.performanceEventCount).toBeGreaterThan(0);
    expect(providers.registrar.purchaseCount).toBe(1);
  });

  it("prevents duplicate domain registration on retry", async () => {
    const store = new CommercializationStore();
    const registrar = new MockRegistrarProvider();
    registrar.seedAvailability([
      {
        domain: "opsflow.com",
        available: true,
        registrationPriceUsd: 12.99,
        renewalPriceUsd: 14.99,
        priceTruth: "ESTIMATE",
        currency: "USD",
      },
    ]);

    ensureVentureBudget(store, { organizationId: ORG_A, ventureId: VENTURE_A, authorizedBudgetUsd: 100 });
    const req = createDomainRequirement({
      store,
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      brandName: "OpsFlow",
    });
    const candidates = await buildDomainCandidates({ requirement: req, registrar });
    const selected = selectTopDomainCandidate(candidates)!;

    const first = await registerDomainWithAuthority({
      store,
      registrar,
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      candidate: selected,
    });
    const second = await registerDomainWithAuthority({
      store,
      registrar,
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      candidate: selected,
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(registrar.purchaseCount).toBe(1);
    expect(store.domainAssets.size).toBe(1);
  });

  it("denies spend when budget exceeded — no provider purchase", async () => {
    const store = new CommercializationStore();
    const registrar = new MockRegistrarProvider();
    registrar.seedAvailability([
      {
        domain: "expensive.com",
        available: true,
        registrationPriceUsd: 99,
        renewalPriceUsd: 99,
        priceTruth: "ESTIMATE",
        currency: "USD",
      },
    ]);

    ensureVentureBudget(store, { organizationId: ORG_A, ventureId: VENTURE_A, authorizedBudgetUsd: 10 });
    const req = createDomainRequirement({ store, organizationId: ORG_A, ventureId: VENTURE_A, brandName: "expensive" });
    const candidates = await buildDomainCandidates({ requirement: req, registrar });
    const selected = candidates.find((c) => c.domain === "expensive.com")!;
    selected.selected = true;

    await expect(
      registerDomainWithAuthority({
        store,
        registrar,
        organizationId: ORG_A,
        ventureId: VENTURE_A,
        candidate: selected,
      }),
    ).rejects.toThrow(/BUDGET_DENIED/);

    expect(registrar.purchaseCount).toBe(0);
  });

  it("preserves UNKNOWN renewal price and requires HITL policy path", () => {
    const store = new CommercializationStore();
    ensureVentureBudget(store, { organizationId: ORG_A, ventureId: VENTURE_A, authorizedBudgetUsd: 500 });

    const intent = createSpendIntent(store, {
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      category: "DOMAIN_REGISTRATION",
      provider: "mock.registrar_v1",
      capability: "domain.register",
      purpose: "Register unknown-renewal.com",
      requestedAmountUsd: 12,
      reversibility: "PARTIALLY_REVERSIBLE",
      idempotencyKey: "intent:unknown-renewal",
      expectedValue: { renewalPriceUnknown: true },
    });

    const auth = authorizeSpendIntent(store, intent.id);
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.outcome).toBe("HITL_REQUIRED");
  });

  it("replays payment webhook idempotently — no duplicate revenue or entitlement", async () => {
    const store = new CommercializationStore();
    const providers = createMockProviderBundle();
    const dry = await runCommercializationDryRun({
      store,
      providers,
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      brandName: "ReplayCo",
      authorizedBudgetUsd: 500,
      lineage: lineage(),
    });

    const product = [...store.products.values()][0]!;
    const price = [...store.prices.values()][0]!;
    const payload = JSON.stringify({
      providerEventId: "evt_replay_1",
      eventType: "PAYMENT_SUCCEEDED",
      amountUsd: 19,
      feeUsd: 0.5,
      currency: "USD",
      customerReference: "cus_1",
      metadata: {},
      rawPayload: { api_key: "sk-secret", authorization: "Bearer x" },
    });
    const sig = providers.payments.signPayload(payload);

    const first = await ingestPaymentWebhookEvent({
      store,
      payments: providers.payments,
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      commercialProductId: product.id,
      commercialPriceId: price.id,
      webhookSecret: providers.payments.webhookSecret,
      signature: sig,
      rawPayload: payload,
    });
    const second = await ingestPaymentWebhookEvent({
      store,
      payments: providers.payments,
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      commercialProductId: product.id,
      commercialPriceId: price.id,
      webhookSecret: providers.payments.webhookSecret,
      signature: sig,
      rawPayload: payload,
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(store.paymentEvents.size).toBe(2); // dry run event + replay attempt same id = still 1 unique provider id
    expect(
      [...store.paymentEvents.values()].filter((e) => e.providerEventId === "evt_replay_1").length,
    ).toBe(1);

    const ent1 = fulfillPaymentEvent({ store, event: first.event! });
    const ent2 = fulfillPaymentEvent({ store, event: second.event! });
    expect(ent1.id).toBe(ent2.id);
    expect(dry.entitlementId).toBeTruthy();
  });

  it("rejects invalid webhook signature", async () => {
    const store = new CommercializationStore();
    const providers = createMockProviderBundle();
    const result = await ingestPaymentWebhookEvent({
      store,
      payments: providers.payments,
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      commercialProductId: randomUUID(),
      commercialPriceId: randomUUID(),
      webhookSecret: providers.payments.webhookSecret,
      signature: "invalid",
      rawPayload: "{}",
    });
    expect(result.rejected).toBe(true);
    expect(result.event).toBeNull();
  });

  it("sanitizes secrets from payment payload", () => {
    const sanitized = sanitizePaymentPayload({
      api_key: "sk-live",
      authorization: "Bearer secret",
      amount: 19,
    });
    expect(sanitized.api_key).toBe("[redacted]");
    expect(sanitized.authorization).toBe("[redacted]");
    expect(sanitized.amount).toBe(19);
  });

  it("keeps domain registered when DNS fails — mission blocked not rolled back", async () => {
    const store = new CommercializationStore();
    const providers = createMockProviderBundle();
    const result = await runCommercializationDryRun({
      store,
      providers,
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      brandName: "DnsFailCo",
      authorizedBudgetUsd: 500,
      lineage: lineage(),
      simulateDnsFailure: true,
    });

    expect(result.plan.status).toBe("BLOCKED");
    expect(result.domainAssetId).toBeTruthy();
    expect(result.deploymentAssetId).toBeNull();
    const domain = store.domainAssets.get(result.domainAssetId!)!;
    expect(domain.status).toBe("REGISTERED");
  });

  it("builds HQ commercialization artifacts for deployment depot and profit lab", async () => {
    const store = new CommercializationStore();
    const providers = createMockProviderBundle();
    await runCommercializationDryRun({
      store,
      providers,
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      brandName: "HqCo",
      authorizedBudgetUsd: 500,
      lineage: lineage(),
    });

    const artifacts = buildCommercializationArtifacts(store, { organizationId: ORG_A, ventureId: VENTURE_A });
    expect(artifacts.launch_operations?.some((a) => a.artifactType === "commercial_domain")).toBe(true);
    expect(artifacts.launch_operations?.some((a) => a.artifactType === "deployment")).toBe(true);
    expect(artifacts.strategy_finance?.some((a) => a.artifactType === "commercial_payment")).toBe(true);
    expect(artifacts.strategy_finance?.some((a) => a.artifactType === "commercial_checkout")).toBe(true);
    expect(artifacts.intelligence_center?.some((a) => a.artifactType === "commercial_revenue")).toBe(true);
  });

  it("denies cross-org artifact visibility in store queries", async () => {
    const store = new CommercializationStore();
    const providers = createMockProviderBundle();
    await runCommercializationDryRun({
      store,
      providers,
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      brandName: "OrgA",
      authorizedBudgetUsd: 500,
      lineage: lineage(),
    });

    const orgBArtifacts = buildCommercializationArtifacts(store, { organizationId: ORG_B, ventureId: VENTURE_A });
    expect(Object.keys(orgBArtifacts).length).toBe(0);
  });

  it("evaluates commercial health after successful dry run", async () => {
    const store = new CommercializationStore();
    const providers = createMockProviderBundle();
    await runCommercializationDryRun({
      store,
      providers,
      organizationId: ORG_A,
      ventureId: VENTURE_A,
      brandName: "HealthyCo",
      authorizedBudgetUsd: 500,
      lineage: lineage(),
    });

    const health = evaluateCommercialHealth(store, { organizationId: ORG_A, ventureId: VENTURE_A });
    expect(health.checks.domainRegistered).toBe(true);
    expect(health.checks.revenueTelemetryActive).toBe(true);
    expect(health.status).toBe("READY");
  });
});

describe("Commercialization provider neutrality", () => {
  it("uses capability contracts not provider-specific business logic", () => {
    const providers = createMockProviderBundle();
    expect(providers.registrar.providerKey).toContain("mock");
    expect(providers.payments.providerKey).toContain("mock");
    expect(typeof providers.registrar.registerDomain).toBe("function");
    expect(typeof providers.payments.createCheckoutConfiguration).toBe("function");
  });
});
