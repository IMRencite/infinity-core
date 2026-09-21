import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { readLiveCommercialCheckoutHealth } from "@/lib/infinity/venture-operating-scale/occupancynpv-live-checkout-health";
import {
  readOccupancynpvDashboardQcEvidence,
  readOccupancynpvResultQcEvidence,
} from "@/lib/infinity/venture-operating-scale/occupancynpv-customer-facing-ui-qc";
import { readCanonicalProductionOperatingState } from "@/lib/infinity/growth-engine/hq-runtime-projection";
import { realFeedbackCount } from "@/lib/infinity/product-improvement-loop/ingest";
import type { QcStatus } from "./contract";
import { occupancynpvCommercialOfferVerification, occupancynpvCustomerPageDepthVerification, type OccupancynpvSystemEvidence } from "./occupancynpv";
import { readOccupancynpvLiveOfferSurface } from "@/lib/infinity/venture-operating-scale/occupancynpv-live-offer-surface";
import type { HqSurfaceEvidence } from "./hq-qc";
import type { DevServerProcessObservation } from "./dev-server";
import type { SystemVerificationInput } from "./matrix";
import { evaluateVentureDesignSystemConformanceGate, htmlHasRawSubmit } from "./visual";

export type OccupancynpvLiveSurfaceSnapshot = {
  captured_at: string;
  homepage_status: number | null;
  homepage_html?: string;
  suggest_status: number | null;
  suggest_html?: string;
  pricing_html?: string;
  login_status: number | null;
  privacy_status: number | null;
  terms_status: number | null;
  sitemap_status: number | null;
  https_ok: boolean;
  domain_host: string;
};

function verification(
  system_id: SystemVerificationInput["system_id"],
  status: QcStatus,
  input: {
    at?: string | null;
    level?: SystemVerificationInput["verification_level"];
    environment?: SystemVerificationInput["environment"];
    evidence?: string | null;
    reason?: string | null;
  } = {},
): SystemVerificationInput {
  return {
    system_id,
    status,
    verification_level: input.level ?? (status === "UNKNOWN" ? "UNCHECKED" : "LIVE_PRODUCTION"),
    environment: input.environment ?? (status === "UNKNOWN" ? undefined : "LIVE_PRODUCTION"),
    last_verified_at: status === "UNKNOWN" ? null : input.at ?? null,
    evidence_reference: input.evidence ?? null,
    failure_reason: status === "PASS" || status === "NOT_APPLICABLE" ? null : input.reason ?? (status === "UNKNOWN" ? "NOT_CHECKED" : status),
  };
}

function htmlHas(html: string | undefined, pattern: RegExp | string): boolean {
  if (!html) return false;
  return typeof pattern === "string" ? html.includes(pattern) : pattern.test(html);
}

