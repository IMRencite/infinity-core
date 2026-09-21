import type { PlannedPage, SearchPerformanceAdapterContract, SitePerformanceIdentity } from "./types";

export function pagePerformanceIdentity(page: PlannedPage, designArchetype: string): SitePerformanceIdentity {
  return {
    pageId: page.route,
    pageType: page.role,
    pagePattern: page.patternId,
    designArchetype,
    topicCluster: page.topicCluster,
    contentDepthBand: page.patternId.includes("EDUCATIONAL") ? "DEEP" : "STANDARD",
    trafficSource: "UNKNOWN",
    ctaPattern: page.ctaStrength,
  };
}

export function answerAuthorityPerformanceContract() {
  return {
    tracks: ["questionId", "answerChunkId", "pageId", "sectionId", "patternId", "CTA", "trafficSource", "qualifiedAction"] as const,
    gscLive: false as const,
    geoCitationMeasured: false as const,
    aiCitationObservability: {
      status: "CONTRACT_ONLY" as const,
      live: false as const,
      pretendUniversalMeasurement: false as const,
    },
  };
}

export function searchPerformanceAdapterContracts(): SearchPerformanceAdapterContract[] {
  return [
    { adapter: "google_search_console", status: "CONTRACT_ONLY", live: false },
    { adapter: "ga4", status: "CONTRACT_ONLY", live: false },
    { adapter: "other_search_performance", status: "CONTRACT_ONLY", live: false },
  ];
}

export function historicalEvidenceSufficientForPatternSuperiority(): false {
  return false;
}
