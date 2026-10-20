import type { RenderPageProfile } from "./rendered-page-quality-v1";
import type { RenderBrowserEvidenceV1, ResponsiveBrowserEvidenceV1 } from "./render-browser-evidence-v1";
import type { OrganicNamedGate } from "./types";

export const PUBLIC_UI_CAPABILITY_REGRESSION_QC = "PUBLIC_UI_CAPABILITY_REGRESSION_QC" as const;
export const VENTURE_REQUIRED_CAPABILITY_QC = "VENTURE_REQUIRED_CAPABILITY_QC" as const;
export const AUTONOMOUS_CHANGE_EXISTING_FEATURE_PRESERVATION_QC =
  "AUTONOMOUS_CHANGE_EXISTING_FEATURE_PRESERVATION_QC" as const;
export const SHARED_PUBLIC_UI_CHANGE_REGRESSION_QC = "SHARED_PUBLIC_UI_CHANGE_REGRESSION_QC" as const;
export const BUILD_FACTORY_CAPABILITY_REGRESSION_QC = "BUILD_FACTORY_CAPABILITY_REGRESSION_QC" as const;

export type PublicCapabilityQcBoundary =
  | "UNIT_HELPER"
  | "AUTONOMOUS_PUBLICATION_APPROVAL"
  | "PRODUCTION_DEPLOY"
  | "PRODUCTION_VERIFY"
  | "BUILD_FACTORY_WEBSITE_LIVE"
  | "NEW_VENTURE_BLOG_LAUNCH"
  | "SHARED_TEMPLATE_RELEASE";

export const CAPABILITY_BROWSER_VISIBILITY_REQUIRED_BOUNDARIES: PublicCapabilityQcBoundary[] = [
  "AUTONOMOUS_PUBLICATION_APPROVAL",
  "PRODUCTION_DEPLOY",
  "PRODUCTION_VERIFY",
  "BUILD_FACTORY_WEBSITE_LIVE",
  "NEW_VENTURE_BLOG_LAUNCH",
  "SHARED_TEMPLATE_RELEASE",
];

export const CAPABILITY_MISSING_BROWSER_EVIDENCE = "FAIL_EVIDENCE_MISSING" as const;

export function requiresCapabilityBrowserEvidence(boundary: PublicCapabilityQcBoundary | undefined): boolean {
  if (!boundary || boundary === "UNIT_HELPER") return false;
  return CAPABILITY_BROWSER_VISIBILITY_REQUIRED_BOUNDARIES.includes(boundary);
}

export function resolveCapabilityRequireBrowser(input: {
  boundary?: PublicCapabilityQcBoundary;
  require_browser?: boolean;
}): boolean {
  if (input.require_browser !== undefined) return input.require_browser;
  return requiresCapabilityBrowserEvidence(input.boundary);
}

export type PublicUiCapabilityId =
  | "BLOG_INDEX_HEADING"
  | "BLOG_ARTICLE_INVENTORY"
  | "BLOG_ARTICLE_CARDS"
  | "BLOG_FEATURED_MEDIA"
  | "BLOG_CATEGORY_DISCOVERY"
  | "BLOG_TOPIC_DISCOVERY"
  | "BLOG_SIDEBAR"
  | "BLOG_POPULAR_RESOURCES"
  | "BLOG_LATEST_POSTS"
  | "BLOG_INTERNAL_LINKS"
  | "ARTICLE_BODY"
  | "ARTICLE_FEATURED_MEDIA"
  | "PRIMARY_CTA";

export type RenderedCapabilitySample = {
  capability_id: PublicUiCapabilityId;
  dom_present: boolean;
  visible: boolean;
  width_px: number;
  height_px: number;
};

export type RenderedCapabilityEvidenceV1 = {
  viewport: RenderBrowserEvidenceV1["viewport"];
  capabilities: RenderedCapabilitySample[];
};

export type ResponsiveCapabilityEvidenceV1 = Partial<Record<RenderBrowserEvidenceV1["viewport"], RenderedCapabilityEvidenceV1>>;

