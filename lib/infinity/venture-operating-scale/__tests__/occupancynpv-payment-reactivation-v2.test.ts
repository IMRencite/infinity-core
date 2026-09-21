import { describe, expect, it } from "vitest";
import { OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS } from "../occupancynpv-canonical-checkout";
import { OCCUPANCYNPV_FOUNDER_PAYMENT_REACTIVATION_AUTHORIZED } from "../occupancynpv-payment-reactivation-evidence";
import { composeOccupancynpvPaymentReactivationFiles } from "../occupancynpv-payment-reactivation-surface";
import { evaluateOccupancynpvFulfillmentReadiness } from "../occupancynpv-fulfillment";

describe("OCCUPANCYNPV_PAYMENT_REACTIVATION_V2", () => {
  it("composes fulfillment-gated checkout onto the paid product without new prices", () => {
    const composed = composeOccupancynpvPaymentReactivationFiles();
    const fulfillment = evaluateOccupancynpvFulfillmentReadiness();
    const paths = composed.files.map((file) => file.path.replace(/\\/g, "/"));
    expect(paths).toEqual(expect.arrayContaining([
      "app/occupancynpv/app/page.tsx",
      "app/occupancynpv/app/checkout/complete/page.tsx",
      "app/api/checkout/start/route.ts",
      "app/api/webhooks/stripe/route.ts",
    ]));
    const checkout = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/api/checkout/start/route.ts")?.content ?? "";
    const webhook = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/api/webhooks/stripe/route.ts")?.content ?? "";
    const complete = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/checkout/complete/page.tsx")?.content ?? "";
    const pricing = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
    expect(OCCUPANCYNPV_FOUNDER_PAYMENT_REACTIVATION_AUTHORIZED).toBe(true);
    expect(composed.checkoutRequiresFulfillment).toBe(true);
    expect(composed.successPath).toBe("/occupancynpv/app/checkout/complete");
    expect(composed.fulfillmentReady).toBe(fulfillment.result === "PASS");
    expect(checkout).toContain("const paymentActivation: boolean = true");
    expect(checkout).toContain("if (fulfillmentReady !== true)");
    expect(checkout).toContain("if (paymentActivation !== true)");
    expect(checkout).toContain(OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL.priceId);
    expect(checkout).toContain(OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL.priceId);
    expect(checkout).toContain("/occupancynpv/app/checkout/complete");
    expect(checkout).toContain("We couldn't start checkout. Please try again or contact support.");
    expect(checkout).toContain("CHECKOUT_UNAVAILABLE");
    expect(checkout).not.toContain("early-access?checkout=success");
    expect(checkout).not.toMatch(/price_1(?!UCs7[hi]LdvXKx7R7G)/);
    expect(webhook).toContain("durableFulfillStripeEvent");
    expect(webhook).toContain("checkout.session.completed");
    expect(complete).toContain("durableUser");
    expect(complete).not.toContain("checkout=success");
    expect(pricing).toContain("$290");
    expect(pricing).toContain("$149");
    expect(pricing).not.toMatch(/(?<!does not include )unlimited/i);
    expect(composed.files.some((file) => /price_/.test(file.path))).toBe(false);
  });
});
