import { describe, expect, it } from "vitest";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { pricingUxReady } from "@/lib/infinity/venture-operating-scale/occupancynpv-pricing-ux-repair-deployment";
import { projectVentureOfferArchitectureHq } from "../hq";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  evaluateAboveFoldCommercialDensityGate,
  evaluateCommercialHeroHeightGate,
  evaluateCommercialPanelSpacingGate,
  evaluateCommercialVisualHierarchyGate,
  evaluateFounderViewportCommercialQc,
  evaluateInitialViewportCommercialActionGate,
  SUPERSEDED_FALSE_POSITIVE,
} from "../founder-viewport-commercial-qc";
import {
  evaluateCommercialContentDensityGate,
  evaluateCommercialInformationHierarchyGate,
  evaluateCustomerFacingLanguageGate,
  evaluateMaterialCustomerAdvantageGate,
  evaluateOccupancyNpvTrueOfferSelection,
} from "../true-offer";

function pricingSource() {
  return composeOccupancynpvPaymentReactivationFiles().files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
}

function cssSource() {
  return composeOccupancynpvPaymentReactivationFiles().files.find((file) => file.path.replace(/\\/g, "/") === "styles/globals.css")?.content ?? "";
}

const belowFold = {
  name: "1366x768",
  width: 1366,
  height: 768,
  scrollY: 0,
  viewportHeight: 768,
  professionalPrice: { top: 820, bottom: 860 },
  startFreeTrial: { top: 760, bottom: 808 },
  startProfessional: { top: 900, bottom: 948 },
  perDealPrice: { top: 820, bottom: 860 },
  startOneDeal: { top: 900, bottom: 948 },
  hero: { top: 72, bottom: 430, height: 358 },
  siblingGapPx: 4,
  pricingGroupToNextSectionGapPx: 2,
};

const aboveFold = {
  name: "1366x768",
  width: 1366,
  height: 768,
  scrollY: 0,
  viewportHeight: 768,
  professionalPrice: { top: 280, bottom: 316 },
  startFreeTrial: { top: 188, bottom: 236 },
  startProfessional: { top: 328, bottom: 376 },
  perDealPrice: { top: 280, bottom: 316 },
  startOneDeal: { top: 328, bottom: 376 },
  hero: { top: 72, bottom: 184, height: 112 },
  siblingGapPx: 24,
  pricingGroupToNextSectionGapPx: 32,
};

