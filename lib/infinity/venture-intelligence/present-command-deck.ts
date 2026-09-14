import { presentVentureCommandDeck } from "@/lib/infinity/founder-idea-lab/command-deck";
import { buildFounderVentureBuildPlan, nextThreePhases } from "@/lib/infinity/founder-idea-lab/build-plan";
import { emptyEducatedEconomicsModel } from "@/lib/infinity/founder-idea-lab/educated-estimates";
import type { FounderProductAdvantageView } from "@/lib/infinity/founder-idea-lab/product-advantage/types";
import type { FounderVentureBriefView } from "@/lib/infinity/founder-idea-lab/venture-brief/types";
import type { FounderVentureCommandDeck } from "@/lib/infinity/founder-idea-lab/command-deck/types";
import type { ZeroToProductionStep } from "@/lib/infinity/founder-idea-lab/build-plan/types";
import type {
  VentureBuildPlanView,
  VentureCommandDeckView,
  VentureEconomicsView,
  VentureMarketAdvantageView,
  VentureNextMoveView,
} from "./types";
import { buildPlanHeadingFor } from "./lifecycle";
import { metricCardsFrom } from "./economics";
import { displayOr } from "./missing-data";
import type { CanonicalSystemReadiness } from "./system-readiness";

export function wrapBuildPlan(input: {
  step: ZeroToProductionStep;
  customer: string;
  problem: string;
  solution: string;
  businessModel: string;
  recommendedModel: string | null;
  hasEstimates: boolean;
  advantage?: FounderProductAdvantageView | null;
  platform?: CanonicalSystemReadiness | null;
}): VentureBuildPlanView {
  const educated = emptyEducatedEconomicsModel();
  const base = buildFounderVentureBuildPlan({
    advantage: input.advantage ?? null,
    educated: input.hasEstimates
      ? {
          ...educated,
          coreMonthly: {
            actual: "UNKNOWN",
            actualDisplay: "Not measured yet",
            bestEstimate: { low: null, base: 1, high: null },
            displayRange: "Modeled",
            displayBase: "Modeled",
            confidence: "LOW",
            strength: "Weak",
            provenance: "SCENARIO_MODEL",
            formula: "persisted monetization",
            assumptions: [],
            basis: "Canonical monetization plan",
            whatIsIt: "Persisted modeled core price",
            whatInfinityEstimates: "Use the persisted plan, do not re-estimate",
            why: "Reuse educated-estimate architecture without a second engine.",
            whatToTestNext: "Observe willingness to pay",
            nextValidation: "Measure actual price paid",
            modeledNotObserved: true,
            grantsBuild: false,
          },
        }
      : educated,
    buildReady: false,
    recommendedModel: input.recommendedModel,
  });
  const heading = buildPlanHeadingFor(input.step);
  const path = base.path.map((item) => ({
    ...item,
    complete: false,
    current: item.id === input.step,
  }));
  const platform = input.platform;
  return {
    ...base,
    heading,
    currentPosition: base.currentPosition,
    path,
    next3Phases: nextThreePhases(input.step, base.phases),
    systemsReady: platform?.platformAvailable ?? base.systemsReady,
    systemsPartial: platform?.platformPartial ?? base.systemsPartial,
    systemsMissing: platform?.platformMissing ?? base.systemsMissing,
    coverageSummary: platform?.platformSummary ?? base.coverageSummary,
    alreadyAvailable: platform
      ? platform.rows
          .filter((row) => row.platform === "PLATFORM_AVAILABLE" || row.platform === "PLATFORM_PARTIAL")
          .map((row) => row.system)
      : base.alreadyAvailable,
    mvp: {
      ...base.mvp,
      idealCustomer: input.customer,
      coreProblem: input.problem,
      corePromise: input.solution,
    },
    ifBuiltToday: {
      ...base.ifBuiltToday,
      whoItWouldSellTo: input.customer,
      howItWouldCharge: displayOr(input.businessModel, base.ifBuiltToday.howItWouldCharge),
      whatItWouldDoDifferently: input.solution,
    },
  };
}

