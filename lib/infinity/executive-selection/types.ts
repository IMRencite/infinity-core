import type { ExecutiveSelectionDecisionType, ExecutiveScoreDimension } from "./constants";

export type ExecutiveScoreDimensionResult = {
  dimension: ExecutiveScoreDimension;
  normalizedScore: number;
  weight: number;
  weightedScore: number;
  sourceReferences: string[];
  confidence: number;
  missingInformation: string[];
  penalties: string[];
  blockers: string[];
};

export type OpportunityExecutiveScore = {
  opportunityId: string;
  dimensions: ExecutiveScoreDimensionResult[];
  aggregateScore: number;
  aggregateConfidence: number;
  exclusionReason?: string;
};

export type ExecutiveContextManifest = {
  opportunitySummaries: Record<string, unknown>;
  validationSummaries: Record<string, unknown>;
  reasoningSummaries: Record<string, unknown>;
  deterministicScores: Record<string, OpportunityExecutiveScore>;
  aiAdvisorySummaries: Record<string, unknown>;
  evidenceQuality: Record<string, number>;
  confidenceProfile: Record<string, number>;
  estimatedCostProfile: Record<string, { min: number; max: number; currency: string }>;
  estimatedTimeProfile: Record<string, string>;
  revenuePotentialProfile: Record<string, string>;
  competitionProfile: Record<string, string>;
  operationalComplexityProfile: Record<string, string>;
  maintenanceBurdenProfile: Record<string, string>;
  strategicFitProfile: Record<string, string>;
  portfolioSynergyProfile: Record<string, string>;
  allocationConstraints: Record<string, unknown>;
  policyConstraints: Record<string, unknown>;
  prohibitedActions: string[];
  escalationThresholds: Record<string, unknown>;
  decisionThresholds: Record<string, unknown>;
  constraintResults?: Record<string, unknown>;
  aiAdvisory?: Record<string, unknown>;
  qa?: { verdict: string; issues: string[]; verifiedAt?: string };
  rankedOpportunityIds?: string[];
  excludedOpportunities?: Array<{ opportunityId: string; reason: string }>;
};

export type ExecutiveSelectionOutcome = {
  opportunityId: string;
  decision: ExecutiveSelectionDecisionType;
  rank: number;
  deterministicScore: number;
  adjustedScore: number;
  confidence: number;
  rationaleSummary: string;
  planningEligible: boolean;
  missingInformation: string[];
  risks: string[];
  blockers: string[];
  escalationReasons: string[];
  validationRunId: string | null;
  supportingEvidenceReferenceIds: string[];
};

export type EligibleOpportunityRow = {
  id: string;
  name: string;
  status: string;
  decision: string;
  confidence_score: number | null;
  overall_score: number | null;
  estimated_startup_cost_min: number | null;
  estimated_startup_cost_max: number | null;
  assumptions: Record<string, unknown>;
  risks: unknown[];
  metadata?: Record<string, unknown>;
};
