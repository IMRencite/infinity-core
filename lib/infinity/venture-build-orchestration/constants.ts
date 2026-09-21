export const EXECUTABLE_VENTURE_PLAN_SCHEMA = "executable_venture_plan_v1" as const;

export const BUILD_AUTHORIZATION_RESULTS = [
  "AUTHORIZED_BUILD",
  "AUTHORIZED_VALIDATION_ARTIFACT",
  "VALIDATION_REQUIRED",
  "EVIDENCE_BLOCKED",
  "POLICY_BLOCKED",
  "ECONOMICS_BLOCKED",
  "ALREADY_BUILDING",
  "ALREADY_BUILT",
] as const;

export const EXECUTABLE_PLAN_KINDS = [
  "BUILD_WORK",
  "VALIDATION_WORK",
  "VALIDATION_ARTIFACT_WORK",
  "BLOCKED",
] as const;

export const EXECUTABLE_PHASES = [
  "VENTURE_DEFINITION",
  "PRODUCT_SPECIFICATION",
  "SYSTEMS_CONFIGURATION",
  "MONETIZATION_CONFIGURATION",
  "PRODUCT_BUILD",
  "CONTENT_ASSET_BUILD",
  "QUALITY_VALIDATION",
  "PRODUCTION_ARTIFACT",
  "DEPLOYMENT_PREPARATION",
] as const;

export const VALIDATION_PHASES = [
  "VENTURE_DEFINITION",
  "PRODUCT_SPECIFICATION",
  "MONETIZATION_CONFIGURATION",
] as const;

export const BUILD_EXECUTION_STATUSES = [
  "PLANNED",
  "READY_TO_EXECUTE",
  "EXECUTING",
  "BLOCKED",
  "REPAIR_REQUIRED",
  "VALIDATING",
  "BUILT",
  "FAILED",
] as const;

export const TASK_STATUSES = [
  "PENDING",
  "READY",
  "RUNNING",
  "BLOCKED",
  "REPAIR_REQUIRED",
  "VALIDATING",
  "COMPLETED",
  "FAILED",
] as const;

export const CANONICAL_FOOTER_COPY =
  "Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR" as const;
export const CANONICAL_INFINITY_OS_URL = "https://imros.io" as const;
export const CANONICAL_IMR_URL = "https://infinitemediaresources.com" as const;
export const CANONICAL_INFINITY_OS_LABEL = "An Infinity OS Venture" as const;
export const REJECTED_INFINITE_OS_VENTURE_LABEL = "An Infinite OS Venture" as const;
export const CANONICAL_IMR_LABEL = "By IMR" as const;
export const CANONICAL_PRIVACY_LABEL = "Privacy Policy" as const;
export const CANONICAL_TERMS_LABEL = "Terms of Service" as const;
export const CANONICAL_SITEMAP_LABEL = "Sitemap" as const;
export const CANONICAL_PRIVACY_HREF = "/privacy-policy/" as const;
export const CANONICAL_TERMS_HREF = "/terms-of-service/" as const;
export const CANONICAL_SITEMAP_HREF = "/sitemap.xml" as const;
export const LIVE_DEPLOYED_FOOTER_COPY = "An Infinity OS Venture · By IMR" as const;

export const MAX_REPAIR_ATTEMPTS = 2;
export const PLAN_VERSION = 1;
export const BUILD_PACKAGE_VERSION = 1;

export const GENERIC_MVP_FORBIDDEN = [
  "create website",
  "add login",
  "add dashboard",
] as const;

export const WRITE_BOUNDARY = {
  missionWrites: 0,
  ventureStateWrites: 0,
  deployments: 0,
  domainPurchases: 0,
  dnsWrites: 0,
  paymentWrites: 0,
  treasuryMovements: 0,
  adSpend: 0,
  publicLaunches: 0,
} as const;