function briefFromEconomics(
  economics: VentureEconomicsView,
  advantage: VentureMarketAdvantageView,
  outlook: string,
  biggestRisk: string,
): FounderVentureBriefView {
  const metrics = metricCardsFrom(economics).map((item) => ({
    id: item.id,
    label: item.label,
    primary: item.value,
    range: item.value,
    confidence: item.confidence,
    kind: (economics.monthlyRevenuePerCustomer.origin === "OBSERVED" && item.id === "core" ? "actual" : "estimated") as "actual" | "estimated",
    help: item.help ?? "",
  }));
  return {
    heading: "Infinity Venture Brief",
    summary: outlook,
    outlook,
    metrics,
    profit: {
      monthlyRevenue: economics.monthlyRevenuePerCustomer.display,
      monthlyVariableCost: "Not measured yet",
      monthlyContributionProfit: economics.contributionProfitPerCustomer.display,
      firstYearRecurringRevenue: economics.firstYearRevenuePerCustomer.display,
      firstYearSetupRevenue: "Not measured yet",
      firstYearTotalRevenue: economics.firstYearRevenuePerCustomer.display,
      firstYearContributionProfit: economics.firstYearContribution.display,
      lifetimeContribution: economics.lifetimeContribution.display,
      setupProfitIncluded: false,
      labelsContributionNotNet: true,
      warning: null,
      waterfall: [],
    },
    advantage: {
      biggestProblem: advantage.primaryCustomerPain,
      biggestCompetitorWeakness: advantage.biggestMarketWeakness,
      strongestDifferentiator: advantage.strongestDifferentiator,
      infinityCouldDoBetter: advantage.whatInfinityCouldDoBetter,
      biggestRisk,
      cards: [],
    },
    whyThisCouldWin: [],
    marketGetsWrong: [],
    doDifferently: [],
    marketVsInfinity: advantage.marketEdge,
    grantsBuild: false,
  };
}

export function presentCanonicalCommandDeck(input: {
  name: string;
  concept: string;
  customer: string;
  problem: string;
  solution: string;
  businessModel: string;
  thesis: string;
  whyThisCouldBeABusiness: string;
  businessCase: string;
  buildReadiness: string;
  buildReadinessReason: string;
  economics: VentureEconomicsView;
  advantage: VentureMarketAdvantageView;
  plan: VentureBuildPlanView;
  nextMove: VentureNextMoveView;
  currentPosition: string;
  biggestRisk: string;
}): VentureCommandDeckView {
  const seeded: FounderVentureCommandDeck = presentVentureCommandDeck({
    name: input.name,
    concept: input.concept,
    customer: input.customer,
    problem: input.problem,
    solution: input.solution,
    brief: briefFromEconomics(input.economics, input.advantage, input.businessCase, input.biggestRisk),
    plan: { ...input.plan, heading: "How Infinity Could Build This" },
  });
  return {
    ...seeded,
    identity: {
      name: input.name,
      concept: input.concept,
      customer: input.customer,
      problem: input.problem,
      solution: input.solution,
      businessModel: input.businessModel,
    },
    thesis: input.thesis,
    whyThisCouldBeABusiness: input.whyThisCouldBeABusiness,
    businessCase: input.businessCase,
    buildReadiness: input.buildReadiness,
    buildReadinessReason: input.buildReadinessReason,
    economicConfidence: input.economics.economicConfidence,
    currentPosition: input.currentPosition,
    nextMove: input.nextMove,
    metrics: metricCardsFrom(input.economics).map((item) => ({
      id: item.id,
      label: item.label,
      value: item.value,
      confidence: item.confidence,
      help: item.help,
    })),
    profit: {
      monthlyContribution: input.economics.contributionProfitPerCustomer.display,
      firstYearContribution: input.economics.firstYearContribution.display,
      lifetimeContribution: input.economics.lifetimeContribution.display,
    },
    biggestAdvantage: input.advantage.strongestDifferentiator,
    biggestRisk: input.biggestRisk,
    primaryPain: input.advantage.primaryCustomerPain,
    howInfinityWouldSolve: input.advantage.whatInfinityCouldDoBetter,
    marketEdge: input.advantage.marketEdge,
    requiredSystems: input.plan.requiredSystems,
    systemsReady: input.plan.systemsReady,
    systemsPartial: input.plan.systemsPartial,
    systemsMissing: input.plan.systemsMissing,
    systemsBlocked: input.plan.systemsBlocked,
    coverageSummary: input.plan.coverageSummary,
    alreadyAvailable: input.plan.alreadyAvailable,
    productSpecificWork: input.plan.productSpecificWork,
    next3Phases: input.plan.next3Phases,
    synthesis: `${input.businessCase}. ${input.currentPosition}. Next: ${input.nextMove.recommendation}`,
    grantsBuild: false,
  };
}
