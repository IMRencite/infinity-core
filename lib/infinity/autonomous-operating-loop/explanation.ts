import { AUTONOMOUS_DECISION_EXPLANATION } from "./types";
import type { AutonomousDecision, AutonomousDecisionExplanation } from "./types";

export function explainAutonomousDecision(decision: AutonomousDecision): AutonomousDecisionExplanation {
  return {
    contract: AUTONOMOUS_DECISION_EXPLANATION,
    why_now: decision.reason,
    evidence: decision.evidence,
    priority_rationale: `${decision.priority} outranks deferred alternatives under profit-before-scale`,
    alternatives_considered: decision.alternatives_considered,
    why_selected: decision.expected_outcome,
    why_others_deferred: decision.alternatives_considered.map((row) => {
      if (row === "PAID_ACQUISITION") return "Paid acquisition remains blocked";
      if (row === "AUTONOMOUS_FINANCIAL_COMMITMENT") return "Autonomous commitments stay recommended-only";
      if (row === "MONEY_MOVEMENT") return "Mercury is read-only; money movement disabled";
      if (row === "USE_SPEND_AUTHORITY" || row === "SPEND_AUTHORITY_USE") {
        return "Remaining spend authority is a constraint, not a command to spend";
      }
      if (row === "CREATE_OUTREACH_MISSION" || row === "NEW_OUTREACH_BURST") {
        return "Do not manufacture outreach busywork or duplicate the existing campaign";
      }
      if (row === "INFER_MARKET_REJECTION" || row === "MARKET_REJECTION") {
        return "Provider/infrastructure failure is not market rejection";
      }
      return `${row} deferred as lower-value or disallowed`;
    }),
    financial_exposure: decision.financial_exposure,
    risk: decision.spend_required > 0 ? "FINANCIAL" : "OPERATING",
    expected_measurement: decision.review_condition ?? "NEXT_REVIEW",
  };
}
