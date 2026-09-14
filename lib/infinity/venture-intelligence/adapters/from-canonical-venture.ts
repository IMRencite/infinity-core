import type { CanonicalVentureAdapterInput, VentureIntelligenceView, VentureMarketAdvantageView } from "../types";
import { VENTURE_INTELLIGENCE_AUTHORITY } from "../types";
import { firstUseful, MISSING_COPY, usefulList } from "../missing-data";

function isFallbackVentureName(name: string): boolean {
  return /^venture\s+[0-9a-f-]{8}/i.test(name) || /^[0-9a-f]{8}$/i.test(name);
}
import { packageValue } from "../json";
import {
  businessCaseFrom,
  buildReadinessFor,
  currentPositionView,
  isBuiltVenture,
  isLiveVenture,
  mapLifecycleStep,
  nextMoveFrom,
  performanceFlags,
  resolveSourceContext,
  sourceBadge,
} from "../lifecycle";
import { actualMetricLabels, composeEconomics, hasEconomics, promisingEconomics, weakEconomics } from "../economics";
import { presentCanonicalCommandDeck, wrapBuildPlan } from "../present-command-deck";
import { buildAutonomousProductAdvantage, hasProductAdvantageEvidence } from "../engines";
import { assessCanonicalSystemReadiness } from "../system-readiness";
import { candidateMarketCopy } from "./from-opportunity-candidate";
import { happeningFrom, learningFrom } from "./from-performance-intelligence";

