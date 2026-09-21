import type { VentureIntelligenceView } from "@/lib/infinity/venture-intelligence/types";
import { requirementsForOperatingModel } from "@/lib/infinity/venture-systems-architecture/requirements";
import type { VentureSystemsEvidence } from "@/lib/infinity/venture-systems-architecture/types";
import { GENERIC_MVP_FORBIDDEN } from "./constants";
import type {
  VentureMonetizationRequirements,
  VentureProductRequirements,
  VentureSystemsRequirements,
} from "./types";

function useful(value: string | null | undefined, fallback: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || /^not (named|evidenced|specified|enough)/i.test(trimmed)) return fallback;
  return trimmed;
}

function rejectGenericMvp(items: string[]): string[] {
  return items.filter((item) => {
    const lower = item.trim().toLowerCase();
    return !GENERIC_MVP_FORBIDDEN.some((forbidden) => lower === forbidden || lower.startsWith(`${forbidden} `));
  });
}

export function compileProductRequirements(input: {
  customer: string;
  problem: string;
  promise: string;
  summary: string;
  mvp: string[];
  differentiators: string[];
  tableStakes: string[];
  doNotCopy: string[];
  pricingModel: string | null;
  workflow: string;
  validation: string[];
}): VentureProductRequirements {
  const mvp = rejectGenericMvp(input.mvp.filter((item) => item.trim().length > 4)).slice(0, 6);
  return {
    targetCustomer: input.customer,
    jtbd: `When ${input.customer} faces ${input.problem}, they need ${input.promise}.`,
    problem: input.problem,
    corePromise: input.promise,
    mvpScope: mvp,
    mustHaveFeatures: mvp,
    differentiators: input.differentiators.slice(0, 4),
    tableStakes: input.tableStakes.slice(0, 4),
    doNotCopy: input.doNotCopy.slice(0, 4),
    pricingModel: input.pricingModel,
    customerWorkflow: input.workflow,
    successCriteria: [
      "A broker can compare two leases without rebuilding spreadsheet math.",
      "NPV and cash-flow comparison are visible for the same deal.",
      "The artifact is a working product, not a requirements document.",
    ],
    validationRequirements: input.validation,
  };
}

export function compileProductRequirementsFromIntelligence(
  view: VentureIntelligenceView,
): VentureProductRequirements {
  const mvp = rejectGenericMvp(
    view.buildPlan.sequence
      .filter((item) => item.sequence === "MVP")
      .map((item) => item.feature)
      .concat(view.buildPlan.mvp.mustHaveFeatures),
  ).slice(0, 6);
  return compileProductRequirements({
    customer: useful(view.customer.targetCustomer, "Named customer is still missing."),
    problem: useful(view.problem.coreProblem, useful(view.problem.primaryPain, "Problem is not evidenced yet.")),
    promise: useful(view.marketAdvantage.strongestDifferentiator, useful(view.solution.solution, "Promise is not evidenced yet.")),
    summary: view.thesis.thesis,
    mvp: mvp.length ? mvp : view.buildPlan.productSpecificWork.slice(0, 4),
    differentiators: view.buildPlan.mvp.differentiators,
    tableStakes: view.buildPlan.mvp.thingsToLeaveOut,
    doNotCopy: view.buildPlan.mvp.thingsToLeaveOut,
    pricingModel: view.businessModel.summary,
    workflow: useful(view.solution.howInfinityWouldSolve, view.solution.solution),
    validation: [view.buildPlan.firstValidation, view.nextMove.whatInfinityWouldTest].filter(Boolean),
  });
}

export function compileSystemsRequirements(evidence: VentureSystemsEvidence): VentureSystemsRequirements {
  const required = requirementsForOperatingModel(evidence).filter((item) => item.required);
  return {
    items: required.map((item) => ({
      family: item.family,
      concern: item.family.toLowerCase().replace(/_/g, " "),
      required: true,
      reason: item.reason,
      ventureSpecific: true,
      platformCapabilityNote:
        "Infinity may already have this platform capability. The venture still needs its own implementation.",
    })),
  };
}

export function compileMonetizationRequirements(input: {
  model: string | null;
  pricing: string | null;
  priceBase: number | null;
  offer: string | null;
}): VentureMonetizationRequirements {
  const model = useful(input.model, "Not present in canonical intelligence");
  const pricing = input.priceBase != null
    ? `$${input.priceBase} ${useful(input.pricing, "per period")}`
    : useful(input.pricing, "Not present in canonical intelligence");
  const paymentsNeeded = /subscription|saas|fee|checkout|billing|payment/i.test(`${model} ${pricing} ${input.offer ?? ""}`);
  return {
    model,
    pricing,
    tiers: input.offer ? [input.offer] : [],
    setupFee: /setup/i.test(input.offer ?? "") ? input.offer : null,
    subscription: /subscription|saas|monthly/i.test(`${model} ${pricing}`) ? pricing : null,
    transactionModel: /transaction|take.?rate|lead/i.test(model) ? model : null,
    managedServiceOption: /managed/i.test(input.offer ?? "") ? input.offer : null,
    addOns: [],
    billingCadence: /annual/i.test(`${pricing} ${input.offer ?? ""}`)
      ? "annual"
      : /month/i.test(`${pricing} ${input.offer ?? ""}`)
        ? "monthly"
        : null,
    trial: /trial/i.test(input.offer ?? "") ? input.offer : null,
    paymentsNeeded,
    livePaymentActivation: false,
  };
}

export function systemsEvidenceFromIntelligence(view: VentureIntelligenceView): VentureSystemsEvidence {
  return {
    ventureId: view.identity.ventureId,
    businessConcept: view.identity.concept || view.identity.name,
    monetizationModelType: view.businessModel.summary,
    productKind: "web application",
    seoIsPrimaryAcquisition: view.buildPlan.requiredSystems.some((item) => item.system === "Organic Growth"),
  };
}
