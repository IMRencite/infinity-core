import { founderFacingCopy } from "../explainability/founder-language";
import { formatApproximateUsd } from "../money-presentation";
import type { FounderVentureBuildPlan } from "../build-plan/types";
import type { FounderVentureBriefView } from "../venture-brief/types";
import type { FounderVentureCommandDeck } from "./types";

function firstSentence(text: string, fallback: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return fallback;
  const match = trimmed.match(/^(.+?[.!?])(?:\s|$)/);
  return match?.[1] ?? trimmed.slice(0, 180);
}

function metric(brief: FounderVentureBriefView, id: string, fallbackLabel: string): { value: string; confidence: FounderVentureCommandDeck["economicConfidence"]; label: string; help?: string } {
  const found = brief.metrics.find((item) => item.id === id);
  const confidence = found?.confidence === "Strong" || found?.confidence === "Moderate" || found?.confidence === "Weak"
    ? found.confidence
    : "Weak";
  return {
    label: found?.label ?? fallbackLabel,
    value: found?.primary ?? "Not enough evidence yet",
    confidence,
    help: found?.help,
  };
}

function businessCaseFrom(outlook: string, confidence: FounderVentureCommandDeck["economicConfidence"]): string {
  if (/unattractive|weak with current/i.test(outlook)) return "Economics look weak";
  if (/not enough/i.test(outlook)) return "Needs more evidence";
  if (/marginal/i.test(outlook)) return "Needs more evidence";
  if (/attractive/i.test(outlook) && confidence === "Weak") return "Worth validating";
  if (/promising/i.test(outlook)) return "Looks promising";
  if (/attractive/i.test(outlook)) return "Looks promising";
  return "Worth validating";
}