const CAPABILITY_MARKERS: Record<PublicUiCapabilityId, string[]> = {
  BLOG_INDEX_HEADING: ["data-blog-hero", "pv-display"],
  BLOG_ARTICLE_INVENTORY: ["data-blog-main-roll", "data-blog-all-articles"],
  BLOG_ARTICLE_CARDS: ["data-blog-roll-card", "data-blog-card"],
  BLOG_FEATURED_MEDIA: ["data-blog-featured-card", "data-visual-role"],
  BLOG_CATEGORY_DISCOVERY: ["data-blog-categories", "data-blog-category"],
  BLOG_TOPIC_DISCOVERY: ["data-blog-tag-cloud", "data-blog-tag"],
  BLOG_SIDEBAR: ['data-blog-sidebar="true"', "data-blog-sidebar-shared"],
  BLOG_POPULAR_RESOURCES: ["data-blog-popular-resources"],
  BLOG_LATEST_POSTS: ["data-blog-latest", "data-blog-featured-blogs"],
  BLOG_INTERNAL_LINKS: ["href=\"/journal/", "Read article"],
  ARTICLE_BODY: ["data-blog-article-shell", "pv-reading"],
  ARTICLE_FEATURED_MEDIA: ["data-blog-article-hero", "FEATURED_EDITORIAL_IMAGE"],
  PRIMARY_CTA: ["cta", "Read article"],
};

export function requiredCapabilitiesForProfile(profile: RenderPageProfile): PublicUiCapabilityId[] {
  switch (profile) {
    case "BLOG_INDEX":
      return [
        "BLOG_INDEX_HEADING",
        "BLOG_ARTICLE_INVENTORY",
        "BLOG_ARTICLE_CARDS",
        "BLOG_FEATURED_MEDIA",
        "BLOG_CATEGORY_DISCOVERY",
        "BLOG_TOPIC_DISCOVERY",
        "BLOG_SIDEBAR",
        "BLOG_POPULAR_RESOURCES",
        "BLOG_LATEST_POSTS",
        "BLOG_INTERNAL_LINKS",
      ];
    case "ARTICLE":
      return ["ARTICLE_BODY", "ARTICLE_FEATURED_MEDIA", "BLOG_SIDEBAR", "BLOG_INTERNAL_LINKS"];
    case "CATEGORY_ARCHIVE":
    case "TAG_ARCHIVE":
      return [
        "BLOG_INDEX_HEADING",
        "BLOG_ARTICLE_CARDS",
        "BLOG_CATEGORY_DISCOVERY",
        "BLOG_TOPIC_DISCOVERY",
        "BLOG_SIDEBAR",
      ];
    default:
      return ["PRIMARY_CTA"];
  }
}

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

export function evaluateSourceCapabilityPresence(input: {
  profile: RenderPageProfile;
  html: string;
}): { required: PublicUiCapabilityId[]; present: PublicUiCapabilityId[]; missing: PublicUiCapabilityId[] } {
  const required = requiredCapabilitiesForProfile(input.profile);
  const present = required.filter((id) => CAPABILITY_MARKERS[id].some((marker) => input.html.includes(marker)));
  const missing = required.filter((id) => !present.includes(id));
  return { required, present, missing };
}

export function evaluateRenderedCapabilityPresence(input: {
  profile: RenderPageProfile;
  viewport: RenderBrowserEvidenceV1["viewport"];
  capabilities: RenderedCapabilitySample[];
}): OrganicNamedGate {
  const required = requiredCapabilitiesForProfile(input.profile);
  const reasons: string[] = [];
  for (const id of required) {
    const sample = input.capabilities.find((row) => row.capability_id === id);
    if (!sample?.dom_present) reasons.push(`CAPABILITY_DOM_MISSING_${id}`);
    else if (!sample.visible || sample.width_px <= 0 || sample.height_px <= 0) {
      reasons.push(`CAPABILITY_NOT_VISIBLE_${id}`);
    }
  }
  if (input.profile === "BLOG_INDEX" && input.viewport === "desktop") {
    const sidebar = input.capabilities.find((row) => row.capability_id === "BLOG_SIDEBAR");
    if (sidebar && sidebar.width_px < 120) reasons.push("DESKTOP_SIDEBAR_ZERO_WIDTH");
  }
  return named("RENDERED_CAPABILITY_PRESENCE", reasons);
}

