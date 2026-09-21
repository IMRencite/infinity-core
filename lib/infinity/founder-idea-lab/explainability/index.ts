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
export { buildFounderMoneyView, moneyAttractivenessLabel } from "./money-view";
export { attachFounderIntelligence } from "./attach";
export { buildFounderFriendlyBrief } from "./founder-brief";
export {
  translateDecision,
  translateStatus,
  revenueModelSentence,
  DECISION_DISPLAY,
  STATUS_DISPLAY,
} from "./founder-language";
