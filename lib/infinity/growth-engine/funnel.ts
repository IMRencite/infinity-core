import {
  VENTURE_GROWTH_FUNNEL_CONTRACT,
  type GrowthFunnelState,
} from "./contract";

export const GROWTH_FUNNEL_STATES: readonly GrowthFunnelState[] = [
  "VISITOR",
  "PROSPECT",
  "CONTACTED",
  "REPLIED",
  "QUALIFIED",
  "ACCOUNT_CREATED",
  "TRIAL_STARTED",
  "ACTIVATED",
  "VALUE_EVENT_REACHED",
  "CHECKOUT_STARTED",
  "TRIAL_CONVERTED",
  "PAID",
  "RETAINED",
  "EXPANDED",
  "CHURNED",
  "REACTIVATED",
] as const;

export const TRIAL_FUNNEL_STATES = [
  "TRIAL_STARTED",
  "ACTIVATED",
  "VALUE_EVENT_REACHED",
  "TRIAL_CONVERTED",
  "TRIAL_CANCELLED",
  "TRIAL_EXPIRED",
  "PAYMENT_RECOVERY",
] as const;

export type OutreachEvidenceLedger = {
  prospectsSourced: number;
  prospectsQualified: number;
  attempted: number;
  delivered: number;
  bounced: number;
  replied: number;
  qualifiedReplies: number;
  qualifiedConversations: number;
  problemConfirmation: number;
  pricingFeedback: number;
  trialInterest: number;
  purchaseIntent: number;
  actualPurchase: number;
};

export function emptyOutreachEvidenceLedger(): OutreachEvidenceLedger {
  return {
    prospectsSourced: 0,
    prospectsQualified: 0,
    attempted: 0,
    delivered: 0,
    bounced: 0,
    replied: 0,
    qualifiedReplies: 0,
    qualifiedConversations: 0,
    problemConfirmation: 0,
    pricingFeedback: 0,
    trialInterest: 0,
    purchaseIntent: 0,
    actualPurchase: 0,
  };
}

export function ventureGrowthFunnelContract() {
  return {
    contract: VENTURE_GROWTH_FUNNEL_CONTRACT,
    states: GROWTH_FUNNEL_STATES,
    trialStates: TRIAL_FUNNEL_STATES,
    trialStartIsNotSuccess: true,
    optimizeToward: "VALUE_EVENT",
  };
}
