import { createMockProviderBundle } from "@/lib/infinity/commercialization/providers/mock";
import { CommercializationStore, nowIso, newId } from "@/lib/infinity/commercialization/store";
import { createDomainRequirement } from "@/lib/infinity/commercialization/domain/register-domain";
import { buildDomainCandidates, selectTopDomainCandidate } from "@/lib/infinity/commercialization/domain/candidate-engine";
import { buildDefaultDnsDesiredRecords, createDnsDesiredState } from "@/lib/infinity/commercialization/dns/reconcile";
import { createRevenueActivationPlan } from "@/lib/infinity/commercialization/revenue/activation";
import type { CommercializationPlan } from "@/lib/infinity/commercialization/types";
import type { ZeroToProductionRun } from "./types";

/** Prepare commercialization artifacts without executing EAG mutations. */
export async function prepareCommercializationPlan(input: {
  run: ZeroToProductionRun;
  store: CommercializationStore;
  brandName: string;
  modelType: string;
  plannedPriceUsd: number;
}): Promise<{
  plan: CommercializationPlan;
  domainRequirementId: string;
  domainCandidateCount: number;
  dnsDesiredStateId: string | null;
  revenuePlanId: string;
  registrarPurchases: number;
  dnsMutations: number;
  paymentProducts: number;
}> {
  const providers = createMockProviderBundle();
  const ventureId = input.run.ventureId ?? input.run.opportunityCandidateId;
  const idempotencyKey = `ztp:${input.run.id}:commercialization-plan`;
  const existing = input.store.findByIdempotency(input.run.organizationId, idempotencyKey, input.store.plans);
  if (existing) {
    return {
      plan: existing,
      domainRequirementId: [...input.store.domainRequirements.values()].find((r) => r.commercializationPlanId === existing.id)?.id ?? existing.id,
      domainCandidateCount: [...input.store.domainCandidates.values()].filter((c) => c.domainRequirementId === ([...input.store.domainRequirements.values()].find((r) => r.commercializationPlanId === existing.id)?.id ?? "")).length,
      dnsDesiredStateId: [...input.store.dnsStates.values()].find((d) => d.ventureId === ventureId)?.id ?? null,
      revenuePlanId: [...input.store.revenuePlans.values()].find((p) => p.ventureId === ventureId)?.id ?? existing.id,
      registrarPurchases: providers.registrar.purchaseCount,
      dnsMutations: 0,
      paymentProducts: 0,
    };
  }

  const plan: CommercializationPlan = {
    id: newId(),
    organizationId: input.run.organizationId,
    ventureId,
    ventureBlueprintId: input.run.ventureBlueprintId,
    selectedCandidateId: input.run.opportunityCandidateId,
    missionId: input.run.missionId,
    cycleKey: null,
    brandName: input.brandName,
    productType: "saas",
    businessModel: input.modelType,
    domainRequirements: { preferredTlds: [".com", ".io"] },
    hostingRequirements: { provider: "planned.hosting", publicDeploy: false },
    paymentModel: { capability: "subscription_checkout", liveMutation: false },
    pricing: { plannedPriceUsd: input.plannedPriceUsd },
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
    status: "READY",
    currentStage: "PLAN",
    idempotencyKey,
    createdAt: nowIso(),
  };
  input.store.plans.set(plan.id, plan);
  input.store.registerIdempotency(input.run.organizationId, idempotencyKey, plan.id);

  const requirement = createDomainRequirement({
    store: input.store,
    organizationId: input.run.organizationId,
    ventureId,
    commercializationPlanId: plan.id,
    brandName: input.brandName,
    businessDescription: "ZTP planned commercialization — no purchase",
    preferredKeywords: ["ops"],
    maximumPurchasePriceUsd: 50,
  });

  providers.registrar.seedAvailability([
    {
      domain: `${input.brandName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18)}.com`,
      available: true,
      registrationPriceUsd: 12.99,
      renewalPriceUsd: 14.99,
      priceTruth: "ESTIMATE",
      currency: "USD",
    },
  ]);

  const candidates = await buildDomainCandidates({ requirement, registrar: providers.registrar });
  for (const candidate of candidates) input.store.domainCandidates.set(candidate.id, candidate);
  const selected = selectTopDomainCandidate(candidates);
  const zone = selected?.domain ?? `${requirement.brandName.toLowerCase().replace(/\s+/g, "")}.example`;
  const dns = createDnsDesiredState({
    store: input.store,
    organizationId: input.run.organizationId,
    ventureId,
    domainAssetId: `planned:${zone}`,
    zoneName: zone,
    provider: providers.dns.providerKey,
    records: buildDefaultDnsDesiredRecords({ zoneName: zone, hostingTarget: "192.0.2.10" }),
    idempotencyKey: `ztp:${input.run.id}:dns-desired`,
  });

  const revenue = createRevenueActivationPlan({
    store: input.store,
    organizationId: input.run.organizationId,
    ventureId,
    commercializationPlanId: plan.id,
    lineage: {
      monetizationPlanId: "ztp-monetization-lineage",
      monetizationRunId: null,
      candidateId: input.run.opportunityCandidateId,
      plannedPriceUsd: input.plannedPriceUsd,
      billingFrequency: "MONTHLY",
      modelType: input.modelType,
    },
    idempotencyKey: `ztp:${input.run.id}:revenue-plan`,
  });

  return {
    plan,
    domainRequirementId: requirement.id,
    domainCandidateCount: candidates.length,
    dnsDesiredStateId: dns.id,
    revenuePlanId: revenue.id,
    registrarPurchases: providers.registrar.purchaseCount,
    dnsMutations: 0,
    paymentProducts: 0,
  };
}
