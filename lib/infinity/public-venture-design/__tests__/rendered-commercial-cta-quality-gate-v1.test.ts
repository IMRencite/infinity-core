import { describe, expect, it } from "vitest";
import {
  applyCommercialCtaCss,
  evaluateRenderedCommercialCTAQualityGate,
  RENDERED_COMMERCIAL_CTA_QUALITY_GATE,
} from "../rendered-interaction/commercial-cta";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";

describe("RenderedCommercialCTAQualityGate", () => {
  it("fails a default-browser purchase button on a branded commercial surface", () => {
    const result = evaluateRenderedCommercialCTAQualityGate({
      route: "/pricing",
      html: `<div data-payment-surface="occupancynpv-canonical"><form action="/api/checkout/start" method="post"><button type="submit">Continue to Professional checkout — $290/year</button></form></div>`,
      css: "body { color: black; }",
    });
    expect(result.gate).toBe(RENDERED_COMMERCIAL_CTA_QUALITY_GATE);
    expect(result.result).toBe("FAIL");
    expect(result.rawDefaultBrandedCommercialCta).toBe("FAILS");
    expect(result.reasons).toContain("DEFAULT_BROWSER_STYLING");
  });

  it("passes branded OccupancyNPV checkout CTAs from the compose layer", () => {
    const composed = composeOccupancynpvPaymentReactivationFiles();
    const pricing = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
    const css = composed.files.find((file) => file.path.replace(/\\/g, "/") === "styles/globals.css")?.content ?? "";
    const result = evaluateRenderedCommercialCTAQualityGate({ html: pricing, css, route: "/pricing" });
    expect(pricing).toContain("vg-cta vg-cta--primary");
    expect(pricing).toContain("vg-cta vg-cta--secondary");
    expect(pricing).toContain("Start Professional");
    expect(pricing).toContain("Start One Deal");
    expect(pricing).not.toContain("<button type=\"submit\">Continue to Professional");
    expect(css).toContain("--vg-commercial-cta-applied");
    expect(applyCommercialCtaCss(css)).toBe(css);
    expect(result.result).toBe("PASS");
    expect(result.controls.length).toBeGreaterThanOrEqual(2);
  });
});
