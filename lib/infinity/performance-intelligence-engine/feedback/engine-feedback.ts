import type { CreativeFeedbackContract, OrganicFeedbackContract, PabFeedbackContract } from "../types";
import type { LearningDecision, OptimizationOpportunity } from "../types";

export function buildOrganicFeedbackContract(input: {
  ventureId: string;
  opportunities: OptimizationOpportunity[];
}): OrganicFeedbackContract {
  const recommendations = input.opportunities
    .filter((o) => ["REFRESH", "RELINK", "REWRITE", "PRUNE", "EXPAND"].includes(o.actionType))
    .map((o) => ({
      action: o.actionType,
      targetPageId: o.target.startsWith("page-") ? o.target : undefined,
      rationale: o.supportingEvidence.join("; "),
    }));

  return { ventureId: input.ventureId, recommendations };
}

export function buildCreativeFeedbackContract(input: {
  ventureId: string;
  opportunities: OptimizationOpportunity[];
  mediaAssetIds?: string[];
}): CreativeFeedbackContract {
  const recommendations = input.opportunities
    .filter((o) => ["CHANGE_CREATIVE", "CHANGE_THUMBNAIL"].includes(o.actionType))
    .map((o) => ({
      action: o.actionType,
      targetAssetId: input.mediaAssetIds?.[0],
      rationale: o.supportingEvidence.join("; "),
    }));

  return { ventureId: input.ventureId, recommendations };
}

export function buildPabFeedbackContract(input: {
  ventureId: string;
  opportunities: OptimizationOpportunity[];
}): PabFeedbackContract {
  const recommendations = input.opportunities
    .filter((o) => ["REPAIR", "FIX_TECHNICAL_ISSUE", "IMPROVE_CONVERSION"].includes(o.actionType))
    .map((o) => ({
      action: o.actionType,
      targetFeature: o.target,
      rationale: o.supportingEvidence.join("; "),
    }));

  return { ventureId: input.ventureId, recommendations };
}

export function buildAttributionSummary(decisions: LearningDecision[]): Array<{
  decisionId: string;
  channel: string;
  confidence: string;
}> {
  return decisions.map((d) => ({
    decisionId: d.decisionId,
    channel: d.missionTargetEngine ?? "unknown",
    confidence: d.attributionConfidence,
  }));
}
