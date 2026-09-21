import { categoryTerm, type ResearchCoverageSeed } from "@/lib/infinity/research/coverage/queries";
import type { PlannedResearchQuery } from "@/lib/infinity/research/coverage/queries";
import { DIMENSION_SIGNAL_TYPES } from "@/lib/infinity/research/coverage/dimensions";

export function benchmarkEconomicsQueries(seed: ResearchCoverageSeed, missing: string[]): PlannedResearchQuery[] {
  const category = categoryTerm(seed);
  const customer = seed.targetCustomer?.trim() || "SMB";
  const families: Array<{ gap: string; query: string; dimensions: Array<"pricing" | "monetization" | "distribution"> }> = [
    { gap: "cac", query: `${customer} ${category} CAC benchmark`, dimensions: ["monetization"] },
    { gap: "cac", query: `${customer} ${category} CAC benchmark report`, dimensions: ["monetization"] },
    { gap: "cac", query: `${category} customer acquisition cost SaaS study`, dimensions: ["monetization"] },
    { gap: "cac", query: `${customer} ${category} CAC public filing`, dimensions: ["monetization"] },
    { gap: "cac", query: `${category} official company CAC disclosure`, dimensions: ["monetization"] },
    { gap: "cac", query: `${category} customer acquisition cost industry report`, dimensions: ["monetization"] },
    { gap: "cac", query: `${category} customer acquisition cost`, dimensions: ["monetization"] },
    { gap: "cac", query: `${customer} ${category} average cost per lead`, dimensions: ["distribution"] },
    { gap: "churn", query: `${customer} SaaS monthly logo churn`, dimensions: ["monetization"] },
    { gap: "churn", query: `small business software customer churn`, dimensions: ["monetization"] },
    { gap: "churn", query: `${category} website SaaS customer retention`, dimensions: ["monetization"] },
    { gap: "churn", query: `managed website service retention`, dimensions: ["monetization"] },
    { gap: "margin", query: `vertical SaaS gross margin`, dimensions: ["monetization"] },
    { gap: "margin", query: `SMB SaaS gross margin`, dimensions: ["monetization"] },
    { gap: "margin", query: `website-as-a-service gross margin`, dimensions: ["monetization"] },
    { gap: "margin", query: `managed digital service gross margin`, dimensions: ["monetization"] },
    { gap: "margin", query: `hybrid SaaS service gross margin`, dimensions: ["monetization"] },
    { gap: "conversion", query: `${category} conversion rate benchmark`, dimensions: ["distribution"] },
    { gap: "conversion", query: `${customer} ${category} sales close rate`, dimensions: ["distribution"] },
    { gap: "sales_cycle", query: `${category} sales cycle benchmark`, dimensions: ["distribution"] },
    { gap: "arpu", query: `${category} ARPU`, dimensions: ["pricing"] },
    { gap: "cac", query: `${customer} ${category} Google Ads CPC`, dimensions: ["distribution"] },
    { gap: "cac", query: `${customer} ${category} visitor to lead conversion`, dimensions: ["distribution"] },
    { gap: "cac", query: `${customer} ${category} lead to customer conversion`, dimensions: ["distribution"] },
    { gap: "cac", query: `${customer} ${category} sales labor cost per close`, dimensions: ["monetization"] },
    { gap: "cac", query: `${customer} ${category} paid search CPL`, dimensions: ["distribution"] },
  ];
  const prioritized = missing.length ? families.filter((item) => missing.includes(item.gap)) : families;
  return prioritized.map((item, index) => ({
    queryId: `benchmark-${index + 1}`,
    query: item.query,
    targetDimensions: item.dimensions,
    targetSignalTypes: item.dimensions.flatMap((dimension) => DIMENSION_SIGNAL_TYPES[dimension]),
    intent: `benchmark-economics:${item.gap}`,
  }));
}
