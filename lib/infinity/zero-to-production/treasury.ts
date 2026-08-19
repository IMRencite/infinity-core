import { authorizeFinancialAction, createFinancialActionRequest } from "@/lib/infinity/treasury/actions/engine";
import { estimateAmount, unknownAmount } from "@/lib/infinity/treasury/types";
import { isUnknownOrUnboundedCost } from "@/lib/infinity/treasury/policy/evaluate";
import { resolveTreasuryPolicy } from "@/lib/infinity/treasury/config";
import type { TreasuryStore } from "@/lib/infinity/treasury/store";
import type { ZeroToProductionRun } from "./types";

export function planZtpTreasury(input: {
  treasury: TreasuryStore | null;
  run: ZeroToProductionRun;
  plannedCostUsd?: number;
  unknown?: boolean;
}): {
  requestId: string | null;
  authorized: boolean;
  executed: false;
  blocked: boolean;
  reasonCodes: string[];
} {
  if (!input.treasury) {
    return { requestId: null, authorized: false, executed: false, blocked: false, reasonCodes: ["TREASURY_PLANNING_SKIPPED"] };
  }
  const amount = input.unknown ? unknownAmount("USD") : estimateAmount(input.plannedCostUsd ?? 12.99, "USD");
  if (isUnknownOrUnboundedCost(amount)) {
    return { requestId: null, authorized: false, executed: false, blocked: true, reasonCodes: ["UNKNOWN_COST"] };
  }
  const policy = input.treasury.policyByOrg.get(input.run.organizationId) ?? resolveTreasuryPolicy();
  const value = amount.value ?? 0;
  const domainLimit = policy.categoryLimits.DOMAINS ?? null;
  const single = policy.maximumSingleAutonomousPurchase;
  if ((domainLimit != null && value > domainLimit) || (single != null && value > single)) {
    return { requestId: null, authorized: false, executed: false, blocked: true, reasonCodes: ["POLICY_CEILING"] };
  }

  const request = createFinancialActionRequest(input.treasury, {
    organizationId: input.run.organizationId,
    ventureId: input.run.ventureId,
    missionId: input.run.missionId,
    opportunityId: input.run.opportunityCandidateId,
    purpose: `ZTP planned commercialization cost for ${input.run.id}`,
    category: "DOMAINS",
    actionType: "DOMAIN_PURCHASE",
    amount,
    idempotencyKey: `ztp-treasury:${input.run.organizationId}:${input.run.id}`,
    economicJustification: "Planning-only FinancialActionRequest. Not executed. EAG required for any real mutation.",
  });
  const result = authorizeFinancialAction(input.treasury, request.requestId);
  return {
    requestId: request.requestId,
    authorized: result.evaluation.decision === "AUTO_AUTHORIZE",
    executed: false,
    blocked: false,
    reasonCodes: result.evaluation.reasonCodes,
  };
}