export function evaluatePublicUiCapabilityRegressionQc(input: {
  profile: RenderPageProfile;
  html: string;
  browser_capabilities?: ResponsiveCapabilityEvidenceV1 | null;
  require_browser?: boolean;
  boundary?: PublicCapabilityQcBoundary;
}): OrganicNamedGate {
  const source = evaluateSourceCapabilityPresence(input);
  const reasons: string[] = source.missing.map((id) => `SOURCE_CAPABILITY_MISSING_${id}`);
  const requireBrowser = resolveCapabilityRequireBrowser(input);
  if (requireBrowser) {
    if (!input.browser_capabilities?.desktop) {
      reasons.push(CAPABILITY_MISSING_BROWSER_EVIDENCE, "BROWSER_CAPABILITY_EVIDENCE_MISSING");
    } else {
      const desktop = evaluateRenderedCapabilityPresence({
        profile: input.profile,
        viewport: "desktop",
        capabilities: input.browser_capabilities.desktop.capabilities,
      });
      if (desktop.result !== "PASS") reasons.push(...desktop.reasons);
    }
  }
  return named(PUBLIC_UI_CAPABILITY_REGRESSION_QC, reasons);
}

export function evaluateVentureRequiredCapabilityQc(input: {
  routes: Array<{ profile: RenderPageProfile; html: string; browser_capabilities?: ResponsiveCapabilityEvidenceV1 | null }>;
  require_browser?: boolean;
  boundary?: PublicCapabilityQcBoundary;
}): OrganicNamedGate {
  const reasons: string[] = [];
  for (const route of input.routes) {
    const gate = evaluatePublicUiCapabilityRegressionQc({
      profile: route.profile,
      html: route.html,
      browser_capabilities: route.browser_capabilities,
      require_browser: input.require_browser,
      boundary: input.boundary,
    });
    if (gate.result !== "PASS") reasons.push(...gate.reasons.map((r) => `${route.profile}:${r}`));
  }
  return named(VENTURE_REQUIRED_CAPABILITY_QC, reasons);
}

export function evaluateAutonomousChangeExistingFeaturePreservationQc(input: {
  before: PublicUiCapabilityId[];
  after_html: string;
  profile: RenderPageProfile;
}): OrganicNamedGate {
  const after = evaluateSourceCapabilityPresence({ profile: input.profile, html: input.after_html });
  const reasons: string[] = [];
  for (const id of input.before) {
    if (!after.present.includes(id)) reasons.push(`REQUIRED_CAPABILITY_REMOVED_${id}`);
  }
  return named(AUTONOMOUS_CHANGE_EXISTING_FEATURE_PRESERVATION_QC, reasons);
}

export function evaluateBuildFactoryCapabilityRegressionBlocking(input: {
  venture_rendered_quality_qc: "PASS" | "FAIL" | "FAIL_EVIDENCE_MISSING";
  venture_required_capability_qc: "PASS" | "FAIL";
}): {
  BUILD_FACTORY_CAPABILITY_REGRESSION_QC: "PASS" | "FAIL";
  WEBSITE_LIVE_ALLOWED: boolean;
} {
  const allowed = input.venture_rendered_quality_qc === "PASS" && input.venture_required_capability_qc === "PASS";
  const regressionBlocks =
    input.venture_rendered_quality_qc === "PASS" && input.venture_required_capability_qc === "FAIL";
  return {
    BUILD_FACTORY_CAPABILITY_REGRESSION_QC: regressionBlocks ? "PASS" : allowed ? "PASS" : "FAIL",
    WEBSITE_LIVE_ALLOWED: allowed,
  };
}
