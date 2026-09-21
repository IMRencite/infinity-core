import { PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED } from "./capabilities";
import { createDuckDuckGoHtmlSearchProvider } from "./providers/duckduckgo-html";
import type { PublicWebSearchProvider } from "./types";

export type PublicWebProviderAuditRow = {
  providerId: string;
  capabilities: string[];
  searchClass: string | null;
  verified: boolean;
  requiresCredentials: boolean;
  configured: boolean;
  notes: string;
};

export function auditPublicWebResearchProviders(env: NodeJS.ProcessEnv = process.env): PublicWebProviderAuditRow[] {
  const geminiConfigured = Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY);
  const searchProvider = (env.PUBLIC_WEB_SEARCH_PROVIDER ?? "public_html").trim().toLowerCase();
  return [
    {
      providerId: "gemini",
      capabilities: ["research.reason_over_evidence", "grounded_research"],
      searchClass: null,
      verified: geminiConfigured,
      requiresCredentials: true,
      configured: geminiConfigured,
      notes: "Existing grounded LLM. Not a web.search transport.",
    },
    {
      providerId: "mock",
      capabilities: ["grounded_research"],
      searchClass: null,
      verified: false,
      requiresCredentials: false,
      configured: (env.RESEARCH_PROVIDER ?? "").toLowerCase() === "mock",
      notes: "Simulation only. Not eligible for autonomous live public research.",
    },
    {
      providerId: "duckduckgo_html",
      capabilities: ["web.search"],
      searchClass: "PUBLIC_WEB_SEARCH",
      verified: searchProvider === "public_html" || searchProvider === "duckduckgo_html",
      requiresCredentials: false,
      configured: searchProvider !== "none",
      notes: "No-credential public HTML search adapter. Acquisition requests web.search, not this vendor.",
    },
    {
      providerId: "internal_http",
      capabilities: ["web.fetch_public_page"],
      searchClass: null,
      verified: true,
      requiresCredentials: false,
      configured: true,
      notes: "SSRF-guarded public HTTP fetch. Not a search engine.",
    },
  ];
}

export function inspectPublicWebSearchReadiness(env: NodeJS.ProcessEnv = process.env): {
  available: boolean;
  providerId: string | "NONE";
  reason: typeof PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED | "AVAILABLE";
  requiresCredentials: boolean;
} {
  const configured = (env.PUBLIC_WEB_SEARCH_PROVIDER ?? "public_html").trim().toLowerCase();
  if (configured === "none" || configured === "off" || configured === "disabled") {
    return {
      available: false,
      providerId: "NONE",
      reason: PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED,
      requiresCredentials: false,
    };
  }
  if (configured === "public_html" || configured === "duckduckgo_html") {
    return { available: true, providerId: "duckduckgo_html", reason: "AVAILABLE", requiresCredentials: false };
  }
  return {
    available: false,
    providerId: configured || "NONE",
    reason: PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED,
    requiresCredentials: true,
  };
}

export function getPublicWebSearchProvider(input?: {
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
}): PublicWebSearchProvider | null {
  const readiness = inspectPublicWebSearchReadiness(input?.env ?? process.env);
  if (!readiness.available) return null;
  if (readiness.providerId === "duckduckgo_html") {
    return createDuckDuckGoHtmlSearchProvider({ fetchImpl: input?.fetchImpl });
  }
  return null;
}
