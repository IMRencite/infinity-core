import { newId, nowIso, type CommercializationStore } from "./store";
import type { CommercializationPlan, CommercializationStage, DeploymentAsset } from "./types";
import type { ProductionArtifactHandoff } from "@/lib/infinity/production-artifact/handoff";
import { createDomainRequirement, registerDomainWithAuthority } from "./domain/register-domain";
import { buildDomainCandidates, selectTopDomainCandidate } from "./domain/candidate-engine";
import { buildDefaultDnsDesiredRecords, createDnsDesiredState, reconcileDnsDesiredState } from "./dns/reconcile";
import {
  activateCommercialProduct,
  configureCheckout,
  createRevenueActivationPlan,
  type MonetizationPlanLineage,
} from "./revenue/activation";
import { commercialEventToPerformanceEvents, fulfillPaymentEvent, ingestPaymentWebhookEvent } from "./revenue/webhook-ingest";
import { ensureVentureBudget } from "./treasury/spend-authority";
import type { MockProviderBundle } from "./providers/mock";

export type DryRunInput = {
  organizationId: string;
  ventureId: string;
  brandName: string;
  ventureBlueprintId?: string | null;
  selectedCandidateId?: string | null;
  missionId?: string | null;
  cycleKey?: string | null;
  authorizedBudgetUsd?: number;
  lineage: MonetizationPlanLineage;
  providers: MockProviderBundle;
  store: CommercializationStore;
  simulateDnsFailure?: boolean;
  /** Typed production handoff intake only. Dry-run execution ignores this and does not deploy from it. */
  productionArtifactHandoff?: ProductionArtifactHandoff | null;
}

export type DryRunResult = {
  plan: CommercializationPlan;
  domainAssetId: string | null;
  deploymentAssetId: string | null;
  productId: string | null;
  paymentEventId: string | null;
  entitlementId: string | null;
  performanceEventCount: number;
  stage: CommercializationStage;
  blockedReason?: string;
};

function createPlan(input: DryRunInput): CommercializationPlan {
  const idempotencyKey = `venture:${input.ventureId}:commercialization-plan:v1`;
  const existing = input.store.findByIdempotency(input.organizationId, idempotencyKey, input.store.plans);
  if (existing) return existing;

  const plan: CommercializationPlan = {
    id: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    ventureBlueprintId: input.ventureBlueprintId ?? null,
    selectedCandidateId: input.selectedCandidateId ?? null,
    missionId: input.missionId ?? null,
    cycleKey: input.cycleKey ?? null,
    brandName: input.brandName,
    productType: "saas",
    businessModel: input.lineage.modelType,
    domainRequirements: { preferredTlds: [".com", ".io"] },
    hostingRequirements: { provider: "mock.hosting_v1" },
    paymentModel: { capability: "subscription_checkout" },
    pricing: { plannedPriceUsd: input.lineage.plannedPriceUsd },
    fulfillmentModel: { type: "SAAS_ENTITLEMENT" },
    expectedInfrastructureSpend: { domain: 12.99, hosting: 0 },
    externalActionRequirements: [
      "REGISTER_DOMAIN",
      "UPDATE_DNS",
      "CREATE_HOSTING_PROJECT",
      "ATTACH_DOMAIN",
      "CREATE_PAYMENT_PRODUCT",
      "CREATE_PAYMENT_PRICE",
      "CONFIGURE_CHECKOUT",
    ],
    status: "EXECUTING",
    currentStage: "PLAN",
    idempotencyKey,
    createdAt: nowIso(),
  };
  input.store.plans.set(plan.id, plan);
  input.store.registerIdempotency(input.organizationId, idempotencyKey, plan.id);
  return plan;
}

