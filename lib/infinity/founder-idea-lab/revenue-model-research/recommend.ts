import type { VentureContext } from "../comparable-economics/qualify";
import { classifyRevenueModelTypes, primaryRevenueModelType } from "./classify";
import type { RecommendedRevenueModel, RevenueModelComparable, RevenueModelType, RevenueStream } from "./types";
import type { RevenueModelCoverageStatus } from "./types";

const FIT_FACTORS = [
  "target_customer",
  "willingness_to_pay",
  "service_intensity",
  "software_leverage",
  "comparable_monetization",
  "gross_margin_potential",
  "sales_complexity",
  "implementation_burden",
  "retention_model",
  "upsell_potential",
] as const;

function scoreFit(input: {
  context: VentureContext;
  text: string;
  comparables: RevenueModelComparable[];
  streams: RevenueStream[];
}): Record<string, number> {
  const hay = `${input.context.title} ${input.context.description} ${input.context.businessModelHypothesis} ${input.context.proposedSolution} ${input.text}`;
  const numeric = input.comparables.filter((row) => row.numericPricingContribution).length;
  return {
    target_customer: input.context.targetCustomer ? 1 : 0.3,
    willingness_to_pay: numeric >= 2 ? 1 : numeric === 1 ? 0.6 : 0.1,
    service_intensity: /\b(managed|seo|content|done-for-you|setup)\b/i.test(hay) ? 0.8 : 0.3,
    software_leverage: /\b(saas|cms|platform|software|website)\b/i.test(hay) ? 0.9 : 0.3,
    comparable_monetization: numeric >= 2 ? 1 : input.comparables.some((row) => row.revenueModelRole !== "NO") ? 0.4 : 0.1,
    gross_margin_potential: /\bgross margin\b|\d+\s*%\s*margin/i.test(input.text) ? 0.7 : 0.2,
    sales_complexity: /\b(setup|implementation|sales|demo)\b/i.test(hay) ? 0.6 : 0.4,
    implementation_burden: /\b(setup|onboarding|implementation)\b/i.test(hay) ? 0.7 : 0.3,
    retention_model: /\b(annual|subscription|recurring|churn)\b/i.test(hay) ? 0.8 : 0.3,
    upsell_potential: /\b(add-?on|seo|aeo|premium|multi-location)\b/i.test(hay) ? 0.8 : 0.3,
  };
}

function pickRecommended(text: string, streams: RevenueStream[], fit: Record<string, number>): RevenueModelType {
  const software = fit.software_leverage >= 0.8;
  const service = fit.service_intensity >= 0.7;
  const setup = streams.some((item) => item.type === "ONE_TIME_IMPLEMENTATION");
  const commission = streams.some((item) => item.type === "COMMISSION");
  const perUser = streams.some((item) => item.type === "PER_USER");
  const perSeat = streams.some((item) => item.type === "PER_SEAT");
  const perLocation = streams.some((item) => item.type === "PER_LOCATION");
  if (commission && !software) return "COMMISSION";
  if (perUser && !service) return "PER_USER";
  if (perSeat && !service) return "PER_SEAT";
  if (perLocation) return "PER_LOCATION";
  if (software && service) return "HYBRID_SOFTWARE_SERVICE";
  if (software && setup) return "SUBSCRIPTION_PLUS_SETUP";
  if (/\bretainer\b/i.test(text) && !software) return "MANAGED_SERVICE_RETAINER";
  const classified = primaryRevenueModelType(text);
  if (classified !== "UNKNOWN") return classified;
  if (streams[0]?.type && streams[0].type !== "UNKNOWN") return streams[0].type;
  return "UNKNOWN";
}

export function recommendRevenueModel(input: {
  context: VentureContext;
  packetText: string;
  comparables: RevenueModelComparable[];
  streams: RevenueStream[];
  coverageStatus: RevenueModelCoverageStatus;
}): RecommendedRevenueModel {
  const fit = scoreFit({
    context: input.context,
    text: input.packetText,
    comparables: input.comparables,
    streams: input.streams,
  });
  const recommended =
    input.coverageStatus === "REVENUE_MODEL_INSUFFICIENT"
      ? "UNKNOWN"
      : pickRecommended(input.packetText, input.streams, fit);
  const classified = classifyRevenueModelTypes(input.packetText).map((item) => item.type);
  const alternatives = [...new Set([recommended === "HYBRID_SOFTWARE_SERVICE" ? "SUBSCRIPTION_PLUS_SETUP" : "HYBRID_SOFTWARE_SERVICE", ...classified])]
    .filter((item) => item !== recommended && item !== "UNKNOWN")
    .slice(0, 3) as RevenueModelType[];
  const support = input.comparables.filter((row) => row.revenueModelRole !== "NO").map((row) => row.name);
  const unknowns: string[] = [];
  if (!input.comparables.some((row) => row.numericPricingContribution)) unknowns.push("public numeric pricing");
  if (!/\bsetup\b/i.test(input.packetText)) unknowns.push("setup/onboarding fee");
  if (!/\bgross margin\b/i.test(input.packetText)) unknowns.push("gross margin");
  if (!/\bchurn\b/i.test(input.packetText)) unknowns.push("retention/churn");

  const confidence =
    input.coverageStatus === "REVENUE_MODEL_SUFFICIENT" ? "MEDIUM" : input.coverageStatus === "REVENUE_MODEL_PARTIAL" ? "LOW" : "NONE";

  return {
    recommendedModel: recommended,
    streams: input.streams,
    alternativeModels: alternatives,
    rationale:
      recommended === "UNKNOWN"
        ? "No defensible money model: comparable monetization evidence is insufficient. Category precedent is not treated as a recommended price."
        : `Selected ${recommended} from target customer, software leverage (${fit.software_leverage}), service intensity (${fit.service_intensity}), comparable monetization (${fit.comparable_monetization}), and observed streams. Not an LLM-only choice.`,
    comparableSupport: support,
    confidence,
    keyAssumptions: FIT_FACTORS.map((factor) => `${factor}=${fit[factor]}`),
    majorUnknowns: unknowns,
    fitFactors: fit,
  };
}