function parseApproxUsd(value: string): number | null {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function weakestConfidence(brief: FounderVentureBriefView): FounderVentureCommandDeck["economicConfidence"] {
  const ranks = { Insufficient: 0, Weak: 1, Moderate: 2, Strong: 3 };
  const values = brief.metrics.map((item) => ranks[item.confidence] ?? 1);
  const min = values.length ? Math.min(...values) : 1;
  if (min >= 3) return "Strong";
  if (min >= 2) return "Moderate";
  return "Weak";
}

export function presentVentureCommandDeck(input: {
  name: string;
  concept?: string | null;
  customer?: string | null;
  problem?: string | null;
  solution?: string | null;
  brief: FounderVentureBriefView;
  plan: FounderVentureBuildPlan;
  scenarios?: Array<{ customers: number; mrr: string; arr: string }>;
}): FounderVentureCommandDeck {
  const brief = input.brief;
  const plan = input.plan;
  const core = metric(brief, "core", "Monthly revenue / customer");
  const contribution = metric(brief, "contribution", "Contribution profit / customer");
  const cac = metric(brief, "cac", "CAC");
  const lifetime = metric(brief, "lifetime", "Customer lifetime");
  const ltv = metric(brief, "ltv", "LTV");
  const ltvCac = metric(brief, "ltv-cac", "LTV/CAC");
  const payback = metric(brief, "payback", "Payback");
  const firstYear = metric(brief, "first-year", "First-year revenue / customer");
  const confidence = weakestConfidence(brief);
  const businessCase = businessCaseFrom(brief.outlook, confidence);
  const customer = founderFacingCopy(input.customer || plan.mvp.idealCustomer);
  const problem = founderFacingCopy(input.problem || plan.mvp.coreProblem || brief.advantage.biggestProblem);
  const solution = founderFacingCopy(input.solution || plan.mvp.corePromise || brief.advantage.infinityCouldDoBetter);
  const concept = firstSentence(
    founderFacingCopy(input.concept || ""),
    `${solution} for ${customer}`.replace(/\s+/g, " ").trim(),
  );
  const price = core.value;
  const nextMove: FounderVentureCommandDeck["nextMove"] = {
    recommendation: `Validate whether ${customer} will pay ${price} for the core product before committing to the full build.`,
    why: plan.firstValidation,
    whatInfinityWouldTest: plan.mvp.validationGoal,
    successLooksLike: "Customers accept proposed core pricing. CAC stays inside the modeled range. Early users retain. Contribution margin remains viable.",
  };
  const monthlyContribution = parseApproxUsd(brief.profit.monthlyContributionProfit);
  const scaleRow = input.scenarios?.find((item) => item.customers === 100);
  const scaleAt100 = scaleRow && monthlyContribution != null
    ? {
        mrr: scaleRow.mrr,
        contribution: formatApproximateUsd(monthlyContribution * 100),
        arr: scaleRow.arr,
        note: "Scenario, not forecast." as const,
      }
    : null;
  const thesis = [
    `Demand exists because ${problem.replace(/\.$/, "")}.`,
    `Current options are weak: ${brief.advantage.biggestCompetitorWeakness.replace(/\.$/, "")}.`,
    `Infinity's product advantage is ${brief.advantage.strongestDifferentiator.replace(/\.$/, "")}.`,
  ].join(" ");
  const whyThisCouldBeABusiness = [
    `People pay to fix ${problem.replace(/\.$/, "").toLowerCase()}.`,
    `They stay if the site keeps producing search and AI-discovery leads (${lifetime.value} modeled lifetime).`,
    `Infinity OS can assemble this with existing internal systems, then charge ${price} plus optional setup/service.`,
    `Modeled contribution is ${brief.profit.monthlyContributionProfit}/customer after variable delivery costs — not company net profit.`,
  ].join(" ");
  const synthesis = `${businessCase} venture with modeled LTV/CAC of ${ltvCac.value} and a clear differentiator, but pricing and market evidence still need validation before BUILD.`;
  return {
    heading: "Venture Command Deck",
    identity: {
      name: input.name.trim() || "This venture",
      concept,
      customer,
      problem,
      solution,
      businessModel: plan.ifBuiltToday.howItWouldCharge,
    },
    thesis,
    whyThisCouldBeABusiness,
    businessCase,
    buildReadiness: "Not ready to build",
    buildReadinessReason: plan.firstValidation,
    economicConfidence: confidence,
    currentPosition: plan.currentPosition,
    nextMove,
    metrics: [
      { id: "core", label: "Monthly revenue / customer", value: core.value, confidence: core.confidence, help: core.help },
      { id: "contribution", label: "Contribution profit / customer", value: contribution.value, confidence: contribution.confidence, help: contribution.help },
      { id: "cac", label: "CAC", value: cac.value, confidence: cac.confidence, help: cac.help },
      { id: "lifetime", label: "Customer lifetime", value: lifetime.value, confidence: lifetime.confidence, help: lifetime.help },
      { id: "ltv", label: "LTV", value: ltv.value, confidence: ltv.confidence, help: ltv.help },
      { id: "ltv-cac", label: "LTV/CAC", value: ltvCac.value, confidence: ltvCac.confidence, help: ltvCac.help },
      { id: "payback", label: "Payback", value: payback.value, confidence: payback.confidence, help: payback.help },
      { id: "first-year", label: "First-year revenue / customer", value: firstYear.value, confidence: firstYear.confidence, help: firstYear.help },
    ],
    profit: {
      monthlyContribution: brief.profit.monthlyContributionProfit,
      firstYearContribution: brief.profit.firstYearContributionProfit,
      lifetimeContribution: brief.profit.lifetimeContribution,
    },
    scaleAt100,
    biggestAdvantage: brief.advantage.strongestDifferentiator,
    biggestRisk: brief.advantage.biggestRisk,
    primaryPain: brief.advantage.biggestProblem,
    howInfinityWouldSolve: brief.advantage.infinityCouldDoBetter,
    marketEdge: brief.marketVsInfinity.slice(0, 3),
    requiredSystems: plan.requiredSystems,
    systemsReady: plan.systemsReady,
    systemsPartial: plan.systemsPartial,
    systemsMissing: plan.systemsMissing,
    systemsBlocked: plan.systemsBlocked,
    coverageSummary: plan.coverageSummary,
    alreadyAvailable: plan.alreadyAvailable,
    productSpecificWork: plan.productSpecificWork,
    buildComplexity: plan.effort,
    next3Phases: plan.next3Phases,
    synthesis,
    grantsBuild: false,
  };
}
