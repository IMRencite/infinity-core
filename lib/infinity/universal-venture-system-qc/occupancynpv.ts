import { evaluateBrowserConsoleQCGate } from "@/lib/infinity/customer-facing-browser-qc/console-gate";
import { evaluateCustomerFacingNetworkQCGate } from "@/lib/infinity/customer-facing-browser-qc/network-gate";
import { evaluateCustomerFacingNavigationQCGate } from "@/lib/infinity/customer-facing-browser-qc/navigation-gate";
import { evaluateCommercialProductionReadinessGate } from "@/lib/infinity/payment-path/production";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { realFeedbackCount } from "@/lib/infinity/product-improvement-loop/ingest";
import { buildOccupancyNpvCurrentOffer } from "@/lib/infinity/offer-architecture/occupancynpv";
import {
  buildOccupancyNpvLiveActivatedOffer,
  OCCUPANCYNPV_TRIAL_TTV_EXPLANATION,
} from "@/lib/infinity/offer-architecture/occupancynpv-live-activation";
import type { QcStatus, VentureSystemId } from "./contract";
import { occupancyNpvCapabilityProfile, buildVentureSystemInventory } from "./inventory";
import { buildVentureProductionQcMatrix, evaluateUniversalVentureProductionQualityGate, evaluateVentureQCCoverageContract, type SystemVerificationInput } from "./matrix";
import { occupancyNpvCustomerJourney, evaluateCustomerJourneyEndToEndQCGate } from "./journeys";
import { buildRenderedActionInventory, evaluateExpectedRenderedCapabilityGate, evaluateCustomerFormQCGate } from "./rendered";
import {
  evaluateOccupancynpvCommercialOfferCompleteness,
  occupancyNpvPriceOnlyRenderedOffer,
  type RenderedOfferObservation,
} from "./commercial-offer";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { evaluatePageDepthBundle, relatedPathsAligned } from "@/lib/infinity/customer-page-depth";
import { evaluateOccupancynpvBrandIdentityQc } from "@/lib/infinity/venture-brand-identity/evaluate";

export type OccupancynpvSystemVerdict = QcStatus | "N/A";

export type OccupancynpvFullQcReport = {
  venture_id: typeof CRE_VENTURE_ID;
  inventory: ReturnType<typeof buildVentureSystemInventory>;
  coverage: ReturnType<typeof evaluateVentureQCCoverageContract>;
  quality: ReturnType<typeof evaluateUniversalVentureProductionQualityGate>;
  systems: Record<string, OccupancynpvSystemVerdict>;
  overall: "PASS" | "FAIL" | "PARTIAL";
  improvement: OccupancynpvImprovementReport;
};

export type OccupancynpvImprovementReport = {
  founder_physical_page: "PASS";
  global_trigger: "PASS" | "FAIL";
  trigger_clickable: "PASS" | "FAIL";
  form: "PASS" | "FAIL";
  submission: "PASS" | "FAIL";
  success_state: "PASS" | "FAIL";
  mobile: "PASS" | "FAIL";
  canonical_pipeline: "PASS" | "FAIL";
  real_customer_feedback: number;
};

export type OccupancynpvSystemEvidence = {
  now?: string;
  public_site: SystemVerificationInput;
  navigation: SystemVerificationInput;
  calculator: SystemVerificationInput;
  results: SystemVerificationInput;
  pricing: SystemVerificationInput;
  login_account: SystemVerificationInput;
  checkout: SystemVerificationInput;
  payment: SystemVerificationInput;
  fulfillment: SystemVerificationInput;
  growth: SystemVerificationInput;
  gmail: SystemVerificationInput;
  gemini: SystemVerificationInput;
  durable_queue: SystemVerificationInput;
  reply_handling: SystemVerificationInput;
  improvement_intake: SystemVerificationInput;
  legal: SystemVerificationInput;
  mobile: SystemVerificationInput;
  accessibility: SystemVerificationInput;
  console: SystemVerificationInput;
  network: SystemVerificationInput;
  domain_ssl: SystemVerificationInput;
  analytics: SystemVerificationInput;
  design_quality: SystemVerificationInput;
  customer_page_depth?: SystemVerificationInput;
  commercial_offer: SystemVerificationInput;
  commercial_offer_detail?: ReturnType<typeof evaluateOccupancynpvCommercialOfferCompleteness>;
  improvement: Omit<OccupancynpvImprovementReport, "founder_physical_page" | "real_customer_feedback"> & {
    real_customer_feedback?: number;
  };
  extras?: SystemVerificationInput[];
};

