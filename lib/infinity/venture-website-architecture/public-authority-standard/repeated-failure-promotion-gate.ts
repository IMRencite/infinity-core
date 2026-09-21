import type { Gate } from "../types";
import { REPEATED_FAILURE_PROMOTION_GATE } from "../constants";
import type { PageAdmissionRecord, PageFailureFamily } from "./page-build-state";

export type RepeatedFailurePromotion = {
  family: PageFailureFamily;
  component: string;
  pages: string[];
  promoteTo: "shared" | "global";
};

export type RepeatedFailurePromotionGateResult = {
  gate: typeof REPEATED_FAILURE_PROMOTION_GATE;
  overall: Gate;
  promotions: RepeatedFailurePromotion[];
  sharedFixesRequired: number;
};

export function evaluateRepeatedFailurePromotionGate(
  records: PageAdmissionRecord[],
): RepeatedFailurePromotionGateResult {
  const buckets = new Map<string, RepeatedFailurePromotion>();
  for (const record of records) {
    for (const family of record.families) {
      const component = family === "CONTRAST" || family === "CTA" ? "surface-ink" : family === "SOURCE_PRESENTATION" ? "pv-source-board" : family.toLowerCase();
      const key = `${family}:${component}`;
      const existing = buckets.get(key) ?? { family, component, pages: [], promoteTo: "shared" as const };
      if (!existing.pages.includes(record.route)) existing.pages.push(record.route);
      existing.promoteTo = existing.pages.length >= 8 ? "global" : "shared";
      buckets.set(key, existing);
    }
  }
  const promotions = [...buckets.values()].filter((item) => item.pages.length >= 2);
  return {
    gate: REPEATED_FAILURE_PROMOTION_GATE,
    overall: "PASS",
    promotions,
    sharedFixesRequired: promotions.length,
  };
}
