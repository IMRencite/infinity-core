import { describe, expect, it } from "vitest";
import ts from "typescript";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { pricingUxReady } from "@/lib/infinity/venture-operating-scale/occupancynpv-pricing-ux-repair-deployment";
import { projectVentureOfferArchitectureHq } from "../hq";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  evaluateCommercialContentRedundancyGate,
  evaluateCommercialPageNarrativeGate,
  evaluatePricingPageInformationDepthGate,
} from "../pricing-page-quality";
import { ensureOccupancyNpvCanonicalWork, projectVentureCurrentWork, resetCanonicalWorkStore } from "@/lib/infinity/canonical-work";

function pricingPageParseDiagnostics(source: string): string[] {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.Latest,
      jsx: ts.JsxEmit.Preserve,
    },
    reportDiagnostics: true,
    fileName: "app/pricing/page.tsx",
  });
  return (result.diagnostics ?? []).map((row) => ts.flattenDiagnosticMessageText(row.messageText, "\n"));
}

function pricing() {
  return composeOccupancynpvPaymentReactivationFiles().files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
}

describe("OCCUPANCYNPV_PRICING_PAGE_QUALITY_V3", () => {
  it("keeps the 3-day trial first and restores a conversion-safe building hero", () => {
    const html = pricing();
    expect(pricingPageParseDiagnostics(html)).toEqual([]);
    expect(html).not.toMatch(/<\/div(?![>\s/])/);
    expect(html).toContain("PRICING_FAQ_SCHEMA");
    expect(pricingUxReady(html)).toBe(true);
    expect(html).toContain("hero-building.webp");
    expect(html).toContain('data-commercial-hero="overlay"');
    expect(html).toContain("Start Free Trial");
    expect(html.indexOf("Start Free Trial")).toBeLessThan(html.indexOf("Start Professional"));
    expect(html).toContain("$290/year");
    expect(html).toContain("$149");
    expect(html).not.toContain("data-offer-block");
    expect(html).not.toContain("Who is this not for");
    expect(html).not.toMatch(/Who should not use it/i);
  });

  it("answers buyer questions without duplicate not-for sections", () => {
    const html = pricing();
    expect(evaluatePricingPageInformationDepthGate(html).result).toBe("PASS");
    expect(evaluateCommercialContentRedundancyGate(html).result).toBe("PASS");
    expect(evaluateCommercialPageNarrativeGate(html).result).toBe("PASS");
    expect(html).toContain("FAQPage");
    expect(html).toContain("Start the 3-day free trial");
  });

  it("does not treat Next.js payload copies as duplicate audience sections", () => {
    const visible = "<h2>Who OccupancyNPV is not for</h2><p>Landlords running a portfolio</p>";
    const rendered = `${visible}<script>self.__next_f.push(${JSON.stringify(visible)})</script>`;
    expect(evaluateCommercialContentRedundancyGate(rendered).result).toBe("PASS");
    expect(evaluateCommercialContentRedundancyGate(`${visible}${visible}`).result).toBe("FAIL");
  });

  it("projects HQ quality fields and the production-quality mission", () => {
    resetCanonicalWorkStore();
    ensureOccupancyNpvCanonicalWork();
    const view = projectVentureOfferArchitectureHq(CRE_VENTURE_ID);
    expect(view.promotional_offer).toBe("3-Day Free Trial");
    expect(view.card_required).toBe("NO");
    expect(view.auto_convert).toBe("NO");
    expect(view.pricing_content_depth).toBeDefined();
    expect(view.whitespace).toBeDefined();
    expect(projectVentureCurrentWork(CRE_VENTURE_ID).current_work).toBeNull();
    expect(projectVentureCurrentWork(CRE_VENTURE_ID).parked_authorization).toMatch(/Pricing Hero Enhancement/);
  });
});
