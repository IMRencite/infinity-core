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
    confidence: extra && "confidence" in extra ? extra.confidence ?? null : 0.7,
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

export function rejectUnknownEconomicsPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  return packet({
    submissionId,
    candidateId,
    summary: "Credible negative demand, market, and competition evidence; unit economics remain unknown.",
    layers: { category: "UNSUPPORTED", ideaSpecific: "UNSUPPORTED", unitEconomics: "UNKNOWN" },
    findings: [
      finding("demand", "negative", "Prospects refuse to pay for this workflow."),
      finding("market", "negative", "The category is contracting."),
      finding("competition", "negative", "Prior comparable businesses shut down after failing to monetize."),
      finding("monetization", "negative", "Public filings show persistent losses and failed subscription conversions."),
      finding("pricing", "negative", "Price cuts still did not produce paying customers."),
      finding("distribution", "negative", "Acquisition costs exceed any observed revenue."),
      finding("buildability", "mixed", "Software can be built, but operations require heavy manual work."),
      finding("capital_efficiency", "unknown", "No measured CAC/LTV for this concept.", {
        grounded: false,
        confidence: null,
      }),
      finding("speed_to_revenue", "negative", "Comparables never reached revenue after 18 months."),
    ],
  });
}

export function validateUnknownEconomicsPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  return packet({
    submissionId,
    candidateId,
    summary: "Strong material research; category monetizes; unit economics are unknown.",
    competitorLeads: ["Acme Suite"],
    verifiedCompetitors: ["Acme Suite"],
    layers: { category: "SUPPORTED", ideaSpecific: "SUPPORTED", unitEconomics: "UNKNOWN" },
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
      finding("capital_efficiency", "unknown", "No observed CAC/LTV yet.", { grounded: false, confidence: null }),
      finding("speed_to_revenue", "positive", "Self-serve signup can produce revenue in months."),
    ],
  });
}

/** Replay shape of Infinity CMS live V5: material PASS, category SUPPORTED, unit UNKNOWN, score 68.7. */
export function infinityCmsLiveV5ReplayPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  return packet({
    submissionId,
    candidateId,
    summary:
      "CMS category has commercial precedent; idea-specific conversion and unit economics remain unknown.",
    competitorLeads: ["Dealerspike", "Hibu"],
    verifiedCompetitors: ["Hibu"],
    layers: { category: "SUPPORTED", ideaSpecific: "UNKNOWN", unitEconomics: "UNKNOWN" },
    findings: [
      finding("demand", "positive", "Businesses search for CMS platforms that produce rankable sites.", {
        findingId: "finding_01",
        confidence: null,
      }),
      finding("demand", "positive", "Owners pay for website platforms that generate leads.", {
        findingId: "finding_02",
        confidence: null,
      }),
      finding("market", "positive", "SMB website and CMS spend is an established commercial market.", {
        findingId: "finding_03",
        confidence: null,
      }),
      finding("competition", "positive", "Incumbent CMS tools leave a gap for AI-built SEO/AEO sites.", {
        findingId: "finding_04",
        confidence: null,
      }),
      finding("monetization", "positive", "Comparable CMS vendors charge monthly packages.", {
        findingId: "finding_05",
        confidence: null,
      }),
      finding("monetization", "positive", "Category pricing pages show package tiers.", {
        findingId: "finding_06",
        confidence: null,
      }),
      finding("competition", "positive", "Hibu and similar vendors sell SMB web packages.", {
        findingId: "finding_07",
        confidence: null,
      }),
      finding("competition", "positive", "Dealer-focused CMS incumbents do not cover this exact AI workflow.", {
        findingId: "finding_08",
        confidence: null,
      }),
      finding("market", "positive", "AEO/SEO site demand is shifting toward AI-assisted publishing.", {
        findingId: "finding_09",
        confidence: null,
      }),
      finding("capital_efficiency", "positive", "Software delivery keeps incremental cost relatively low.", {
        findingId: "finding_10",
        grounded: false,
        confidence: null,
      }),
    ],
  });
}

