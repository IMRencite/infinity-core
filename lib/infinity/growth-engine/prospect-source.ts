import { inspectPublicWebSearchReadiness, auditPublicWebResearchProviders } from "@/lib/infinity/research/public-web/search-registry";
import { PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED } from "@/lib/infinity/research/public-web/capabilities";
import { OCCUPANCYNPV_GROWTH_CAMPAIGN_ID } from "./occupancynpv-experiment";
import { occupancynpvBoundedGrowthGrantRecorded } from "./founder-grant";
import { readProspectSourceLiveVerification } from "./source-live-verification";

export const QUALIFIED_PROSPECT_SOURCE_CONTRACT = "QualifiedProspectSourceContract" as const;
export const QUALIFIED_PROSPECT_SOURCE_AUTHORIZATION_GATE = "QualifiedProspectSourceAuthorizationGate" as const;
export { OCCUPANCYNPV_GROWTH_BOUNDED_SOURCE_GRANT } from "./founder-grant";

export type QualifiedProspectSource = {
  contract: typeof QUALIFIED_PROSPECT_SOURCE_CONTRACT;
  source_id: string;
  provider: string;
  capability: "web.search" | "grounded_research" | "NONE";
  authorization_state: "AUTHORIZED" | "NOT_AUTHORIZED";
  terms_policy_status: string;
  geographic_coverage: "US";
  business_data_coverage: "PUBLIC_BUSINESS_PAGES";
  contact_data_coverage: "PUBLISHED_BUSINESS_EMAIL_ONLY";
  freshness: "LIVE_QUERY" | "UNVERIFIED";
  cost: "UNKNOWN";
  rate_limits: "UNKNOWN";
  provenance_support: true;
  live_verification_state: "LIVE_VERIFIED" | "UNVERIFIED" | "FAIL";
  vendor_neutral: true;
};

export function inspectOccupancynpvQualifiedProspectSource(input: {
  liveSearchResults?: number;
  liveSearchError?: string | null;
} = {}): QualifiedProspectSource {
  const search = inspectPublicWebSearchReadiness();
  const persisted = readProspectSourceLiveVerification();
  const liveCount = input.liveSearchResults ?? persisted?.result_count ?? 0;
  const liveError = input.liveSearchError ?? (persisted?.live_verification_state === "FAIL" ? "LIVE_PROBE_FAIL" : null);
  const live =
    search.available && liveCount > 0
      ? "LIVE_VERIFIED"
      : search.available && liveError
        ? "FAIL"
        : "UNVERIFIED";
  return {
    contract: QUALIFIED_PROSPECT_SOURCE_CONTRACT,
    source_id: search.available ? `source:${search.providerId}:public-web-cre` : "source:NONE",
    provider: search.providerId,
    capability: search.available ? "web.search" : "NONE",
    authorization_state: occupancynpvBoundedGrowthGrantRecorded() ? "AUTHORIZED" : "NOT_AUTHORIZED",
    terms_policy_status: "public HTML search / public page fetch only; no authenticated scrape; no purchased lists",
    geographic_coverage: "US",
    business_data_coverage: "PUBLIC_BUSINESS_PAGES",
    contact_data_coverage: "PUBLISHED_BUSINESS_EMAIL_ONLY",
    freshness: live === "LIVE_VERIFIED" ? "LIVE_QUERY" : "UNVERIFIED",
    cost: "UNKNOWN",
    rate_limits: "UNKNOWN",
    provenance_support: true,
    live_verification_state: live,
    vendor_neutral: true,
  };
}

export function evaluateQualifiedProspectSourceAuthorizationGate(source = inspectOccupancynpvQualifiedProspectSource()): {
  gate: typeof QUALIFIED_PROSPECT_SOURCE_AUTHORIZATION_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  source: QualifiedProspectSource;
  campaign: typeof OCCUPANCYNPV_GROWTH_CAMPAIGN_ID;
  providersAudited: ReturnType<typeof auditPublicWebResearchProviders>;
} {
  const reasons: string[] = [];
  if (source.provider === "NONE") reasons.push(PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED);
  if (source.authorization_state !== "AUTHORIZED") reasons.push("SOURCE_NOT_AUTHORIZED");
  if (source.live_verification_state !== "LIVE_VERIFIED") reasons.push("SOURCE_NOT_LIVE_VERIFIED");
  if (source.contact_data_coverage !== "PUBLISHED_BUSINESS_EMAIL_ONLY") reasons.push("CONTACT_POLICY_INVALID");
  return {
    gate: QUALIFIED_PROSPECT_SOURCE_AUTHORIZATION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    source,
    campaign: OCCUPANCYNPV_GROWTH_CAMPAIGN_ID,
    providersAudited: auditPublicWebResearchProviders(),
  };
}
