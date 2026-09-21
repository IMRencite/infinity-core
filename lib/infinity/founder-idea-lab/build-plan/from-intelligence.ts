import type { EducatedEconomicsModel } from "../educated-estimates/types";
import { capabilityStatusLabel } from "../product-advantage/language";
import type { CapabilityStatus, FounderProductAdvantageView } from "../product-advantage/types";
import {
  BUILD_PLAN_AUTHORITY,
  type BuildPlanReadiness,
  type CanonicalInfinitySystem,
  type FounderBuildPlanPhase,
  type FounderVentureBuildPlan,
  type SuggestedSequenceItem,
  ZERO_TO_PRODUCTION_STEPS,
} from "./types";
import { deriveRequiredSystems, nextThreePhases, systemCoverageSummary } from "./coverage";

function readinessLabel(value: BuildPlanReadiness): string {
  if (value === "READY_NOW") return "Ready now";
  if (value === "ALREADY_BUILT") return "Already available";
  if (value === "PARTIALLY_AVAILABLE") return "Partially available";
  if (value === "NEEDS_BUILD") return "Needs to be built";
  if (value === "NEEDS_VALIDATION") return "Needs validation first";
  return "Blocked by missing evidence";
}

function phase(
  order: number,
  name: string,
  what: string,
  why: string,
  systems: CanonicalInfinitySystem[],
  readiness: BuildPlanReadiness,
  gate: string,
  output: string,
): FounderBuildPlanPhase {
  return {
    id: `phase-${order}`,
    order,
    name,
    whatInfinityWouldDo: what,
    whyItMatters: why,
    systems,
    readiness,
    readinessLabel: readinessLabel(readiness),
    gate,
    output,
  };
}

function currentPosition(input: {
  buildReady: boolean;
  hasEstimates: boolean;
  hasAdvantage: boolean;
}): string {
  if (input.buildReady) return "Canonical build state is ready";
  if (!input.hasEstimates && !input.hasAdvantage) return "Blocked on product evidence";
  if (!input.hasEstimates) return "Researching economics";
  if (input.hasAdvantage) return "Ready for pricing validation";
  return "Ready for MVP definition";
}

