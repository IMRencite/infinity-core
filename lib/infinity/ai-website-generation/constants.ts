export const AI_WEBSITE_GENERATION_SCHEMA_VERSION = "ai_website_generation_plan_v1";
export const AI_WEBSITE_PROMPT_VERSION = "ai_website_prompt_v1";
export const AI_WEBSITE_TRANSLATION_SCHEMA_VERSION = "ai_website_translated_model_v1";

export const AI_WEBSITE_GENERATION_MODES = ["mock", "shadow", "advisory", "disabled"] as const;
export type AiWebsiteGenerationMode = (typeof AI_WEBSITE_GENERATION_MODES)[number];

export const AI_WEBSITE_PLAN_STATUSES = [
  "requested",
  "running",
  "completed",
  "rejected_schema",
  "rejected_policy",
  "needs_review",
  "approved",
  "rejected",
  "failed",
  "superseded",
] as const;

export const AI_WEBSITE_REVIEW_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "needs_revision",
  "policy_blocked",
] as const;

export const AI_WEBSITE_INTERNAL_LABEL =
  "AI-generated internal plan — not deployed or published.";

export const HONEST_CONTENT_MARKERS = [
  "[CONTENT REQUIRED]",
  "[CONTACT INFORMATION REQUIRED]",
  "[PRICING NOT CONFIGURED]",
  "[LEGAL REVIEW REQUIRED]",
  "[EVIDENCE REQUIRED]",
  "[AFFILIATE RELATIONSHIP NOT CONFIGURED]",
  "[FORM INTEGRATION NOT CONFIGURED]",
] as const;

export const ALLOWED_PAGE_TYPES = [
  "home",
  "about",
  "contact",
  "service",
  "product",
  "category",
  "article",
  "landing",
  "comparison",
  "legal_placeholder",
  "custom",
] as const;

export const ALLOWED_COMPONENT_TYPES = [
  "Header",
  "Navigation",
  "Footer",
  "Hero",
  "ContentSection",
  "FeatureGrid",
  "CTASection",
  "Card",
  "TestimonialPlaceholder",
  "FAQSection",
  "ContactFormPlaceholder",
  "Breadcrumbs",
  "ArticleLayout",
  "ComparisonTable",
  "LegalNotice",
] as const;

export const AI_WEBSITE_COST_LIMITS = {
  maxContextRecords: 48,
  maxContextBytes: 256_000,
  maxEstimatedInputTokens: 24_000,
  maxOutputTokens: 8_192,
  maxEstimatedCostUsd: 0.5,
  maxRetries: 2,
  maxPlansPerBuildVersion: 3,
  maxPages: 12,
  maxSectionsPerPage: 12,
  maxContentLength: 8_000,
  maxGeneratedFiles: 200,
  maxWorkspaceBytes: 5_000_000,
} as const;

export const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/,
  /OPENAI_API_KEY/i,
  /SUPABASE_SERVICE_ROLE/i,
  /Bearer\s+[a-zA-Z0-9._-]+/,
] as const;
