import type { VentureEconomicMetricView, VentureEconomicsView, VentureIntelligenceView } from "@/lib/infinity/venture-intelligence/types";
import { metricCardsFrom } from "@/lib/infinity/venture-intelligence/economics";
import type { ClassifiedValue, VentureEconomicsIntelligenceRecord } from "@/lib/infinity/venture-economics/types";
import { CRE_PRIMARY_OFFER } from "@/lib/infinity/venture-operating-scale/constants";
import {
  ASKREVIEW_INSPECTION_LIFECYCLE,
  ASKREVIEW_PRODUCTION_STATE,
  CANONICAL_ECONOMICS_UNAVAILABLE,
  GENERIC_NO_RELIABLE_ESTIMATE,
  OCCUPANCYNPV_INSPECTION_TITLE,
  PROJECTION_ERROR,
  type CanonicalEconomicsOverlayInput,
  type PartialEconomicsPresentation,
  PARTIAL_ECONOMICS_PRESENTATION_CONTRACT,
} from "./types";
import { isAskReviewIdentity, isOccupancynpvIdentity } from "./aliases";

function originFromClassification(value: ClassifiedValue): VentureEconomicMetricView["origin"] {
  if (value.classification === "OBSERVED") return "OBSERVED";
  if (value.classification === "UNKNOWN") return "MISSING";
  return "MODELED";
}

function overlayMetric(metric: VentureEconomicMetricView, value: ClassifiedValue): VentureEconomicMetricView {
  return {
    ...metric,
    display: value.display,
    expectedDisplay: value.display,
    origin: originFromClassification(value),
    help: value.note,
    provenance: {
      ...metric.provenance,
      sourceType: "VentureEconomicsIntelligenceContract",
      note: value.note,
    },
  };
}

function isGenericUnknown(value: string | null | undefined): boolean {
  if (!value) return true;
  return (
    value === GENERIC_NO_RELIABLE_ESTIMATE ||
    /^not (evidenced|named|specified) yet$/i.test(value) ||
    /^not yet promoted/i.test(value)
  );
}

export function presentPartialEconomics(input: {
  economics: VentureEconomicsIntelligenceRecord | null;
  renderedCac?: string | null;
  renderedLtv?: string | null;
  renderedPrice?: string | null;
  renderedMonetization?: string | null;
}): PartialEconomicsPresentation {
  const economics = input.economics;
  const knownPricing = Boolean(economics?.unit_economics.price.display && economics.unit_economics.price.classification !== "UNKNOWN");
  const knownMonetization = Boolean(economics?.recommended_monetization_model);
  const renderedAllGeneric =
    isGenericUnknown(input.renderedCac) &&
    isGenericUnknown(input.renderedLtv) &&
    isGenericUnknown(input.renderedPrice) &&
    isGenericUnknown(input.renderedMonetization);
  return {
    contract: PARTIAL_ECONOMICS_PRESENTATION_CONTRACT,
    knownPricingVisible: knownPricing && !isGenericUnknown(input.renderedPrice ?? economics?.unit_economics.price.display),
    knownMonetizationVisible:
      knownMonetization && !isGenericUnknown(input.renderedMonetization ?? economics?.recommended_monetization_model),
    unknownCacPreserved: Boolean(input.renderedCac?.includes("UNKNOWN") || economics?.customer_acquisition_model.classification === "UNKNOWN"),
    unknownLtvPreserved: Boolean(input.renderedLtv?.includes("UNKNOWN") || economics?.lifetime_value_model.classification === "UNKNOWN"),
    collapsedToGenericUnknown: Boolean(economics?.research_ran && renderedAllGeneric),
  };
}

