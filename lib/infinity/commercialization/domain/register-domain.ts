import { newId, nowIso, type CommercializationStore } from "../store";
import { assertSpendAuthorized, createSpendIntent, authorizeSpendIntent, recordSpendExecution } from "../treasury/spend-authority";
import { renewalPriceUnknown } from "./candidate-engine";
import type { DomainAsset, DomainCandidate, DomainRequirement } from "../types";
import type { RegistrarCapability } from "../providers/contracts";

export async function registerDomainWithAuthority(input: {
  store: CommercializationStore;
  registrar: RegistrarCapability;
  organizationId: string;
  ventureId: string;
  candidate: DomainCandidate;
  commercializationPlanId?: string | null;
  missionId?: string | null;
  authorizationRef?: string;
}): Promise<{ asset: DomainAsset; duplicate: boolean }> {
  const idempotencyKey = `venture:${input.ventureId}:domain-register:${input.candidate.domain}`;

  const existingAsset = input.store.findByIdempotency(input.organizationId, idempotencyKey, input.store.domainAssets);
  if (existingAsset) return { asset: existingAsset, duplicate: true };

  if (input.candidate.registrationPriceUsd == null) {
    throw new Error("UNKNOWN_COST");
  }

  const intent = createSpendIntent(input.store, {
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    missionId: input.missionId,
    commercializationPlanId: input.commercializationPlanId,
    category: "DOMAIN_REGISTRATION",
    provider: input.registrar.providerKey,
    capability: "domain.register",
    purpose: `Register domain ${input.candidate.domain}`,
    requestedAmountUsd: input.candidate.registrationPriceUsd,
    estimatedRecurringAmountUsd: input.candidate.renewalPriceUsd,
    reversibility: "PARTIALLY_REVERSIBLE",
    expectedValue: {
      domain: input.candidate.domain,
      renewalPriceUnknown: renewalPriceUnknown(input.candidate),
    },
    idempotencyKey: `intent:${idempotencyKey}`,
  });

  const authResult = authorizeSpendIntent(input.store, intent.id, {
    authoritySource: input.authorizationRef ?? "dry_run_gateway",
    externalActionId: null,
  });

  if (!authResult.ok) {
    throw new Error(`BUDGET_DENIED:${authResult.reason}`);
  }

  assertSpendAuthorized(authResult.authorization);

  const registration = await input.registrar.registerDomain({
    domain: input.candidate.domain,
    authorizationRef: authResult.authorization.id,
    idempotencyKey,
  });

  const execution = recordSpendExecution(input.store, {
    intent: authResult.intent,
    authorization: authResult.authorization,
    provider: input.registrar.providerKey,
    capability: "domain.register",
    idempotencyKey: `exec:${idempotencyKey}`,
    actualCostUsd: registration.registrationPriceUsd,
    costTruth: "ACTUAL",
    providerReference: registration.registrarDomainId,
    result: { domain: registration.domain },
  });

  const asset: DomainAsset = {
    id: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    domain: registration.domain,
    registrar: input.registrar.providerKey,
    registrarDomainId: registration.registrarDomainId,
    registrationPriceUsd: registration.registrationPriceUsd,
    renewalPriceUsd: registration.renewalPriceUsd,
    priceTruth: registration.renewalPriceTruth,
    currency: registration.currency,
    registeredAt: registration.registeredAt,
    expiresAt: registration.expiresAt,
    autoRenew: true,
    status: "REGISTERED",
    nameserverMode: "REGISTRAR",
    dnsProvider: null,
    verificationState: "PENDING",
    spendExecutionId: execution.id,
    idempotencyKey,
  };

  input.store.domainAssets.set(asset.id, asset);
  input.store.registerIdempotency(input.organizationId, idempotencyKey, asset.id);

  return { asset, duplicate: false };
}

export function createDomainRequirement(input: {
  store: CommercializationStore;
  organizationId: string;
  ventureId: string;
  commercializationPlanId?: string | null;
  brandName: string;
  businessDescription?: string | null;
  preferredKeywords?: string[];
  preferredTlds?: string[];
  maximumPurchasePriceUsd?: number | null;
}): DomainRequirement {
  const req: DomainRequirement = {
    id: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    commercializationPlanId: input.commercializationPlanId ?? null,
    brandName: input.brandName,
    businessDescription: input.businessDescription ?? null,
    preferredKeywords: input.preferredKeywords ?? [],
    preferredTlds: input.preferredTlds ?? [".com", ".io"],
    maxLength: 16,
    avoidHyphens: true,
    avoidNumbers: true,
    brandabilityPriority: 0.8,
    seoPriority: 0.4,
    maximumPurchasePriceUsd: input.maximumPurchasePriceUsd ?? null,
    renewalPriceConstraintUsd: null,
  };
  input.store.domainRequirements.set(req.id, req);
  return req;
}