export async function runCommercializationDryRun(input: DryRunInput): Promise<DryRunResult> {
  const plan = createPlan(input);
  ensureVentureBudget(input.store, {
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    authorizedBudgetUsd: input.authorizedBudgetUsd ?? 500,
  });

  plan.currentStage = "DOMAIN";
  input.store.plans.set(plan.id, plan);

  const requirement = createDomainRequirement({
    store: input.store,
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    commercializationPlanId: plan.id,
    brandName: input.brandName,
    businessDescription: "Dry-run venture",
    preferredKeywords: ["ops"],
    maximumPurchasePriceUsd: 50,
  });

  input.providers.registrar.seedAvailability([
    {
      domain: `${input.brandName.toLowerCase().replace(/\s+/g, "")}.com`,
      available: true,
      registrationPriceUsd: 12.99,
      renewalPriceUsd: 14.99,
      priceTruth: "ESTIMATE",
      currency: "USD",
    },
  ]);

  const candidates = await buildDomainCandidates({ requirement, registrar: input.providers.registrar });
  for (const c of candidates) input.store.domainCandidates.set(c.id, c);
  const selected = selectTopDomainCandidate(candidates);
  if (!selected) throw new Error("NO_DOMAIN_CANDIDATE");

  const { asset: domainAsset } = await registerDomainWithAuthority({
    store: input.store,
    registrar: input.providers.registrar,
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    candidate: selected,
    commercializationPlanId: plan.id,
    missionId: input.missionId,
    authorizationRef: "dry_run_eag",
  });

  plan.currentStage = "INFRASTRUCTURE";
  input.store.plans.set(plan.id, plan);

  const dnsDesired = createDnsDesiredState({
    store: input.store,
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    domainAssetId: domainAsset.id,
    zoneName: domainAsset.domain,
    provider: input.providers.dns.providerKey,
    records: buildDefaultDnsDesiredRecords({ zoneName: domainAsset.domain, hostingTarget: "192.0.2.10" }),
    idempotencyKey: `venture:${input.ventureId}:dns:${domainAsset.domain}`,
  });

  const dnsResult = await reconcileDnsDesiredState({
    store: input.store,
    dns: input.providers.dns,
    desired: dnsDesired,
    simulateFailure: input.simulateDnsFailure,
    authorizationRef: "dry_run_eag",
  });

  if (dnsResult.failed) {
    plan.status = "BLOCKED";
    plan.currentStage = "INFRASTRUCTURE";
    input.store.plans.set(plan.id, plan);
    return {
      plan,
      domainAssetId: domainAsset.id,
      deploymentAssetId: null,
      productId: null,
      paymentEventId: null,
      entitlementId: null,
      performanceEventCount: 0,
      stage: plan.currentStage,
      blockedReason: dnsResult.failureCode,
    };
  }

  plan.currentStage = "DEPLOY";
  input.store.plans.set(plan.id, plan);

  const project = await input.providers.hosting.createProject(`venture-${input.ventureId}`);
  const deployKey = `venture:${input.ventureId}:deploy:v1`;
  const deployment = await input.providers.hosting.deploy({
    projectId: project.projectId,
    artifactRef: "artifact:dry-run",
    idempotencyKey: deployKey,
  });
  await input.providers.hosting.attachDomain({
    projectId: project.projectId,
    domain: domainAsset.domain,
    idempotencyKey: `venture:${input.ventureId}:attach-domain:${domainAsset.domain}`,
  });

  const deploymentAsset: DeploymentAsset = {
    id: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    provider: input.providers.hosting.providerKey,
    projectId: project.projectId,
    deploymentId: deployment.deploymentId,
    environment: "production",
    status: "DOMAIN_ATTACHED",
    deploymentUrl: deployment.deploymentUrl,
    customDomain: domainAsset.domain,
    artifactId: null,
    commitHash: null,
    productionReady: true,
    deployed: true,
    domainAttached: true,
    publiclyLaunched: false,
    rollbackReference: null,
    verifiedAt: nowIso(),
    idempotencyKey: deployKey,
  };
  input.store.deploymentAssets.set(deploymentAsset.id, deploymentAsset);
  input.store.registerIdempotency(input.organizationId, deployKey, deploymentAsset.id);

  plan.currentStage = "REVENUE_ACTIVATION";
  input.store.plans.set(plan.id, plan);

  const revenuePlan = createRevenueActivationPlan({
    store: input.store,
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    commercializationPlanId: plan.id,
    lineage: input.lineage,
    idempotencyKey: `venture:${input.ventureId}:revenue-plan:v1`,
  });

  const { product, price } = await activateCommercialProduct({
    store: input.store,
    payments: input.providers.payments,
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    revenuePlan,
    lineage: input.lineage,
    productName: `${input.brandName} Pro`,
    idempotencyKey: `venture:${input.ventureId}:payment-product:v1`,
  });

  await configureCheckout({
    store: input.store,
    payments: input.providers.payments,
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    product,
    price,
    idempotencyKey: `venture:${input.ventureId}:checkout:v1`,
  });

  plan.currentStage = "VERIFY";
  input.store.plans.set(plan.id, plan);

  const payload = JSON.stringify({
    providerEventId: `evt_dry_${input.ventureId}`,
    eventType: "PAYMENT_SUCCEEDED",
    amountUsd: input.lineage.plannedPriceUsd,
    feeUsd: 0.87,
    currency: "USD",
    customerReference: "cus_dry_run",
    metadata: {
      organizationId: input.organizationId,
      ventureId: input.ventureId,
      commercialProductId: product.id,
    },
    rawPayload: { id: `evt_dry_${input.ventureId}`, authorization: "Bearer secret-token" },
  });

  const signature = input.providers.payments.signPayload(payload);
  const ingest = await ingestPaymentWebhookEvent({
    store: input.store,
    payments: input.providers.payments,
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    commercialProductId: product.id,
    commercialPriceId: price.id,
    webhookSecret: input.providers.payments.webhookSecret,
    signature,
    rawPayload: payload,
  });

  if (!ingest.event) throw new Error("WEBHOOK_INGEST_FAILED");

  const entitlement = fulfillPaymentEvent({ store: input.store, event: ingest.event });

  const perfEvents = commercialEventToPerformanceEvents({ event: ingest.event, sourceId: "commercialization_v1" });

  plan.currentStage = "READY";
  plan.status = "ACTIVE";
  input.store.plans.set(plan.id, plan);

  return {
    plan,
    domainAssetId: domainAsset.id,
    deploymentAssetId: deploymentAsset.id,
    productId: product.id,
    paymentEventId: ingest.event.id,
    entitlementId: entitlement.id,
    performanceEventCount: perfEvents.length,
    stage: plan.currentStage,
  };
}
