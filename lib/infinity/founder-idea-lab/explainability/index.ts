export type {
  DecisionExplanation,
  EvidenceDimensionSummary,
  FindingDisplayKind,
  FounderExplainability,
  KeyFindingView,
  ScoreExplanation,
  SourceTraceRow,
} from "./types";
export { FINDING_DISPLAY_KINDS } from "./types";
export { composeFounderExplainability, flattenExplainabilityForHq } from "./compose";
export { buildFounderIntelligenceView, parseFounderIntelligenceView } from "./view";
export { attachFounderIntelligence } from "./attach";