describe("OCCUPANCYNPV_FOUNDER_VIEWPORT_COMMERCIAL_QC_V2", () => {
  it("records prior automated fold and spacing PASS as superseded false positives", () => {
    expect(SUPERSEDED_FALSE_POSITIVE).toBe("SUPERSEDED_FALSE_POSITIVE");
    expect(evaluateInitialViewportCommercialActionGate(belowFold).result).toBe("FAIL");
    expect(evaluateCommercialPanelSpacingGate({
      siblingGapPx: 4,
      pricingGroupToNextSectionGapPx: 2,
      measurement: "BROWSER_GEOMETRY",
    }).result).toBe("FAIL");
    expect(evaluatePrimaryWithoutGeometry()).toBe("FAIL");
  });

  it("fails source-only viewport and density gates that previously hid founder evidence", () => {
    const obstructive = `
      <header class="pv-hero pv-article-hero pv-hero-photo"></header>
      <div>What does OccupancyNPV cost?</div>
      <p>These offers exist because tenant-rep brokers currently rebuild a workbook</p>
      <div class="pv-pricing-split"><p class="vg-price">$290 / year</p></div>
      <button>Request Pilot Access</button>
      <section data-pricing-architecture="true"><p class="vg-price">$290/year</p><button data-offer-cta="primary">Start Professional</button></section>
    `;
    expect(evaluateAboveFoldCommercialDensityGate({ html: obstructive }).result).toBe("FAIL");
    expect(evaluateCommercialContentDensityGate(obstructive).result).toBe("FAIL");
    expect(evaluateCommercialInformationHierarchyGate(obstructive).result).toBe("FAIL");
    expect(evaluateCommercialHeroHeightGate({ html: obstructive, measurement: "SOURCE_INFERENCE" }).result).toBe("FAIL");
  });

  it("composes one compact pricing decision block without the fake offer", () => {
    const pricing = pricingSource();
    const css = cssSource();
    expect(pricingUxReady(pricing)).toBe(true);
    expect(pricing).toContain('data-commercial-hero="overlay"');
    expect(pricing).toContain("hero-building.webp");
    expect(pricing).toContain("How the 3-day free trial works");
    expect(pricing).toContain("Professional vs Per-Deal");
    expect(pricing).not.toContain("Who is this not for");
    expect(pricing).toContain("data-commercial-decision=\"primary\"");
    expect(pricing).toContain("$290/year");
    expect(pricing).toContain("$149");
    expect(pricing).toContain("Start Free Trial");
    expect(pricing).toContain("Try OccupancyNPV free for 3 days");
    expect(pricing).toContain("Start Professional");
    expect(pricing).toContain("Start One Deal");
    expect(pricing.indexOf("Start Free Trial")).toBeLessThan(pricing.indexOf("Start Professional"));
    expect(pricing).not.toContain("pv-hero-photo");
    expect(pricing).not.toContain("pv-pricing-split");
    expect(pricing).not.toContain("What does OccupancyNPV cost?");
    expect(pricing).not.toContain("Primary offer · paid-first");
    expect(pricing).not.toContain("data-offer-block");
    expect(pricing.indexOf("Start Professional")).toBeLessThan(pricing.indexOf("How the 3-day free trial works"));
    expect(evaluateCustomerFacingLanguageGate(pricing).result).toBe("PASS");
    expect(evaluateCommercialContentDensityGate(pricing).result).toBe("PASS");
    expect(evaluateCommercialInformationHierarchyGate(pricing).result).toBe("PASS");
    expect(evaluateCommercialVisualHierarchyGate(pricing).result).toBe("PASS");
    expect(css).toContain(".onpv-pricing-hero");
    expect(css).toContain("--pv-space-visual-gap");
  });

  it("passes geometry gates only when scrollY is 0 and CTAs are inside the viewport", () => {
    const pricing = pricingSource();
    expect(evaluateFounderViewportCommercialQc({ html: pricing }).InitialViewportCommercialActionGate.result).toBe("FAIL");
    expect(evaluateFounderViewportCommercialQc({ html: pricing, profile: belowFold }).InitialViewportCommercialActionGate.result).toBe("FAIL");
    const pass = evaluateFounderViewportCommercialQc({ html: pricing, profile: aboveFold });
    expect(pass.InitialViewportCommercialActionGate.result).toBe("PASS");
    expect(pass.AboveFoldCommercialDensityGate.result).toBe("PASS");
    expect(pass.CommercialHeroHeightGate.result).toBe("PASS");
    expect(pass.CommercialPanelSpacingGate.result).toBe("PASS");
    expect(pass.PrimaryCommercialActionViewportGate.result).toBe("PASS");
  });

  it("selects the 3-day no-card trial and states it above the paid CTAs", () => {
    const selected = evaluateOccupancyNpvTrueOfferSelection();
    expect(selected.decision).toBe("TRUE_OFFER_SELECTED");
    expect(selected.promotional_offer).toBe("3-Day Free Trial");
    expect(selected.offer_optimization).toBe("PENDING");
    expect(selected.capital_blocks).toBe(false);
    expect(selected.candidates.find((row) => row.id === "FREE_FIRST_DEAL")?.eligible).toBe(false);
    expect(selected.candidates.find((row) => row.id === "NO_CARD_TRIAL")?.eligible).toBe(true);
    expect(evaluateMaterialCustomerAdvantageGate({ html: pricingSource() }).result).toBe("PASS");
    const view = projectVentureOfferArchitectureHq(CRE_VENTURE_ID);
    expect(view.promotional_offer).toBe("3-Day Free Trial");
    expect(view.offer_optimization).toBe("PENDING");
    expect(view.purchase_model).toBe("Annual subscription + per-transaction");
    expect(view.primary_cta).toBe("Start Free Trial");
  });
});

function evaluatePrimaryWithoutGeometry() {
  return evaluateFounderViewportCommercialQc({ html: "<button>Start Professional</button>" }).PrimaryCommercialActionViewportGate.result;
}
