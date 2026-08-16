import { randomUUID } from "node:crypto";
import type { MediaQualityReview, MediaRepairAction, MediaRoutingDecision } from "../types";
import type { RepairActionType } from "../constants";
import { selectFallbackProvider } from "../routing/media-model-router";

export function planMediaRepair(
  review: MediaQualityReview,
  attemptNumber: number,
): RepairActionType[] {
  const actions: RepairActionType[] = [];
  for (const finding of review.findings) {
    if (finding.gate === "TEXT_LEGIBILITY") actions.push("USE_DETERMINISTIC_RENDER");
    else if (finding.gate === "SUBJECT_CONSISTENCY") actions.push("CHANGE_REFERENCE");
    else if (finding.gate === "AI_SLOP_RISK") actions.push("REPROMPT");
    else if (finding.severity === "CRITICAL") actions.push("REJECT_ASSET");
    else actions.push("REGENERATE");
  }
  return [...new Set(actions)].slice(0, attemptNumber >= 2 ? 1 : 2);
}

export function applyMediaRepairPlan(input: {
  review: MediaQualityReview;
  routing: MediaRoutingDecision;
  attemptNumber: number;
  repairBudget: number;
}): { actions: MediaRepairAction[]; nextProvider?: MediaRoutingDecision["candidates"][number] } {
  const planned = planMediaRepair(input.review, input.attemptNumber).slice(0, input.repairBudget);
  const actions: MediaRepairAction[] = planned.map((action) => ({
    actionId: randomUUID(),
    assetId: input.review.assetId,
    action,
    reason: `Repair for ${input.review.findings.map((f) => f.gate).join(", ")}`,
    attemptNumber: input.attemptNumber,
    success: false,
  }));

  let nextProvider: MediaRoutingDecision["candidates"][number] | undefined;
  if (planned.includes("CHANGE_PROVIDER")) {
    nextProvider = selectFallbackProvider(input.routing, input.routing.selectedProvider) ?? undefined;
  }

  return { actions, nextProvider };
}

export function withinRepairBudget(attemptNumber: number, maxAttempts: number): boolean {
  return attemptNumber <= maxAttempts;
}
