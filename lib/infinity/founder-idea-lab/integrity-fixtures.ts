import { newId } from "./store";
import type { FounderResearchFinding, FounderResearchPacket } from "./research-packet";
import type { MonetizationEvidenceLayers } from "./monetization-levels";

function finding(
  dimension: FounderResearchFinding["dimension"],
  polarity: FounderResearchFinding["polarity"],
  claim: string,
  extra?: Partial<FounderResearchFinding>,
): FounderResearchFinding {
  return {
    findingId: extra?.findingId ?? newId(),
    dimension,
    claim,
    polarity,
    grounded: extra?.grounded ?? true,
    confidence: extra?.confidence ?? 0.7,
    sourceUrls: extra?.sourceUrls ?? ["https://example.com/research"],
    limitations: extra?.limitations ?? [],
    verifiesFounderCompetitor: extra?.verifiesFounderCompetitor ?? null,
  };
}

function packet(input: {
  submissionId: string;
  candidateId: string;
  summary: string;
  findings: FounderResearchFinding[];
  competitorLeads?: string[];
  verifiedCompetitors?: string[];
  layers: MonetizationEvidenceLayers;
  requiresMoreResearch?: boolean;
  failed?: boolean;
  failureCode?: FounderResearchPacket["failureCode"];
}): FounderResearchPacket {
  return {
    researchRunId: newId(),
    candidateId: input.candidateId,
    submissionId: input.submissionId,
    grounded: !input.failed && input.findings.some((item) => item.grounded),
    failed: Boolean(input.failed),
    failureCode: input.failureCode ?? null,
    summary: input.summary,
    findings: input.findings,
    sources: [{ url: "https://example.com/research", title: "Research fixture", domain: "example.com" }],
    competitorLeads: input.competitorLeads ?? [],
    verifiedCompetitors: input.verifiedCompetitors ?? [],
    monetizationLayers: input.layers,
    requiresMoreResearch: Boolean(input.requiresMoreResearch),
  };
}

/** Workflow SaaS with strong demand and category+idea monetization. */
export function workflowSaasIntegrityPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  return packet({
    submissionId,
    candidateId,
    summary: "Operators already pay for workflow SaaS; this specific scheduling workflow has documented demand.",
    competitorLeads: ["Acme Suite"],
    verifiedCompetitors: ["Acme Suite"],
    layers: { category: "SUPPORTED", ideaSpecific: "SUPPORTED", unitEconomics: "SUPPORTED" },
    findings: [
      finding("demand", "positive", "Operators search for and buy workflow automation for this job."),
      finding("market", "positive", "Digital workflow software spend is expanding."),
      finding("competition", "positive", "Incumbents are generic; workflow-specific tools remain fragmented.", {
        verifiesFounderCompetitor: "Acme Suite",
      }),
      finding("monetization", "positive", "Comparable workflow SaaS products charge monthly seats."),
      finding("pricing", "positive", "Public seat prices cluster around tens of dollars per month."),
      finding("distribution", "positive", "Search and content can reach operators."),
      finding("buildability", "positive", "Core product is a digitally delivered CRUD/workflow app."),
      finding("capital_efficiency", "positive", "Software delivery keeps incremental cost low."),
      finding("speed_to_revenue", "positive", "Self-serve signup can produce revenue in months."),
    ],
  });
}

/** Marketplace concept with different competition and distribution evidence. */
export function artMarketplaceIntegrityPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  return packet({
    submissionId,
    candidateId,
    summary: "Art marketplaces exist, but this concept faces crowded discovery and take-rate pressure.",
    competitorLeads: ["Etsy"],
    verifiedCompetitors: [],
    layers: { category: "SUPPORTED", ideaSpecific: "UNPROVEN", unitEconomics: "UNKNOWN" },
    findings: [
      finding("demand", "mixed", "Artists want discovery, but buyer intent is seasonal and taste-driven."),
      finding("market", "positive", "Online art and craft marketplaces are an established category."),
      finding("competition", "negative", "Large incumbents already concentrate buyer traffic."),
      finding("monetization", "mixed", "Category take rates exist; this exact concept has no conversion proof."),
      finding("pricing", "mixed", "Commission ranges are public for incumbents, not for this concept."),
      finding("distribution", "negative", "Paid social is expensive; organic marketplace SEO is incumbent-owned."),
      finding("buildability", "mixed", "A catalog marketplace is buildable but needs payments, trust, and moderation."),
      finding("capital_efficiency", "unknown", "No credible CAC/LTV for this exact concept.", { grounded: false, confidence: null }),
      finding("speed_to_revenue", "mixed", "Liquidity takes time even when the category already monetizes."),
    ],
  });
}

export function categorySupportedIdeaUnprovenPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  return packet({
    submissionId,
    candidateId,
    summary: "Comparable commercial platforms monetize the category; this exact idea is unproven and unit economics are unknown.",
    layers: { category: "SUPPORTED", ideaSpecific: "UNPROVEN", unitEconomics: "UNKNOWN" },
    findings: [
      finding("demand", "unknown", "No idea-specific demand study yet.", { grounded: false, confidence: null }),
      finding("market", "positive", "The category has multiple commercial platforms with public pricing."),
      finding("competition", "positive", "Existing businesses already charge for adjacent products."),
      finding("monetization", "mixed", "Category precedent is commercial; this exact concept has no win-rate evidence."),
      finding("pricing", "positive", "Public subscription and take-rate pages exist for comparables."),
      finding("distribution", "unknown", "No channel evidence for this exact concept.", { grounded: false, confidence: null }),
      finding("buildability", "unknown", "Build complexity not yet assessed from evidence.", { grounded: false, confidence: null }),
      finding("capital_efficiency", "unknown", "No CAC/LTV/margin evidence.", { grounded: false, confidence: null }),
      finding("speed_to_revenue", "unknown", "No time-to-revenue evidence for this concept.", { grounded: false, confidence: null }),
    ],
  });
}

export function negativeEconomicsPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  return packet({
    submissionId,
    candidateId,
    summary: "Credible negative evidence: poor willingness to pay, failed comparable models, and weak margins.",
    layers: { category: "UNSUPPORTED", ideaSpecific: "UNSUPPORTED", unitEconomics: "UNSUPPORTED" },
    findings: [
      finding("demand", "negative", "Prospects refuse to pay for this workflow."),
      finding("market", "negative", "The category is contracting."),
      finding("competition", "negative", "Prior comparable businesses shut down after failing to monetize."),
      finding("monetization", "negative", "Public filings show persistent losses and failed subscription conversions."),
      finding("pricing", "negative", "Price cuts still did not produce paying customers."),
      finding("distribution", "negative", "Acquisition costs exceed any observed revenue."),
      finding("buildability", "mixed", "Software can be built, but operations require heavy manual work."),
      finding("capital_efficiency", "negative", "Reported CAC exceeds LTV."),
      finding("speed_to_revenue", "negative", "Comparables never reached revenue after 18 months."),
    ],
  });
}

export function competitorSeedOnlyPacket(
  submissionId: string,
  candidateId: string,
  competitorLead: string,
): FounderResearchPacket {
  return packet({
    submissionId,
    candidateId,
    summary: "Founder competitor names were used as research leads; they are not verified evidence.",
    competitorLeads: [competitorLead],
    verifiedCompetitors: [],
    layers: { category: "UNKNOWN", ideaSpecific: "UNKNOWN", unitEconomics: "UNKNOWN" },
    requiresMoreResearch: true,
    findings: [
      finding("competition", "unknown", `Research lead only: ${competitorLead} was named by the founder.`, {
        grounded: false,
        confidence: null,
        sourceUrls: [],
        limitations: ["FOUNDER_PROVIDED — not independently verified"],
      }),
    ],
  });
}

export function failedProviderPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  return packet({
    submissionId,
    candidateId,
    summary: "Research provider failed.",
    layers: { category: "UNKNOWN", ideaSpecific: "UNKNOWN", unitEconomics: "UNKNOWN" },
    failed: true,
    failureCode: "PROVIDER_FAILED",
    findings: [],
  });
}
