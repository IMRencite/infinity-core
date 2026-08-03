export {
  DEFAULT_VALIDATION_MODEL_NAME,
  DEFAULT_VALIDATION_MODEL_VERSION,
  DEFAULT_VALIDATION_THRESHOLDS,
  VALIDATION_CATEGORIES,
  VALIDATION_RECOMMENDATIONS,
  isValidationCategory,
  isValidationRecommendation,
} from "./constants";
export {
  aggregateValidationScores,
  calculateValidationCategories,
  detectSparseSystemValidation,
  hasMarketEvidence,
} from "./categories";
export {
  buildValidationRunKey,
  ensureDefaultValidationModel,
  selectActiveValidationModel,
} from "./models";
export {
  generateValidationRecommendation,
  isPlannerEligible,
} from "./recommend";
export { runValidation } from "./run";
export {
  calculateValidationSummary,
  findOpportunityNeedingValidation,
  getLatestValidationRunForOpportunity,
  getValidationRunDetails,
  isOpportunityApprovedForPlanning,
  listValidationRuns,
  selectOpportunityForInitiativePlanning,
} from "./queries";
export type {
  CategoryResult,
  RunValidationInput,
  RunValidationResult,
  ValidationDimensionResult,
  ValidationFinding,
  ValidationModel,
  ValidationRequirement,
  ValidationRun,
} from "./types";
export type { ValidationRunWithDetails } from "./queries";