/** Grounded money-research follow-up evidence. Fixture names are not production constants. */
export function cmsMoneyResearchAfterPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  const base = infinityCmsLiveV5ReplayPacket(submissionId, candidateId);
  return {
    ...base,
    summary:
      "Adjacent website-platform vendors publish recurring pricing, setup fees, packages, and add-ons; unit economics remain modeled, not observed.",
    competitorLeads: ["Dealerspike", "Hibu", "Northstar Sites", "LocalLaunch Web"],
    verifiedCompetitors: ["Hibu", "Northstar Sites", "LocalLaunch Web"],
    monetizationLayers: { category: "SUPPORTED", ideaSpecific: "UNPROVEN", unitEconomics: "UNKNOWN" },
    findings: [
      ...base.findings,
      finding(
        "pricing",
        "positive",
        "Northstar Sites public plans start at $149-$399 per month for SMB website packages.",
        {
          findingId: "money_01",
          verifiesFounderCompetitor: "Northstar Sites",
          sourceUrls: ["https://example.com/northstar/pricing"],
        },
      ),
      finding(
        "pricing",
        "positive",
        "Northstar Sites charges a $2,000 setup fee and lists $3,600/year on annual contracts.",
        {
          findingId: "money_02",
          verifiesFounderCompetitor: "Northstar Sites",
          sourceUrls: ["https://example.com/northstar/plans"],
        },
      ),
      finding(
        "monetization",
        "positive",
        "LocalLaunch Web monthly retainers are $299 per month plus SEO add-on packages.",
        {
          findingId: "money_03",
          verifiesFounderCompetitor: "LocalLaunch Web",
          sourceUrls: ["https://example.com/locallaunch/pricing"],
        },
      ),
      finding(
        "pricing",
        "positive",
        "LocalLaunch Web implementation fee is $1,500 setup and premium support is an upsell.",
        {
          findingId: "money_04",
          verifiesFounderCompetitor: "LocalLaunch Web",
          sourceUrls: ["https://example.com/locallaunch/plans"],
        },
      ),
      finding(
        "monetization",
        "positive",
        "Website-as-a-service category benchmarks show managed website retainers with package tiers.",
        {
          findingId: "money_05",
          sourceUrls: ["https://example.com/benchmark/website-as-a-service"],
        },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "Category vendors report 55%-70% gross margin and paid-search CAC of $700-$1800.",
        {
          findingId: "money_06",
          sourceUrls: ["https://example.com/benchmark/smb-margins"],
        },
      ),
    ],
  };
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

/** Dedicated benchmark-economics after evidence. Values live in fixture claims only. */
export function cmsBenchmarkEconomicsAfterPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  const base = cmsMoneyResearchAfterPacket(submissionId, candidateId);
  return {
    ...base,
    summary:
      "Category and comparable economics evidence supports modeled CAC, retention, and margin ranges; observed unit economics remain unknown.",
    findings: [
      ...base.findings.filter((item) => item.findingId !== "money_06"),
      finding(
        "capital_efficiency",
        "mixed",
        "2024 KeyBanc SMB website-as-a-service benchmark study reports paid-search CAC of $800-$1,200.",
        {
          findingId: "bench_cac_01",
          sourceUrls: ["https://www.keybanc.com/reports/smb-website-benchmarks-2024"],
        },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "HubSpot agency methodology survey of 180 firms reports local digital agency CAC of $900.",
        {
          findingId: "bench_cac_02",
          sourceUrls: ["https://www.hubspot.com/agency-benchmarks/cac-2024"],
        },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "Northstar Sites reported CAC of $1,100 in official company material for SMB website packages.",
        {
          findingId: "bench_cac_03",
          verifiesFounderCompetitor: "Northstar Sites",
          sourceUrls: ["https://example-northstar.com/investor/disclosures"],
        },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "OpenView 2024 industry report lists managed website platform CAC of $700-$1,400.",
        {
          findingId: "bench_cac_04",
          sourceUrls: ["https://openviewpartners.com/benchmarks/managed-website-2024"],
        },
      ),
      finding(
        "capital_efficiency",
        "negative",
        "Bessemer Cloud Index outlier for SMB website-as-a-service CAC of $18,000 is an extreme observation.",
        {
          findingId: "bench_cac_outlier",
          sourceUrls: ["https://www.bvp.com/atlas/outlier-smb-website-cac"],
        },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "KeyBanc 2024 benchmark study reports SMB website-as-a-service monthly logo churn of 2%-4%.",
        {
          findingId: "bench_churn_01",
          sourceUrls: ["https://www.keybanc.com/reports/smb-churn-2024"],
        },
      ),
      finding(
        "monetization",
        "positive",
        "ChartMogul industry report: hosted website software gross margin 60%-75%.",
        {
          findingId: "bench_margin_sw",
          sourceUrls: ["https://chartmogul.com/reports/hosted-website-margins-2024"],
        },
      ),
      finding(
        "monetization",
        "positive",
        "HubSpot agency methodology survey of 120 firms: managed SEO/content service gross margin 40%-50%.",
        {
          findingId: "bench_margin_svc",
          sourceUrls: ["https://www.hubspot.com/agency-benchmarks/service-margins-2024"],
        },
      ),
      finding(
        "distribution",
        "mixed",
        "SMB local website Google Ads CPC is $3.50-$7 according to a 2024 WordStream industry report.",
        {
          findingId: "bench_cpc",
          sourceUrls: ["https://www.wordstream.com/blog/ws/2024/smb-website-cpc"],
        },
      ),
      finding(
        "distribution",
        "mixed",
        "SMB paid search CPL for local website services is $40-$90 in a 2024 First Page Sage benchmark study.",
        {
          findingId: "bench_cpl",
          sourceUrls: ["https://firstpagesage.com/reports/smb-website-cpl-2024"],
        },
      ),
      finding(
        "distribution",
        "mixed",
        "Visitor-to-lead conversion for SMB website landing pages is 3%-6% in a 2024 Unbounce benchmark study.",
        {
          findingId: "bench_vtl",
          sourceUrls: ["https://unbounce.com/conversion-benchmark-report/2024"],
        },
      ),
      finding(
        "distribution",
        "mixed",
        "Lead-to-customer conversion for SMB website packages is 15%-25% in a 2024 HubSpot methodology survey.",
        {
          findingId: "bench_ltc",
          sourceUrls: ["https://www.hubspot.com/agency-benchmarks/close-2024"],
        },
      ),
      finding(
        "distribution",
        "mixed",
        "SMB website package sales cycle is 21-45 days in a 2024 agency methodology report.",
        {
          findingId: "bench_cycle",
          sourceUrls: ["https://www.hubspot.com/agency-benchmarks/sales-cycle-2024"],
        },
      ),
    ],
  };
}

