export const VALIDATION_GRADE_PUBLIC_VENTURE_TEMPLATE_V1 =
  "VALIDATION_GRADE_PUBLIC_VENTURE_TEMPLATE_V1" as const;

export const VALIDATION_GRADE_MATURITY = "VALIDATION_GRADE" as const;

export const VALIDATION_QUALITY_STATES = [
  "FUNCTIONALLY_INVALID",
  "FUNCTIONALLY_VALID",
  "FUNCTIONALLY_VALID_VISUALLY_BELOW_VALIDATION_GRADE",
  "VALIDATION_GRADE_READY",
  "PREMIUM_VALIDATION_READY",
  "PREMIUM_AUTHORITY_VALIDATION_READY",
  "PREMIUM_AUTHORITY_STRUCTURE_READY_BUT_CONTENT_DEPTH_BELOW_STANDARD",
  "PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD",
  "PRODUCTION_GRADE",
] as const;

export type ValidationQualityState = (typeof VALIDATION_QUALITY_STATES)[number];

export const CANONICAL_FOOTER_VISIBLE_FORMAT =
  "Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR" as const;

export const CANONICAL_PRIVACY_LABEL = "Privacy Policy" as const;
export const CANONICAL_TERMS_LABEL = "Terms of Service" as const;
export const CANONICAL_SITEMAP_LABEL = "Sitemap" as const;
export const CANONICAL_INFINITY_OS_VENTURE_LABEL = "An Infinity OS Venture" as const;
export const CANONICAL_INFINITE_OS_VENTURE_LABEL = CANONICAL_INFINITY_OS_VENTURE_LABEL;
/** Historical public attribution. Reject for current rendering. */
export const REJECTED_INFINITE_OS_VENTURE_LABEL = "An Infinite OS Venture" as const;
export const CANONICAL_IMR_BY_LABEL = "By IMR" as const;

export const CANONICAL_PRIVACY_HREF = "/privacy-policy/" as const;
export const CANONICAL_TERMS_HREF = "/terms-of-service/" as const;
export const CANONICAL_SITEMAP_HREF = "/sitemap.xml" as const;
export const CANONICAL_INFINITE_OS_URL = "https://imros.io" as const;
export const CANONICAL_IMR_URL = "https://infinitemediaresources.com" as const;

/** Live CRE artifact wording before this contract. Do not treat as the new canonical footer. */
export const LIVE_DEPLOYED_FOOTER_COPY = "An Infinity OS Venture · By IMR" as const;
export const LIVE_DEPLOYED_INFINITY_OS_LABEL = "Infinity OS" as const;

export const FORBIDDEN_FAKE_TRUST =
  /testimonial|customers already|countdown|limited spots|guaranteed savings|increase revenue|market leader|\b#1\b|trusted by|as seen in|iso 27001|soc 2|case study/i;

export const LEGAL_CONFIGURATION_REQUIRED = "LEGAL_CONFIGURATION_REQUIRED" as const;
