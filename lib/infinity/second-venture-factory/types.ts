import type { CommercialOfferContract, FulfillmentContract } from "@/lib/infinity/fulfillment/types";
import type { VentureBackendContract } from "@/lib/infinity/venture-backend-architecture";
import type { VentureOperationalRecord } from "@/lib/infinity/venture-operating-scale/types";
import type { DifferentiationDimension } from "./constants";

export type OpportunityUniverseCandidate = {
  id: string;
  title: string;
  problem: string;
  customer: string;
  market: string;
  evidence: string;
  demandSignal: string;
  competitiveCondition: string;
  businessModel: string[];
  commercialOfferHypothesis: string;
  expectedWillingnessToPay: string;
  acquisitionPath: string;
  backendRequirements: string;
  fulfillmentRequirements: string;
  estimatedBuildComplexity: string;
  estimatedOperatingCost: string;
  timeToMarket: string;
  reversibility: string;
  risk: string;
  expectedValue: string;
  confidence: string;
  opportunityScore: number | "UNKNOWN";
  monetizationScore: number | "UNKNOWN";
  economicViability: string | "UNKNOWN";
  recommendedModel: string | "UNKNOWN";
  recommendedPricing: string | "UNKNOWN";
  unknowns: string[];
};

export type DifferentiationComparison = Record<
  DifferentiationDimension,
  { occupancyNpv: string; candidate: string; different: boolean }
>;

export type SecondVentureDifferentiationGateResult = {
  gate: "SecondVentureDifferentiationGate";
  result: "PASS" | "FAIL";
  candidateId: string;
  differentDimensions: number;
  requiredDimensions: number;
  comparison: DifferentiationComparison;
  cloneRejected: boolean;
  reasons: string[];
};

export type SecondVentureEconomicDecision = {
  engine: "VentureSelection.classifyDecision";
  secondDecisionEngineCreated: false;
  decision: "BUILD" | "VALIDATE" | "HOLD" | "REJECT";
  recommendedNextAction: string;
  selectionScore: number | "UNKNOWN";
  unknownEconomicsPreserved: true;
  unitEconomics: "UNKNOWN";
  expectedRoi: "UNKNOWN";
};

export type SecondVentureSelectionResult = {
  selected: boolean;
  candidateId: string | null;
  ventureId: string | null;
  workingName: string | null;
  reason: string;
  economicDecision: SecondVentureEconomicDecision | null;
  differentiation: SecondVentureDifferentiationGateResult | null;
  evaluatedCount: number;
  ranked: Array<{
    id: string;
    title: string;
    opportunityScore: number | "UNKNOWN";
    monetizationScore: number | "UNKNOWN";
    viability: string | "UNKNOWN";
    differentiation: "PASS" | "FAIL";
  }>;
};

export type SecondVentureFactoryProofResult = {
  mission: "SECOND_VENTURE_AUTONOMOUS_FACTORY_PROOF_V1";
  occupancyNpvParallel: {
    lifecycle: string;
    dailyOperatingRuntime: string;
    latestCycle: string | null;
    latestOutcome: string | null;
    observations: number;
    operationalBlocker: string;
    concurrency: "ALLOWED" | "BLOCKED";
  };
  selection: SecondVentureSelectionResult;
  record: VentureOperationalRecord | null;
  offer: CommercialOfferContract | null;
  fulfillment: FulfillmentContract | null;
  backend: VentureBackendContract | null;
  hqProjection: "PASS" | "FAIL";
  generalization: {
    gate: "MultiVentureFactoryGeneralizationGate";
    result: "PASS" | "FAIL" | "NOT_YET";
    hardCodedOccupancyNpvDependency: string[];
    providerNeutrality: "PASS" | "FAIL";
    fulfillmentNeutrality: "PASS" | "FAIL";
  };
  authorizationBoundary: {
    firstRequired: string;
    reason: string;
    cost: string;
  };
  nextState: string;
  nextAction: string;
};
