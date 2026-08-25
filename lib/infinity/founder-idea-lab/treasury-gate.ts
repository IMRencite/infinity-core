import { authorizeFinancialAction, createFinancialActionRequest } from "@/lib/infinity/treasury/actions/engine";
import { actualAmount } from "@/lib/infinity/treasury/types";
import type { TreasuryStore } from "@/lib/infinity/treasury/store";
import type { FounderIdeaSubmission } from "./types";

/**
 * Founder BUILD / BUILD ANYWAY is not unlimited spending authority.
 * Financial mutations still require Treasury FinancialActionRequest.
 */
export function assertFounderSpendStillTreasuryGated(
  treasury: TreasuryStore,
  submission: FounderIdeaSubmission,
): { bypassed: false; authorized: boolean; reasonCodes: string[] } {
  const request = createFinancialActionRequest(treasury, {
    organizationId: submission.organizationId,
    ventureId: submission.opportunityCandidateId,
    purpose: `Founder-approved spend for ${submission.title}`,
    category: "SOFTWARE_TOOLS",
    actionType: "SOFTWARE_PURCHASE",
    amount: actualAmount(25),
    idempotencyKey: `founder-treasury:${submission.id}:probe`,
    economicJustification: "Founder build approval does not grant spend authority",
  });
  const result = authorizeFinancialAction(treasury, request.requestId);
  return {
    bypassed: false,
    authorized: result.evaluation.decision === "AUTO_AUTHORIZE",
    reasonCodes: result.evaluation.reasonCodes,
  };
}
