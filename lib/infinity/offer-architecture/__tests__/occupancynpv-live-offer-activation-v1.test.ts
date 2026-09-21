import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  mutateProductImprovementLoop,
  PRODUCT_IMPROVEMENT_PATH,
  inspectProductImprovementLoop,
} from "@/lib/infinity/product-improvement-loop";
import {
  OCCUPANCYNPV_PER_DEAL_PRICE_USD,
  OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
} from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import { evaluateFounderFeedbackVisibilityGate, projectVentureCustomerSuggestions } from "@/lib/infinity/product-improvement-loop";
import { inspectFounderSuggestionsSurface } from "@/lib/infinity/product-improvement-loop/suggestions-qc";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { projectVentureOfferArchitectureHq } from "../hq";
import {
  activateOccupancyNpvLivePaidFirstOffer,
  evaluateOccupancyNpvLiveOfferOptions,
  OCCUPANCYNPV_HIGH_FRICTION_PAID_FIRST_JUSTIFICATION,
  OCCUPANCYNPV_PRIMARY_OFFER_CTA,
  selectOccupancyNpvLiveCustomerFacingOffer,
} from "../occupancynpv-live-activation";
import { analyzeOccupancyNpvOffers } from "../occupancynpv";
import { evaluateOccupancynpvCommercialOfferCompleteness, inferRenderedOfferFromHtml } from "@/lib/infinity/universal-venture-system-qc/commercial-offer";
import { occupancynpvCommercialOfferVerification } from "@/lib/infinity/universal-venture-system-qc/occupancynpv";
import { buildVentureSystemInventory, occupancyNpvCapabilityProfile } from "@/lib/infinity/universal-venture-system-qc/inventory";
import { buildVentureProductionQcMatrix, evaluateUniversalVentureProductionQualityGate } from "@/lib/infinity/universal-venture-system-qc/matrix";
import { evaluateMandatoryVentureSmokeSuite } from "@/lib/infinity/universal-venture-system-qc/modes";
import { commercialOfferSmokeSurfaces } from "@/lib/infinity/universal-venture-system-qc/commercial-offer";

function pricingHtml() {
  return composeOccupancynpvPaymentReactivationFiles().files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
}

function loadCanonicalFeedback() {
  const parsed = JSON.parse(readFileSync(join(process.cwd(), PRODUCT_IMPROVEMENT_PATH), "utf8")) as ReturnType<typeof inspectProductImprovementLoop>;
  mutateProductImprovementLoop((state) => {
    state.feedback.splice(0, state.feedback.length, ...parsed.feedback);
    state.opportunities.splice(0, state.opportunities.length, ...parsed.opportunities);
  });
}

