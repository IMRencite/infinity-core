import type { FounderIntelligenceFrontView } from "@/lib/infinity/founder-idea-lab/explainability/view";
import type { VentureIntelligenceView } from "../types";
import { VENTURE_INTELLIGENCE_AUTHORITY, VENTURE_SOURCE_BADGES } from "../types";
import { MISSING_COPY, displayOr, firstUseful, usefulList } from "../missing-data";
import { currentPositionView } from "../lifecycle";
import type { ZeroToProductionStep } from "@/lib/infinity/founder-idea-lab/build-plan/types";

function stepFromDeck(position: string): ZeroToProductionStep {
  if (/pricing validation|validat/i.test(position)) return "VALIDATE";
  if (/architecture|design/i.test(position)) return "DESIGN";
  if (/build/i.test(position)) return "BUILD";
  if (/launch/i.test(position)) return "LAUNCH";
  return "IDEA";
}

function metricFromDeck(
  view: FounderIntelligenceFrontView,
  id: string,
  label: string,
  fallback: string,
) {
  const found = view.commandDeck?.metrics.find((item) => item.id === id);
  const display = displayOr(found?.value, fallback);
  return {
    id,
    label: found?.label ?? label,
    display,
    origin: "MODELED" as const,
    confidence: found?.confidence === "Strong" || found?.confidence === "Moderate" ? found.confidence : ("Weak" as const),
    actualDisplay: MISSING_COPY.notApplicable,
    expectedDisplay: display,
    varianceDisplay: null,
    help: found?.help,
    provenance: {
      field: id,
      sourceType: "founder_idea_educated_estimates",
      sourceId: null,
      note: "Founder modeled estimate. Not observed operating data.",
    },
  };
}

