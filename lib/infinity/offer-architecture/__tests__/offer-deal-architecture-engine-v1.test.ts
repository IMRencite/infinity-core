import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  OCCUPANCYNPV_PER_DEAL_PRICE_USD,
  OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
} from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import {
  evaluateFounderFeedbackVisibilityGate,
  FOUNDER_FEEDBACK_VISIBILITY_GATE,
  inspectProductImprovementLoop,
  mutateProductImprovementLoop,
  PRODUCT_IMPROVEMENT_PATH,
  projectVentureCustomerSuggestions,
  resetProductImprovementLoop,
} from "@/lib/infinity/product-improvement-loop";
import { inspectFounderSuggestionsSurface } from "@/lib/infinity/product-improvement-loop/suggestions-qc";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import {
  analyzeOccupancyNpvOffers,
  applicableOfferMetrics,
  assessPurchaseFriction,
  assessTimeToValue,
  buildOccupancyNpvCurrentOffer,
  buildOfferExperiment,
  CANONICAL_VENTURE_BUILD_FLOW,
  collectOfferFeedbackSignals,
  evaluateFreeOfferEconomicSafetyGate,
  evaluateOfferActivationGate,
  evaluateOfferArchitectureReadinessGate,
  evaluateOfferDisclosureQCGate,
  evaluateOfferEconomics,
  evaluateOfferEconomicsQCGate,
  evaluateOfferFulfillmentCompatibilityGate,
  evaluateOfferPaymentCompatibilityGate,
  evaluateOfferCrossVentureConfidence,
  evaluateTrialDisclosureQCGate,
  generateOfferOptions,
  nextOfferVersion,
  OFFER_ARCHITECTURE_CONTRACT,
  OFFER_EXPERIMENT_CONTRACT,
  OFFER_TYPES,
  offerFeedbackMayBypassEconomics,
  offerFeedbackMayChangeLivePricing,
  offerPerformanceEvents,
  projectVentureOfferArchitectureHq,
  recordOfferArchitecture,
  recordOfferExperiment,
  resetOfferArchitecture,
  selectOffer,
  unknownCostTreatedAsZero,
} from "..";
import { classified, unknownValue } from "@/lib/infinity/venture-economics/classified";
import type { OfferArchitectureContract } from "../types";
import { NOT_APPLICABLE, UNKNOWN } from "../types";

function loadCanonicalFeedback() {
  const parsed = JSON.parse(readFileSync(join(process.cwd(), PRODUCT_IMPROVEMENT_PATH), "utf8")) as ReturnType<typeof inspectProductImprovementLoop>;
  mutateProductImprovementLoop((state) => {
    state.feedback.splice(0, state.feedback.length, ...parsed.feedback);
    state.opportunities.splice(0, state.opportunities.length, ...parsed.opportunities);
  });
}

function draftOffer(overrides: Partial<OfferArchitectureContract> = {}): OfferArchitectureContract {
  return {
    contract: OFFER_ARCHITECTURE_CONTRACT,
    venture_id: "venture:saas-demo",
    offer_id: "offer:venture:saas-demo:monthly",
    offer_version: 1,
    offer_name: "Monthly SaaS",
    offer_type: "MONTHLY_SUBSCRIPTION",
    target_segment: "SMB operators",
    primary_product: "Demo SaaS",
    pricing_model: "subscription",
    price: classified("$29/month", "HYPOTHESIS", "Test fixture only.", 29, "usd"),
    billing_frequency: "monthly",
    trial_policy: {
      enabled: false,
      kind: "NONE",
      duration: NOT_APPLICABLE,
      post_trial_price: NOT_APPLICABLE,
      billing_date: NOT_APPLICABLE,
      billing_frequency: NOT_APPLICABLE,
      cancellation_path: "in-app cancel",
      explicit_customer_authorization: NOT_APPLICABLE,
      auto_convert: false,
    },
    pilot_policy: NOT_APPLICABLE,
    discount_policy: NOT_APPLICABLE,
    guarantee_policy: UNKNOWN,
    freemium_policy: NOT_APPLICABLE,
    first_use_incentive: NOT_APPLICABLE,
    bundle_configuration: NOT_APPLICABLE,
    seat_configuration: NOT_APPLICABLE,
    usage_configuration: NOT_APPLICABLE,
    conversion_path: "signup → checkout",
    fulfillment_requirements: "account entitlement",
    payment_requirements: "verified payment path",
    capital_requirements: "treasury authorization",
    expected_conversion_effect: unknownValue("conversion", "Unobserved."),
    expected_margin_effect: unknownValue("margin", "Unobserved."),
    expected_support_cost_effect: unknownValue("support", "Unobserved."),
    abuse_risk: UNKNOWN,
    refund_risk: UNKNOWN,
    time_to_value: "TIME_BASED",
    purchase_friction: "MEDIUM",
    evidence_basis: ["fixture"],
    confidence: "LOW",
    status: "DRAFT",
    created_at: "2026-09-12T00:00:00.000Z",
    updated_at: "2026-09-12T00:00:00.000Z",
    supersedes_offer_id: null,
    monetization_plan_id: null,
    commercialization_economics_id: null,
    experiment_id: null,
    activation: "NOT_ACTIVATED",
    ...overrides,
  };
}

