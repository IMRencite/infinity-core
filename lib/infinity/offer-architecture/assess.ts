import type { FrictionLevel, TimeToValueType, VentureArchetype } from "./types";
import { UNKNOWN } from "./types";

export type PurchaseFrictionInput = {
  buyer_trust?: FrictionLevel | typeof UNKNOWN;
  brand_maturity?: FrictionLevel | typeof UNKNOWN;
  product_novelty?: FrictionLevel | typeof UNKNOWN;
  purchase_price_usd?: number | null;
  commitment_duration?: "NONE" | "MONTHLY" | "ANNUAL" | "ONE_TIME" | typeof UNKNOWN;
  payment_before_value?: boolean | typeof UNKNOWN;
  account_creation_burden?: FrictionLevel | typeof UNKNOWN;
  setup_effort?: FrictionLevel | typeof UNKNOWN;
  switching_cost?: FrictionLevel | typeof UNKNOWN;
  sales_cycle?: "SELF_SERVE" | "ASSISTED" | "ENTERPRISE" | typeof UNKNOWN;
  buyer_authority?: "END_USER" | "MANAGER" | "UNKNOWN";
  proof_availability?: FrictionLevel | typeof UNKNOWN;
  risk_perception?: FrictionLevel | typeof UNKNOWN;
};

export type PurchaseFrictionAssessment = {
  level: FrictionLevel;
  explanation: string;
  factors: string[];
};

function rank(value: FrictionLevel | typeof UNKNOWN | undefined, highMeansFriction: boolean): number {
  if (!value || value === UNKNOWN) return 1;
  const score = value === "HIGH" ? 2 : value === "MEDIUM" ? 1 : 0;
  return highMeansFriction ? score : 2 - score;
}

export function assessPurchaseFriction(input: PurchaseFrictionInput): PurchaseFrictionAssessment {
  const factors: string[] = [];
  let score = 0;
  if ((input.purchase_price_usd ?? 0) >= 200) {
    score += 2;
    factors.push("purchase_price_high");
  } else if (input.purchase_price_usd == null) {
    score += 1;
    factors.push("purchase_price_unknown");
  }
  if (input.commitment_duration === "ANNUAL") {
    score += 2;
    factors.push("annual_commitment");
  }
  if (input.payment_before_value === true) {
    score += 2;
    factors.push("payment_before_value");
  }
  score += rank(input.buyer_trust, false);
  score += rank(input.brand_maturity, false);
  score += rank(input.product_novelty, true);
  score += rank(input.account_creation_burden, true);
  score += rank(input.setup_effort, true);
  score += rank(input.risk_perception, true);
  if (input.proof_availability === "HIGH") score -= 1;
  if (input.proof_availability === "LOW" || input.proof_availability === UNKNOWN) {
    score += 1;
    factors.push("limited_proof");
  }
  const level: FrictionLevel = score >= 8 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";
  return {
    level,
    explanation: `Purchase friction is ${level} because ${factors.join(", ") || "no elevated friction factors were evidenced"}.`,
    factors,
  };
}

export function assessTimeToValue(input: {
  archetype?: VentureArchetype;
  value_type?: TimeToValueType | typeof UNKNOWN;
  meaningful_value_before_payment?: boolean | typeof UNKNOWN;
}): {
  type: TimeToValueType | typeof UNKNOWN;
  meaningful_value_before_payment: boolean | typeof UNKNOWN;
  explanation: string;
} {
  const type = input.value_type
    ?? (input.archetype === "SERVICE" || input.archetype === "LEAD_GEN"
      ? "SERVICE_BASED"
      : input.archetype === "ECOMMERCE" || input.archetype === "MERCH" || input.archetype === "TRANSACTIONAL_TOOL" || input.archetype === "CALCULATOR" || input.archetype === "WEB_UTILITY"
        ? "TRANSACTION_BASED"
        : input.archetype === "SAAS" || input.archetype === "SUBSCRIPTION"
          ? "TIME_BASED"
          : input.archetype === "YOUTUBE_MEDIA" || input.archetype === "NEWSLETTER" || input.archetype === "CREATOR"
            ? "USAGE_BASED"
            : UNKNOWN);
  return {
    type,
    meaningful_value_before_payment: input.meaningful_value_before_payment ?? UNKNOWN,
    explanation: type === "TRANSACTION_BASED" || type === "EVENT_BASED"
      ? "Value is experienced on a discrete job or deal, so calendar trials are not the default."
      : type === UNKNOWN
        ? "Time-to-value type is UNKNOWN and is not inferred as zero-friction."
        : `Value is primarily ${type}.`,
  };
}
