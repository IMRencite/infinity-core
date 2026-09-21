import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { hydrateProductImprovementLoop } from "@/lib/infinity/product-improvement-loop/store";
import { offersForVenture, inspectOfferArchitecture, hydrateOfferArchitecture } from "./store";
import { collectOfferFeedbackSignals } from "./feedback";
import { buildOccupancyNpvCurrentOffer } from "./occupancynpv";
import { summarizeOccupancyNpvOfferEvents } from "./occupancynpv-live-activation";
import { evaluateOccupancyNpvTrueOfferSelection } from "./true-offer";
import { hqConversionFieldsFromEvidence } from "./founder-viewport-commercial-qc";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import {
  evaluatePageDepthBundle,
  hqCustomerPageDepthFields,
  scorecardFromBundle,
} from "@/lib/infinity/customer-page-depth";
import { occupancynpvVenturePageDepthHqFields } from "@/lib/infinity/venture-operating-scale/occupancynpv-venture-page-depth";
import type { OfferArchitectureHqView, OfferStatus } from "./types";
import { UNKNOWN } from "./types";

function isNamedPromotionalOffer(offer: string | null | undefined): boolean {
  return typeof offer === "string" && offer.length > 0 && offer !== "NONE";
}

function namedPromotionalOfferStatus(
  offer: string | null | undefined,
  occupancyPresent: boolean,
  storedOfferPresent: boolean,
): OfferArchitectureHqView["promotional_offer_status"] {
  if (isNamedPromotionalOffer(offer)) return "ACTIVE";
  if (occupancyPresent) return "NONE";
  if (storedOfferPresent) return "NOT_ACTIVE";
  return "NONE";
}

function namedOfferActivationStatus(
  offer: string | null | undefined,
  occupancyPresent: boolean,
  storedStatus: OfferStatus | undefined,
): OfferArchitectureHqView["offer_status"] {
  if (isNamedPromotionalOffer(offer)) return "ACTIVATED";
  if (occupancyPresent) return UNKNOWN;
  return storedStatus ?? UNKNOWN;
}

function occupancynpvPricingDepthHq() {
  try {
    const html = composeOccupancynpvPaymentReactivationFiles().files
      .find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
    return hqCustomerPageDepthFields(scorecardFromBundle("/pricing", evaluatePageDepthBundle({
      route: "/pricing",
      html,
      pageType: "PRICING",
      archetype: "calculator",
    })));
  } catch {
    return hqCustomerPageDepthFields(null);
  }
}

