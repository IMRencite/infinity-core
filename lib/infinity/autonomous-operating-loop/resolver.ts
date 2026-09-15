import { AUTONOMOUS_NEXT_MISSION_RESOLVER } from "./types";
import type {
  AutonomousDecision,
  AutonomousDecisionOutcome,
  OperatingPriority,
  RecommendedCommitment,
} from "./types";
import type { AutonomousObservation, ObservedVenture } from "./observe";

function decision(partial: Omit<AutonomousDecision, "contract">): AutonomousDecision {
  return { contract: AUTONOMOUS_NEXT_MISSION_RESOLVER, ...partial };
}

function noneCommitment(): RecommendedCommitment | null {
  return null;
}

function recommendedSpend(venture: ObservedVenture, reason: string): RecommendedCommitment {
  return {
    amount: 0,
    category: "OPERATIONS",
    reason,
    evidence: ["SPEND_AUTHORITY_EXISTS_IS_NOT_A_COMMAND"],
    expected_benefit: "NONE_WITHOUT_EVIDENCE",
    risk: "HIGH",
    authority_available: venture.remaining_spend_authority,
    created: false,
  };
}

export function resolveAutonomousNextMission(observation: AutonomousObservation): AutonomousDecision {
  const occupancy = observation.occupancy;
  const learning = observation.loop.learning;
  const learningApplied = learning.map((row) => row.next_behavior).filter(Boolean);
  const providerFailureLearned = learning.some((row) => row.class === "PROVIDER_FAILURE");
  const alternatives: string[] = [
    "PAID_ACQUISITION",
    "AUTONOMOUS_FINANCIAL_COMMITMENT",
    "MONEY_MOVEMENT",
    "NEW_OUTREACH_BURST",
  ];

  if (!occupancy || occupancy.paused) {
    return decision({
      outcome: "NO_ACTION_JUSTIFIED",
      selected_mission: null,
      reason: "NO_ELIGIBLE_OPERATING_VENTURE",
      priority: "NO_ACTION_WAIT",
      expected_outcome: "Remain idle until an operating venture is eligible",
      evidence: ["NO_ELIGIBLE_VENTURE"],
      venture_id: occupancy?.venture_id ?? null,
      capability_required: "NONE",
      financial_exposure: 0,
      spend_required: 0,
      commitment_required: 0,
      authorization_class: "NONE",
      review_condition: "NEXT_DAILY_REVIEW",
      fallback: "IDLE_NO_ACTION",
      alternatives_considered: alternatives,
      founder_approval_required: false,
      recommended_commitment: noneCommitment(),
      learning_applied: learningApplied,
    });
  }

  if (occupancy.qc_blocked) {
    return decision({
      outcome: "BLOCKED_BY_QC",
      selected_mission: null,
      reason: "QC_BLOCK_PREVENTS_RELEASE",
      priority: "PRODUCTION_SECURITY_QC_FAILURE",
      expected_outcome: "Hold release until Universal QC passes",
      evidence: ["QC_BLOCKED"],
      venture_id: occupancy.venture_id,
      capability_required: "UNIVERSAL_QC",
      financial_exposure: 0,
      spend_required: 0,
      commitment_required: 0,
      authorization_class: "POLICY",
      review_condition: "QC_PASS",
      fallback: "BLOCKED",
      alternatives_considered: alternatives,
      founder_approval_required: false,
      recommended_commitment: noneCommitment(),
      learning_applied: learningApplied,
    });
  }

  if (occupancy.checkout_unhealthy) {
    return decision({
      outcome: "REPAIR_REQUIRED",
      selected_mission: "REPAIR_LIVE_COMMERCIAL_CHECKOUT",
      reason: "CUSTOMER_PAYMENT_FULFILLMENT_FAILURE_OUTRANKS_GROWTH",
      priority: "CUSTOMER_PAYMENT_FULFILLMENT_FAILURE",
      expected_outcome: "Restore live checkout before any acquisition or spend",
      evidence: ["LIVE_CHECKOUT_UNHEALTHY", "PROFIT_BEFORE_SCALE"],
      venture_id: occupancy.venture_id,
      capability_required: "STRIPE_CHECKOUT",
      financial_exposure: 0,
      spend_required: 0,
      commitment_required: 0,
      authorization_class: "POLICY",
      review_condition: "CHECKOUT_HEALTH_PASS",
      fallback: "BLOCKED",
      alternatives_considered: [...alternatives, "CONTINUE_OUTREACH", "SPEND_AUTHORITY_USE"],
      founder_approval_required: false,
      recommended_commitment: noneCommitment(),
      learning_applied: learningApplied,
    });
  }

  if (occupancy.provider_health === "FAILED" || occupancy.provider_failure_class === "PROVIDER_FAILURE") {
    return decision({
      outcome: "BLOCKED_BY_PROVIDER",
      selected_mission: "REPAIR_PROVIDER_PATH",
      reason: "PROVIDER_FAILURE_IS_INFRASTRUCTURE_NOT_MARKET_REJECTION",
      priority: "PRODUCTION_SECURITY_QC_FAILURE",
      expected_outcome: "Restore provider path; do not record business rejection",
      evidence: ["PROVIDER_FAILURE", "PROVIDER_FAILURE_NE_MARKET_FAILURE"],
      venture_id: occupancy.venture_id,
      capability_required: "PROVIDER_HEALTH",
      financial_exposure: 0,
      spend_required: 0,
      commitment_required: 0,
      authorization_class: "POLICY",
      review_condition: "PROVIDER_RECOVERY",
      fallback: "DEGRADED",
      alternatives_considered: [...alternatives, "INFER_MARKET_REJECTION"],
      founder_approval_required: false,
      recommended_commitment: noneCommitment(),
      learning_applied: [...learningApplied, "EXCLUDE_PROVIDER_FAILURE_FROM_BUSINESS_LEARNING"],
    });
  }

  if (occupancy.unsubscribe) {
    return decision({
      outcome: "NO_ACTION_JUSTIFIED",
      selected_mission: null,
      reason: "UNSUBSCRIBE_SUPPRESSES_OUTREACH",
      priority: "NO_ACTION_WAIT",
      expected_outcome: "Do not contact suppressed recipients",
      evidence: ["UNSUBSCRIBE", "COMPLIANCE"],
      venture_id: occupancy.venture_id,
      capability_required: "NONE",
      financial_exposure: 0,
      spend_required: 0,
      commitment_required: 0,
      authorization_class: "POLICY",
      review_condition: "NEXT_DAILY_REVIEW",
      fallback: "IDLE_NO_ACTION",
      alternatives_considered: [...alternatives, "CONTINUE_OUTREACH"],
      founder_approval_required: false,
      recommended_commitment: noneCommitment(),
      learning_applied: learningApplied,
    });
  }

  if (occupancy.reply_class === "UNSUBSCRIBE") {
    return decision({
      outcome: "NO_ACTION_JUSTIFIED",
      selected_mission: null,
      reason: "REPLY_CLASSIFIED_UNSUBSCRIBE",
      priority: "NO_ACTION_WAIT",
      expected_outcome: "Suppress and stop outreach to this recipient",
      evidence: ["CUSTOMER_REPLY:UNSUBSCRIBE"],
      venture_id: occupancy.venture_id,
      capability_required: "NONE",
      financial_exposure: 0,
      spend_required: 0,
      commitment_required: 0,
      authorization_class: "POLICY",
      review_condition: "NEXT_DAILY_REVIEW",
      fallback: "IDLE_NO_ACTION",
      alternatives_considered: [...alternatives, "CONTINUE_OUTREACH"],
      founder_approval_required: false,
      recommended_commitment: noneCommitment(),
      learning_applied: learningApplied,
    });
  }

  if (occupancy.reply_class && occupancy.reply_class !== "UNKNOWN") {
    const followUp = occupancy.reply_class === "POSITIVE" || occupancy.reply_class === "INTERESTED" || occupancy.reply_class === "QUESTION" || occupancy.reply_class === "OBJECTION";
    return decision({
      outcome: followUp ? "EXECUTE_ACTION" : "NO_ACTION_JUSTIFIED",
      selected_mission: followUp ? `CUSTOMER_REPLY_${occupancy.reply_class}` : null,
      reason: `CUSTOMER_REPLY_${occupancy.reply_class}`,
      priority: "CUSTOMER_RESPONSE_FOLLOW_UP",
      expected_outcome: followUp ? "Respond from classified customer evidence" : "Record non-interested reply without new outreach",
      evidence: [`CUSTOMER_REPLY:${occupancy.reply_class}`],
      venture_id: occupancy.venture_id,
      capability_required: "INBOUND_CLASSIFICATION",
      financial_exposure: 0,
      spend_required: 0,
      commitment_required: 0,
      authorization_class: "NONE",
      review_condition: "REPLY_HANDLED",
      fallback: followUp ? "MISSION_ACTIVE" : "IDLE_NO_ACTION",
      alternatives_considered: [...alternatives, "IGNORE_REPLY", "START_NEW_CAMPAIGN"],
      founder_approval_required: false,
      recommended_commitment: noneCommitment(),
      learning_applied: learningApplied,
    });
  }

  if (occupancy.send_executed && occupancy.replies_pending) {
    return decision({
      outcome: "WAIT_FOR_EVIDENCE",
      selected_mission: null,
      reason: "REAL_OUTREACH_DEPENDENCY_AWAITING_REPLY",
      priority: "EXISTING_GROWTH_CONTINUATION",
      expected_outcome: "Resume when a customer reply or evidence window closes",
      evidence: ["SEND_EXECUTED", "REPLY_PENDING"],
      venture_id: occupancy.venture_id,
      capability_required: "INBOUND_OBSERVER",
      financial_exposure: 0,
      spend_required: 0,
      commitment_required: 0,
      authorization_class: "NONE",
      review_condition: "CUSTOMER_REPLY_OR_WINDOW",
      fallback: "WAITING_FOR_EVIDENCE",
      alternatives_considered: [...alternatives, "NEW_MISSION", "SPEND_AUTHORITY_USE"],
      founder_approval_required: false,
      recommended_commitment: noneCommitment(),
      learning_applied: learningApplied,
    });
  }

  if (providerFailureLearned && occupancy.growth_active) {
    return decision({
      outcome: "BLOCKED_BY_PROVIDER",
      selected_mission: null,
      reason: "LEARNING_BLOCKS_OUTREACH_AFTER_PROVIDER_FAILURE",
      priority: "PRODUCTION_SECURITY_QC_FAILURE",
      expected_outcome: "Do not treat prior provider failure as market rejection; wait for recovery",
      evidence: ["LEARNING:PROVIDER_FAILURE", "LEARNING_CHANGES_BEHAVIOR"],
      venture_id: occupancy.venture_id,
      capability_required: "PROVIDER_HEALTH",
      financial_exposure: 0,
      spend_required: 0,
      commitment_required: 0,
      authorization_class: "POLICY",
      review_condition: "PROVIDER_RECOVERY",
      fallback: "DEGRADED",
      alternatives_considered: [...alternatives, "CONTINUE_OUTREACH", "MARKET_REJECTION"],
      founder_approval_required: false,
      recommended_commitment: noneCommitment(),
      learning_applied: [...learningApplied, "SKIP_OUTREACH_AFTER_PROVIDER_FAILURE"],
    });
  }

  if (occupancy.active_mission_id) {
    return decision({
      outcome: "CONTINUE_EXISTING_ACTION",
      selected_mission: occupancy.active_mission_id,
      reason: "EXISTING_ACTIVE_MISSION_OUTRANKS_NEW_WORK",
      priority: "EXISTING_GROWTH_CONTINUATION",
      expected_outcome: "Finish or block the current canonical mission before creating another",
      evidence: [`ACTIVE_MISSION:${occupancy.active_mission_id}`],
      venture_id: occupancy.venture_id,
      capability_required: "CANONICAL_MISSION_RUNTIME",
      financial_exposure: 0,
      spend_required: 0,
      commitment_required: 0,
      authorization_class: "NONE",
      review_condition: "MISSION_TERMINAL",
      fallback: "MISSION_ACTIVE",
      alternatives_considered: [...alternatives, "CREATE_DUPLICATE_MISSION"],
      founder_approval_required: false,
      recommended_commitment: noneCommitment(),
      learning_applied: learningApplied,
    });
  }

  if (occupancy.growth_active && occupancy.campaign_id) {
    return decision({
      outcome: "CONTINUE_EXISTING_ACTION",
      selected_mission: null,
      reason: "EXISTING_GROWTH_CAMPAIGN_CONTINUES_WITHOUT_NEW_MISSION",
      priority: "EXISTING_GROWTH_CONTINUATION",
      expected_outcome: "Existing campaign tick continues inside caps; no new mission and no spend",
      evidence: [`CAMPAIGN:${occupancy.campaign_id}`, `CAMPAIGN_STATE:${occupancy.campaign_state}`, "SEND_NOT_FORCED"],
      venture_id: occupancy.venture_id,
      capability_required: "GROWTH_RUNTIME",
      financial_exposure: 0,
      spend_required: 0,
      commitment_required: 0,
      authorization_class: "NONE",
      review_condition: "GROWTH_TICK_OR_REPLY",
      fallback: "IDLE_NO_ACTION",
      alternatives_considered: [...alternatives, "CREATE_OUTREACH_MISSION", "USE_SPEND_AUTHORITY"],
      founder_approval_required: false,
      recommended_commitment: occupancy.remaining_spend_authority > 0
        ? recommendedSpend(occupancy, "Authority exists but campaign continuation is zero-cost")
        : noneCommitment(),
      learning_applied: learningApplied,
    });
  }

  const outcome: AutonomousDecisionOutcome = "NO_ACTION_JUSTIFIED";
  const priority: OperatingPriority = "NO_ACTION_WAIT";
  return decision({
    outcome,
    selected_mission: null,
    reason: "NO_URGENT_DEFECT_NO_RESPONSE_NO_EVIDENCE_SUPPORTED_SPEND",
    priority,
    expected_outcome: "Idle until the next event or daily review — busywork is not an operating outcome",
    evidence: [
      "NO_CHECKOUT_INCIDENT",
      "NO_CUSTOMER_REPLY",
      "NO_EXECUTED_SEND_DEPENDENCY",
      "SPEND_AUTHORITY_IS_NOT_A_COMMAND",
      "PAID_ACQUISITION_BLOCKED",
    ],
    venture_id: occupancy.venture_id,
    capability_required: "NONE",
    financial_exposure: 0,
    spend_required: 0,
    commitment_required: 0,
    authorization_class: "NONE",
    review_condition: "NEXT_DAILY_REVIEW_OR_EVENT",
    fallback: "IDLE_NO_ACTION",
    alternatives_considered: alternatives,
    founder_approval_required: false,
    recommended_commitment: occupancy.remaining_spend_authority > 0
      ? recommendedSpend(occupancy, "Remaining $ spend authority is not a spend command")
      : noneCommitment(),
    learning_applied: learningApplied,
  });
}