export function overlayCanonicalEconomicsOnIntelligence(
  view: VentureIntelligenceView,
  input: CanonicalEconomicsOverlayInput,
): VentureIntelligenceView {
  const economics = input.economics;
  if (!economics) {
    if (input.expectedCanonical) {
      return {
        ...view,
        commandDeck: {
          ...view.commandDeck,
          currentPosition: `${PROJECTION_ERROR} — ${CANONICAL_ECONOMICS_UNAVAILABLE}`,
        },
        currentPosition: {
          ...view.currentPosition,
          label: `${PROJECTION_ERROR} — ${CANONICAL_ECONOMICS_UNAVAILABLE}`,
        },
      };
    }
    return view;
  }

  const launched = input.lifecycle === "PUBLICLY_LAUNCHED";
  const askReview = isAskReviewIdentity(economics.venture_id) || isAskReviewIdentity(view.identity.ventureId);
  const occupancy = isOccupancynpvIdentity(economics.venture_id) || isOccupancynpvIdentity(view.identity.ventureId);
  const customer = economics.customer_segment;
  const problem = economics.primary_job_to_be_done;
  const solution = occupancy ? CRE_PRIMARY_OFFER : economics.primary_job_to_be_done;
  const businessModel = economics.recommended_monetization_model;
  const concept = occupancy ? OCCUPANCYNPV_INSPECTION_TITLE : input.productTitle || view.identity.concept;
  const lifecycleLabel = askReview
    ? `${ASKREVIEW_INSPECTION_LIFECYCLE} — ${ASKREVIEW_PRODUCTION_STATE}`
    : launched
      ? "PUBLICLY_LAUNCHED"
      : input.lifecycle ?? view.currentPosition.label;

  const economicConfidence: VentureEconomicsView["economicConfidence"] =
    economics.confidence.overall === "HIGH" ? "Strong" : economics.confidence.overall === "MEDIUM" ? "Moderate" : "Weak";
  const economicsView: VentureEconomicsView = {
    ...view.economics,
    monthlyRevenuePerCustomer: overlayMetric(view.economics.monthlyRevenuePerCustomer, economics.unit_economics.revenue_per_customer),
    contributionProfitPerCustomer: overlayMetric(
      view.economics.contributionProfitPerCustomer,
      economics.unit_economics.contribution_profit,
    ),
    cac: overlayMetric(view.economics.cac, economics.customer_acquisition_model),
    ltv: overlayMetric(view.economics.ltv, economics.lifetime_value_model),
    ltvCac: overlayMetric(view.economics.ltvCac, economics.ltv_cac_ratio),
    payback: overlayMetric(view.economics.payback, economics.payback_period),
    firstYearRevenuePerCustomer: overlayMetric(
      view.economics.firstYearRevenuePerCustomer,
      economics.unit_economics.revenue_per_customer,
    ),
    firstYearContribution: overlayMetric(view.economics.firstYearContribution, economics.contribution_margin_model),
    lifetimeContribution: overlayMetric(view.economics.lifetimeContribution, economics.lifetime_value_model),
    margin: overlayMetric(view.economics.margin, economics.unit_economics.gross_margin),
    economicConfidence,
    evidenceStrength: `${economics.confidence.overall} overall · competitor/pricing ${economics.confidence.dimensions.competitor_evidence}/${economics.confidence.dimensions.pricing_evidence} · CAC/retention ${economics.confidence.dimensions.cac_evidence}/${economics.confidence.dimensions.retention_evidence}`,
  };

  const commandDeckMetrics = metricCardsFrom(economicsView).map((item) => ({
    id: item.id,
    label: item.label,
    value: item.value,
    confidence: item.confidence,
    help: item.help,
  }));

  const evidence = [
    ...economics.evidence.map((item) => item.label),
    ...economics.competitors.map((item) => `${item.name} · ${item.observed_pricing.display}`),
    ...economics.substitutes.map((item) => `${item.name} · substitute`),
  ];

  return {
    ...view,
    identity: {
      ...view.identity,
      name: economics.venture_name || view.identity.name,
      concept,
    },
    customer: { targetCustomer: customer },
    problem: { coreProblem: problem, primaryPain: problem },
    solution: { solution, howInfinityWouldSolve: economics.recommended_pricing_hypothesis },
    businessModel: { summary: businessModel },
    economics: economicsView,
    currentPosition: {
      ...view.currentPosition,
      label: lifecycleLabel,
      step: launched ? "ACQUIRE" : askReview ? "VALIDATE" : view.currentPosition.step,
    },
    commandDeck: {
      ...view.commandDeck,
      identity: {
        name: economics.venture_name || view.commandDeck.identity.name,
        concept,
        customer,
        problem,
        solution,
        businessModel,
      },
      currentPosition: lifecycleLabel,
      metrics: commandDeckMetrics,
      profit: {
        monthlyContribution: economics.unit_economics.contribution_margin.display,
        firstYearContribution: economics.unit_economics.revenue_per_customer.display,
        lifetimeContribution: economics.lifetime_value_model.display,
      },
      economicConfidence: economicsView.economicConfidence,
      buildReadiness: launched ? "Deployed" : askReview ? "Production paused" : view.commandDeck.buildReadiness,
    },
    evidence: {
      summary: evidence,
      missing: economics.economic_unknowns,
    },
    risks: {
      ...view.risks,
      economic: economics.economic_risks[0] ?? view.risks.economic,
      biggest: economics.economic_risks[0] ?? view.risks.biggest,
    },
    buildReadiness: launched ? "Deployed" : askReview ? "Production paused" : view.buildReadiness,
    thesis: {
      ...view.thesis,
      thesis: `${problem}. ${businessModel}.`,
      whyThisCouldBeABusiness: economics.recommended_pricing_hypothesis,
    },
  };
}

export function intelligenceShowsGenericFallback(view: Pick<VentureIntelligenceView, "customer" | "problem" | "solution" | "businessModel" | "economics" | "currentPosition">): boolean {
  return (
    isGenericUnknown(view.customer.targetCustomer) &&
    isGenericUnknown(view.problem.coreProblem) &&
    isGenericUnknown(view.solution.solution) &&
    isGenericUnknown(view.businessModel.summary) &&
    (isGenericUnknown(view.economics.cac.display) || view.economics.cac.display === GENERIC_NO_RELIABLE_ESTIMATE)
  );
}