export function projectVentureOfferArchitectureHq(ventureId: string): OfferArchitectureHqView {
  hydrateProductImprovementLoop();
  hydrateOfferArchitecture();
  const stored = offersForVenture(ventureId);
  const analysis = ventureId === CRE_VENTURE_ID ? buildOccupancyNpvCurrentOffer() : null;
  const offers = stored.length ? stored : analysis ? [analysis] : [];
  const current = offers.find((row) => row.activation === "ACTIVATED" || row.status === "ACTIVATED")
    ?? null;
  const occupancy = ventureId === CRE_VENTURE_ID ? evaluateOccupancyNpvTrueOfferSelection() : null;
  const conversion = occupancy ? hqConversionFieldsFromEvidence() : null;
  const depth = ventureId === CRE_VENTURE_ID ? occupancynpvPricingDepthHq() : hqCustomerPageDepthFields(null);
  const ventureDepth = ventureId === CRE_VENTURE_ID
    ? (() => {
        try {
          return occupancynpvVenturePageDepthHqFields(composeOccupancynpvPaymentReactivationFiles().files);
        } catch {
          return null;
        }
      })()
    : null;
  const experiment = inspectOfferArchitecture().experiments.find((row) => row.venture_id === ventureId) ?? null;
  const signals = collectOfferFeedbackSignals(ventureId);
  const realSignals = signals.filter((row) => row.real_count > 0);
  const metrics = summarizeOccupancyNpvOfferEvents();
  return {
    venture_id: ventureId,
    pricing_architecture: occupancy
      ? `Professional $${occupancy.pricing.professional_usd_year}/year · Per-Deal $${occupancy.pricing.per_deal_usd}`
      : current?.price.display ?? UNKNOWN,
    purchase_model: occupancy?.purchase_model_display ?? current?.offer_type ?? UNKNOWN,
    promotional_offer: occupancy?.promotional_offer ?? current?.offer_name ?? "NONE",
    promotional_offer_status: namedPromotionalOfferStatus(occupancy?.promotional_offer, Boolean(occupancy), Boolean(current)),
    offer_optimization: occupancy?.offer_optimization ?? "PENDING",
    conversion_ux: conversion?.conversion_ux ?? "FAIL",
    above_fold_cta: conversion?.above_fold_cta ?? "FAIL",
    panel_spacing: conversion?.panel_spacing ?? "FAIL",
    card_required: occupancy?.promotional_offer === "3-Day Free Trial" ? "NO" : UNKNOWN,
    auto_convert: occupancy?.promotional_offer === "3-Day Free Trial" ? "NO" : UNKNOWN,
    pricing_content_depth: conversion?.pricing_content_depth ?? "FAIL",
    page: depth.page,
    information_depth: depth.information_depth as OfferArchitectureHqView["information_depth"],
    question_coverage: depth.question_coverage as OfferArchitectureHqView["question_coverage"],
    product_understanding: depth.product_understanding as OfferArchitectureHqView["product_understanding"],
    buyer_decision_support: depth.buyer_decision_support as OfferArchitectureHqView["buyer_decision_support"],
    information_gain: depth.information_gain as OfferArchitectureHqView["information_gain"],
    thinness: depth.thinness as OfferArchitectureHqView["thinness"],
    missing_material_questions: depth.missing_material_questions,
    page_depth_total: ventureDepth?.summary.total_material_pages ?? 0,
    page_depth_passed: ventureDepth?.summary.passed ?? 0,
    page_depth_failed: ventureDepth?.summary.failed ?? 0,
    page_depth_thin: ventureDepth?.summary.thin ?? 0,
    page_depth_unverified: ventureDepth?.summary.unverified ?? 0,
    page_depth_summary: ventureDepth
      ? `${ventureDepth.summary.total_material_pages} total · ${ventureDepth.summary.passed} passed · ${ventureDepth.summary.failed} failed · ${ventureDepth.summary.thin} thin · ${ventureDepth.summary.unverified} unverified`
      : "N/A",
    page_depth_thin_pages: ventureDepth?.display_rows.filter((row) => row.thinness === "FAIL").map((row) => row.route).join(" · ") || "NONE",
    page_depth_missing_questions: ventureDepth?.display_rows
      .filter((row) => row.missing_material_questions > 0)
      .map((row) => `${row.route}:${row.missing_material_questions}`)
      .join(" · ") || "NONE",
    page_depth_rows: ventureDepth?.display_rows ?? [],
    whitespace: conversion?.whitespace ?? "FAIL",
    current_offer: occupancy?.promotional_offer ?? current?.offer_name ?? "NONE",
    offer_type: occupancy?.offer_type ?? current?.offer_type ?? UNKNOWN,
    offer_status: namedOfferActivationStatus(occupancy?.promotional_offer, Boolean(occupancy), current?.status),
    price: occupancy
      ? `Professional $${occupancy.pricing.professional_usd_year}/year · Per-Deal $${occupancy.pricing.per_deal_usd}`
      : current?.price.display ?? UNKNOWN,
    billing: occupancy ? "Annual subscription · Per-deal" : current?.billing_frequency ?? UNKNOWN,
    trial_pilot: occupancy?.promotional_offer === "3-Day Free Trial"
      ? "3-DAY NO-CARD TRIAL · NO AUTO-CONVERT"
      : current
      ? `${current.trial_policy.enabled ? current.trial_policy.kind : "TRIAL_OFF"} · ${current.pilot_policy}`
      : UNKNOWN,
    purchase_friction: current?.purchase_friction ?? UNKNOWN,
    time_to_value: current?.time_to_value ?? UNKNOWN,
    primary_cta: occupancy?.promotional_offer === "3-Day Free Trial" ? "Start Free Trial" : occupancy ? "Start Professional" : UNKNOWN,
    offer_exposure: String(metrics.exposure),
    offer_starts: String(metrics.starts),
    meaningful_uses: String(metrics.meaningful_uses),
    checkout_starts: String(metrics.checkout_starts),
    paid_conversions: String(metrics.paid_conversions),
    conversion_rate: metrics.conversion_rate,
    offer_cost: metrics.offer_cost,
    contribution_impact: metrics.contribution_impact,
    evidence_sufficiency: current?.confidence ?? "INSUFFICIENT",
    experiment_status: experiment?.status ?? "NONE",
    offer_confidence: current?.confidence ?? "INSUFFICIENT",
    expected_conversion_impact: current?.expected_conversion_effect.display ?? UNKNOWN,
    margin_impact: current?.expected_margin_effect.display ?? UNKNOWN,
    support_cost_impact: current?.expected_support_cost_effect.display ?? UNKNOWN,
    abuse_risk: current?.abuse_risk ?? UNKNOWN,
    current_experiment: experiment?.experiment_id ?? "NONE",
    winning_variant: experiment?.decision && experiment.decision !== UNKNOWN ? String(experiment.decision) : "NONE",
    evidence: current?.evidence_basis ?? [],
    customer_suggestion_signals: realSignals.length
      ? realSignals.map((row) => `${row.category}:${row.real_count}`).join(" · ")
      : "NONE — synthetic excluded",
    last_updated: current?.updated_at ?? occupancy?.selected ?? UNKNOWN,
    history: offers.map((row) => ({
      offer_id: row.offer_id,
      version: row.offer_version,
      status: row.status,
      offer_name: row.offer_name,
    })),
  };
}
