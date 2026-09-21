import { describe, expect, it } from "vitest";
import { projectVentureOfferArchitectureHq } from "../hq";
import {
  classifyCommercialOfferState,
  evaluateCustomerFacingLanguageGate,
  evaluateMaterialCustomerAdvantageGate,
  evaluateOccupancyNpvTrueOfferSelection,
  htmlClaimsFakePaidFirstOffer,
} from "../true-offer";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { pricingUxReady } from "@/lib/infinity/venture-operating-scale/occupancynpv-pricing-ux-repair-deployment";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { inferRenderedOfferFromHtml } from "@/lib/infinity/universal-venture-system-qc/commercial-offer";

function pricingHtml() {
  return composeOccupancynpvPaymentReactivationFiles().files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
}

describe("OCCUPANCYNPV_TRUE_OFFER_CONVERSION_UX_V1", () => {
  it("does not treat paid-first list price as a promotional offer", () => {
    const selected = evaluateOccupancyNpvTrueOfferSelection();
    expect(selected.selected).toBe("TRUE_OFFER_SELECTED");
    expect(selected.purchase_model).toBe("PAID_FIRST");
    expect(selected.promotional_offer).toBe("3-Day Free Trial");
    expect(selected.offer_optimization).toBe("PENDING");
    expect(selected.pricing.professional_usd_year).toBe(290);
    expect(selected.pricing.per_deal_usd).toBe(149);
    expect(selected.capital).toBe("NOT_SET");
    expect(selected.free_offer_safety.result).toBe("PASS");
    expect(selected.activation_class).toBe("OFFER_ACTIVE_NO_NEW_DISCRETIONARY_SPEND");
  });

  it("rejects the previous fake paid-first offer block", () => {
    const fake = `<section data-offer-block="true" data-offer-type="PAID_FIRST"><p>Primary offer · paid-first</p><p>$290/year</p><p>What you get</p><button>Start Professional</button></section>`;
    expect(htmlClaimsFakePaidFirstOffer(fake)).toBe(true);
    expect(evaluateMaterialCustomerAdvantageGate({ html: fake }).result).toBe("FAIL");
    expect(inferRenderedOfferFromHtml(fake).offer_block_present).toBe(false);
    expect(classifyCommercialOfferState({
      prices_visible: true,
      material_advantage: false,
    })).toBe("PRICING_PRESENT_OFFER_NONE");
  });

  it("composes above-the-fold pricing without internal language", () => {
    const pricing = pricingHtml();
    expect(pricingUxReady(pricing)).toBe(true);
    expect(evaluateCustomerFacingLanguageGate(pricing).result).toBe("PASS");
    expect(inferRenderedOfferFromHtml(pricing).offer_block_present).toBe(true);
    expect(pricing.indexOf("Start Free Trial")).toBeLessThan(pricing.indexOf("Start Professional"));
    expect(pricing.indexOf("Start Professional")).toBeLessThan(pricing.indexOf("Start One Deal"));
    expect(pricing.indexOf("$290/year")).toBeLessThan(pricing.indexOf("Start Professional"));
  });

  it("HQ never names $290/year as the current offer", () => {
    const view = projectVentureOfferArchitectureHq(CRE_VENTURE_ID);
    expect(view.current_offer).toBe("3-Day Free Trial");
    expect(view.promotional_offer).toBe("3-Day Free Trial");
    expect(view.purchase_model).toBe("Annual subscription + per-transaction");
    expect(view.offer_optimization).toBe("PENDING");
    expect(view.pricing_architecture).toContain("$290");
    expect(view.pricing_architecture).not.toMatch(/current offer/i);
  });
});
