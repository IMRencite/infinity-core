import { ZERO_TO_PRODUCTION_STEPS, type ZeroToProductionStep } from "@/lib/infinity/founder-idea-lab/build-plan/types";
import type {
  CanonicalPerformanceInput,
  CanonicalVentureAdapterInput,
  VentureBusinessCaseView,
  VentureBuildPlanHeading,
  VentureCurrentPositionView,
  VentureNextMoveView,
  VentureSourceContextId,
} from "./types";
import { VENTURE_SOURCE_BADGES } from "./types";
import { displayOr, firstUseful, MISSING_COPY } from "./missing-data";

export function resolveSourceContext(input: {
  founderIdeaId?: string | null;
  origin?: string | null;
  live: boolean;
  built: boolean;
  validated: boolean;
  hasCandidate: boolean;
}): VentureSourceContextId {
  if (input.founderIdeaId) return "FOUNDER_IDEA";
  const origin = String(input.origin ?? "").toLowerCase();
  if (origin.includes("founder")) return "FOUNDER_IDEA";
  if (input.live) return "LIVE_VENTURE";
  if (input.built) return "PORTFOLIO_VENTURE";
  if (input.validated) return "VALIDATED_VENTURE";
  if (input.hasCandidate) return "OPPORTUNITY_CANDIDATE";
  return "AUTONOMOUS_DISCOVERY";
}

export function sourceBadge(id: VentureSourceContextId): string {
  return VENTURE_SOURCE_BADGES[id];
}

const TECHNICAL_EXECUTION_METRICS = new Set([
  "execution_success_rate",
  "provider_cost",
  "build_cost",
  "token_usage",
  "latency_ms",
  "qa_pass_rate",
]);

const CUSTOMER_LEARNING_METRICS = [
  "cac",
  "ltv",
  "conversion",
  "retention",
  "churn",
  "gross_revenue",
  "revenue",
  "paying_customers",
  "customers",
  "sessions",
];

export function isTechnicalExecutionMetric(metric: string): boolean {
  return TECHNICAL_EXECUTION_METRICS.has(metric.toLowerCase());
}

export function isCustomerLearningMetric(metric: string): boolean {
  const normalized = metric.toLowerCase();
  return CUSTOMER_LEARNING_METRICS.some((item) => normalized.includes(item));
}

export function isExternallyLive(input: Pick<CanonicalVentureAdapterInput, "launchStage">): boolean {
  const stage = String(input.launchStage ?? "").toLowerCase();
  return (
    stage.includes("externally_live") ||
    stage === "live" ||
    stage.includes("launched") ||
    stage.includes("public") ||
    (stage.includes("live") && !stage.includes("internal"))
  );
}

export function isLiveVenture(input: Pick<CanonicalVentureAdapterInput, "launchStage" | "productionArtifactId" | "performance">): boolean {
  return isExternallyLive(input);
}

export function isBuiltVenture(input: Pick<CanonicalVentureAdapterInput, "buildId" | "productionArtifactId" | "assemblyStatus" | "launchStage">): boolean {
  if (input.productionArtifactId) return true;
  if (input.buildId) return true;
  const status = String(input.assemblyStatus ?? "").toLowerCase();
  const stage = String(input.launchStage ?? "").toLowerCase();
  return status === "internally_ready" || stage.includes("ready") || stage.includes("built");
}

export function mapLifecycleStep(input: {
  live: boolean;
  building: boolean;
  built: boolean;
  hasPerformance: boolean;
  hasCustomerLearning: boolean;
  hasEconomics: boolean;
  hasResearch: boolean;
  underperforming: boolean;
  performingWell: boolean;
}): ZeroToProductionStep {
  if (input.live && input.hasCustomerLearning && input.performingWell && !input.underperforming) {
    return "SCALE";
  }
  if (input.live && input.hasCustomerLearning) return "LEARN";
  if (input.live) return "ACQUIRE";
  if (input.building) return "BUILD";
  if (input.built) return "LAUNCH";
  if (input.hasEconomics && input.hasResearch) return "DESIGN";
  if (input.hasEconomics || input.hasResearch) return "VALIDATE";
  return "IDEA";
}

export function positionLabel(step: ZeroToProductionStep): string {
  switch (step) {
    case "IDEA":
      return "Idea — still assembling the venture thesis";
    case "VALIDATE":
      return "Validate — evidence exists, economics still need proof";
    case "DESIGN":
      return "Design — architecture and offer definition";
    case "BUILD":
      return "Build — product work is in progress";
    case "LAUNCH":
      return "Launch — internally assembled, not yet scaled";
    case "ACQUIRE":
      return "Acquire — ready to win first customers";
    case "LEARN":
      return "Learn — measuring what is actually happening";
    case "SCALE":
      return "Scale — operating against measured economics";
  }
}

