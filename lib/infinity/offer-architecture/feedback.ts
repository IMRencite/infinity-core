import { projectVentureCustomerSuggestions } from "@/lib/infinity/product-improvement-loop/suggestions";
import type { OfferFeedbackSignal } from "./types";

const CATEGORY_PATTERNS: Array<{ category: OfferFeedbackSignal["category"]; pattern: RegExp }> = [
  { category: "too_expensive", pattern: /too expensive|overpriced|price( is|s are)? (high|steep)|\$290|\$149/i },
  { category: "need_trial", pattern: /trial|try (it |before )?(i )?(buy|pay)|test before/i },
  { category: "want_monthly_option", pattern: /monthly|pay month|month to month/i },
  { category: "want_demo", pattern: /demo|walkthrough|show me/i },
  { category: "pricing_confusing", pattern: /pricing (is )?(confusing|unclear)|don't understand.{0,20}price/i },
  { category: "unwilling_to_enter_card", pattern: /credit card|enter (a )?card|card required/i },
  { category: "need_lower_risk_first_use", pattern: /first (use|deal|transaction)|lower.?risk|try one/i },
  { category: "prefer_one_time_purchase", pattern: /one[- ]time|per deal|not (a )?subscription/i },
  { category: "want_team_pricing", pattern: /team pric|per seat|seats/i },
  { category: "want_pilot", pattern: /pilot|assisted|white glove/i },
];

export function collectOfferFeedbackSignals(ventureId: string): OfferFeedbackSignal[] {
  const view = projectVentureCustomerSuggestions(ventureId);
  const buckets = new Map<OfferFeedbackSignal["category"], OfferFeedbackSignal>();
  for (const row of view.rows) {
    const text = `${row.suggestion} ${row.goal_or_context ?? ""} ${row.classification}`;
    const hit = CATEGORY_PATTERNS.find((item) => item.pattern.test(text))?.category ?? "other";
    const current = buckets.get(hit) ?? {
      category: hit,
      real_count: 0,
      synthetic_count: 0,
      evidence_ids: [],
      automatic_price_change: false as const,
      automatic_economics_bypass: false as const,
    };
    if (row.synthetic) current.synthetic_count += 1;
    else {
      current.real_count += 1;
      current.evidence_ids.push(row.feedback_id);
    }
    buckets.set(hit, current);
  }
  return [...buckets.values()];
}

export function offerFeedbackMayChangeLivePricing(): false {
  return false;
}

export function offerFeedbackMayBypassEconomics(): false {
  return false;
}
