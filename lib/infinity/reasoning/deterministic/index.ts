export {
  DEFAULT_REASONING_THRESHOLDS,
  DEFAULT_REASONING_WEIGHTS,
  REASONING_DIMENSIONS,
  REASONING_OUTCOMES,
  isReasoningOutcome,
} from "./constants";
export { compareOpportunities } from "./compare";
export { explainOpportunityScore, explainOutcome } from "./explain";
export { prioritizeOpportunity } from "./prioritize";
export { rankValidatedOpportunities, selectTopValidatedOpportunity } from "./rank";
export {
  aggregateWeightedReasoningScore,
  calculateOpportunityScore,
  calculateReasoningDimensions,
  ruleBasedScoringStrategy,
} from "./score";
export {
  ReasoningGateError,
  assertValidatedForReasoning,
  mergeReasoningConfig,
} from "./types";
export type {
  CompareOpportunitiesResult,
  DimensionDataStatus,
  OpportunityScoreResult,
  RankedOpportunity,
  ReasoningConfig,
  ReasoningContext,
  ReasoningDimensionKey,
  ReasoningDimensionScore,
  ReasoningOutcome,
  ReasoningValidationSnapshot,
  ScoringStrategy,
} from "./types";