describe("OFFER + DEAL ARCHITECTURE ENGINE V1", () => {
  beforeEach(() => {
    resetOfferArchitecture();
    resetProductImprovementLoop();
  });

  it("keeps Offer + Deal Architecture after commercialization economics and preserves Customer Suggestions learning", () => {
    const offerAt = CANONICAL_VENTURE_BUILD_FLOW.indexOf("OFFER + DEAL ARCHITECTURE");
    expect(offerAt).toBe(CANONICAL_VENTURE_BUILD_FLOW.indexOf("Commercialization Economics") + 1);
    expect(CANONICAL_VENTURE_BUILD_FLOW).toContain("Offer Optimization");
    expect(CANONICAL_VENTURE_BUILD_FLOW).toContain("Customer Feedback / Suggestion Learning");
    expect(OFFER_TYPES).toContain("FREE_FIRST_DEAL");
    expect(OFFER_TYPES).toContain("PAID_FIRST");
  });

  it("OfferArchitectureContract uses UNKNOWN/NOT_APPLICABLE instead of fake values", () => {
    const offer = draftOffer();
    expect(offer.contract).toBe(OFFER_ARCHITECTURE_CONTRACT);
    expect(offer.guarantee_policy).toBe(UNKNOWN);
    expect(offer.freemium_policy).toBe(NOT_APPLICABLE);
    expect(evaluateOfferDisclosureQCGate(offer).result).toBe("PASS");
    expect(evaluateOfferArchitectureReadinessGate({ offer: null, commercial_venture: true }).result).toBe("FAIL");
    expect(evaluateOfferArchitectureReadinessGate({ offer, commercial_venture: true }).result).toBe("PASS");
  });

  it("generates bounded options per archetype and does not force every type", () => {
    const saas = generateOfferOptions({ archetype: "SAAS" });
    const ecom = generateOfferOptions({ archetype: "ECOMMERCE" });
    const utility = generateOfferOptions({ archetype: "WEB_UTILITY" });
    const service = generateOfferOptions({ archetype: "SERVICE" });
    expect(saas).toContain("MONTHLY_SUBSCRIPTION");
    expect(ecom).toContain("PRODUCT_BUNDLE");
    expect(utility).toContain("FREE_FIRST_USE");
    expect(service).toContain("CONSULTATION_FIRST");
    expect(ecom).not.toContain("MONTHLY_SUBSCRIPTION");
    expect(saas.length).toBeLessThan(OFFER_TYPES.length);
  });

  it("assesses purchase friction and time-to-value", () => {
    const high = assessPurchaseFriction({
      purchase_price_usd: 290,
      commitment_duration: "ANNUAL",
      payment_before_value: true,
      product_novelty: "HIGH",
      proof_availability: "LOW",
      risk_perception: "HIGH",
    });
    expect(high.level).toBe("HIGH");
    const ttv = assessTimeToValue({ archetype: "TRANSACTIONAL_TOOL", value_type: "TRANSACTION_BASED" });
    expect(ttv.type).toBe("TRANSACTION_BASED");
  });

  it("does not treat unknown cost as zero", () => {
    const economics = evaluateOfferEconomics({ offer_type: "FREE_FIRST_DEAL", price_usd: 149 });
    expect(economics.provider_cost.classification).toBe("UNKNOWN");
    expect(economics.provider_cost.numeric).toBeNull();
    expect(unknownCostTreatedAsZero(economics.provider_cost)).toBe(false);
    expect(evaluateOfferEconomicsQCGate(economics).result).toBe("PASS");
    expect(evaluateFreeOfferEconomicSafetyGate({
      infrastructure_cost: null,
      provider_cost: null,
      support_cost: null,
      fulfillment_cost: null,
      fraud_abuse_cost: null,
      opportunity_cost: null,
      treated_as_economically_free: true,
    }).result).toBe("FAIL");
  });

  it("enforces payment, fulfillment, capital, and trial disclosure before activation", () => {
    const payment = evaluateOfferPaymentCompatibilityGate(null);
    const fulfillment = evaluateOfferFulfillmentCompatibilityGate();
    expect(payment.result).toBe("FAIL");
    expect(fulfillment.result).toBe("FAIL");
    const auto = evaluateTrialDisclosureQCGate({
      enabled: true,
      kind: "CARD_REQUIRED_TRIAL",
      duration: UNKNOWN,
      post_trial_price: UNKNOWN,
      billing_date: UNKNOWN,
      billing_frequency: UNKNOWN,
      cancellation_path: UNKNOWN,
      explicit_customer_authorization: false,
      auto_convert: true,
    });
    expect(auto.result).toBe("FAIL");
    expect(auto.reasons).toEqual(expect.arrayContaining([
      "EXPLICIT_AUTHORIZATION_REQUIRED",
      "TRIAL_DURATION_UNDEFINED",
      "POST_TRIAL_PRICE_UNDEFINED",
      "CANCELLATION_UNAVAILABLE",
    ]));
    const activation = evaluateOfferActivationGate({
      commercial_economics: "PASS",
      payment,
      fulfillment,
      capital: { result: "FAIL", reasons: ["NOT_SET"] },
      legal_policy: "PASS",
      customer_disclosure: evaluateOfferDisclosureQCGate(draftOffer()),
      qc: "PASS",
      trial: auto,
      analysis_only: true,
    });
    expect(activation.result).toBe("FAIL");
    expect(activation.reasons).toEqual(expect.arrayContaining([
      "ANALYSIS_ONLY_NO_ACTIVATION",
      "PAYMENT_READINESS_FAIL",
      "FULFILLMENT_READINESS_FAIL",
      "CAPITAL_FAIL",
    ]));
  });

  it("reuses the existing experiment schema and Performance Intelligence events", () => {
    const experiment = buildOfferExperiment({
      venture_id: CRE_VENTURE_ID,
      experiment_id: "experiment:offer-test",
      offer_variants: ["PAID_FIRST", "FREE_FIRST_DEAL"],
      hypothesis: "A bounded first deal may reduce friction",
      existing_experiment_id: "exp_e72beb7b6d35e7b20acf",
    });
    expect(experiment.contract).toBe(OFFER_EXPERIMENT_CONTRACT);
    expect(experiment.experiment_schema).toBe("market_validation_experiment_v1");
    recordOfferExperiment(experiment);
    const event = offerPerformanceEvents({
      venture_id: CRE_VENTURE_ID,
      offer_id: "offer:test",
      metric: "checkout_to_paid",
      value: 0,
    });
    expect(event.eventType).toBe("offer_performance");
    expect(applicableOfferMetrics({ has_trial: true, paid: true, acquisition_known: false })).toContain("trial_free_use_to_meaningful_use");
    expect(evaluateOfferCrossVentureConfidence({ sample_size: 1, venture_count: 1, archetype_compatible: false }).result).toBe("FAIL");
  });

  it("consumes Customer Suggestions as evidence and cannot auto-change price", () => {
    loadCanonicalFeedback();
    const signals = collectOfferFeedbackSignals(CRE_VENTURE_ID);
    expect(signals.some((row) => row.real_count > 0)).toBe(true);
    expect(signals.every((row) => row.automatic_price_change === false && row.automatic_economics_bypass === false)).toBe(true);
    expect(offerFeedbackMayChangeLivePricing()).toBe(false);
    expect(offerFeedbackMayBypassEconomics()).toBe(false);
    const selected = selectOffer({
      offer_type: "FREE_FIRST_DEAL",
      friction: assessPurchaseFriction({ purchase_price_usd: 0, payment_before_value: false }),
      time_to_value: "TRANSACTION_BASED",
      economics: evaluateOfferEconomics({ offer_type: "FREE_FIRST_DEAL" }),
      payment_ready: false,
      fulfillment_ready: false,
      capital_authorized: false,
      legal_policy_pass: true,
      customer_disclosure_pass: true,
      qc_pass: true,
      evidence_quality: "INSUFFICIENT",
      strategic_fit: "STRONG",
      analysis_only: true,
      feedback: signals,
    });
    expect(selected.decision).toBe("DEFER");
  });

  it("persists versioned offer history without overwriting", () => {
    const first = recordOfferArchitecture(draftOffer({ offer_version: 1, offer_name: "v1" }));
    const second = recordOfferArchitecture(draftOffer({
      offer_id: "offer:venture:saas-demo:monthly-v2",
      offer_version: 2,
      offer_name: "v2",
      supersedes_offer_id: first.offer_id,
      status: "SUPERSEDED",
    }));
    expect(nextOfferVersion("venture:saas-demo")).toBe(3);
    expect(first.offer_name).toBe("v1");
    expect(second.offer_version).toBe(2);
    const hq = projectVentureOfferArchitectureHq("venture:saas-demo");
    expect(hq.history).toHaveLength(2);
    expect(hq.current_offer).toBeTruthy();
    expect(hq.purchase_friction).toBeTruthy();
    expect(hq.time_to_value).toBeTruthy();
  });

  it("analyzes OccupancyNPV without changing price or trial", () => {
    loadCanonicalFeedback();
    expect(OCCUPANCYNPV_PROFESSIONAL_PRICE_USD).toBe(290);
    expect(OCCUPANCYNPV_PER_DEAL_PRICE_USD).toBe(149);
    const analysis = analyzeOccupancyNpvOffers();
    expect(analysis.current_offer).toMatch(/\$290/);
    expect(analysis.current_friction.level).toBe("HIGH");
    expect(analysis.current_time_to_value.type).toBe("TRANSACTION_BASED");
    expect(analysis.assessments.map((row) => row.candidate)).toEqual([
      "CURRENT_PAID_FIRST",
      "FREE_FIRST_DEAL",
      "PROFESSIONAL_SHORT_TRIAL",
      "ASSISTED_PILOT",
    ]);
    expect(analysis.assessments.every((row) => row.decision !== "ACTIVATE")).toBe(true);
    expect(analysis.best_current_candidate).toBe("CURRENT_PAID_FIRST");
    expect(analysis.decision).toBe("DEFER");
    expect(analysis.pricing_changed).toBe(false);
    expect(analysis.trial_changed).toBe(false);
    expect(analysis.founder_real_suggestion_as_evidence).toBe(true);
    expect(buildOccupancyNpvCurrentOffer().trial_policy.enabled).toBe(false);
    expect(buildOccupancyNpvCurrentOffer().activation).toBe("LIVE_PROJECTION");
  });

  it("Customer Suggestions regression remains intact", () => {
    loadCanonicalFeedback();
    const view = projectVentureCustomerSuggestions(CRE_VENTURE_ID);
    expect(view.counts.real).toBe(1);
    expect(view.counts.synthetic).toBe(1);
    expect(view.rows[0]?.feedback_id).toBe("fb:candidate:7e7e924e-0741-4155-a729-8d529da77ea9:072ce8ac-6ad4-4028-bd69-3b9ab3e38add");
    expect(view.rows[0]?.type).toBe("REAL");
    expect(view.rows.some((row) => row.type === "SYNTHETIC / QC")).toBe(true);
    const empty = projectVentureCustomerSuggestions(ASKREVIEW_VENTURE_ID);
    expect(empty.rows).toHaveLength(0);
    const surface = inspectFounderSuggestionsSurface();
    expect(surface.suggestions_tab_present).toBe(true);
    expect(surface.suggestions_after_system_view).toBe(true);
    expect(evaluateFounderFeedbackVisibilityGate({
      canonical_feedback_count: view.rows.length,
      suggestions_tab_present: surface.suggestions_tab_present,
      suggestions_surface_reachable: surface.suggestions_surface_reachable,
    }).gate).toBe(FOUNDER_FEEDBACK_VISIBILITY_GATE);
    expect(evaluateFounderFeedbackVisibilityGate({
      canonical_feedback_count: view.rows.length,
      suggestions_tab_present: surface.suggestions_tab_present,
      suggestions_surface_reachable: surface.suggestions_surface_reachable,
    }).result).toBe("PASS");
    const locked = readFileSync(join(process.cwd(), "INFINITY_LOCKED_DECISIONS.md"), "utf8");
    expect(locked).toContain("CUSTOMER SUGGESTIONS IS A FIRST-CLASS VENTURE HQ SURFACE");
    expect(locked).toContain("PRICING IS NOT THE SAME AS THE OFFER");
    expect(readFileSync(join(process.cwd(), "components/dashboard/operator-console/customer-suggestions-tab.tsx"), "utf8")).not.toContain(CRE_VENTURE_ID);
  });
});