/** Enterprise SaaS CAC against an SMB self-serve-style venture. Must not dominate base CAC. */
export function cmsWeakEnterpriseBenchmarkPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  const base = infinityCmsLiveV5ReplayPacket(submissionId, candidateId);
  return {
    ...base,
    findings: [
      ...base.findings,
      finding(
        "capital_efficiency",
        "mixed",
        "Gartner 2024 enterprise SaaS field-sales CAC benchmark is $12,000 for Fortune 500 CRM SaaS.",
        {
          findingId: "weak_ent_cac",
          sourceUrls: ["https://www.gartner.com/en/documents/enterprise-saas-cac-2024"],
        },
      ),
    ],
  };
}

/** Two credible benchmark groups disagree materially. */
export function cmsConflictingBenchmarkPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  const base = infinityCmsLiveV5ReplayPacket(submissionId, candidateId);
  return {
    ...base,
    findings: [
      ...base.findings,
      finding(
        "capital_efficiency",
        "mixed",
        "KeyBanc 2024 SMB website-as-a-service paid-search CAC benchmark is $400-$500.",
        { findingId: "conflict_a1", sourceUrls: ["https://www.keybanc.com/reports/smb-cac-low-2024"] },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "OpenView 2024 SMB website platform CAC benchmark is $450.",
        { findingId: "conflict_a2", sourceUrls: ["https://openviewpartners.com/benchmarks/smb-cac-low"] },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "Bessemer 2024 SMB website-as-a-service CAC benchmark is $1,400-$1,600.",
        { findingId: "conflict_b1", sourceUrls: ["https://www.bvp.com/atlas/smb-website-cac-high"] },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "Pacific Crest 2024 managed website category CAC benchmark is $1,500.",
        { findingId: "conflict_b2", sourceUrls: ["https://www.pacificcrest.com/research/website-cac-2024"] },
      ),
    ],
  };
}

