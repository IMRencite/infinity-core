import { FOUNDER_TERM_HELP } from "../educated-estimates/present";
import type { EducatedEconomicsModel, FounderEstimateHeroMetric } from "../educated-estimates/types";
import { presentEducatedEstimates } from "../educated-estimates/present";
import { founderFacingCopy } from "../explainability/founder-language";
import type { FounderProductAdvantageView } from "../product-advantage/types";
import { painCategoryLabel } from "../product-advantage/language";
import { CONTRIBUTION_PROFIT_HELP, type FounderVentureBriefView, type MarketVsInfinityRow, type VentureBriefMetric, type WhyWinRow } from "./types";
import { buildProfitBreakdown } from "./profit";

function outlookFrom(attractiveness: string, strength: string): string {
  if (/not enough/i.test(attractiveness)) return "Not enough evidence to publish a venture outlook.";
  if (/attractive/i.test(attractiveness) && /weak/i.test(strength)) {
    return "Economically attractive if retention and margin assumptions hold.";
  }
  if (/promising/i.test(attractiveness)) return "Promising, but still weakly validated.";
  if (/unattractive/i.test(attractiveness)) return "Modeled economics look weak with current assumptions.";
  if (/marginal/i.test(attractiveness)) return "Marginal economics until CAC, retention, or margin improve.";
  return attractiveness.endsWith(".") ? attractiveness : `${attractiveness}.`;
}

function metricFromHero(hero: FounderEstimateHeroMetric | undefined, fallback: VentureBriefMetric): VentureBriefMetric {
  if (!hero) return fallback;
  return {
    id: hero.id,
    label: hero.label,
    primary: hero.primary,
    range: hero.range,
    confidence: hero.confidence,
    kind: hero.kind === "actual" ? "actual" : hero.kind,
    help: hero.help,
  };
}

