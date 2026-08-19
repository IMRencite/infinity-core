import { isUnknownOrUnboundedCost } from "@/lib/infinity/treasury/policy/evaluate";
import { authorizeFinancialAction, createFinancialActionRequest } from "@/lib/infinity/treasury/actions/engine";
import { actualAmount, unknownAmount, type EpistemicAmount } from "@/lib/infinity/treasury/types";
import type { TreasuryStore } from "@/lib/infinity/treasury/store";
import type { CanonicalCodingTask, EpistemicCost } from "./types";

export function toTreasuryAmount(cost: EpistemicCost): EpistemicAmount {
  if (cost.actuality === "UNKNOWN" || cost.value == null) return unknownAmount(cost.currency);
  return actualAmount(cost.value, cost.currency);
}

export function cursorCostCanAutoAuthorize(cost: EpistemicCost): boolean {
  return !isUnknownOrUnboundedCost(toTreasuryAmount(cost));
}

export function authorizeCursorUsage(
  treasury: TreasuryStore | null,
  task: CanonicalCodingTask,
  cost: EpistemicCost,
): { authorized: boolean; reasonCodes: string[]; executed: false } {
  if (!cursorCostCanAutoAuthorize(cost)) {
    return { authorized: false, reasonCodes: ["UNKNOWN_COST"], executed: false };
  }
  if (!treasury) {
    return { authorized: false, reasonCodes: ["TREASURY_REQUIRED"], executed: false };
  }
  const request = createFinancialActionRequest(treasury, {
    organizationId: task.organizationId,
    ventureId: task.ventureId,
    missionId: task.missionId,
    purpose: `Cursor coding agent usage for ${task.taskId}`,
    category: "AI_API",
    actionType: "OTHER",
    amount: toTreasuryAmount(cost),
    idempotencyKey: `cursor-cost:${task.organizationId}:${task.taskId}`,
    economicJustification: "Optional coding-agent provider usage",
  });
  const result = authorizeFinancialAction(treasury, request.requestId);
  return {
    authorized: result.evaluation.decision === "AUTO_AUTHORIZE",
    reasonCodes: result.evaluation.reasonCodes,
    executed: false,
  };
}