/** READ-ONLY replay of live Infinity CMS v6 money-extraction failures. Do not copy live IDs into production logic. */
export function cmsLiveV6EconomicReplayPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  const base = infinityCmsLiveV5ReplayPacket(submissionId, candidateId);
  return {
    ...base,
    summary:
      "Public pricing clues and weak category benchmarks exist, but modeled monthly price, ARPU, LTV, and payback remain incomplete.",
    competitorLeads: ["Hibu", "DealerSpike"],
    verifiedCompetitors: ["Hibu"],
    monetizationLayers: { category: "SUPPORTED", ideaSpecific: "UNPROVEN", unitEconomics: "UNKNOWN" },
    findings: [
      ...base.findings,
      finding(
        "pricing",
        "positive",
        "SaaS CMS / AI website builders: $10–$80+/month for hosted website packages.",
        { findingId: "v6_price_category", sourceUrls: ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-v6-cat"] },
      ),
      finding(
        "pricing",
        "positive",
        "Durable public plans list $12/month for an AI website builder.",
        { findingId: "v6_price_durable", sourceUrls: ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-v6-durable"] },
      ),
      finding(
        "pricing",
        "positive",
        "AEO tracking tools charge $79–$380/month.",
        { findingId: "v6_price_aeo", sourceUrls: ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-v6-aeo"] },
      ),
      finding(
        "pricing",
        "positive",
        "Agency setup/onboarding fees are typically $1,000–$5,000.",
        { findingId: "v6_price_setup", sourceUrls: ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-v6-setup"] },
      ),
      finding(
        "monetization",
        "positive",
        "Hibu local marketing retainers: up to $3,500/month.",
        { findingId: "v6_price_hibu", verifiesFounderCompetitor: "Hibu", sourceUrls: ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-v6-hibu"] },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "One unsourced SEO page lists SMB SaaS organic CAC of $476. The same page mentions paid CAC of $723.",
        { findingId: "v6_cac", sourceUrls: ["https://example-seo-blog.com/smb-saas-cac"] },
      ),
      finding(
        "monetization",
        "mixed",
        "Generic SaaS vendors report 77% gross margin.",
        { findingId: "v6_margin", sourceUrls: ["https://example-seo-blog.com/saas-margins"] },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "Median monthly gross churn is 8–10%, and AI wrappers 45% annual churn.",
        { findingId: "v6_churn", sourceUrls: ["https://example-seo-blog.com/churn"] },
      ),
    ],
    sources: [
      {
        url: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-v6-cat",
        title: "Website builder pricing roundup",
        domain: "vertexaisearch.cloud.google.com",
        publisher: "Industry roundup",
      },
    ],
  };
}

/** READ-ONLY replay of live Infinity CMS v7 economic qualification failures. Do not copy live IDs into production logic. */
export function cmsLiveV7EconomicReplayPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  const base = infinityCmsLiveV5ReplayPacket(submissionId, candidateId);
  return {
    ...base,
    summary:
      "Opaque Vertex redirects produced clustered prices, but core pricing quality, setup, margin, and retention remain incomplete.",
    competitorLeads: ["Dealer Spike", "Hibu"],
    verifiedCompetitors: ["Hibu"],
    monetizationLayers: { category: "SUPPORTED", ideaSpecific: "UNPROVEN", unitEconomics: "UNKNOWN" },
    findings: [
      ...base.findings,
      finding(
        "pricing",
        "positive",
        "Dealer Spike charges $1,149/month for dealer website packages.",
        {
          findingId: "v7_dealer_spike",
          verifiesFounderCompetitor: "Dealer Spike",
          sourceUrls: ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-v7-dealer"],
        },
      ),
      finding(
        "pricing",
        "positive",
        "Hibu local marketing retainers: $1,100–$1,500/month.",
        {
          findingId: "v7_hibu",
          verifiesFounderCompetitor: "Hibu",
          sourceUrls: ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-v7-hibu"],
        },
      ),
      finding(
        "pricing",
        "positive",
        "GEO/AI SEO tools charge $79–$499+/month.",
        {
          findingId: "v7_geo",
          sourceUrls: ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-v7-geo"],
        },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "One Vertex page lists organic/GEO CAC of $249. The same page mentions typical B2B SaaS CAC of $702.",
        {
          findingId: "v7_cac",
          sourceUrls: ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-v7-cac"],
        },
      ),
      finding(
        "monetization",
        "mixed",
        "Wix Base44 AI website builder: starting near 0% gross margin, while projected 60%.",
        {
          findingId: "v7_margin",
          sourceUrls: ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-v7-margin"],
        },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "Median monthly gross churn is 3–7%.",
        {
          findingId: "v7_churn",
          sourceUrls: ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-v7-churn"],
        },
      ),
      finding(
        "competition",
        "mixed",
        "Business Bundled JSON LLMs ChatGPT Customer Acquisition Cost CPC are mentioned in a roundup without commercial CMS pricing.",
        {
          findingId: "v7_noise",
          sourceUrls: ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-v7-noise"],
        },
      ),
    ],
    sources: [
      {
        url: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-v7-dealer",
        title: "Dealer website pricing",
        domain: "vertexaisearch.cloud.google.com",
      },
    ],
  };
}

/** Read-only v8 economic replay: mixed clusters, weak CAC, usable logo churn, missing margin. */
export function cmsLiveV8EconomicReplayPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  const base = infinityCmsLiveV5ReplayPacket(submissionId, candidateId);
  const vertex = (token: string) => `https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-v8-${token}`;
  return {
    ...base,
    summary:
      "Opaque Vertex redirects mixed self-serve, vertical, managed, and tooling prices; CAC and logo churn exist at LOW quality; margin remains missing.",
    competitorLeads: ["Dealer Spike", "Hibu", "HubSpot", "Wix"],
    verifiedCompetitors: ["Hibu", "Dealer Spike"],
    monetizationLayers: { category: "SUPPORTED", ideaSpecific: "UNPROVEN", unitEconomics: "UNKNOWN" },
    findings: [
      ...base.findings,
      finding(
        "pricing",
        "positive",
        "Self-serve website builders list $9–$40/month.",
        {
          findingId: "v8_self_serve",
          sourceUrls: [vertex("self-serve")],
        },
      ),
      finding(
        "pricing",
        "positive",
        "HubSpot Marketing Hub Starter is $45/month; Professional is $800+/month for CRM and AEO tooling.",
        {
          findingId: "v8_hubspot",
          verifiesFounderCompetitor: "HubSpot",
          sourceUrls: [vertex("hubspot")],
        },
      ),
      finding(
        "pricing",
        "positive",
        "Dealer Spike charges $1,149+/month for dealer website packages.",
        {
          findingId: "v8_dealer_spike",
          verifiesFounderCompetitor: "Dealer Spike",
          sourceUrls: [vertex("dealer")],
        },
      ),
      finding(
        "pricing",
        "positive",
        "Vertical dealership CMS platforms charge $449–$1,500+/month.",
        {
          findingId: "v8_vertical",
          sourceUrls: [vertex("vertical")],
        },
      ),
      finding(
        "pricing",
        "positive",
        "Hibu bundled local marketing retainers: $1,100–$1,500/month.",
        {
          findingId: "v8_hibu",
          verifiesFounderCompetitor: "Hibu",
          sourceUrls: [vertex("hibu")],
        },
      ),
      finding(
        "pricing",
        "positive",
        "GEO solutions recommend investing $2,400/month.",
        {
          findingId: "v8_geo",
          sourceUrls: [vertex("geo")],
        },
      ),
      finding(
        "pricing",
        "positive",
        "AEO rank-tracking tooling lists $99–$10,000/month.",
        {
          findingId: "v8_tooling",
          sourceUrls: [vertex("tooling")],
        },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "SMB SaaS CAC is $559.",
        {
          findingId: "v8_cac",
          sourceUrls: [vertex("cac")],
        },
      ),
      finding(
        "capital_efficiency",
        "mixed",
        "Median monthly logo churn is 3.5%.",
        {
          findingId: "v8_churn",
          sourceUrls: [vertex("churn")],
        },
      ),
    ],
    sources: [
      { url: vertex("self-serve"), title: null, domain: "vertexaisearch.cloud.google.com" },
      { url: vertex("hubspot"), title: null, domain: "vertexaisearch.cloud.google.com" },
      { url: vertex("dealer"), title: null, domain: "vertexaisearch.cloud.google.com" },
      { url: vertex("vertical"), title: null, domain: "vertexaisearch.cloud.google.com" },
      { url: vertex("hibu"), title: null, domain: "vertexaisearch.cloud.google.com" },
      { url: vertex("geo"), title: null, domain: "vertexaisearch.cloud.google.com" },
      { url: vertex("tooling"), title: null, domain: "vertexaisearch.cloud.google.com" },
      { url: vertex("cac"), title: null, domain: "vertexaisearch.cloud.google.com" },
      { url: vertex("churn"), title: null, domain: "vertexaisearch.cloud.google.com" },
    ],
  };
}

/** No trustworthy economic benchmarks — UNKNOWN, not invented. */
export function cmsUnknownBenchmarkPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  return infinityCmsLiveV5ReplayPacket(submissionId, candidateId);
}