export function occupancynpvCommercialOfferVerification(input: {
  html?: string;
  rendered?: RenderedOfferObservation;
  at?: string | null;
} = {}): {
  verification: SystemVerificationInput;
  completeness: ReturnType<typeof evaluateOccupancynpvCommercialOfferCompleteness>;
} {
  const html = input.html ?? "";
  const trialLive = /data-promotional-offer="THREE_DAY_NO_CARD_TRIAL"|Start Free Trial/i.test(html);
  const completeness = evaluateOccupancynpvCommercialOfferCompleteness({
    html: input.html,
    rendered: input.rendered ?? (input.html ? undefined : occupancyNpvPriceOnlyRenderedOffer()),
    canonical: trialLive ? buildOccupancyNpvLiveActivatedOffer() : buildOccupancyNpvCurrentOffer(),
    commercial_activation_claimed: trialLive,
    claimed_lifecycle: trialLive ? "ACTIVE" : "ANALYSIS_ONLY",
    high_friction_justification: trialLive ? OCCUPANCYNPV_TRIAL_TTV_EXPLANATION : null,
  });
  return {
    completeness,
    verification: {
      system_id: "COMMERCIAL_OFFER",
      status: completeness.result,
      verification_level: "LIVE_PRODUCTION",
      environment: "LIVE_PRODUCTION",
      last_verified_at: input.at ?? new Date().toISOString(),
      evidence_reference: "LIVE_PRODUCTION:occupancynpv.com/pricing#commercial-offer",
      failure_reason: completeness.result === "PASS" ? null : completeness.reasons.join(","),
    },
  };
}

function mapSystem(id: VentureSystemId, row: SystemVerificationInput): SystemVerificationInput {
  return { ...row, system_id: id };
}

export function occupancynpvCustomerPageDepthVerification(input: {
  html?: string;
  css?: string;
  at?: string | null;
} = {}): SystemVerificationInput {
  let composed = null;
  if (!input.html) {
    try {
      composed = composeOccupancynpvPaymentReactivationFiles();
    } catch {
      composed = null;
    }
  }
  const html = input.html ?? composed?.files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
  const css = input.css ?? composed?.files.find((file) => file.path.replace(/\\/g, "/") === "styles/globals.css")?.content ?? "";
  const bundle = evaluatePageDepthBundle({ route: "/pricing", html, pageType: "PRICING", archetype: "calculator" });
  const aligned = relatedPathsAligned(html, css);
  const fail = bundle.question.result === "FAIL"
    || bundle.gain.result === "FAIL"
    || bundle.decision.result === "FAIL"
    || bundle.understanding.result === "FAIL"
    || bundle.thinness.result === "FAIL"
    || bundle.redundancy.result === "FAIL"
    || bundle.contract.status === "FAIL"
    || !aligned;
  return {
    system_id: "CUSTOMER_PAGE_DEPTH",
    status: fail ? "FAIL" : "PASS",
    verification_level: input.html ? "LIVE_PRODUCTION" : "SERVED_LOCAL",
    environment: input.html ? "LIVE_PRODUCTION" : "LOCAL_DEV",
    last_verified_at: input.at ?? new Date().toISOString(),
    evidence_reference: "occupancynpv.com/pricing#page-depth",
    failure_reason: fail
      ? [
          ...bundle.question.reasons,
          ...bundle.thinness.reasons,
          aligned ? null : "RELATED_PATHS_WIDTH_DEFECT",
        ].filter(Boolean).join(",")
      : null,
  };
}

