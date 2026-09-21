import { validateCreCompileInput } from "@/lib/infinity/venture-build-orchestration/fixtures";
import type { CompileInput } from "@/lib/infinity/venture-build-orchestration/types";
import {
  CRE_CANDIDATE_ID,
  EXPERIMENT_SCHEMA,
  INTENT_EVENTS,
  LIVE_ORG,
  LOCKED_SUCCESS_CRITERIA,
  TRAFFIC_PLAN,
  WRITE_BOUNDARY,
  marketValidationExperimentId,
} from "./constants";
import { creOffer, crePricingHypotheses, intentModel, pricingRationale } from "./offer";
import { PILOT_FORM_FIELDS, SENSITIVE_FIELDS_FORBIDDEN } from "./form";
import type { MarketValidationExperiment } from "./types";

export function experimentIdempotencyKey(candidateId: string, version: number): string {
  return ["market_validation_experiment", candidateId, String(version)].join(":");
}

export function compileCreValidationArtifactInput(overrides: Partial<CompileInput> = {}): CompileInput {
  const offer = creOffer();
  const prices = crePricingHypotheses();
  const base = validateCreCompileInput({
    purpose: "VALIDATION_ARTIFACT",
    decision: "VALIDATE",
    buildReady: false,
    product: {
      ...validateCreCompileInput().product,
      targetCustomer: offer.targetCustomer,
      problem: offer.problem,
      corePromise: offer.valueProposition,
      mvpScope: offer.does,
      doNotCopy: offer.doesNot,
      pricingModel: "annual_or_per_deal_hypotheses",
      validationRequirements: [offer.disclosure, offer.legalDisclosure],
    },
    monetization: {
      ...validateCreCompileInput().monetization,
      model: "annual_or_team_seat_with_optional_per_deal_reports",
      pricing: "Hypotheses only. Not proven willingness to pay.",
      tiers: prices.map((item) => `${item.label} — ${item.displayPrice}`),
      paymentsNeeded: false,
      livePaymentActivation: false,
    },
  });
  return { ...base, ...overrides, purpose: "VALIDATION_ARTIFACT", decision: overrides.decision ?? "VALIDATE", buildReady: false };
}

export function compileMarketValidationExperiment(input: {
  candidateId?: string;
  organizationId?: string;
  validationRunId?: string | null;
}): MarketValidationExperiment {
  const candidateId = input.candidateId ?? CRE_CANDIDATE_ID;
  const offer = creOffer();
  const prices = crePricingHypotheses();
  const experimentId = marketValidationExperimentId(candidateId);
  return {
    schemaVersion: EXPERIMENT_SCHEMA,
    experimentId,
    candidateId,
    ventureId: `candidate:${candidateId}`,
    validationRunId: input.validationRunId ?? null,
    organizationId: input.organizationId ?? LIVE_ORG,
    hypothesis:
      "Independent CRE brokers and tenant reps will demonstrate qualified pilot intent for a focused lease-comparison and NPV workflow at an annual seat or per-deal report price.",
    targetCustomer: offer.targetCustomer,
    validationDimension: "WILLINGNESS_TO_PAY",
    experimentType: "PRICING_PURCHASE_INTENT",
    offer,
    priceHypotheses: prices,
    pricingRationale: pricingRationale(),
    artifactRequirements: [
      "landing page",
      "offer explanation",
      "pricing hypothesis",
      "primary CTA",
      "intent form",
      "analytics instrumentation",
      "privacy-safe event schema",
      "canonical footer attribution",
      "validation disclosure",
      "responsive layout",
      "accessibility",
      "no placeholder URLs",
      "no fake claims",
    ],
    trafficStrategy: [...TRAFFIC_PLAN],
    successMetrics: [
      "qualified visitors",
      "pricing engagement",
      "qualified pilot requests",
      "selected offer",
      "strong purchase-intent rate",
      "form completion",
    ],
    guardrailMetrics: ["unrelated visitors", "duplicate submissions", "synthetic events", "page views treated as WTP"],
    minimumEvidence: { ...LOCKED_SUCCESS_CRITERIA },
    budget: {
      researchOnly: false,
      hostingDeployAllowed: true,
      adSpend: 0,
      domainSpend: 0,
      stripeWrites: 0,
    },
    economicAuthorization: {
      eagRequired: true,
      treasuryMovementForbidden: true,
    },
    externalActions: {
      validationDeployments: 0,
      fullProductBuilds: 0,
      domainPurchases: 0,
      dnsWrites: 0,
      stripeWrites: 0,
      treasuryMovement: 0,
      adSpend: 0,
      outboundMarketingSends: 0,
    },
    eventSchema: [...INTENT_EVENTS],
    intentModel: intentModel(),
    form: {
      fields: [...PILOT_FORM_FIELDS],
      sensitiveForbidden: [...SENSITIVE_FIELDS_FORBIDDEN],
      duplicateKey: "workEmail",
    },
    startState: "DRAFT",
    runtimeState: "DRAFT",
    completionState: null,
    result: null,
    confidence: "NONE",
    wtpEvidence: "NONE",
    observedPayment: false,
    thresholdsLockedBeforeLaunch: true,
    variantPolicy: "SINGLE_OFFER",
    variantRationale:
      "Expected sample is small. Two price hypotheses on one page, one CTA, no visitor-level price discrimination.",
    specialistReviewResolved: false,
    traceability: {
      candidateId,
      experimentId,
      artifactId: null,
      planId: null,
      validationRunId: input.validationRunId ?? null,
    },
  };
}
