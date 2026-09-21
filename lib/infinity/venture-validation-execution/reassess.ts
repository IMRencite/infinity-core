import {
  activateAutonomousEducatedEstimates,
  buildAutonomousProductAdvantage,
  hasProductAdvantageEvidence,
  researchAutonomousRevenueModel,
} from "@/lib/infinity/venture-intelligence/engines";
import type { CanonicalCandidateInput, VentureIntelligenceView } from "@/lib/infinity/venture-intelligence/types";
import type {
  BusinessModelChallenge,
  EconomicSnapshot,
  ValidationEvidenceRevision,
  ValidationOutcome,
} from "./types";

export function snapshotFromIntelligence(view: VentureIntelligenceView): EconomicSnapshot {
  return {
    model: view.businessModel.summary,
    pricing: view.economics.monthlyRevenuePerCustomer.display,
    priceBase: null,
    cac: null,
    cacDisplay: view.economics.cac.display,
    actualCac: "UNKNOWN",
    ltv: null,
    ltvDisplay: view.economics.ltv.display,
    ltvCac: null,
    ltvCacDisplay: view.economics.ltvCac.display,
    paybackMonths: null,
    paybackDisplay: view.economics.payback.display,
    marginPercent: null,
    marginDisplay: view.economics.margin.display,
    retention: view.economics.retention.display,
    lifetime: view.economics.lifetime.display,
    confidence: view.economics.economicConfidence,
    provenance: view.economics.cac.origin,
  };
}

export function challengeBusinessModel(input: {
  candidate: CanonicalCandidateInput;
  revenueModel: string;
}): BusinessModelChallenge {
  const text = [input.candidate.summary, input.candidate.problem, input.candidate.demandEvidence.join(" "), input.revenueModel]
    .join(" ")
    .toLowerCase();
  const episodic = /deal|lease|calculator|spreadsheet|per[- ]deal|episodic|transaction/i.test(text);
  const team = /broker|agency|firm|team|boutique/i.test(text);
  return {
    monthlySubscriptionSupported: episodic ? "PARTIAL" : "YES",
    perDealModel: episodic
      ? "Per-deal or per-report pricing is plausible because use is deal-triggered."
      : "No strong episodic-use evidence.",
    teamLicense: team
      ? "A boutique firm/team seat is a plausible alternative to a lone monthly seat."
      : "Team license not evidenced.",
    oneTimeModel: episodic
      ? "A one-time calculator purchase is possible but weaker if reports and updates matter."
      : "One-time purchase is not the evidenced default.",
    recommendedModel: episodic
      ? "annual_or_team_seat_with_optional_per_deal_reports"
      : input.candidate.businessModelCandidates[0] ?? "saas_subscription",
    reason: episodic
      ? "A CRE lease calculator is used when a deal is live, not necessarily every month. Monthly SaaS may still work as a professional seat, but it is not proven."
      : "Usage cadence does not contradict a monthly seat.",
  };
}

export function reviseEconomics(candidate: CanonicalCandidateInput): {
  after: EconomicSnapshot;
  challenge: BusinessModelChallenge;
  evidence: ValidationEvidenceRevision;
  recommendedPricing: string;
  setupFee: string | null;
  streams: string[];
  marginMethod: string;
} {
  const revenue = researchAutonomousRevenueModel(candidate);
  const estimates = activateAutonomousEducatedEstimates(candidate);
  const advantage = buildAutonomousProductAdvantage(candidate);
  const recommendedModel = revenue.recommended.recommendedModel;
  const challenge = challengeBusinessModel({ candidate, revenueModel: recommendedModel });
  const cac = estimates.cac.selected;
  const margin = estimates.margin.selected;
  const price =
    revenue.directAnswer.coreRevenue ||
    revenue.pricingClusters?.recommended ||
    candidate.monetizationEvidence[0] ||
    "Not evidenced";

  return {
    after: {
      model: challenge.recommendedModel,
      pricing: price,
      priceBase: null,
      cac: cac?.bestEstimate.base ?? null,
      cacDisplay: cac?.displayBase ?? "UNKNOWN",
      actualCac: "UNKNOWN",
      ltv: estimates.ltv?.bestEstimate.base ?? null,
      ltvDisplay: estimates.ltv?.displayBase ?? "UNKNOWN",
      ltvCac: estimates.ltvCac?.base ?? null,
      ltvCacDisplay: estimates.ltvCac?.base != null ? String(estimates.ltvCac.base) : "UNKNOWN",
      paybackMonths: estimates.payback?.base ?? null,
      paybackDisplay: estimates.payback?.base != null ? `${estimates.payback.base} months` : "UNKNOWN",
      marginPercent: margin?.bestEstimate.base ?? null,
      marginDisplay: margin?.displayBase ?? "UNKNOWN",
      retention: estimates.retention?.displayBase ?? "UNKNOWN",
      lifetime: estimates.ltv?.displayBase ?? "UNKNOWN",
      confidence: cac?.strength ?? "Weak",
      provenance: cac?.provenance ?? "UNKNOWN",
    },
    challenge,
    evidence: {
      customer: candidate.targetCustomer,
      problem: candidate.problem,
      painEvidence: candidate.demandEvidence.slice(0, 4),
      painConfidence: hasProductAdvantageEvidence(candidate) ? "Moderate" : "Weak",
      competitors: advantage.view?.competitorStrengths.map((row) => row.competitor ?? row.strength).filter(Boolean) ??
        candidate.competitionEvidence.slice(0, 4),
      competitorWeaknesses: advantage.view?.summary.whatCustomersHate
        ? [advantage.view.summary.whatCustomersHate]
        : candidate.competitionEvidence.slice(0, 3),
      competitionConfidence: candidate.competitionEvidence.length ? "Moderate" : "Weak",
      customerProblems: advantage.view?.summary.biggestPains ?? [candidate.problem],
      productResponses: advantage.view?.recommendedImprovements.map((item) => item.recommendedImprovement) ?? [],
      differentiators: advantage.view?.differentiators.map((item) => item.idea) ?? [],
      advantageStrength: advantage.insufficient ? "Insufficient" : advantage.view?.summary.evidenceStrength ?? "Moderate",
    },
    recommendedPricing: price,
    setupFee: estimates.setup?.displayBase ?? null,
    streams: [challenge.perDealModel, challenge.teamLicense].filter((item) => !/not evidenced|not the evidenced/i.test(item)),
    marginMethod: margin?.formula ?? "component_model",
  };
}

export function decideValidationOutcome(input: {
  compileDecision: string;
  buildReady: boolean;
  wtpClosed: boolean;
  advantageOk: boolean;
}): ValidationOutcome {
  if (input.compileDecision === "REJECT") return "REJECT";
  if (input.compileDecision === "HOLD") return "HOLD";
  if (input.buildReady && input.compileDecision === "BUILD" && input.wtpClosed && input.advantageOk) {
    return "BUILD_READY";
  }
  if (!input.wtpClosed) return "EXTERNAL_VALIDATION_REQUIRED";
  return "MORE_VALIDATION_REQUIRED";
}
