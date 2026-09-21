export * from "./constants";
export * from "./types";
export { FounderIdeaStore, newId, nowIso } from "./store";
export { submitFounderIdea } from "./submit";
export { normalizeFounderIdea, claimSourceLabel } from "./normalize";
export { convertFounderIdeaToCandidate, conservativeScoringInputs, isSharedConservativeFallback, applyResearchPacketToCandidate } from "./convert";
export { gradeFounderIdea, gradeLoadedCandidate, buildLoadedCandidate } from "./grade";
export { applyFounderDecision, founderActionsFor, validationPlanFor } from "./decide";
export { routeFounderBuild } from "./build-route";
export { analyzeFounderIdea, analyzeFounderIdeaWithCanonicalResearch } from "./analyze";
export type { AnalyzeOptions, CanonicalResearchExecutor } from "./analyze";
export { persistFounderIdea, lookupFounderDiscoveryRun, FOUNDER_DISCOVERY_LINEAGE_CONFLICT, FOUNDER_CANDIDATE_LINEAGE_CONFLICT } from "./persist";
export {
  founderDiscoveryIdempotencyKey,
  founderResearchAttemptKey,
  derivedFounderReanalysisAttempt,
  resolveFounderReanalysisAttempt,
  parseFounderReanalysisAttemptField,
} from "./idempotency";
export { founderDedupKey, founderMergeGroupKey, reconcileFounderCandidateIdentity } from "./candidate-identity";
export { reanalyzeFounderIdea, reanalyzeFounderIdeaWithCanonicalResearch, markNeedsReanalysis } from "./reanalyze";
export { buildFounderResearchSeed, parseKnownCompetitors } from "./research-seed";
export { buildCanonicalResearchRequest } from "./research-request";
export { founderResearchPacketFromResult, founderResearchPacketFromFailure } from "./research-from-canonical";
export { resolveFounderCandidate, markDanglingCandidate } from "./candidate-repair";
export { archiveHistoricalGrade, snapshotFromGrade } from "./grade-history";
export { founderIdeaStatusesMatchProposedSql, founderIdeaSqlV1Drift } from "./status-compat";
export { scoreFromEvidenceCoverage, recommendScoreDisplay } from "./score-from-evidence";
export { evaluateEvidenceReadiness, evaluateBuildReadiness } from "./readiness";
export { statusFromInfinityDecision } from "./decision-status";
export {
  unitEconomicsNumericallyKnown,
  isResearchAdapterPlaceholderEconomics,
} from "./economics-known";
export { monetizeFromResearchPacket } from "./monetization-from-research";
export { modelComparableEconomics } from "./comparable-economics";
export { researchRevenueModel } from "./revenue-model-research";
export { researchBenchmarkEconomics } from "./benchmark-economics";
export { composeFounderExplainability, attachFounderIntelligence } from "./explainability";
export { activateEducatedEstimates, buildEducatedEconomicsModel, presentEducatedEstimates } from "./educated-estimates";
export { presentVentureBrief, buildProfitBreakdown } from "./venture-brief";
export { buildFounderVentureBuildPlan } from "./build-plan";
export { presentVentureCommandDeck } from "./command-deck";
export { buildProductAdvantage } from "./product-advantage";
export {
  workflowSaasIntegrityPacket,
  artMarketplaceIntegrityPacket,
  categorySupportedIdeaUnprovenPacket,
  negativeEconomicsPacket,
  competitorSeedOnlyPacket,
  failedProviderPacket,
  rejectUnknownEconomicsPacket,
  validateUnknownEconomicsPacket,
  infinityCmsLiveV5ReplayPacket,
  cmsMoneyResearchAfterPacket,
  cmsBenchmarkEconomicsAfterPacket,
  cmsWeakEnterpriseBenchmarkPacket,
  cmsConflictingBenchmarkPacket,
  cmsUnknownBenchmarkPacket,
  cmsLiveV6EconomicReplayPacket,
  cmsLiveV7EconomicReplayPacket,
  cmsLiveV8EconomicReplayPacket,
} from "./integrity-fixtures";
export { cmsComparableEconomicsPacket, CMS_LIVE_V6_SNAPSHOT } from "./cms-live-v6-fixture";
export {
  saasWorkflowResearchFixture,
  saasWorkflowMonetizationFixture,
  weakMonetizationFixture,
  rejectScoringFixture,
  applyCanonicalResearchFixture,
  canonicalGroundedEvidence,
} from "./fixtures";
export { assertFounderSpendStillTreasuryGated } from "./treasury-gate";
export { classifyFounderFailure, technicalFailureIsNotBusinessRejection } from "./failures";
export { segmentPerformanceByOrigin, performanceRecordForOrigin } from "./origin";
export type { OriginPerformanceRecord, OriginPerformanceSegment } from "./origin";
export { buildFounderIdeaArtifacts, listFounderIdeas, founderHotTakes } from "./hq/artifacts";
export type { FounderIdeaListRow } from "./hq/artifacts";
export { mergeRoomArtifacts } from "./hq/merge";
export { founderHotTakesFromMetadata } from "./hq/hot-takes";
export { founderIdeaJourney } from "./hq/journey";
