export {
  VALIDATION_GRADE_PUBLIC_VENTURE_TEMPLATE_V1,
  VALIDATION_GRADE_MATURITY,
  VALIDATION_QUALITY_STATES,
  CANONICAL_FOOTER_VISIBLE_FORMAT,
  CANONICAL_PRIVACY_LABEL,
  CANONICAL_TERMS_LABEL,
  CANONICAL_SITEMAP_LABEL,
  CANONICAL_INFINITY_OS_VENTURE_LABEL,
  CANONICAL_INFINITE_OS_VENTURE_LABEL,
  REJECTED_INFINITE_OS_VENTURE_LABEL,
  CANONICAL_IMR_BY_LABEL,
  CANONICAL_PRIVACY_HREF,
  CANONICAL_TERMS_HREF,
  CANONICAL_SITEMAP_HREF,
  CANONICAL_INFINITE_OS_URL,
  CANONICAL_IMR_URL,
  LIVE_DEPLOYED_FOOTER_COPY,
  LIVE_DEPLOYED_INFINITY_OS_LABEL,
  LEGAL_CONFIGURATION_REQUIRED,
} from "./constants";
export type { ValidationQualityState } from "./constants";
export { validationGradeGlobalCss } from "./css";
export { validationGradePrimitivesSource } from "./primitives";
export {
  validationLandingLegalFacts,
  fullProductLegalFacts,
  privacyPolicySource,
  termsOfServiceSource,
  sitemapSource,
} from "./legal";
export type { LegalBehaviorFacts } from "./legal";
export {
  auditValidationGrade,
  auditFooterContract,
  evaluatePublicLegalCompleteness,
  classifyLiveDeployedCreLanding,
} from "./quality-gate";
export type { ValidationGradeAudit, StructuralCheck } from "./quality-gate";
