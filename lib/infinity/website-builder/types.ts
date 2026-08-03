import type { BuildProjectType } from "@/lib/infinity/build-factory/constants";
import type { WebsiteV1ProjectType } from "./constants";

export type WebsiteFramework = "static" | "nextjs";

export type WebsitePageType =
  | "home"
  | "about"
  | "contact"
  | "service"
  | "product"
  | "category"
  | "article"
  | "landing"
  | "comparison"
  | "legal_placeholder"
  | "custom";

export type WebsitePageDefinition = {
  slug: string;
  pageType: WebsitePageType;
  title: string;
  description: string;
  purpose: string;
  sections: string[];
  primaryCTA?: string;
  secondaryCTA?: string;
  metadata?: Record<string, string>;
  schemaTypes?: string[];
  internalLinks?: string[];
  contentStatus: "approved" | "placeholder";
  validationRequirements?: string[];
};

export type WebsiteNavigationItem = {
  label: string;
  href: string;
};

export type WebsiteBuildExtension = {
  schemaVersion: typeof import("./constants").WEBSITE_BUILDER_VERSION;
  siteName: string;
  siteDescription: string;
  projectType: WebsiteV1ProjectType;
  framework: WebsiteFramework;
  routeStrategy: "file_based" | "app_router";
  pageDefinitions: WebsitePageDefinition[];
  navigation: WebsiteNavigationItem[];
  footer: { notice: string; links: WebsiteNavigationItem[] };
  brandingTokens: Record<string, string>;
  typographyTokens: Record<string, string>;
  spacingTokens: Record<string, string>;
  componentDefinitions: string[];
  contentSections: string[];
  callsToAction: string[];
  forms: { id: string; purpose: string; externalSubmit: false }[];
  metadata: Record<string, string>;
  schemaRequirements: string[];
  accessibilityRequirements: string[];
  performanceRequirements: string[];
  analyticsPlaceholders: string[];
  integrationPlaceholders: string[];
  prohibitedFeatures: string[];
};

export type RouteManifestEntry = {
  slug: string;
  path: string;
  pageType: WebsitePageType;
  title: string;
};

export type ComponentManifestEntry = {
  name: string;
  path: string;
  variant?: string;
};

export type WebsiteBuildState = {
  completedSteps: string[];
  routeManifest: RouteManifestEntry[];
  componentManifest: ComponentManifestEntry[];
  metadataManifest: Record<string, unknown>;
  sitemapManifest: { urls: string[] };
  fileManifest: { path: string; hash: string; bytes: number }[];
  validationReports: Record<string, { valid: boolean; issues: string[] }>;
  packageArtifactPath?: string;
};

export function isWebsiteV1ProjectType(
  projectType: BuildProjectType,
): projectType is WebsiteV1ProjectType {
  return (
    projectType === "static_website" ||
    projectType === "nextjs_website" ||
    projectType === "content_site" ||
    projectType === "lead_generation_site" ||
    projectType === "affiliate_site"
  );
}