export function presentVentureBrief(input: {
  educated: EducatedEconomicsModel;
  advantage: FounderProductAdvantageView | null;
  attractiveness: string;
  biggestRisk: string;
}): FounderVentureBriefView {
  const presented = presentEducatedEstimates(input.educated);
  const profit = buildProfitBreakdown(input.educated);
  const strength = presented.hero.find((item) => item.id === "cac")?.confidence ?? "Weak";
  const outlook = outlookFrom(founderFacingCopy(input.attractiveness), strength);
  const risk = founderFacingCopy(
    input.biggestRisk || input.advantage?.summary.biggestEconomicUncertainty || "Unit economics are still modeled, not observed.",
  );
  const summaryParts = [presented.conclusion.replace(/\s+/g, " ").trim(), `Biggest risk: ${risk}`].filter(Boolean);
  const hero = presented.hero;
  const metrics: VentureBriefMetric[] = [
    metricFromHero(hero.find((item) => item.id === "core"), {
      id: "core",
      label: "Estimated monthly revenue / customer",
      primary: "—",
      range: "Not enough evidence yet",
      confidence: "Insufficient",
      kind: "estimated",
      help: FOUNDER_TERM_HELP.estimated,
    }),
    {
      id: "first-year",
      label: "Estimated first-year revenue / customer",
      primary: presented.firstYear.coreOnly,
      range: presented.firstYear.coreOnly,
      confidence: input.educated.firstYearCustomerValue?.strength ?? "Insufficient",
      kind: "estimated",
      help: "Setup plus 12 months of core subscription. This is revenue, not profit.",
    },
    {
      id: "contribution",
      label: "Estimated contribution profit / customer",
      primary: profit.monthlyContributionProfit,
      range: profit.monthlyContributionProfit,
      confidence: input.educated.margin.selected?.strength ?? "Insufficient",
      kind: "modeled",
      help: CONTRIBUTION_PROFIT_HELP,
    },
    metricFromHero(hero.find((item) => item.id === "cac"), {
      id: "cac",
      label: "Estimated CAC",
      primary: "—",
      range: "Not enough evidence yet",
      confidence: "Insufficient",
      kind: "estimated",
      help: FOUNDER_TERM_HELP.cac,
    }),
    metricFromHero(hero.find((item) => item.id === "lifetime"), {
      id: "lifetime",
      label: "Estimated customer lifetime",
      primary: "—",
      range: "Not enough evidence yet",
      confidence: "Insufficient",
      kind: "estimated",
      help: FOUNDER_TERM_HELP.estimated,
    }),
    metricFromHero(hero.find((item) => item.id === "ltv"), {
      id: "ltv",
      label: "Estimated LTV",
      primary: "—",
      range: "Not enough evidence yet",
      confidence: "Insufficient",
      kind: "modeled",
      help: FOUNDER_TERM_HELP.ltv,
    }),
    metricFromHero(hero.find((item) => item.id === "ltv-cac"), {
      id: "ltv-cac",
      label: "Estimated LTV/CAC",
      primary: "—",
      range: "Not enough evidence yet",
      confidence: "Insufficient",
      kind: "modeled",
      help: FOUNDER_TERM_HELP.ltvCac,
    }),
    metricFromHero(hero.find((item) => item.id === "payback"), {
      id: "payback",
      label: "Estimated payback",
      primary: "—",
      range: "Not enough evidence yet",
      confidence: "Insufficient",
      kind: "modeled",
      help: FOUNDER_TERM_HELP.payback,
    }),
    metricFromHero(hero.find((item) => item.id === "margin"), {
      id: "margin",
      label: "Estimated contribution margin",
      primary: "—",
      range: "Not enough evidence yet",
      confidence: "Insufficient",
      kind: "modeled",
      help: FOUNDER_TERM_HELP.contributionMargin,
    }),
  ];
  const advantage = input.advantage;
  const biggestProblem = advantage?.summary.biggestPains[0] ?? "Not enough complaint evidence yet.";
  const infinityCouldDoBetter = advantage?.summary.bestOpportunities[0] ?? "Not enough evidence to recommend a product change.";
  const strongest = advantage?.summary.strongestDifferentiator ?? "Not enough evidence yet";
  const competitorWeakness = advantage?.doNotCopy[0] ?? advantage?.summary.whatCustomersHate ?? "Not enough public complaint evidence yet.";
  const whyThisCouldWin: WhyWinRow[] = (advantage?.buildBetter ?? []).slice(0, 5).map((card) => ({
    problem: card.problem,
    response: card.recommendedImprovement,
    commercialWhy: card.whyItCouldWin,
    evidence: `${card.evidenceStrength} evidence`,
  }));
  const marketGetsWrong = [
    ...(advantage?.summary.biggestPains ?? []),
    ...(advantage?.doNotCopy ?? []),
  ].filter((item, index, all) => item && all.indexOf(item) === index).slice(0, 6);
  const doDifferently = [
    advantage?.summary.whatInfinityShouldDoDifferently,
    ...(advantage?.recommendedImprovements ?? []).map((item) => item.recommendedImprovement),
  ].filter((item): item is string => Boolean(item)).filter((item, index, all) => all.indexOf(item) === index).slice(0, 6);
  const marketVsInfinity: MarketVsInfinityRow[] = (advantage?.painClusters ?? []).slice(0, 8).map((cluster) => {
    const response = advantage?.recommendedImprovements.find((item) => item.customerProblem === cluster.problem);
    return {
      dimension: painCategoryLabel(cluster.category),
      marketToday: cluster.problem,
      infinityOpportunity: response?.recommendedImprovement ?? advantage?.summary.bestOpportunities[0] ?? "Keep researching this friction.",
      evidence: cluster.confidence === "HIGH" ? "Strong evidence" : cluster.confidence === "MEDIUM" ? "Moderate evidence" : "Weak evidence",
    };
  });
  return {
    heading: "Infinity Venture Brief",
    outlook,
    summary: summaryParts.slice(0, 2).join(" "),
    metrics,
    profit,
    advantage: {
      biggestProblem,
      infinityCouldDoBetter,
      strongestDifferentiator: strongest,
      biggestCompetitorWeakness: competitorWeakness,
      biggestRisk: risk,
      cards: [
        { id: "problem", label: "Biggest customer problem", value: biggestProblem, evidence: advantage?.summary.evidenceStrength ?? "Not enough evidence" },
        { id: "better", label: "What Infinity could do better", value: infinityCouldDoBetter, evidence: advantage?.summary.evidenceStrength ?? "Not enough evidence" },
        { id: "differentiator", label: "Strongest differentiator", value: strongest, evidence: advantage?.summary.evidenceStrength ?? "Not enough evidence" },
        { id: "weakness", label: "Biggest competitor weakness", value: competitorWeakness, evidence: advantage?.summary.evidenceStrength ?? "Not enough evidence" },
        { id: "risk", label: "Biggest risk", value: risk, evidence: "Modeled" },
      ],
    },
    whyThisCouldWin,
    marketGetsWrong: marketGetsWrong.length ? marketGetsWrong : ["Not enough complaint evidence yet."],
    doDifferently: doDifferently.length ? doDifferently : ["Keep researching competitor friction before changing the product."],
    marketVsInfinity,
    grantsBuild: false,
  };
}