describe("OCCUPANCYNPV_LIVE_OFFER_ACTIVATION_V1", () => {
  it("selects the 3-day no-card trial and keeps paid prices unchanged", () => {
    const options = evaluateOccupancyNpvLiveOfferOptions();
    const byId = Object.fromEntries(options.map((row) => [row.id, row]));
    expect(byId.CURRENT_PAID_FIRST.decision).toBe("ACTIVATE");
    expect(byId.THREE_DAY_NO_CARD_TRIAL.decision).toBe("ACTIVATE");
    expect(byId.FREE_FIRST_DEAL.decision).toBe("DEFER");
    expect(byId.LIMITED_PILOT.decision).toBe("DEFER");
    expect(byId.SHORT_PROFESSIONAL_TRIAL.decision).toBe("DEFER");
    expect(byId.DEMO_FIRST.decision).toBe("REJECT");
    expect(byId.DISCOUNTED_FIRST_DEAL.decision).toBe("REJECT");
    expect(byId.REQUEST_PILOT_ACCESS.decision).toBe("DEFER");
    const selected = selectOccupancyNpvLiveCustomerFacingOffer();
    expect(selected.selected_offer).toBe("THREE_DAY_NO_CARD_TRIAL");
    expect(selected.decision).toBe("ACTIVATE");
    expect(selected.economic_bounds.incremental_discretionary_spend).toBe("NONE");
    expect(selected.prices_changed).toBe(false);
    expect(selected.trial_changed).toBe(true);
    expect(OCCUPANCYNPV_PROFESSIONAL_PRICE_USD).toBe(290);
    expect(OCCUPANCYNPV_PER_DEAL_PRICE_USD).toBe(149);
    expect(analyzeOccupancyNpvOffers().decision).toBe("DEFER");
  });

  it("renders standard pricing without labeling the purchase model as an offer", () => {
    const pricing = pricingHtml();
    expect(pricing).toContain("data-pricing-architecture");
    expect(pricing).toContain("data-promotional-offer=\"THREE_DAY_NO_CARD_TRIAL\"");
    expect(pricing).toContain("Start Free Trial");
    expect(pricing).toContain("$290/year");
    expect(pricing).toContain("$149");
    expect(pricing).toContain("Start Professional");
    expect(pricing).toContain("Start One Deal");
    expect(pricing).toContain("/api/checkout/start");
    expect(pricing).not.toContain("data-offer-block");
    expect(pricing).not.toContain("Primary offer · paid-first");
    expect(pricing).not.toMatch(/entitlement remains ACTIVE|fulfillment grants/i);
    expect(pricing).toContain("occupancynpv-offer-beacon");
    expect(pricing).toContain("OccupancynpvOfferBeacon");
    const composed = composeOccupancynpvPaymentReactivationFiles();
    expect(composed.files.some((file) => file.path.replace(/\\/g, "/") === "components/occupancynpv-offer-beacon.tsx")).toBe(true);
    expect(composed.files.some((file) => file.path.replace(/\\/g, "/") === "app/api/occupancynpv/offer-events/route.ts")).toBe(true);
    expect(composed.files.find((file) => file.path.replace(/\\/g, "/") === "lib/occupancynpv/durable.ts")?.content).toContain("durablePersistOfferEvent");
  });

  it("passes commercial offer QC when the 3-day trial is the live acquisition offer", () => {
    const activated = activateOccupancyNpvLivePaidFirstOffer();
    const completeness = evaluateOccupancynpvCommercialOfferCompleteness({
      html: pricingHtml(),
      canonical: activated.offer,
      commercial_activation_claimed: true,
      claimed_lifecycle: "ACTIVE",
      high_friction_justification: OCCUPANCYNPV_HIGH_FRICTION_PAID_FIRST_JUSTIFICATION,
    });
    expect(completeness.result).toBe("PASS");
    const verification = occupancynpvCommercialOfferVerification({ html: pricingHtml() });
    expect(verification.completeness.result).toBe("PASS");
    const inventory = buildVentureSystemInventory(occupancyNpvCapabilityProfile());
    const now = "2026-09-12T12:00:00.000Z";
    const verifications = inventory.entries
      .filter((row) => row.applicability === "APPLICABLE")
      .map((row) => row.system_id === "COMMERCIAL_OFFER"
        ? verification.verification
        : {
            system_id: row.system_id,
            status: "PASS" as const,
            last_verified_at: now,
            verification_level: "LIVE_PRODUCTION" as const,
            environment: "LIVE_PRODUCTION" as const,
            failure_reason: null,
          });
    const quality = evaluateUniversalVentureProductionQualityGate({
      inventory,
      matrix: buildVentureProductionQcMatrix({ inventory, verifications, mode: "FULL", now }),
    });
    expect(quality.result).toBe("PASS");
    const rendered = inferRenderedOfferFromHtml(pricingHtml());
    expect(rendered.offer_block_present).toBe(true);
    expect(rendered.cta_label).toBe("Start Free Trial");
    expect(rendered.live_offer_type).toBe("NO_CARD_TRIAL");
    const smoke = evaluateMandatoryVentureSmokeSuite([
      { surface: "home_public_entry", applicable: true, result: "PASS" },
      { surface: "navigation", applicable: true, result: "PASS" },
      { surface: "primary_product_workflow", applicable: true, result: "PASS" },
      { surface: "primary_cta", applicable: true, result: "PASS" },
      { surface: "auth_if_applicable", applicable: true, result: "PASS" },
      { surface: "payment_entry_if_paid", applicable: true, result: "PASS" },
      { surface: "feedback_improvement_entry", applicable: true, result: "PASS" },
      { surface: "legal_footer", applicable: true, result: "PASS" },
      { surface: "console", applicable: true, result: "PASS" },
      { surface: "network", applicable: true, result: "PASS" },
      { surface: "mobile", applicable: true, result: "PASS" },
      ...commercialOfferSmokeSurfaces({
        commercial: true,
        completeness,
        rendered,
      }),
    ]);
    expect(smoke.result).toBe("PASS");
    expect(activated.experiment.contract).toBe("OfferExperimentContract");
    expect(OCCUPANCYNPV_PRIMARY_OFFER_CTA).toBe("Start Free Trial");
  });

  it("projects HQ pricing separately from promotional offer and preserves Customer Suggestions", () => {
    loadCanonicalFeedback();
    const view = projectVentureOfferArchitectureHq(CRE_VENTURE_ID);
    expect(view.current_offer).toBe("3-Day Free Trial");
    expect(view.promotional_offer).toBe("3-Day Free Trial");
    expect(view.promotional_offer_status).toBe("ACTIVE");
    expect(view.purchase_model).toBe("Annual subscription + per-transaction");
    expect(view.pricing_architecture).toMatch(/\$290/);
    expect(view.pricing_architecture).toMatch(/\$149/);
    expect(view.primary_cta).toBe("Start Free Trial");
    expect(view.card_required).toBe("NO");
    expect(view.auto_convert).toBe("NO");
    expect(view.offer_exposure).toBeDefined();
    expect(view.offer_starts).toBeDefined();
    expect(view.meaningful_uses).toBeDefined();
    expect(view.paid_conversions).toBeDefined();
    expect(view.contribution_impact).toBeDefined();
    const suggestions = projectVentureCustomerSuggestions(CRE_VENTURE_ID);
    expect(suggestions.counts.real).toBe(1);
    expect(suggestions.counts.synthetic).toBe(1);
    expect(inspectFounderSuggestionsSurface().suggestions_tab_present).toBe(true);
    const surface = inspectFounderSuggestionsSurface();
    expect(surface.suggestions_tab_present).toBe(true);
    expect(evaluateFounderFeedbackVisibilityGate({
      canonical_feedback_count: suggestions.counts.real,
      suggestions_tab_present: surface.suggestions_tab_present,
      suggestions_surface_reachable: surface.suggestions_surface_reachable,
    }).result).toBe("PASS");
  });
});
