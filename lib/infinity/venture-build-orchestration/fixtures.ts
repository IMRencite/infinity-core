import { compileProductRequirements, compileMonetizationRequirements, compileSystemsRequirements } from "./requirements";
import type { CompileInput } from "./types";

const ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

export const CRE_CANDIDATE_ID = "7e7e924e-0741-4155-a729-8d529da77ea9";

const creProduct = compileProductRequirements({
  customer: "Independent CRE brokers and tenant reps",
  problem: "Brokers rebuild lease comparison math in spreadsheets for every deal.",
  promise: "Compare commercial leases and NPV in one shareable workflow.",
  summary: "CRE lease comparison and NPV calculator.",
  mvp: [
    "Side-by-side lease cash-flow comparison",
    "NPV and discount-rate sensitivity",
    "Shareable deal summary for clients",
  ],
  differentiators: ["Deal-native NPV instead of generic spreadsheet templates"],
  tableStakes: ["Export to CSV"],
  doNotCopy: ["Full brokerage CRM"],
  pricingModel: "Monthly SaaS subscription",
  workflow: "Enter two leases, compare NPV, share the summary.",
  validation: ["Measure whether brokers will pay the modeled monthly price."],
});

const creSystems = compileSystemsRequirements({
  ventureId: CRE_CANDIDATE_ID,
  operatingModel: "SAAS",
  productKind: "web application",
  businessConcept: "Commercial Real Estate Lease Comparison & NPV Calculator",
  monetizationModelType: "saas_subscription",
  ventureStage: "PRE_REVENUE",
  expectedScale: "SMALL",
});

const creMoney = compileMonetizationRequirements({
  model: "saas_subscription",
  pricing: "Monthly subscription",
  priceBase: 79,
  offer: "Monthly CRE lease-analysis subscription",
});

export function authorizedBuildCompileInput(overrides: Partial<CompileInput> = {}): CompileInput {
  return {
    organizationId: ORG,
    ventureId: "venture-evbo-authorized-v1",
    candidateId: "candidate-evbo-authorized-v1",
    selectionId: "selection-evbo-authorized-v1",
    name: "Lease Compare Calculator",
    decision: "BUILD",
    buildReady: true,
    buildReadyReason: "BUILD_READY",
    evidence: {
      customerPain: true,
      competition: true,
      monetization: true,
      research: true,
      missing: [],
    },
    economics: { known: true, placeholder: false },
    policyBlocked: false,
    policyReasons: [],
    alreadyBuilding: false,
    alreadyBuilt: false,
    product: creProduct,
    systems: creSystems,
    monetization: creMoney,
    organicRequired: false,
    creativeMediaRequired: false,
    researchIds: ["research-evbo-authorized-v1"],
    monetizationPlanId: "plan-evbo-authorized-v1",
    ...overrides,
  };
}

export function validateCreCompileInput(overrides: Partial<CompileInput> = {}): CompileInput {
  return {
    organizationId: ORG,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
    candidateId: CRE_CANDIDATE_ID,
    selectionId: "selection-cre-live",
    name: "Commercial Real Estate (CRE) Lease Comparison & NPV Calculator",
    decision: "VALIDATE",
    buildReady: false,
    buildReadyReason: "Canonical decision is VALIDATE.",
    evidence: {
      customerPain: true,
      competition: true,
      monetization: true,
      research: true,
      missing: [],
    },
    economics: { known: true, placeholder: false },
    policyBlocked: false,
    policyReasons: [],
    alreadyBuilding: false,
    alreadyBuilt: false,
    product: creProduct,
    systems: creSystems,
    monetization: creMoney,
    organicRequired: false,
    creativeMediaRequired: false,
    researchIds: [],
    monetizationPlanId: null,
    ...overrides,
  };
}

export function blockedCompileInput(overrides: Partial<CompileInput> = {}): CompileInput {
  return {
    ...validateCreCompileInput(),
    ventureId: "venture-evbo-blocked-v1",
    candidateId: "candidate-evbo-blocked-v1",
    decision: "HOLD",
    buildReady: false,
    evidence: {
      customerPain: false,
      competition: false,
      monetization: false,
      research: false,
      missing: ["customer_pain", "competition_evidence", "research"],
    },
    economics: { known: false, placeholder: false },
    product: compileProductRequirements({
      customer: "Unknown",
      problem: "Not evidenced yet.",
      promise: "Not evidenced yet.",
      summary: "",
      mvp: [],
      differentiators: [],
      tableStakes: [],
      doNotCopy: [],
      pricingModel: null,
      workflow: "Unknown",
      validation: [],
    }),
    ...overrides,
  };
}
