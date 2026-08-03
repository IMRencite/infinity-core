import type { BuildProjectType } from "@/lib/infinity/build-factory/constants";

export const WEBSITE_BUILDER_VERSION = "website_builder_v1";

export const WEBSITE_INTERNAL_SOURCE_LABEL =
  "Internal website source — not deployed.";

export const FOUNDATION_DESIGN_LABEL =
  "Foundation design system — refinement pending.";

export const INTERNAL_CANONICAL_ORIGIN = "https://example.invalid";

export const WEBSITE_V1_PROJECT_TYPES = [
  "static_website",
  "nextjs_website",
  "content_site",
  "lead_generation_site",
  "affiliate_site",
] as const satisfies readonly BuildProjectType[];

export type WebsiteV1ProjectType = (typeof WEBSITE_V1_PROJECT_TYPES)[number];

export const WEBSITE_TASK_CAPABILITY_KEYS = [
  "website.generate_structure",
  "website.generate_components",
  "website.generate_pages",
  "website.generate_styles",
  "website.generate_metadata",
  "website.generate_sitemap",
  "website.generate_robots",
  "website.validate_structure",
  "website.validate_accessibility",
  "website.validate_seo",
  "website.validate_security",
  "website.package_internal_source",
] as const;

export type WebsiteTaskCapabilityKey = (typeof WEBSITE_TASK_CAPABILITY_KEYS)[number];

export const CONTENT_MARKERS = {
  contentRequired: "[CONTENT REQUIRED]",
  contactRequired: "[CONTACT INFORMATION REQUIRED]",
  legalReview: "[LEGAL REVIEW REQUIRED]",
  pricingNotConfigured: "[PRICING NOT CONFIGURED]",
  formNotConfigured: "Form integration not configured.",
  affiliatePlaceholder: "[AFFILIATE LINK PLACEHOLDER]",
  disclosurePlaceholder: "[AFFILIATE DISCLOSURE — LEGAL REVIEW REQUIRED]",
} as const;

export const MAX_SAMPLE_CONTENT_RECORDS = 3;

export const WEBSITE_STATE_DIR = ".infinity/website";

export const PROHIBITED_FAKE_PATTERNS = [
  /\b\d+%\s+(increase|growth|roi)\b/i,
  /\b(fortune\s*500|google|microsoft|amazon)\s+(client|customer)/i,
  /\b(guaranteed|money-back guarantee)\b/i,
  /\b(five-star|5-star)\s+rating\b/i,
] as const;
