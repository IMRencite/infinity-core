import {
  ACCESSIBILITY_QC_GATE,
  CANONICAL_FOOTER_COPY,
  CUSTOMER_AUTH_QC_GATE,
  CUSTOMER_PERSISTENCE_QC_GATE,
  DESIGN_QUALITY_QC_GATE,
  DOMAIN_SSL_QC_GATE,
  ERROR_STATE_QC_GATE,
  LEGAL_TRUST_QC_GATE,
  PERFORMANCE_QC_GATE,
  RESPONSIVE_QC_GATE,
  RESULT_UX_QC_GATE,
  SEO_PUBLIC_INDEXABILITY_QC_GATE,
  type NamedSystemGate,
} from "./contract";

export function evaluateCustomerAuthQCGate(input: {
  signup?: boolean | "N/A";
  login: boolean;
  logout: boolean;
  session_persistence: boolean;
  protected_route: boolean;
  unauthenticated_redirect: boolean;
  account_isolation: boolean;
  password_reset?: boolean | "N/A";
}): NamedSystemGate {
  const reasons: string[] = [];
  if (input.signup !== "N/A" && input.signup === false) reasons.push("SIGNUP_FAILED");
  if (!input.login) reasons.push("LOGIN_FAILED");
  if (!input.logout) reasons.push("LOGOUT_FAILED");
  if (!input.session_persistence) reasons.push("SESSION_NOT_PERSISTED");
  if (!input.protected_route) reasons.push("PROTECTED_ROUTE_FAILED");
  if (!input.unauthenticated_redirect) reasons.push("UNAUTHENTICATED_REDIRECT_FAILED");
  if (!input.account_isolation) reasons.push("ACCOUNT_ISOLATION_FAILED");
  if (input.password_reset !== "N/A" && input.password_reset === false) reasons.push("PASSWORD_RESET_FAILED");
  return { gate: CUSTOMER_AUTH_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateCustomerPersistenceQCGate(input: {
  create: boolean;
  save: boolean;
  retrieve: boolean;
  update: boolean;
  return_later: boolean;
  account_isolation: boolean;
  recent_only_shortcut: boolean;
}): NamedSystemGate {
  const reasons: string[] = [];
  if (!input.create) reasons.push("CREATE_FAILED");
  if (!input.save) reasons.push("SAVE_FAILED");
  if (!input.retrieve) reasons.push("RETRIEVE_FAILED");
  if (!input.update) reasons.push("UPDATE_FAILED");
  if (!input.return_later) reasons.push("RETURN_LATER_FAILED");
  if (!input.account_isolation) reasons.push("ACCOUNT_ISOLATION_FAILED");
  if (input.recent_only_shortcut) reasons.push("RECENT_RECORD_SHORTCUT_HIDES_HISTORY");
  return { gate: CUSTOMER_PERSISTENCE_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateResultUxQCGate(input: {
  understandable: boolean;
  structured: boolean;
  interpretable: boolean;
  actionable: boolean;
  raw_computation_only: boolean;
  dead_end: boolean;
}): NamedSystemGate {
  const reasons: string[] = [];
  if (!input.understandable) reasons.push("RESULTS_NOT_UNDERSTANDABLE");
  if (!input.structured) reasons.push("RESULTS_NOT_STRUCTURED");
  if (!input.interpretable) reasons.push("RESULTS_NOT_INTERPRETABLE");
  if (!input.actionable) reasons.push("RESULTS_NOT_ACTIONABLE");
  if (input.raw_computation_only) reasons.push("RAW_COMPUTATION_OUTPUT_IS_NOT_FINISHED_PRODUCT_UX");
  if (input.dead_end) reasons.push("DEAD_END_WORKFLOW");
  return { gate: RESULT_UX_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateLegalTrustQCGate(input: {
  privacy_policy: boolean;
  terms_of_service: boolean;
  sitemap: boolean;
  footer_links: boolean;
  venture_identity: boolean;
  contact_or_support: boolean;
  pricing_clarity?: boolean | "N/A";
  footer_copy?: string;
}): NamedSystemGate {
  const reasons: string[] = [];
  if (!input.privacy_policy) reasons.push("PRIVACY_POLICY_MISSING");
  if (!input.terms_of_service) reasons.push("TERMS_MISSING");
  if (!input.sitemap) reasons.push("SITEMAP_MISSING");
  if (!input.footer_links) reasons.push("FOOTER_LINKS_MISSING");
  if (!input.venture_identity) reasons.push("VENTURE_IDENTITY_MISSING");
  if (!input.contact_or_support) reasons.push("CONTACT_SUPPORT_MISSING");
  if (input.pricing_clarity !== "N/A" && input.pricing_clarity === false) reasons.push("PRICING_UNCLEAR");
  const copy = input.footer_copy ?? "";
  if (copy && !copy.includes("Privacy Policy")) reasons.push("FOOTER_PRIVACY_COPY_MISSING");
  if (copy && !copy.includes("Terms of Service")) reasons.push("FOOTER_TERMS_COPY_MISSING");
  if (copy && !copy.includes("Sitemap")) reasons.push("FOOTER_SITEMAP_COPY_MISSING");
  if (copy && !copy.includes("An Infinity OS Venture")) reasons.push("FOOTER_INFINITY_OS_COPY_MISSING");
  if (copy && !copy.includes("By IMR")) reasons.push("FOOTER_IMR_COPY_MISSING");
  return { gate: LEGAL_TRUST_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function canonicalFooterRequired(): typeof CANONICAL_FOOTER_COPY {
  return CANONICAL_FOOTER_COPY;
}

export function evaluateDomainSslQCGate(input: {
  domain_resolves: boolean;
  https_works: boolean;
  certificate_valid: boolean;
  canonical_domain_correct: boolean;
  preview_domain_leakage: boolean;
  redirects_sane: boolean;
}): NamedSystemGate {
  const reasons: string[] = [];
  if (!input.domain_resolves) reasons.push("DOMAIN_DOES_NOT_RESOLVE");
  if (!input.https_works) reasons.push("HTTPS_FAILED");
  if (!input.certificate_valid) reasons.push("CERTIFICATE_INVALID");
  if (!input.canonical_domain_correct) reasons.push("CANONICAL_DOMAIN_INCORRECT");
  if (input.preview_domain_leakage) reasons.push("PREVIEW_DOMAIN_LEAKAGE");
  if (!input.redirects_sane) reasons.push("REDIRECTS_INSANE");
  return { gate: DOMAIN_SSL_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateSeoPublicIndexabilityQCGate(input: {
  applicable: boolean;
  title: boolean;
  description: boolean;
  canonical: boolean;
  robots: boolean;
  sitemap: boolean;
  indexable: boolean;
  broken_public_links: boolean;
}): NamedSystemGate {
  if (!input.applicable) {
    return { gate: SEO_PUBLIC_INDEXABILITY_QC_GATE, result: "PASS", reasons: ["NOT_APPLICABLE_APP_ONLY"] };
  }
  const reasons: string[] = [];
  if (!input.title) reasons.push("TITLE_MISSING");
  if (!input.description) reasons.push("DESCRIPTION_MISSING");
  if (!input.canonical) reasons.push("CANONICAL_MISSING");
  if (!input.robots) reasons.push("ROBOTS_MISSING");
  if (!input.sitemap) reasons.push("SITEMAP_MISSING");
  if (!input.indexable) reasons.push("NOT_INDEXABLE");
  if (input.broken_public_links) reasons.push("BROKEN_PUBLIC_LINKS");
  return { gate: SEO_PUBLIC_INDEXABILITY_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateResponsiveQCGate(input: {
  desktop_ok: boolean;
  tablet_ok?: boolean | "N/A";
  mobile_ok: boolean;
  overflow: boolean;
  clipping: boolean;
  navigation_ok: boolean;
  dialogs_ok: boolean;
  forms_ok: boolean;
  ctas_ok: boolean;
  primary_mobile_cta_accessible: boolean;
}): NamedSystemGate {
  const reasons: string[] = [];
  if (!input.desktop_ok) reasons.push("DESKTOP_FAILED");
  if (input.tablet_ok !== "N/A" && input.tablet_ok === false) reasons.push("TABLET_FAILED");
  if (!input.mobile_ok) reasons.push("MOBILE_FAILED");
  if (input.overflow) reasons.push("OVERFLOW");
  if (input.clipping) reasons.push("CLIPPING");
  if (!input.navigation_ok) reasons.push("NAVIGATION_BROKEN");
  if (!input.dialogs_ok) reasons.push("DIALOGS_BROKEN");
  if (!input.forms_ok) reasons.push("FORMS_BROKEN");
  if (!input.ctas_ok) reasons.push("CTAS_BROKEN");
  if (!input.primary_mobile_cta_accessible) reasons.push("PRIMARY_MOBILE_CTA_INACCESSIBLE");
  return { gate: RESPONSIVE_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateAccessibilityQCGate(input: {
  keyboard: boolean;
  focus: boolean;
  labels: boolean;
  semantic_headings: boolean;
  form_errors: boolean;
  dialogs: boolean;
  accessible_names: boolean;
  contrast?: boolean | "UNMEASURED";
  screen_reader_semantics: boolean;
}): NamedSystemGate {
  const reasons: string[] = [];
  if (!input.keyboard) reasons.push("KEYBOARD_FAILED");
  if (!input.focus) reasons.push("FOCUS_FAILED");
  if (!input.labels) reasons.push("LABELS_MISSING");
  if (!input.semantic_headings) reasons.push("HEADINGS_FAILED");
  if (!input.form_errors) reasons.push("FORM_ERRORS_INACCESSIBLE");
  if (!input.dialogs) reasons.push("DIALOGS_INACCESSIBLE");
  if (!input.accessible_names) reasons.push("ACCESSIBLE_NAMES_MISSING");
  if (input.contrast === false) reasons.push("CONTRAST_FAILED");
  if (!input.screen_reader_semantics) reasons.push("SCREEN_READER_SEMANTICS_FAILED");
  return { gate: ACCESSIBILITY_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluatePerformanceQCGate(input: {
  page_load_ok: boolean;
  route_load_ok: boolean;
  api_latency_ok: boolean;
  blocking_requests_ok: boolean;
}): NamedSystemGate {
  const reasons: string[] = [];
  if (!input.page_load_ok) reasons.push("PAGE_LOAD_EXCEEDED_VENTURE_LIMIT");
  if (!input.route_load_ok) reasons.push("ROUTE_LOAD_EXCEEDED_VENTURE_LIMIT");
  if (!input.api_latency_ok) reasons.push("API_LATENCY_EXCEEDED_VENTURE_LIMIT");
  if (!input.blocking_requests_ok) reasons.push("BLOCKING_REQUESTS_FAILED");
  return { gate: PERFORMANCE_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateErrorStateQCGate(input: {
  api_unavailable_controlled: boolean;
  invalid_form_controlled: boolean;
  auth_expired_controlled: boolean;
  checkout_unavailable_controlled: boolean;
  submission_failure_controlled: boolean;
  raw_stack_trace: boolean;
  raw_json_leaked: boolean;
}): NamedSystemGate {
  const reasons: string[] = [];
  if (!input.api_unavailable_controlled) reasons.push("API_UNAVAILABLE_UNCONTROLLED");
  if (!input.invalid_form_controlled) reasons.push("INVALID_FORM_UNCONTROLLED");
  if (!input.auth_expired_controlled) reasons.push("AUTH_EXPIRED_UNCONTROLLED");
  if (!input.checkout_unavailable_controlled) reasons.push("CHECKOUT_UNAVAILABLE_UNCONTROLLED");
  if (!input.submission_failure_controlled) reasons.push("SUBMISSION_FAILURE_UNCONTROLLED");
  if (input.raw_stack_trace) reasons.push("RAW_STACK_TRACE");
  if (input.raw_json_leaked) reasons.push("RAW_JSON_LEAKED");
  return { gate: ERROR_STATE_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateDesignQualityQCGate(input: {
  unstyled_new_feature: boolean;
  generic_raw_component: boolean;
  broken_hierarchy: boolean;
  bad_spacing: boolean;
  low_quality_ai_surface: boolean;
}): NamedSystemGate {
  const reasons: string[] = [];
  if (input.unstyled_new_feature) reasons.push("UNSTYLED_NEW_FEATURE");
  if (input.generic_raw_component) reasons.push("GENERIC_RAW_COMPONENT");
  if (input.broken_hierarchy) reasons.push("BROKEN_HIERARCHY");
  if (input.bad_spacing) reasons.push("BAD_SPACING");
  if (input.low_quality_ai_surface) reasons.push("LOW_QUALITY_AI_LOOKING_SURFACE");
  return { gate: DESIGN_QUALITY_QC_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}