export function buildOccupancynpvCurrentEvidence(input: {
  now?: string;
  live?: OccupancynpvLiveSurfaceSnapshot | null;
  browser_console?: readonly string[];
  browser_network_ok?: boolean;
  trigger_clickable?: boolean;
  form_submit?: boolean;
  success_state?: boolean;
  mobile_verified?: boolean;
  canonical_pipeline?: boolean;
  computed_styles_match?: boolean;
  founder_physical_visual_fail?: boolean;
  accessibility_ok?: boolean;
  extras?: OccupancynpvSystemEvidence["extras"];
  auth_verified?: boolean;
  performance_ok?: boolean;
} = {}): OccupancynpvSystemEvidence {
  const now = input.now ?? new Date().toISOString();
  const live = input.live ?? null;
  const checkout = readLiveCommercialCheckoutHealth();
  const dashboardQc = readOccupancynpvDashboardQcEvidence();
  const resultQc = readOccupancynpvResultQcEvidence();
  const growth = readCanonicalProductionOperatingState();
  const homepageOk = Boolean(live && live.homepage_status === 200 && htmlHas(live.homepage_html, "OccupancyNPV"));
  const suggestVisible = Boolean(
    live
    && live.suggest_status === 200
    && htmlHas(live.suggest_html, "Suggest an Improvement"),
  );
  const globalTrigger = Boolean(
    live
    && live.homepage_status === 200
    && (htmlHas(live.homepage_html, "Suggest an Improvement") || htmlHas(live.homepage_html, "/suggest-improvement")),
  );
  const formFields = Boolean(
    live
    && suggestVisible
    && (htmlHas(live.suggest_html, "required") || htmlHas(live.suggest_html, "textarea") || htmlHas(live.suggest_html, "name=")),
  );
  const formVentureStyled = Boolean(
    live
    && suggestVisible
    && htmlHas(live.suggest_html, "vg-cta")
    && htmlHas(live.suggest_html, "vg-textarea")
    && htmlHas(live.suggest_html, "vg-input")
    && htmlHas(live.suggest_html, "vg-form-field"),
  );
  const rawSubmit = htmlHasRawSubmit(live?.suggest_html ?? "");
  const design = live?.suggest_html
    ? evaluateVentureDesignSystemConformanceGate({ html: live.suggest_html })
    : null;
  const formProductionQuality = Boolean(formFields && formVentureStyled && !rawSubmit && design?.result === "PASS");
  const designQualityStatus: QcStatus = !live
    ? "UNKNOWN"
    : input.founder_physical_visual_fail || rawSubmit || !formVentureStyled || design?.result === "FAIL"
      ? "FAIL"
      : input.computed_styles_match === false
        ? "FAIL"
        : input.computed_styles_match === true
          ? "PASS"
          : "FAIL";
  const liveOfferHtml = live?.pricing_html ?? readOccupancynpvLiveOfferSurface()?.html;
  const pricingOk = Boolean(
    (htmlHas(live?.homepage_html, "$290") || htmlHas(liveOfferHtml, "$290"))
    && (htmlHas(live?.homepage_html, "$149") || htmlHas(liveOfferHtml, "$149")),
  );
  const legalOk = Boolean(
    live
    && live.privacy_status === 200
    && live.terms_status === 200
    && live.sitemap_status === 200
    && htmlHas(live.homepage_html, "An Infinity OS Venture")
    && htmlHas(live.homepage_html, "By IMR"),
  );
  const domainOk = Boolean(live && live.https_ok && live.domain_host === "occupancynpv.com");
  const paymentStatus: QcStatus = checkout?.result === "FAIL" ? "FAIL" : checkout?.result === "PASS" ? "PASS" : "UNKNOWN";
  const growthStatus: QcStatus = growth?.campaign.status ? "PASS" : "UNKNOWN";
  const gmailStatus: QcStatus = growth?.gmail === "FAIL" ? "FAIL" : growth?.gmail === "PASS" ? "PASS" : "UNKNOWN";
  const geminiStatus: QcStatus = growth?.selectedProvider ? "PASS" : "UNKNOWN";
  const queueStatus: QcStatus = growth?.durableQueue || growth?.funnel.queueState
    ? growth.funnel.queueState === "NONE" && (growth.durableQueue?.depth ?? 0) === 0
      ? "PARTIAL"
      : "PASS"
    : "UNKNOWN";
  const replyStatus: QcStatus = growth?.automation.replyRetrieval
    ? growth.automation.replyRetrieval.toUpperCase().includes("NONE") || growth.automation.overall === "NONE"
      ? "PARTIAL"
      : "PASS"
    : "UNKNOWN";

  return {
    now,
    public_site: verification("PUBLIC_SITE", homepageOk ? "PASS" : live ? "FAIL" : "UNKNOWN", {
      at: live?.captured_at,
      evidence: "LIVE_PRODUCTION:occupancynpv.com/",
      reason: homepageOk ? null : "HOMEPAGE_UNVERIFIED_OR_FAILED",
    }),
    navigation: verification("NAVIGATION", globalTrigger && legalOk ? "PASS" : live ? "PARTIAL" : "UNKNOWN", {
      at: live?.captured_at,
      evidence: "LIVE_PRODUCTION:header+footer",
      reason: live ? "NAVIGATION_NOT_CLICK_VERIFIED" : "NOT_CHECKED",
      level: "LIVE_PRODUCTION",
    }),
    calculator: verification("PRODUCT_WORKFLOW", dashboardQc ? "PASS" : "UNKNOWN", {
      at: dashboardQc?.validatedAt,
      evidence: "occupancynpv-dashboard-qc-evidence.json",
      reason: dashboardQc ? null : "CALCULATOR_QC_EVIDENCE_MISSING",
      level: dashboardQc ? "SERVED_LOCAL" : "UNCHECKED",
      environment: "LOCAL_DEV",
    }),
    results: verification("RESULTS", resultQc ? "PASS" : "UNKNOWN", {
      at: resultQc?.validatedAt,
      evidence: "occupancynpv-result-qc-evidence.json",
      reason: resultQc ? null : "RESULT_UX_EVIDENCE_MISSING",
      level: resultQc ? "SERVED_LOCAL" : "UNCHECKED",
      environment: "LOCAL_DEV",
    }),
    pricing: verification("SUBSCRIPTION", pricingOk ? "PASS" : live ? "FAIL" : "UNKNOWN", {
      at: live?.captured_at,
      evidence: "LIVE_PRODUCTION:pricing",
      reason: pricingOk ? null : "PRICING_UNVERIFIED",
    }),
    login_account: verification("AUTH", input.auth_verified ? "PASS" : live?.login_status === 200 ? "PARTIAL" : "UNKNOWN", {
      at: live?.captured_at,
      evidence: "LIVE_PRODUCTION:/occupancynpv/app/login",
      reason: input.auth_verified ? null : "LOGIN_PAGE_NOT_FULL_AUTH_QC",
    }),
    checkout: verification("CHECKOUT", paymentStatus, {
      at: checkout?.detectedAt,
      evidence: "occupancynpv-live-checkout-health.json",
      reason: paymentStatus === "PASS" ? null : "CHECKOUT_HEALTH_NOT_PASS",
    }),
    payment: verification("PAYMENT", paymentStatus, {
      at: checkout?.detectedAt,
      evidence: "occupancynpv-live-checkout-health.json",
      reason: paymentStatus === "PASS" ? null : "PAYMENT_HEALTH_NOT_PASS",
    }),
    fulfillment: verification("FULFILLMENT", checkout?.fulfillment === "FAIL" ? "FAIL" : checkout?.fulfillment === "PASS" ? "PASS" : "UNKNOWN", {
      at: checkout?.detectedAt,
      evidence: "occupancynpv-live-checkout-health.json#fulfillment",
      reason: checkout?.fulfillment === "PASS" ? null : "FULFILLMENT_HEALTH_NOT_PASS",
    }),
    growth: verification("GROWTH", growthStatus, {
      at: growth?.runtime.lastVerifiedAt,
      evidence: "production-operating-state.json",
      reason: growthStatus === "PASS" ? null : "GROWTH_STATE_UNVERIFIED",
    }),
    gmail: verification("GROWTH_GMAIL", gmailStatus, {
      at: growth?.runtime.lastVerifiedAt,
      evidence: "production.gmail",
      reason: gmailStatus === "PASS" ? null : "GMAIL_NOT_PASS",
    }),
    gemini: verification("GROWTH_GEMINI", geminiStatus, {
      at: growth?.runtime.lastVerifiedAt,
      evidence: "production.selectedProvider",
      reason: geminiStatus === "PASS" ? null : "GEMINI_UNVERIFIED",
    }),
    durable_queue: verification("GROWTH_DURABLE_QUEUE", queueStatus, {
      at: growth?.runtime.lastVerifiedAt,
      evidence: "production.durableQueue",
      reason: queueStatus === "PASS" ? null : "DURABLE_QUEUE_INCOMPLETE",
    }),
    reply_handling: verification("GROWTH_REPLY_HANDLING", replyStatus, {
      at: growth?.runtime.lastVerifiedAt,
      evidence: "production.automation.replyRetrieval",
      reason: replyStatus === "PASS" ? null : "REPLY_HANDLING_INCOMPLETE",
    }),
    improvement_intake: verification(
      "IMPROVEMENT_INTAKE",
      !live
        ? "UNKNOWN"
        : !(globalTrigger && formProductionQuality)
          ? "FAIL"
          : input.form_submit && input.success_state && input.canonical_pipeline
            ? "PASS"
            : "PARTIAL",
      {
      at: live?.captured_at,
      evidence: "LIVE_PRODUCTION:/suggest-improvement",
      reason: !formProductionQuality
        ? "IMPROVEMENT_FORM_NOT_PRODUCTION_QUALITY"
        : input.form_submit && input.success_state && input.canonical_pipeline
          ? null
          : "CLICK_SUBMIT_CANONICAL_PIPELINE_UNPROVEN",
      level: "LIVE_PRODUCTION",
      environment: "LIVE_PRODUCTION",
    }),
    customer_page_depth: occupancynpvCustomerPageDepthVerification({
      html: liveOfferHtml || undefined,
      at: live?.captured_at ?? now,
    }),
    design_quality: verification("DESIGN_QUALITY", designQualityStatus, {
      at: live?.captured_at,
      evidence: "LIVE_PRODUCTION:/suggest-improvement#rendered-visual",
      reason: designQualityStatus === "PASS"
        ? null
        : !live
          ? "DESIGN_QUALITY_NOT_CHECKED"
          : input.computed_styles_match === false
            ? "CLASS_PRESENT_STYLE_NOT_APPLIED"
            : rawSubmit || !formVentureStyled
              ? "BROWSER_DEFAULT_OR_UNSTYLED_CONTROLS"
              : "COMPUTED_STYLE_UNVERIFIED",
      level: input.computed_styles_match ? "LIVE_PRODUCTION" : "UNCHECKED",
    }),
    legal: verification("LEGAL", legalOk ? "PASS" : live ? "FAIL" : "UNKNOWN", {
      at: live?.captured_at,
      evidence: "LIVE_PRODUCTION:footer+legal",
      reason: legalOk ? null : "LEGAL_FOOTER_UNVERIFIED",
    }),
    mobile: verification("MOBILE", input.mobile_verified ? "PASS" : "UNKNOWN", {
      reason: "MOBILE_VIEWPORT_NOT_BROWSER_VERIFIED",
    }),
    accessibility: verification("ACCESSIBILITY", input.accessibility_ok ? "PASS" : "UNKNOWN", {
      at: input.accessibility_ok ? now : null,
      reason: input.accessibility_ok ? null : "ACCESSIBILITY_NOT_BROWSER_VERIFIED",
    }),
    console: verification("CONSOLE", input.browser_console ? (input.browser_console.some((row) => /TypeError|Failed to fetch|Hydration/i.test(row)) ? "FAIL" : "PASS") : "UNKNOWN", {
      at: input.browser_console ? now : null,
      reason: input.browser_console ? null : "BROWSER_CONSOLE_NOT_CAPTURED",
      environment: "LIVE_PRODUCTION",
    }),
    network: verification("NETWORK", input.browser_network_ok === false ? "FAIL" : input.browser_network_ok ? "PASS" : homepageOk ? "PARTIAL" : "UNKNOWN", {
      at: live?.captured_at,
      reason: input.browser_network_ok == null ? "CRITICAL_BROWSER_NETWORK_NOT_CAPTURED" : null,
    }),
    domain_ssl: verification("DOMAIN", domainOk ? "PASS" : live ? "FAIL" : "UNKNOWN", {
      at: live?.captured_at,
      evidence: "https://occupancynpv.com",
      reason: domainOk ? null : "DOMAIN_SSL_UNVERIFIED",
    }),
    analytics: verification("ANALYTICS", input.performance_ok ? "PASS" : growth ? "PARTIAL" : "UNKNOWN", {
      at: input.performance_ok ? now : growth?.runtime.lastVerifiedAt,
      evidence: "production-operating-state.json#performance",
      reason: input.performance_ok ? null : "ANALYTICS_FRESHNESS_AND_SYNTHETIC_GUARD_UNVERIFIED",
    }),
    commercial_offer: occupancynpvCommercialOfferVerification({
      html: `${live?.homepage_html ?? ""}\n${live?.pricing_html ?? readOccupancynpvLiveOfferSurface()?.html ?? ""}`.trim() || undefined,
      at: live?.captured_at ?? readOccupancynpvLiveOfferSurface()?.captured_at ?? now,
    }).verification,
    improvement: {
      global_trigger: globalTrigger ? "PASS" : "FAIL",
      trigger_clickable: input.trigger_clickable ? "PASS" : "FAIL",
      form: formProductionQuality ? "PASS" : "FAIL",
      submission: input.form_submit ? "PASS" : "FAIL",
      success_state: input.success_state ? "PASS" : "FAIL",
      mobile: input.mobile_verified ? "PASS" : "FAIL",
      canonical_pipeline: input.canonical_pipeline ? "PASS" : "FAIL",
      real_customer_feedback: realFeedbackCount(CRE_VENTURE_ID),
    },
    extras: input.extras ?? [],
  };
}