export function fromCanonicalVenture(input: CanonicalVentureAdapterInput): VentureIntelligenceView {
  const live = isLiveVenture(input);
  const built = isBuiltVenture(input);
  const building = Boolean(input.buildId) && !live;
  const validated =
    String(input.readinessStatus ?? "").includes("ready") || String(input.assemblyStatus ?? "").includes("ready");
  const candidate = input.candidate;
  const market = candidateMarketCopy(candidate);
  const customer = firstUseful(
    [
      candidate?.targetCustomer,
      packageValue(input.businessModelPackage, "customer", "targetAudience"),
      packageValue(input.identityPackage, "targetAudience", "targetCustomer"),
    ],
    "Not named yet",
  );
  const problem = firstUseful(
    [
      candidate?.problem,
      packageValue(input.businessModelPackage, "problem", "primaryProblem"),
      packageValue(input.identityPackage, "primaryProblem", "ventureDescription"),
      candidate?.summary,
    ],
    "Not evidenced yet",
  );
  const solution = firstUseful(
    [
      candidate?.summary,
      packageValue(input.businessModelPackage, "solution"),
      packageValue(input.identityPackage, "primaryPromise", "positioning"),
      input.monetizationPlan?.valueProposition,
    ],
    "Not evidenced yet",
  );
  const businessModel = firstUseful(
    [
      input.monetizationPlan?.pricingModel,
      input.monetizationPlan?.modelName,
      input.assemblyEconomics?.pricingHypothesis,
      candidate?.businessModelCandidates[0],
      packageValue(input.businessModelPackage, "revenueModel"),
      packageValue(input.monetizationPackage, "revenueMechanism"),
    ],
    "Not specified yet",
  );
  const concept = firstUseful(
    [candidate?.summary, packageValue(input.identityPackage, "positioning", "ventureDescription"), solution],
    `${solution} for ${customer}`,
  );
  const name = firstUseful(
    [
      packageValue(input.identityPackage, "workingName", "displayName", "name"),
      candidate?.title,
      isFallbackVentureName(input.name) ? null : input.name,
    ],
    input.name || "This venture",
  );

  const productAdvantage = candidate && hasProductAdvantageEvidence(candidate) ? buildAutonomousProductAdvantage(candidate) : { insufficient: true, view: null };
  const advantageView = productAdvantage.view;
  const advantage: VentureMarketAdvantageView = {
    primaryCustomerPain: firstUseful(
      [advantageView?.summary.biggestPains[0], market.pain, problem],
      "Not evidenced yet",
    ),
    biggestMarketWeakness: firstUseful(
      [advantageView?.summary.biggestThingToAvoid, market.weakness, candidate?.competitionEvidence[0]],
      "Not evidenced yet",
    ),
    strongestDifferentiator: firstUseful(
      [advantageView?.summary.strongestDifferentiator, market.differentiator],
      "Not evidenced yet",
    ),
    whatInfinityCouldDoBetter: firstUseful(
      [advantageView?.summary.whatInfinityShouldDoDifferently, market.better],
      "Not evidenced yet",
    ),
    whyThisCouldWin: firstUseful(
      [advantageView?.summary.whyThisCouldWin],
      "Not enough evidence to say why this could win yet.",
    ),
    marketEdge:
      market.pain || market.weakness
        ? [
            {
              dimension: "Customer problem",
              marketToday: firstUseful([market.weakness], "Current options are not fully evidenced."),
              infinityOpportunity: firstUseful(
                [advantageView?.summary.whatInfinityShouldDoDifferently, market.better],
                "Infinity would need more evidence to name the edge.",
              ),
              evidence: firstUseful(candidate?.demandEvidence ?? [], "Persisted opportunity evidence"),
            },
          ]
        : [],
  };

  const flags = performanceFlags(input.performance);
  let step = mapLifecycleStep({
    live,
    building,
    built,
    hasPerformance: flags.hasPerformance,
    hasCustomerLearning: flags.hasCustomerLearning,
    hasEconomics: Boolean(
      input.monetizationPlan?.estimatedCAC != null ||
        input.monetizationPlan?.estimatedLTV != null ||
        input.monetizationPlan?.estimatedRevenuePerCustomer != null,
    ),
    hasResearch: Boolean(
      candidate?.demandEvidence.length ||
        candidate?.marketEvidence.length ||
        candidate?.competitionEvidence.length ||
        (input.researchRuns?.length ?? 0) > 0,
    ),
    underperforming: flags.underperforming,
    performingWell: flags.performingWell,
  });
  const selectionDecision = String(input.selection?.decision ?? "").toUpperCase();
  if (!live && !building && !built && (selectionDecision === "VALIDATE" || selectionDecision === "HOLD")) {
    step = "VALIDATE";
  }
  const { economics, expectedVsActual } = composeEconomics({
    plan: input.monetizationPlan,
    performance: input.performance,
    step,
    sourceId: input.ventureId,
  });
  const economicsKnown = hasEconomics(economics);
  const position = currentPositionView(step);
  const readiness = buildReadinessFor({
    step,
    live,
    building,
    built,
    hasEconomics: economicsKnown,
  });
  const businessCase = businessCaseFrom({
    hasEconomics: economicsKnown,
    weakEconomics: weakEconomics(economics),
    promising: promisingEconomics(economics),
    performingWell: flags.performingWell,
    underperforming: flags.underperforming,
  });
  const platform = assessCanonicalSystemReadiness({
    hasCandidate: Boolean(candidate),
    hasResearch: Boolean(candidate?.demandEvidence.length || candidate?.competitionEvidence.length || input.researchRuns?.length),
    hasMonetization: economicsKnown || Boolean(input.monetizationPlan?.modelName || input.assemblyEconomics?.pricingHypothesis),
    hasAdvantage: !productAdvantage.insufficient,
    built,
    live,
    hasCustomerLearning: flags.hasCustomerLearning,
  });
  const plan = wrapBuildPlan({
    step,
    customer,
    problem,
    solution,
    businessModel,
    recommendedModel: businessModel,
    hasEstimates: economicsKnown,
    advantage: advantageView,
    platform,
  });
  const namedCustomer = customer !== "Not named yet";
  const namedOffer =
    solution !== "Not evidenced yet" && businessModel !== "Not specified yet";
  const nextMove = nextMoveFrom({
    step,
    customer,
    price: economics.monthlyRevenuePerCustomer.display,
    hasCustomer: namedCustomer,
    hasOffer: namedOffer,
    hasPricing: Boolean(input.monetizationPlan?.estimatedPriceBase != null || input.monetizationPlan?.pricingModel || input.assemblyEconomics?.pricingHypothesis),
    hasEconomics: economicsKnown,
    hasObservedCac: flags.hasObservedCac,
    underperforming: flags.underperforming,
    conversionWeak: flags.conversionWeak,
    retentionWeak: flags.retentionWeak,
    firstValidation: plan.firstValidation,
  });
  const sourceId = resolveSourceContext({
    origin: input.origin,
    live,
    built,
    validated,
    hasCandidate: Boolean(candidate),
  });
  const thesis = [
    `Demand exists because ${problem.replace(/\.$/, "")}.`,
    advantage.biggestMarketWeakness !== "Not evidenced yet"
      ? `Current options are weak: ${advantage.biggestMarketWeakness.replace(/\.$/, "")}.`
      : "Market alternatives are not fully evidenced yet.",
    `Infinity's product advantage is ${advantage.strongestDifferentiator.replace(/\.$/, "")}.`,
  ].join(" ");
  const whyBusiness = [
    `People pay to fix ${problem.replace(/\.$/, "").toLowerCase()}.`,
    economicsKnown
      ? `Modeled contribution is ${economics.contributionProfitPerCustomer.display}/customer after variable delivery costs — not company net profit.`
      : "A chargeable model is not reliable yet.",
    live
      ? "Live operating data is preferred over estimates wherever it exists."
      : "These are modeled estimates until customers pay.",
  ].join(" ");
  const biggestRisk = firstUseful(
    [
      candidate?.risks[0],
      input.monetizationPlan?.risks[0],
      input.assemblyEconomics?.majorRisks[0],
      input.selection?.risk,
      flags.underperforming ? "Live results are below the modeled plan." : null,
      "Unit economics are still unproven.",
    ],
    "Unit economics are still unproven.",
  );
  const commandDeck = presentCanonicalCommandDeck({
    name,
    concept,
    customer,
    problem,
    solution,
    businessModel,
    thesis,
    whyThisCouldBeABusiness: whyBusiness,
    businessCase: businessCase.label,
    buildReadiness: readiness.label,
    buildReadinessReason: nextMove.why,
    economics,
    advantage,
    plan,
    nextMove,
    currentPosition: position.label,
    biggestRisk,
  });
  if (flags.hasPerformance) {
    const extra = input.performance.aggregates
      .filter((row) => ["execution_success_rate", "provider_cost", "build_cost", "sessions", "gross_revenue"].includes(row.metric))
      .map((row) => ({
        id: row.metric,
        label: row.metric.replace(/_/g, " "),
        value: `${row.value}${row.unit ? ` ${row.unit}` : ""}`,
        confidence: "Moderate" as const,
        help: "Observed Performance Intelligence aggregate.",
      }));
    if (extra.length) {
      commandDeck.metrics = [...commandDeck.metrics, ...extra.filter((item, index, all) => all.findIndex((row) => row.id === item.id) === index)];
    }
  }
  const happening = happeningFrom(input.performance);
  const learning = learningFrom(input.performance);
  const liveComplaints = usefulList(input.performance.diagnoses);

  return {
    identity: {
      ventureId: input.ventureId,
      name,
      concept,
      originEntityType: "venture_assembly",
      originEntityId: input.ventureId,
    },
    thesis: {
      thesis,
      whyThisCouldBeABusiness: whyBusiness,
      whyThisCouldWin: advantage.whyThisCouldWin,
    },
    customer: { targetCustomer: customer },
    problem: { coreProblem: problem, primaryPain: advantage.primaryCustomerPain },
    solution: { solution, howInfinityWouldSolve: advantage.whatInfinityCouldDoBetter },
    businessModel: { summary: businessModel },
    businessCase,
    economics,
    marketAdvantage: advantage,
    customerProblems: {
      problems: usefulList([advantage.primaryCustomerPain, ...market.problems, ...liveComplaints]),
      productAdvantages: usefulList([advantage.strongestDifferentiator, advantage.whatInfinityCouldDoBetter]),
      liveComplaints,
    },
    productAdvantages: usefulList([advantage.strongestDifferentiator, advantage.whatInfinityCouldDoBetter]),
    systemRequirements: plan.requiredSystems,
    capabilityCoverage: {
      alreadyAvailable: plan.alreadyAvailable,
      productSpecificWork: plan.productSpecificWork,
      infinityOsNote:
        "Already available means Infinity OS has the internal system to help build this venture. It does not mean the customer-facing product already has that feature.",
      coverageSummary: platform.platformSummary,
      platformAvailable: platform.platformAvailable,
      platformPartial: platform.platformPartial,
      platformMissing: platform.platformMissing,
      platformTotal: platform.platformTotal,
      ventureReadyCount: platform.rows.filter((row) => row.venture === "VENTURE_READY").length,
      evidenceBlockedCount: platform.rows.filter((row) => row.venture === "VENTURE_EVIDENCE_BLOCKED").length,
    },
    buildPlan: plan,
    currentPosition: position,
    nextMove,
    risks: {
      biggest: biggestRisk,
      economic: flags.underperforming ? "Observed economics are below plan." : firstUseful(input.monetizationPlan?.risks ?? [], MISSING_COPY.noEstimate),
      product: firstUseful(liveComplaints, advantage.primaryCustomerPain),
      market: advantage.biggestMarketWeakness,
      operational: firstUseful(
        input.departmentStates.filter((item) => /fail|block/i.test(item.state)).map((item) => `${item.id}: ${item.state}`),
        live ? "No operational failure recorded." : MISSING_COPY.notApplicable,
      ),
    },
    evidence: {
      summary: usefulList([
        ...(candidate?.demandEvidence ?? []),
        ...(candidate?.marketEvidence ?? []),
        ...(candidate?.monetizationEvidence ?? []),
        ...(candidate?.competitionEvidence ?? []),
        candidate ? `Opportunity candidate ${candidate.id}` : null,
        input.selection?.decision ? `Selection ${input.selection.decision}` : null,
        ...(input.researchRuns ?? []).map((run) => run.summary ?? run.objective ?? run.id),
        input.assemblyEconomics?.pricingHypothesis,
      ]),
      missing: usefulList(candidate?.unknowns ?? []),
    },
    sourceContext: {
      id: sourceId,
      badge: sourceBadge(sourceId),
      founderIdeaId: null,
      opportunityCandidateId:
        input.opportunityCandidateId !== undefined ? input.opportunityCandidateId : candidate?.id ?? null,
      ventureAssemblyId: input.ventureId,
    },
    performance: {
      available: flags.hasPerformance,
      actualMetrics: [
        ...actualMetricLabels(economics),
        ...input.performance.aggregates.map((row) => row.metric),
      ].filter((item, index, all) => all.indexOf(item) === index),
      expectedVsActual: expectedVsActual.filter((row) => row.status !== "insufficient_data"),
      whatIsActuallyHappening: happening,
      learning,
    },
    commandDeck,
    buildReadiness: readiness.label,
    buildReadinessReason: nextMove.why,
    buildReadinessReasonLabel: readiness.reasonLabel,
    grantsBuild: false,
    authority: VENTURE_INTELLIGENCE_AUTHORITY,
    provenance: [
      {
        field: "identity",
        sourceType: "venture_assembly",
        sourceId: input.ventureId,
        note: "Canonical venture identity. No duplicate venture table.",
      },
      {
        field: "economics",
        sourceType: economics.cac.origin === "OBSERVED" ? "performance_intelligence" : "monetization_plan",
        sourceId: input.ventureId,
        note: "Observed / live wins for actual display. Modeled remains expected.",
      },
      {
        field: "candidate",
        sourceType: "opportunity_candidate",
        sourceId: candidate?.id ?? null,
        note: candidate ? "Opportunity candidate evidence." : "No opportunity candidate linked.",
      },
    ],
  };
}

export function fromPortfolioVenture(input: CanonicalVentureAdapterInput): VentureIntelligenceView {
  return fromCanonicalVenture(input);
}
