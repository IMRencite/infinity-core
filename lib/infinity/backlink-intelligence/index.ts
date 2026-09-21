export const BACKLINK_INTELLIGENCE_ENGINE = "BacklinkIntelligenceAcquisitionEngineV1" as const;
export const BACKLINK_ENGINE_MODE = "DISCOVERY_ONLY" as const;

export const BACKLINK_DISCOVERY_TYPES = [
  "COMPETITOR_LINK_GAP",
  "UNLINKED_BRAND_MENTION",
  "BROKEN_LINK_REPLACEMENT",
  "RESOURCE_PAGE",
  "STATISTICS_CITATION",
  "RESEARCH_CITATION",
  "PARTNER_LINK",
  "SUPPLIER_LINK",
  "CUSTOMER_LINK",
  "ASSOCIATION_LINK",
  "LOCAL_CITATION",
  "DIRECTORY_OPPORTUNITY",
  "EXPERT_CONTRIBUTION",
  "GUEST_EXPERT",
  "JOURNALIST_SOURCE",
  "DIGITAL_PR",
  "ROUNDUP_INCLUSION",
  "TOOLS_AND_CALCULATORS",
  "TEMPLATE_RESOURCE",
  "REFERENCE_RESOURCE",
] as const;
export type BacklinkDiscoveryType = (typeof BACKLINK_DISCOVERY_TYPES)[number];

export const BACKLINK_AUTONOMY_GATE = "BacklinkAutonomyGate" as const;
export const BACKLINK_PROSPECT_QUALITY_GATE = "BacklinkProspectQualityGate" as const;
export const BACKLINK_RELEVANCE_GATE = "BacklinkRelevanceGate" as const;
export const BACKLINK_SPAM_RISK_GATE = "BacklinkSpamRiskGate" as const;
export const BACKLINK_MANIPULATION_RISK_GATE = "BacklinkManipulationRiskGate" as const;
export const BACKLINK_ASSET_MATCH_GATE = "BacklinkAssetMatchGate" as const;
export const BACKLINK_OUTREACH_ELIGIBILITY_GATE = "BacklinkOutreachEligibilityGate" as const;
export const BACKLINK_DUPLICATE_OUTREACH_GATE = "BacklinkDuplicateOutreachGate" as const;
export const BACKLINK_PLACEMENT_VERIFICATION_GATE = "BacklinkPlacementVerificationGate" as const;
export const BACKLINK_HEALTH_GATE = "BacklinkHealthGate" as const;
export const BACKLINK_ATTRIBUTION_GATE = "BacklinkAttributionGate" as const;
export const BACKLINK_SPAM_SAFETY_GATE = "BacklinkSpamSafetyGate" as const;
export const BACKLINK_CONTINUITY_GATE = "BacklinkContinuityGate" as const;

export type BacklinkOpportunity = {
  id: string;
  type: BacklinkDiscoveryType;
  host: string;
  path: string;
  relevance: number;
  spam_risk: number;
  asset_id: string | null;
  content_gap: string | null;
  duplicate: boolean;
};

export type LinkableAsset = {
  id: string;
  title: string;
  url: string;
  kind: "RESEARCH" | "STATISTICS" | "CALCULATOR" | "TEMPLATE" | "GUIDE";
};

const FORBIDDEN_HOST = /pbn|linkfarm|paid-links|directory-submit/i;

export function discoverBacklinkOpportunities(input: {
  mentions: Array<{ host: string; path: string; type: BacklinkDiscoveryType; topic?: string }>;
  assets: LinkableAsset[];
  seen?: string[];
}): BacklinkOpportunity[] {
  const seen = new Set(input.seen ?? []);
  return input.mentions.map((mention, index) => {
    const key = `${mention.host}${mention.path}`;
    const asset = input.assets.find((row) => mention.topic && row.title.toLowerCase().includes(mention.topic.toLowerCase())) ?? null;
    return {
      id: `backlink:${index}:${mention.host}`,
      type: mention.type,
      host: mention.host,
      path: mention.path,
      relevance: asset ? 0.8 : 0.4,
      spam_risk: FORBIDDEN_HOST.test(mention.host) ? 0.95 : 0.1,
      asset_id: asset?.id ?? null,
      content_gap: asset ? null : `BacklinkContentGapRequest:${mention.type}`,
      duplicate: seen.has(key),
    };
  }).filter((row) => row.spam_risk < 0.8);
}

export function evaluateBacklinkAutonomyGate(input: { mode?: string; outreachSent?: boolean } = {}): {
  gate: typeof BACKLINK_AUTONOMY_GATE;
  result: "PASS" | "FAIL" | "NOT_PROVEN";
  reasons: string[];
  mode: typeof BACKLINK_ENGINE_MODE;
} {
  if (input.outreachSent) {
    return { gate: BACKLINK_AUTONOMY_GATE, result: "FAIL", reasons: ["OUTREACH_NOT_ALLOWED_IN_DISCOVERY_ONLY"], mode: BACKLINK_ENGINE_MODE };
  }
  if ((input.mode ?? BACKLINK_ENGINE_MODE) !== "DISCOVERY_ONLY") {
    return { gate: BACKLINK_AUTONOMY_GATE, result: "FAIL", reasons: ["MODE_NOT_DISCOVERY_ONLY"], mode: BACKLINK_ENGINE_MODE };
  }
  return { gate: BACKLINK_AUTONOMY_GATE, result: "PASS", reasons: ["DISCOVERY_ONLY"], mode: BACKLINK_ENGINE_MODE };
}

export function evaluateBacklinkSafetySuite(opportunities: BacklinkOpportunity[]): { result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (opportunities.some((row) => row.spam_risk >= 0.8)) reasons.push("SPAM_RISK");
  if (opportunities.some((row) => FORBIDDEN_HOST.test(row.host))) reasons.push("MANIPULATION_HOST");
  return { result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["SAFE_DISCOVERY"] };
}