export function fromFounderIdea(input: {
  view: FounderIntelligenceFrontView;
  founderIdeaId?: string | null;
  title?: string | null;
  submittedDescription?: string | null;
}): VentureIntelligenceView {
  const view = input.view;
  const deck = view.commandDeck;
  const plan = view.buildPlan;
  if (!deck || !plan) {
    throw new Error("FOUNDER_COMMAND_DECK_MISSING");
  }
  const name = firstUseful([input.title, deck.identity.name], "This venture");
  const step = stepFromDeck(deck.currentPosition);
  const position = currentPositionView(step);
  const businessCaseLabel = (
    [
      "Looks promising",
      "Worth validating",
      "Needs more evidence",
      "Economics are weak",
      "Performing well",
      "Underperforming expectations",
    ] as const
  ).find((item) => deck.businessCase.toLowerCase().includes(item.toLowerCase().split(" ")[0]!))
    ?? (deck.businessCase.toLowerCase().includes("weak")
      ? "Economics are weak"
      : deck.businessCase.toLowerCase().includes("evidence")
        ? "Needs more evidence"
        : "Looks promising");

  return {
    identity: {
      ventureId: input.founderIdeaId ?? "founder-idea",
      name,
      concept: deck.identity.concept,
      originEntityType: "founder_idea",
      originEntityId: input.founderIdeaId ?? null,
    },
    thesis: {
      thesis: deck.thesis,
      whyThisCouldBeABusiness: deck.whyThisCouldBeABusiness,
      whyThisCouldWin: view.productAdvantage?.summary.whyThisCouldWin ?? deck.biggestAdvantage,
    },
    customer: { targetCustomer: deck.identity.customer },
    problem: { coreProblem: deck.identity.problem, primaryPain: deck.primaryPain },
    solution: { solution: deck.identity.solution, howInfinityWouldSolve: deck.howInfinityWouldSolve },
    businessModel: { summary: deck.identity.businessModel },
    businessCase: { label: businessCaseLabel, reason: deck.whyThisCouldBeABusiness },
    economics: {
      monthlyRevenuePerCustomer: metricFromDeck(view, "core", "Monthly revenue / customer", MISSING_COPY.noEstimate),
      contributionProfitPerCustomer: metricFromDeck(view, "contribution", "Contribution profit / customer", MISSING_COPY.noEstimate),
      cac: metricFromDeck(view, "cac", "CAC", MISSING_COPY.noEstimate),
      lifetime: metricFromDeck(view, "lifetime", "Customer lifetime", MISSING_COPY.noEstimate),
      ltv: metricFromDeck(view, "ltv", "LTV", MISSING_COPY.noEstimate),
      ltvCac: metricFromDeck(view, "ltv-cac", "LTV/CAC", MISSING_COPY.noEstimate),
      payback: metricFromDeck(view, "payback", "Payback", MISSING_COPY.noEstimate),
      firstYearRevenuePerCustomer: metricFromDeck(view, "first-year", "First-year revenue / customer", MISSING_COPY.noEstimate),
      firstYearContribution: {
        id: "first-year-contribution",
        label: "First-year contribution",
        display: displayOr(deck.profit.firstYearContribution, MISSING_COPY.noEstimate),
        origin: "MODELED",
        confidence: "Weak",
        actualDisplay: MISSING_COPY.notApplicable,
        expectedDisplay: displayOr(deck.profit.firstYearContribution, MISSING_COPY.noEstimate),
        varianceDisplay: null,
        provenance: {
          field: "first-year-contribution",
          sourceType: "founder_idea_educated_estimates",
          sourceId: null,
          note: "Founder modeled estimate.",
        },
      },
      lifetimeContribution: {
        id: "lifetime-contribution",
        label: "Lifetime contribution",
        display: displayOr(deck.profit.lifetimeContribution, MISSING_COPY.noEstimate),
        origin: "MODELED",
        confidence: "Weak",
        actualDisplay: MISSING_COPY.notApplicable,
        expectedDisplay: displayOr(deck.profit.lifetimeContribution, MISSING_COPY.noEstimate),
        varianceDisplay: null,
        provenance: {
          field: "lifetime-contribution",
          sourceType: "founder_idea_educated_estimates",
          sourceId: null,
          note: "Founder modeled estimate.",
        },
      },
      conversion: {
        id: "conversion",
        label: "Conversion",
        display: MISSING_COPY.notApplicable,
        origin: "MISSING",
        confidence: "Insufficient",
        actualDisplay: MISSING_COPY.notApplicable,
        expectedDisplay: MISSING_COPY.noEstimate,
        varianceDisplay: null,
        provenance: {
          field: "conversion",
          sourceType: "founder_idea",
          sourceId: input.founderIdeaId ?? null,
          note: "No live conversion data on a Founder Idea.",
        },
      },
      retention: {
        id: "retention",
        label: "Retention",
        display: MISSING_COPY.notApplicable,
        origin: "MISSING",
        confidence: "Insufficient",
        actualDisplay: MISSING_COPY.notApplicable,
        expectedDisplay: MISSING_COPY.noEstimate,
        varianceDisplay: null,
        provenance: {
          field: "retention",
          sourceType: "founder_idea",
          sourceId: input.founderIdeaId ?? null,
          note: "No live retention data on a Founder Idea.",
        },
      },
      margin: {
        id: "margin",
        label: "Margin",
        display: MISSING_COPY.noEstimate,
        origin: "MISSING",
        confidence: "Insufficient",
        actualDisplay: MISSING_COPY.notApplicable,
        expectedDisplay: MISSING_COPY.noEstimate,
        varianceDisplay: null,
        provenance: {
          field: "margin",
          sourceType: "founder_idea_educated_estimates",
          sourceId: null,
          note: "Margin remains modeled inside educated estimates; not a live actual.",
        },
      },
      economicConfidence: deck.economicConfidence,
      evidenceStrength: "Modeled estimates from Founder Idea research. Not observed operating data.",
      prefersActuals: true,
    },
    marketAdvantage: {
      primaryCustomerPain: deck.primaryPain,
      biggestMarketWeakness: view.ventureBrief?.advantage.biggestCompetitorWeakness ?? deck.biggestRisk,
      strongestDifferentiator: deck.biggestAdvantage,
      whatInfinityCouldDoBetter: deck.howInfinityWouldSolve,
      whyThisCouldWin: view.productAdvantage?.summary.whyThisCouldWin ?? deck.biggestAdvantage,
      marketEdge: deck.marketEdge,
    },
    customerProblems: {
      problems: usefulList([
        ...(view.productAdvantage?.summary.biggestPains ?? []),
        deck.primaryPain,
        input.submittedDescription,
      ]),
      productAdvantages: usefulList([
        ...(view.productAdvantage?.differentiators ?? []).map((item) => item.idea),
        deck.biggestAdvantage,
      ]),
      liveComplaints: [],
    },
    productAdvantages: usefulList([
      ...(view.productAdvantage?.differentiators ?? []).map((item) => item.idea),
      deck.biggestAdvantage,
    ]),
    systemRequirements: deck.requiredSystems,
    capabilityCoverage: {
      alreadyAvailable: deck.alreadyAvailable,
      productSpecificWork: deck.productSpecificWork,
      infinityOsNote:
        "Already available means Infinity OS has the internal system to help build this venture. It does not mean the customer-facing product already has that feature.",
      coverageSummary: deck.coverageSummary,
    },
    buildPlan: {
      ...plan,
      heading: "How Infinity Could Build This",
    },
    currentPosition: { ...position, label: deck.currentPosition },
    nextMove: deck.nextMove,
    risks: {
      biggest: deck.biggestRisk,
      economic: view.ventureBrief?.advantage.biggestRisk ?? deck.biggestRisk,
      product: firstUseful(view.productAdvantage?.summary.biggestPains ?? [], MISSING_COPY.noEstimate),
      market: firstUseful([view.ventureBrief?.advantage.biggestCompetitorWeakness], MISSING_COPY.noEstimate),
      operational: MISSING_COPY.notApplicable,
    },
    evidence: {
      summary: usefulList(view.evidenceSummary.map((item) => `${item.dimension}: ${item.summary}`)),
      missing: view.missingEconomicEvidence,
    },
    sourceContext: {
      id: "FOUNDER_IDEA",
      badge: VENTURE_SOURCE_BADGES.FOUNDER_IDEA,
      founderIdeaId: input.founderIdeaId ?? null,
      opportunityCandidateId: null,
      ventureAssemblyId: null,
    },
    performance: {
      available: false,
      actualMetrics: [],
      expectedVsActual: [],
      whatIsActuallyHappening: [],
      learning: [],
    },
    commandDeck: {
      ...deck,
      identity: { ...deck.identity, name },
    },
    buildReadiness: deck.buildReadiness,
    buildReadinessReason: deck.buildReadinessReason,
    buildReadinessReasonLabel: "Why not ready to build",
    grantsBuild: false,
    authority: VENTURE_INTELLIGENCE_AUTHORITY,
    provenance: [
      {
        field: "commandDeck",
        sourceType: "founder_idea_intelligence",
        sourceId: input.founderIdeaId ?? null,
        note: "Founder Idea is one source of the canonical view, not the data model.",
      },
    ],
  };
}