export function currentPositionView(step: ZeroToProductionStep): VentureCurrentPositionView {
  const index = ZERO_TO_PRODUCTION_STEPS.indexOf(step);
  return {
    step,
    label: positionLabel(step),
    path: ZERO_TO_PRODUCTION_STEPS.map((id, order) => ({
      id,
      complete: order < index,
      current: id === step,
    })),
  };
}

export function buildPlanHeadingFor(step: ZeroToProductionStep): VentureBuildPlanHeading {
  if (step === "BUILD") return "How Infinity Is Building This";
  if (step === "LAUNCH" || step === "ACQUIRE" || step === "LEARN" || step === "SCALE") {
    return "How This Venture Is Operating";
  }
  return "How Infinity Could Build This";
}

export function buildReadinessFor(input: {
  step: ZeroToProductionStep;
  live: boolean;
  building: boolean;
  built: boolean;
  hasEconomics: boolean;
}): { label: string; reasonLabel: string } {
  if (input.live) return { label: "Deployed", reasonLabel: "Current operating constraint" };
  if (input.built) return { label: "Built", reasonLabel: "What still remains before scale" };
  if (input.building) return { label: "Already building", reasonLabel: "What the current build still needs" };
  if (input.step === "DESIGN") return { label: "Ready for architecture", reasonLabel: "Why architecture is the current gate" };
  if (input.step === "VALIDATE" && input.hasEconomics) {
    return { label: "Validation first", reasonLabel: "Why validation still comes first" };
  }
  if (input.step === "VALIDATE") return { label: "Ready for governed build", reasonLabel: "What must stay gated" };
  return { label: "Not ready", reasonLabel: "Why this is not a build decision" };
}

export function businessCaseFrom(input: {
  hasEconomics: boolean;
  weakEconomics: boolean;
  promising: boolean;
  performingWell: boolean;
  underperforming: boolean;
}): VentureBusinessCaseView {
  if (input.underperforming) {
    return { label: "Underperforming expectations", reason: "Observed results are below the modeled plan." };
  }
  if (input.performingWell) {
    return { label: "Performing well", reason: "Observed results are at or above the modeled plan." };
  }
  if (!input.hasEconomics) {
    return { label: "Needs more evidence", reason: "There is not enough persisted economic evidence yet." };
  }
  if (input.weakEconomics) {
    return { label: "Economics are weak", reason: "Persisted modeled unit economics do not currently look attractive." };
  }
  if (input.promising) {
    return { label: "Looks promising", reason: "Modeled unit economics look attractive, but they are not observed sales." };
  }
  return { label: "Worth validating", reason: "There is a coherent offer, but the money case still needs proof." };
}

