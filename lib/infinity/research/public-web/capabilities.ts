export const PUBLIC_WEB_RESEARCH_RUNTIME = "PublicWebResearchRuntime" as const;

export const PUBLIC_WEB_CAPABILITIES = [
  "web.search",
  "web.fetch_public_page",
  "research.extract_evidence",
  "research.reason_over_evidence",
  "research.verify_claim",
] as const;

export type PublicWebCapability = (typeof PUBLIC_WEB_CAPABILITIES)[number];

export const PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED =
  "PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED" as const;

export const PUBLIC_WEB_SEARCH_CLASSES = ["SEARCH_API", "PUBLIC_WEB_SEARCH", "BROWSER_SEARCH"] as const;

export type PublicWebSearchClass = (typeof PUBLIC_WEB_SEARCH_CLASSES)[number];