export function buildHqCurrentSurfaceEvidence(input: {
  served?: Partial<Record<HqSurfaceEvidence["surface"], { status: number | null; html?: string }>>;
} = {}): HqSurfaceEvidence[] {
  return [
    { surface: "dashboard", status: htmlStatus(input.served?.dashboard, "HQ Command") },
    { surface: "hq_command", status: htmlStatus(input.served?.dashboard, "HQ Command") },
    { surface: "operating_floor", status: htmlStatus(input.served?.dashboard, "Operating Floor") },
    { surface: "operations", status: htmlStatus(input.served?.operations, "Operations") },
    { surface: "venture_radar", status: htmlStatus(input.served?.dashboard, "Venture Radar") },
    { surface: "profit_lab", status: htmlStatus(input.served?.dashboard, "Profit Lab") },
    { surface: "research_grid", status: htmlStatus(input.served?.dashboard, "Research Grid") },
    { surface: "systems_architect", status: htmlStatus(input.served?.dashboard, "Systems Architect") },
    { surface: "blueprint_lab", status: htmlStatus(input.served?.dashboard, "Blueprint Lab") },
    { surface: "growth_nexus", status: htmlStatus(input.served?.dashboard, "Growth Nexus") },
    { surface: "creation_lab", status: htmlStatus(input.served?.dashboard, "Creation Lab") },
    { surface: "design_core", status: htmlStatus(input.served?.dashboard, "Design Core") },
    { surface: "validation_station", status: htmlStatus(input.served?.dashboard, "Validation Station") },
    { surface: "deployment_depot", status: htmlStatus(input.served?.dashboard, "Deployment Depot") },
    { surface: "signal_intelligence", status: htmlStatus(input.served?.dashboard, "Signal Intelligence") },
    { surface: "venture_selection", status: htmlStatus(input.served?.dashboard, "OccupancyNPV") },
    { surface: "venture_detail", status: htmlStatus(input.served?.venture_detail, "Venture QC") },
    { surface: "runtime_state", status: htmlStatus(input.served?.dashboard, "OccupancyNPV") },
    { surface: "console", status: "UNKNOWN" },
    { surface: "network", status: input.served?.dashboard?.status === 200 ? "PARTIAL" : "UNKNOWN" },
    { surface: "navigation", status: input.served?.dashboard?.status === 200 ? "PARTIAL" : "UNKNOWN" },
    { surface: "dev_server_process_health", status: "UNKNOWN" },
  ];
  function htmlStatus(row: { status: number | null; html?: string } | undefined, needle: string): QcStatus {
    if (!row) return "UNKNOWN";
    if (row.status !== 200) return "FAIL";
    if (row.html && needle && !row.html.includes(needle)) return "FAIL";
    return row.html ? "PASS" : "PARTIAL";
  }
}

export function healthyLocalDevServerObservation(): DevServerProcessObservation {
  return {
    processes: [{ pid: 1, command: "next dev", serving_port: 3000, hung: false }],
    expected_port: 3000,
    port_listeners: [3000],
    serving_runtime_started_at: new Date().toISOString(),
    hung_request_timeout: false,
  };
}

export function staleHungDevServerObservation(): DevServerProcessObservation {
  return {
    processes: [
      { pid: 58100, command: "next-server start-server", serving_port: 3000, hung: true, started_at: "2026-09-10T04:49:00.000Z" },
      { pid: 22728, command: "next dev", serving_port: 3000, hung: true },
    ],
    expected_port: 3000,
    port_listeners: [3000, 3000],
    serving_runtime_started_at: "2026-09-10T04:49:00.000Z",
    now: "2026-09-12T04:00:00.000Z",
    hung_request_timeout: true,
  };
}