export function nextMoveFrom(input: {
  step: ZeroToProductionStep;
  customer: string;
  price: string;
  hasCustomer: boolean;
  hasOffer: boolean;
  hasPricing: boolean;
  hasEconomics: boolean;
  hasObservedCac: boolean;
  underperforming: boolean;
  conversionWeak: boolean;
  retentionWeak: boolean;
  firstValidation: string;
}): VentureNextMoveView {
  if (input.step === "SCALE") {
    return {
      recommendation: "Scale the profitable channel while protecting contribution margin.",
      why: "The venture is operating with measured economics.",
      whatInfinityWouldTest: "Whether the winning channel stays inside payback after more spend.",
      successLooksLike: "Contribution holds as volume grows.",
    };
  }
  if (input.retentionWeak) {
    return {
      recommendation: "Improve retention before buying more demand.",
      why: "Customers are not staying long enough for modeled LTV to hold.",
      whatInfinityWouldTest: "Whether onboarding or product gaps explain early churn.",
      successLooksLike: "Retention moves toward the modeled lifetime.",
    };
  }
  if (input.conversionWeak) {
    return {
      recommendation: "Repair the conversion funnel before scaling acquisition.",
      why: "Traffic or demand is not converting at the expected rate.",
      whatInfinityWouldTest: "Offer, pricing, and checkout friction on the live path.",
      successLooksLike: "Conversion moves toward the modeled expectation.",
    };
  }
  if (input.underperforming) {
    return {
      recommendation: "Close the gap between expected and actual unit economics.",
      why: "Live results are below the plan Infinity is using.",
      whatInfinityWouldTest: "Which KPI is causing the variance — CAC, conversion, or retention.",
      successLooksLike: "Actual CAC, conversion, or LTV return toward plan.",
    };
  }
  if (input.step === "LEARN" && !input.hasObservedCac) {
    return {
      recommendation: "Measure CAC from the current customer path before scaling spend.",
      why: "Customers or traffic exist, but acquisition cost is still modeled.",
      whatInfinityWouldTest: "Actual spend versus first retained customers.",
      successLooksLike: "An observed CAC that can replace the model.",
    };
  }
  if (input.step === "ACQUIRE" || (input.step === "LEARN" && !input.hasObservedCac)) {
    return {
      recommendation: "Acquire first customers through a bounded test.",
      why: "The venture is reachable, but there is not yet a paying cohort.",
      whatInfinityWouldTest: "A small acquisition test, not scaled paid spend.",
      successLooksLike: "A first retained customer and a path to measure CAC.",
    };
  }
  if (input.step === "LAUNCH") {
    return {
      recommendation: "Prepare launch so a real customer can reach the offer.",
      why: "The internal package exists; live demand has not been proven.",
      whatInfinityWouldTest: "Launch checklist plus a bounded first-customer test.",
      successLooksLike: "The venture is reachable by customers and can take payment.",
    };
  }
  if (input.step === "BUILD") {
    return {
      recommendation: "Build the evidenced MVP without expanding scope.",
      why: "Build is already in motion; this view cannot authorize more work.",
      whatInfinityWouldTest: "Whether the MVP still matches the evidenced customer problem.",
      successLooksLike: "A working artifact that can be measured, not a broader product suite.",
    };
  }
  if (!input.hasCustomer) {
    return {
      recommendation: "Define the buyer before treating this as a venture.",
      why: "There is no named customer yet.",
      whatInfinityWouldTest: "Who has the pain and who pays.",
      successLooksLike: "A specific buyer that can be interviewed or sold to.",
    };
  }
  if (!input.hasOffer) {
    return {
      recommendation: "Define and validate the offer.",
      why: "The customer problem may exist, but the chargeable offer is not specified.",
      whatInfinityWouldTest: "Whether the named buyer recognizes the proposed solution as an offer.",
      successLooksLike: "A named product, price path, and promise.",
    };
  }
  if (!input.hasPricing || !input.hasEconomics) {
    return {
      recommendation: "Validate pricing before treating modeled economics as a business case.",
      why: "Thesis and customer exist, but a chargeable price is not reliable yet.",
      whatInfinityWouldTest: "Whether the named customer will pay the proposed price.",
      successLooksLike: "A modeled price, CAC path, and contribution estimate with evidence.",
    };
  }
  if (input.step === "DESIGN") {
    return {
      recommendation: "Turn the qualified offer into a governed MVP build plan.",
      why: "Customer, problem, and modeled economics are present; product architecture is the current gate.",
      whatInfinityWouldTest: "Whether the smallest evidenced differentiator can be built inside Infinity systems.",
      successLooksLike: "An MVP scope that a later build-orchestration milestone can execute.",
    };
  }
  return {
    recommendation: displayOr(
      input.firstValidation,
      `Validate whether ${input.customer} will pay ${input.price} before a full build.`,
    ),
    why: "Modeled economics are not observed sales.",
    whatInfinityWouldTest: `Whether ${input.customer} accept the proposed offer.`,
    successLooksLike: "Willingness to pay and contribution remain viable after a bounded test.",
  };
}

export function performanceFlags(performance: CanonicalPerformanceInput): {
  hasPerformance: boolean;
  hasCustomerLearning: boolean;
  hasObservedCac: boolean;
  underperforming: boolean;
  performingWell: boolean;
  conversionWeak: boolean;
  retentionWeak: boolean;
} {
  const customerAggregates = performance.aggregates.filter((row) => isCustomerLearningMetric(row.metric));
  const customerAssessments = performance.assessments.filter((row) => isCustomerLearningMetric(row.metric));
  const hasCustomerLearning =
    customerAggregates.length > 0 ||
    customerAssessments.some((row) => row.actualValue != null) ||
    performance.learningDecisions.length > 0;
  const hasPerformance =
    hasCustomerLearning ||
    performance.aggregates.some((row) => !isTechnicalExecutionMetric(row.metric) && Number.isFinite(row.value));
  const below = customerAssessments.filter((row) => row.status === "below_plan");
  const aboveOrOn = customerAssessments.filter((row) => row.status === "above_plan" || row.status === "on_plan");
  const conversion = customerAssessments.find((row) => row.metric.includes("conversion"));
  const retention = customerAssessments.find((row) => row.metric.includes("retention"));
  return {
    hasPerformance,
    hasCustomerLearning,
    hasObservedCac: [...customerAggregates, ...customerAssessments].some((row) => /cac/i.test(row.metric)),
    underperforming: below.length > 0 && below.length >= aboveOrOn.length,
    performingWell: aboveOrOn.length > 0 && below.length === 0,
    conversionWeak: conversion?.status === "below_plan",
    retentionWeak: retention?.status === "below_plan",
  };
}

export function firstSentence(text: string, fallback: string): string {
  const trimmed = firstUseful([text], fallback);
  if (trimmed === fallback) return fallback;
  const match = trimmed.match(/^(.+?[.!?])(?:\s|$)/);
  return match?.[1] ?? trimmed.slice(0, 180);
}

export function missingAtStage(step: ZeroToProductionStep, kind: "actual" | "estimate"): string {
  if (kind === "actual" && (step === "IDEA" || step === "VALIDATE" || step === "DESIGN" || step === "BUILD")) {
    return MISSING_COPY.notApplicable;
  }
  return kind === "actual" ? MISSING_COPY.notMeasured : MISSING_COPY.noEstimate;
}