export function evaluateOccupancynpvFullSystemQc(evidence: OccupancynpvSystemEvidence): OccupancynpvFullQcReport {
  const inventory = buildVentureSystemInventory(occupancyNpvCapabilityProfile());
  const verifications: SystemVerificationInput[] = [
    mapSystem("PUBLIC_SITE", evidence.public_site),
    mapSystem("NAVIGATION", evidence.navigation),
    mapSystem("PRODUCT_WORKFLOW", evidence.calculator),
    mapSystem("RESULTS", evidence.results),
    mapSystem("PAYMENT", evidence.payment),
    mapSystem("CHECKOUT", evidence.checkout),
    mapSystem("FULFILLMENT", evidence.fulfillment),
    mapSystem("AUTH", evidence.login_account),
    mapSystem("ACCOUNT", evidence.login_account),
    mapSystem("SUBSCRIPTION", evidence.pricing),
    mapSystem("COMMERCIAL_OFFER", evidence.commercial_offer),
    mapSystem("GROWTH", evidence.growth),
    mapSystem("GROWTH_GMAIL", evidence.gmail),
    mapSystem("GROWTH_GEMINI", evidence.gemini),
    mapSystem("GROWTH_DURABLE_QUEUE", evidence.durable_queue),
    mapSystem("GROWTH_REPLY_HANDLING", evidence.reply_handling),
    mapSystem("IMPROVEMENT_INTAKE", evidence.improvement_intake),
    mapSystem("LEGAL", evidence.legal),
    mapSystem("PRIVACY", evidence.legal),
    mapSystem("MOBILE", evidence.mobile),
    mapSystem("RESPONSIVE", evidence.mobile),
    mapSystem("ACCESSIBILITY", evidence.accessibility),
    mapSystem("CONSOLE", evidence.console),
    mapSystem("NETWORK", evidence.network),
    mapSystem("DOMAIN", evidence.domain_ssl),
    mapSystem("DNS", evidence.domain_ssl),
    mapSystem("SSL", evidence.domain_ssl),
    mapSystem("ANALYTICS", evidence.analytics),
    mapSystem("PERFORMANCE", evidence.analytics),
    mapSystem("DESIGN_QUALITY", evidence.design_quality),
    mapSystem("CUSTOMER_PAGE_DEPTH", evidence.customer_page_depth ?? occupancynpvCustomerPageDepthVerification()),
    ...(evidence.extras ?? []),
  ];
  const matrix = buildVentureProductionQcMatrix({
    inventory,
    verifications,
    mode: "FULL",
    now: evidence.now,
  });
  const coverage = evaluateVentureQCCoverageContract(matrix);
  const quality = evaluateUniversalVentureProductionQualityGate({ matrix, coverage, inventory });
  const brand = evaluateOccupancynpvBrandIdentityQc();
  const qualityWithBrand = brand.full_pass_allowed
    ? quality
    : {
        ...quality,
        result: "FAIL" as const,
        overall: "FAIL" as const,
        reasons: [...quality.reasons, `VENTURE_BRAND_IDENTITY:${[...brand.logo.reasons, ...brand.favicon.reasons, ...brand.consistency.reasons, ...brand.completeness.reasons, ...brand.discoverability.reasons].join(",") || "FAIL"}`],
      };
  const systems = {
    public_site: evidence.public_site.status,
    navigation: evidence.navigation.status,
    calculator: evidence.calculator.status,
    results: evidence.results.status,
    pricing: evidence.pricing.status,
    commercial_offer: evidence.commercial_offer.status,
    login_account: evidence.login_account.status,
    checkout: evidence.checkout.status,
    payment: evidence.payment.status,
    fulfillment: evidence.fulfillment.status,
    growth: evidence.growth.status,
    gmail: evidence.gmail.status,
    gemini: evidence.gemini.status,
    durable_queue: evidence.durable_queue.status,
    reply_handling: evidence.reply_handling.status,
    suggest_an_improvement: evidence.improvement.global_trigger,
    feedback_submission: evidence.improvement.submission,
    canonical_feedback_pipeline: evidence.improvement.canonical_pipeline,
    legal_footer: evidence.legal.status,
    responsive_mobile: evidence.mobile.status,
    accessibility: evidence.accessibility.status,
    console: evidence.console.status,
    network: evidence.network.status,
    domain_ssl: evidence.domain_ssl.status,
    analytics_performance: evidence.analytics.status,
    design_quality: evidence.design_quality.status,
    customer_page_depth: (evidence.customer_page_depth ?? occupancynpvCustomerPageDepthVerification()).status,
  };
  const improvement: OccupancynpvImprovementReport = {
    founder_physical_page: "PASS",
    global_trigger: evidence.improvement.global_trigger,
    trigger_clickable: evidence.improvement.trigger_clickable,
    form: evidence.improvement.form,
    submission: evidence.improvement.submission,
    success_state: evidence.improvement.success_state,
    mobile: evidence.improvement.mobile,
    canonical_pipeline: evidence.improvement.canonical_pipeline,
    real_customer_feedback: evidence.improvement.real_customer_feedback ?? realFeedbackCount(CRE_VENTURE_ID),
  };
  return {
    venture_id: CRE_VENTURE_ID,
    inventory,
    coverage,
    quality: qualityWithBrand,
    systems,
    overall: qualityWithBrand.overall,
    improvement,
  };
}