export function buildFounderVentureBuildPlan(input: {
  advantage: FounderProductAdvantageView | null;
  educated: EducatedEconomicsModel;
  buildReady: boolean;
  recommendedModel: string | null;
}): FounderVentureBuildPlan {
  const advantage = input.advantage;
  const improvements = advantage?.recommendedImprovements ?? [];
  const hasEstimates = Boolean(input.educated.coreMonthly || input.educated.cac.selected);
  const hasAdvantage = Boolean(improvements.length);
  const newCount = improvements.filter((item) => item.capabilityStatus === "NEW_OPPORTUNITY").length;
  const plannedCount = improvements.filter((item) => item.capabilityStatus === "ALREADY_PLANNED" || item.capabilityStatus === "ALREADY_BUILT").length;
  const effort = newCount >= 3 && plannedCount === 0 ? "HIGH" : newCount >= 1 ? "MEDIUM" : "LOW";
  const defineReady: BuildPlanReadiness = hasAdvantage ? "READY_NOW" : "BLOCKED_BY_EVIDENCE";
  const econReady: BuildPlanReadiness = hasEstimates ? "NEEDS_VALIDATION" : "BLOCKED_BY_EVIDENCE";
  const buildReadyState: BuildPlanReadiness = input.buildReady ? "READY_NOW" : "NEEDS_VALIDATION";
  const phases: FounderBuildPlanPhase[] = [
    phase(1, "Define the product", "Turn the strongest customer pain and differentiators into the smallest viable product.", "Avoid building a generic CMS.", ["Research / Validation", "Venture Systems Architecture"], defineReady, "A named customer problem and differentiator must be evidenced.", "MVP scope + product requirements"),
    phase(2, "Design systems architecture", "Map the MVP to existing Infinity systems instead of inventing a parallel stack.", "Reuse Company Builder, Product / Asset Builder, and payment architecture.", ["Venture Systems Architecture", "Company Builder", "Product / Asset Builder"], "PARTIALLY_AVAILABLE", "Architecture must stay inside canonical Infinity systems.", "System map + capability gaps"),
    phase(3, "Finalize monetization", "Lock a software-first price, optional managed service, and setup fee as hypotheses to test.", "Pricing must stay testable before acquisition spend.", ["Monetization Engine", "Treasury / Economic Authorization"], econReady, "Validate willingness to pay before expanding tiers.", "Pricing hypothesis + economic checks"),
    phase(4, "Build MVP", "Build only the must-have features that exploit the strongest evidenced pain.", "Modeled economics cannot authorize BUILD.", ["Product / Asset Builder", "Venture Selection"], buildReadyState, "Canonical buildReady remains NO until the decision gate changes.", "Working MVP, not a full CMS suite"),
    phase(5, "Build content / SEO / AEO foundation", "Generate structured service + location architecture from the knowledge base.", "This is the evidenced local-search gap.", ["Organic Growth", "Creative Media", "Product / Asset Builder"], hasAdvantage ? "NEEDS_BUILD" : "BLOCKED_BY_EVIDENCE", "Confirm generated pages cover service + location pairs.", "SEO/AEO page architecture"),
    phase(6, "Add payments", "Attach checkout to the core subscription using existing payment architecture.", "Do not invent a second billing system.", ["Payment Architecture", "Commercialization Control Plane"], "PARTIALLY_AVAILABLE", "A chargeable core SKU must exist.", "Checkout + invoice path"),
    phase(7, "Prepare deployment", "Hand the production artifact to deployment readiness — no live launch yet.", "Deployment is a later gate, not this plan.", ["Production Artifact Handoff", "Deployment Readiness"], "NEEDS_VALIDATION", "Deployment Execution stays locked until authorization.", "Deployable artifact packet"),
    phase(8, "Validate product and pricing", "Test whether similar businesses will pay the modeled core price.", "Estimates are not observed sales.", ["Research / Validation", "Monetization Engine"], "NEEDS_VALIDATION", "Willingness to pay must be measured, not assumed.", "Pricing validation result"),
    phase(9, "Acquire first customers", "Use a small outbound or search test before paid scale.", "Prove CAC before broad acquisition.", ["Organic Growth", "Commercialization Control Plane", "Treasury / Economic Authorization"], "NEEDS_VALIDATION", "Do not scale paid acquisition until payback is evidenced.", "First paying cohort"),
    phase(10, "Measure real economics", "Replace modeled CAC, retention, and contribution margin with observed values.", "Actual data wins over Best Estimate.", ["Performance Intelligence", "Treasury / Economic Authorization"], "NEEDS_VALIDATION", "Observed CAC, logo retention, and contribution must be collected.", "Actual unit-economics readout"),
    phase(11, "Improve / scale", "Expand only after payback and service margin hold.", "Scaling managed services too early hides software value.", ["Performance Intelligence", "Monetization Engine", "Deployment Execution"], "NEEDS_VALIDATION", "Validate service margin before scaling managed work.", "Scale / no-scale recommendation"),
  ];
  const mvpFeatures = improvements.filter((item) => item.prioritySignal === "high").slice(0, 4).map((item) => item.featureCapability);
  const sequence: SuggestedSequenceItem[] = improvements.slice(0, 8).map((item, index) => {
    const status = item.capabilityStatus as CapabilityStatus;
    const sequenceLabel = index === 0 || status === "NEW_OPPORTUNITY" ? "MVP" : status === "PARTIALLY_COVERED" ? "NEXT" : "LATER";
    return {
      sequence: sequenceLabel,
      feature: item.recommendedImprovement,
      capabilityStatus: status,
      capabilityLabel: capabilityStatusLabel(status),
    };
  });
  const position = currentPosition({ buildReady: input.buildReady, hasEstimates, hasAdvantage });
  const pathCurrent = input.buildReady ? "BUILD" : hasEstimates ? "VALIDATE" : "IDEA";
  const requiredSystems = deriveRequiredSystems(phases);
  const coverage = systemCoverageSummary(requiredSystems);
  const productSpecificWork = [
    ...improvements.filter((item) => item.capabilityStatus === "NEW_OPPORTUNITY").map((item) => item.recommendedImprovement),
    ...mvpFeatures,
  ].filter((item, index, all) => item && all.indexOf(item) === index).slice(0, 6);
  return {
    heading: "How Infinity Could Build This",
    summary: "A recommended Zero-to-Production path. It does not create missions, change the roadmap, or authorize BUILD.",
    estimatedPath: "Idea → validate pricing → define MVP → build only evidenced differentiators → measure real economics",
    existingCoverage: plannedCount ? `${plannedCount} planned or existing capabilities can be reused` : "Most required product responses still need to be built or validated",
    newCapabilitiesRequired: newCount ? `${newCount} new product opportunities` : "No new capabilities evidenced beyond the current plan",
    mainDependency: "Willingness-to-pay and contribution-margin validation",
    firstValidation: "Publish a core price and measure whether similar businesses actually pay it",
    effort,
    effortConfidence: hasAdvantage ? "Moderate" : "Weak",
    currentPosition: position,
    path: ZERO_TO_PRODUCTION_STEPS.map((id) => ({
      id,
      complete: ["IDEA"].includes(id) && hasEstimates,
      current: id === pathCurrent,
    })),
    phases,
    mvp: {
      coreProblem: advantage?.summary.biggestPains[0] ?? "Not enough complaint evidence yet.",
      idealCustomer: "Local / SMB operators who need a site that can rank",
      corePromise: advantage?.summary.strongestDifferentiator ?? "Not enough evidence yet",
      mustHaveFeatures: mvpFeatures.length ? mvpFeatures : ["Not enough evidence to name must-have features."],
      differentiators: (advantage?.differentiators ?? []).slice(0, 3).map((item) => item.idea),
      thingsToLeaveOut: [
        ...(advantage?.tableStakes ?? []).slice(0, 3),
        ...(advantage?.doNotCopy ?? []).slice(0, 2),
      ].slice(0, 4),
      validationGoal: advantage?.validationIdeas[0] ?? "Test willingness to pay for self-serve versus managed tiers.",
    },
    sequence,
    economicChecks: [
      "Before broad acquisition: validate CAC",
      "Before scaling managed services: validate service margin",
      "Before adding paid acquisition: prove payback",
      "Before expanding tiers: validate willingness to pay",
    ],
    requiredSystems,
    systemsReady: coverage.systemsReady,
    systemsPartial: coverage.systemsPartial,
    systemsMissing: coverage.systemsMissing,
    systemsBlocked: coverage.systemsBlocked,
    coverageSummary: coverage.coverageSummary,
    nextRequiredSystems: coverage.nextRequiredSystems,
    alreadyAvailable: coverage.alreadyAvailable,
    productSpecificWork: productSpecificWork.length
      ? productSpecificWork
      : ["Not enough evidence to name product-specific build work."],
    next3Phases: nextThreePhases(pathCurrent, phases),
    ifBuiltToday: {
      whatItWouldBuild: advantage?.recommendedImprovements[0]?.recommendedImprovement ?? "A software-first local CMS MVP, not a full agency platform.",
      whoItWouldSellTo: "Local / SMB operators who need rankable service-area sites",
      howItWouldCharge:
        input.recommendedModel && input.recommendedModel !== "UNKNOWN" && !/^[A-Z0-9_]+$/.test(input.recommendedModel)
          ? input.recommendedModel
          : "A monthly core subscription plus optional setup and managed service",
      whatItWouldDoDifferently: advantage?.summary.whatInfinityShouldDoDifferently ?? "Keep software separate from optional managed work.",
      howItWouldAcquire: "A small outbound and search test, not scaled paid spend",
      whatItWouldMeasure: "Actual CAC, logo retention, and contribution after hosting / AI / support costs",
    },
    authority: BUILD_PLAN_AUTHORITY,
    grantsBuild: false,
  };
}

export function buildPlanReadinessLabel(value: BuildPlanReadiness): string {
  return readinessLabel(value);
}
