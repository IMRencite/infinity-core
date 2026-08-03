export {
  DETERMINISTIC_DISCOVERY_IMPLEMENTATION_KEY,
  DETERMINISTIC_DISCOVERY_PROVIDER_KEY,
  DISCOVERY_PROVIDER_STATUSES,
  DISCOVERY_PROVIDER_TYPES,
  DISCOVERY_SCORING_VERSION,
  DISCOVERY_RULE_SCORING_VERSION,
  DISCOVERY_SIGNAL_TYPES,
  OPPORTUNITY_DECISION_ACTOR_TYPES,
  OPPORTUNITY_REVIEW_TYPES,
  OPPORTUNITY_REVIEW_VERDICTS,
  OPPORTUNITY_REVIEWER_TYPES,
} from "./constants";
export { runDeterministicDiscoveryFoundation } from "./discover";
export { recordOpportunityDecision } from "./decisions";
export { listDiscoveryProviders, resolveDiscoveryProvider } from "./registry";
export { recordOpportunityReview } from "./reviews";
export { recordOpportunityScore } from "./score";
export { recordDiscoverySignal } from "./signals";
export type {
  DeterministicDiscoveryResult,
  DiscoveryContext,
  DiscoveryProvider,
  DiscoverySignal,
  OpportunityDecisionRecord,
  OpportunityReview,
} from "./types";

export type { DiscoveredOpportunity, ScoredDiscoveredOpportunity } from "./types/opportunity";
export type {
  DiscoveryFetchContext,
  DiscoveryRawItem,
  DiscoverySourceProvider,
} from "./types/provider";
export type { DiscoveryPipelineContext, DiscoveryPipelineResult } from "./types/pipeline";

export {
  registerDiscoverySourceProvider,
  getDiscoverySourceProvider,
  listDiscoverySourceProviders,
  clearDiscoverySourceProviders,
} from "./registry/provider-registry";

export {
  bootstrapDiscoverySourceProviders,
  resetDiscoverySourceProvidersForTests,
  allDefaultProviderIds,
} from "./providers/bootstrap";
export { isLiveDiscoveryFetchEnabled, DISCOVERY_ENGINE_VERSION } from "./providers/config";
export { normalizeDiscoveryItem, normalizeDiscoveryBatch } from "./normalization/normalize";
export {
  buildOpportunityDedupKey,
  dedupeOpportunities,
  DiscoveryDedupeSet,
} from "./dedupe/dedupe";
export { scoreDiscoveredOpportunity, rankScoredOpportunities } from "./ranking/score";
export { runDiscoveryEnginePipeline, runDiscoveryEnginePipelineForScan } from "./pipeline";
export { emitDiscoveryPipelineEvent } from "./events/emit";
