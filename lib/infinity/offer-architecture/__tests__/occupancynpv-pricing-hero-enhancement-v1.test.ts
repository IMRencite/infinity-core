import { describe, expect, it } from "vitest";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { pricingUxReady } from "@/lib/infinity/venture-operating-scale/occupancynpv-pricing-ux-repair-deployment";
import {
  evaluateHeroConversionBalanceGate,
  evaluateHeroTextReadabilityGate,
  evaluateResponsiveHeroGate,
} from "../pricing-page-quality";
import { ensureOccupancyNpvCanonicalWork, projectVentureCurrentWork, resetCanonicalWorkStore } from "@/lib/infinity/canonical-work";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";

function composed() {
  return composeOccupancynpvPaymentReactivationFiles();
}

function pricing() {
  return composed().files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
}

function css() {
  return composed().files.find((file) => file.path.replace(/\\/g, "/") === "styles/globals.css")?.content ?? "";
}

describe("OCCUPANCYNPV_PRICING_HERO_ENHANCEMENT_V1", () => {
  it("enlarges the existing building hero with overlay copy and no extra primary CTA", () => {
    const html = pricing();
    const styles = css();
    expect(pricingUxReady(html)).toBe(true);
    expect(html).toContain("hero-building.webp");
    expect(html).toContain('data-commercial-hero="overlay"');
    expect(html).toContain("Compare commercial lease scenarios with confidence");
    expect(html).toContain("Model cash flow, NPV, and sensitivity");
    expect(html).toContain("Start with a 3-day free trial. No credit card required.");
    expect(html).not.toContain("pv-hero-photo");
    expect(html).toContain("How the 3-day free trial works");
    expect(html).toContain("Professional vs Per-Deal");
    expect(html).toContain("$290/year");
    expect(html).toContain("$149");
    expect(evaluateHeroTextReadabilityGate(html).result).toBe("PASS");
    expect(evaluateResponsiveHeroGate({ html, css: styles }).result).toBe("PASS");
    expect(evaluateHeroConversionBalanceGate({
      html,
      profile: {
        scrollY: 0,
        viewportHeight: 768,
        professionalPrice: { top: 560, bottom: 590 },
        startFreeTrial: { top: 380, bottom: 430 },
        startProfessional: { top: 560, bottom: 610 },
        hero: { top: 68, bottom: 284, height: 216 },
      },
    }).result).toBe("PASS");
    expect(styles).toContain("13.5rem");
    expect(styles).toContain("10rem");
  });

  it("keeps the hero enhancement parked, not as current active HQ work", () => {
    resetCanonicalWorkStore();
    ensureOccupancyNpvCanonicalWork();
    const detail = projectVentureCurrentWork(CRE_VENTURE_ID);
    expect(detail.current_work).toBeNull();
    expect(detail.status).toBeNull();
    expect(detail.parked_authorization).toMatch(/Pricing Hero Enhancement/);
    expect(detail.latest_completed).toBeTruthy();
  });
});