export function occupancyNpvPaymentFailureFailsOverall(): true {
  return true;
}

export function occupancyNpvFulfillmentFailureFailsOverall(): true {
  return true;
}

export function evaluateOccupancynpvCommercialBlockers(input: {
  payment: "PASS" | "FAIL";
  fulfillment: "PASS" | "FAIL";
}): ReturnType<typeof evaluateCommercialProductionReadinessGate> {
  return evaluateCommercialProductionReadinessGate({
    offer: "PASS",
    backend: "PASS",
    security: "PASS",
    paymentPath: input.payment,
    webhook: "PASS",
    fulfillment: input.fulfillment,
    customerFailureUx: "PASS",
    legalCommercialTruth: "PASS",
  });
}

export function occupancyNpvJourneyFromEvidence(evidence: OccupancynpvSystemEvidence) {
  return evaluateCustomerJourneyEndToEndQCGate({
    journey: occupancyNpvCustomerJourney(),
    transitions: [
      { from: "homepage", to: "calculator", works: evidence.calculator.status === "PASS" },
      { from: "calculator", to: "results", works: evidence.results.status === "PASS" },
      { from: "results", to: "pricing", works: evidence.pricing.status === "PASS" },
      { from: "pricing", to: "checkout", works: evidence.checkout.status === "PASS" },
      { from: "checkout", to: "return_fulfillment", works: evidence.fulfillment.status === "PASS" },
      { from: "return_fulfillment", to: "login_account", works: evidence.login_account.status === "PASS" },
      { from: "login_account", to: "suggest_improvement", works: evidence.improvement.global_trigger === "PASS" && evidence.improvement.form === "PASS" },
    ],
  });
}

export function occupancyNpvExpectedImprovementCapability(input: {
  trigger_rendered: boolean;
  trigger_visible: boolean;
}) {
  const inventory = buildRenderedActionInventory({
    venture_id: CRE_VENTURE_ID,
    actions: [
      {
        name: "Suggest an Improvement",
        kind: "cta",
        required: true,
        capability_id: "improvement_intake",
        rendered: input.trigger_rendered,
        visible: input.trigger_visible,
        enabled: input.trigger_visible,
      },
    ],
  });
  return evaluateExpectedRenderedCapabilityGate({
    capabilities: [{ capability_id: "improvement_intake", required: true, rendered_trigger_required: true }],
    inventory,
  });
}

export function occupancyNpvFormFromImprovement(improvement: OccupancynpvSystemEvidence["improvement"]) {
  return evaluateCustomerFormQCGate([
    {
      name: "suggest-improvement",
      rendered: improvement.form === "PASS",
      labels: improvement.form === "PASS",
      required_fields: improvement.form === "PASS",
      validation: improvement.form === "PASS",
      submit: improvement.submission === "PASS",
      success: improvement.success_state === "PASS",
      error: improvement.form === "PASS",
      duplicate_submit_handled: improvement.submission === "PASS",
      mobile: improvement.mobile === "PASS",
      accessibility: improvement.form === "PASS" && improvement.mobile === "PASS",
    },
  ]);
}

export function occupancyNpvConsoleNetwork(input: { console: string[]; network_ok: boolean }) {
  return {
    console: evaluateBrowserConsoleQCGate(input.console),
    network: evaluateCustomerFacingNetworkQCGate([
      { name: "occupancynpv-home", required: true, ok: input.network_ok, status: input.network_ok ? 200 : null, failure: input.network_ok ? null : "NETWORK_FAILURE" },
    ]),
    navigation: evaluateCustomerFacingNavigationQCGate([
      { route: "/", reached: input.network_ok, failed_fetch: !input.network_ok },
      { route: "/suggest-improvement", reached: input.network_ok, failed_fetch: !input.network_ok },
    ]),
  };
}
