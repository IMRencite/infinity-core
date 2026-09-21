import type { SalesIntelligenceObservation } from "@/lib/infinity/venture-sales-floor/types";

export type AffiliateLearningObservation = {
  observation_id: string;
  kind:
    | "AFFILIATE_TYPE"
    | "RECRUITMENT_CHANNEL"
    | "CONVERSION_RATE"
    | "CUSTOMER_QUALITY"
    | "COMMISSION_COST"
    | "REFUND_RATE"
    | "CHARGEBACK_RATE"
    | "ATTRIBUTED_REVENUE"
    | "CONTRIBUTION_AFTER_COMMISSION"
    | "RECRUITMENT_MESSAGE"
    | "PARTNER_QUALITY"
    | "FRAUD_PATTERN";
  key: string;
  converts: boolean;
  weight: number;
};

export function affiliateObservationsToSalesIntelligence(
  observations: AffiliateLearningObservation[],
): SalesIntelligenceObservation[] {
  return observations.map((row) => ({
    observation_id: row.observation_id,
    kind: row.kind === "RECRUITMENT_CHANNEL" || row.kind === "AFFILIATE_TYPE" ? "CHANNEL" : "OFFER",
    key: `affiliate:${row.kind}:${row.key}`,
    converts: row.converts,
    weight: row.weight,
  }));
}

export function affiliateLearningReachesSalesIntelligence(observations: AffiliateLearningObservation[]): boolean {
  return affiliateObservationsToSalesIntelligence(observations).some((row) => row.key.startsWith("affiliate:"));
}
