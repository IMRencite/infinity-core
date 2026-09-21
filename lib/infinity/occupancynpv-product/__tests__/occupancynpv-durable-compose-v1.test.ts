import { describe, expect, it } from "vitest";
import { composeOccupancynpvPaidProductFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-paid-product-surface";
import { evaluateOccupancynpvFulfillmentReadiness } from "@/lib/infinity/venture-operating-scale/occupancynpv-fulfillment";

describe("OCCUPANCYNPV_DURABLE_COMPOSE_V1", () => {
  it("composes paid-app files onto the blocked-checkout successor without payment activation", () => {
    const composed = composeOccupancynpvPaidProductFiles();
    const paths = composed.files.map((file) => file.path.replace(/\\/g, "/"));
    expect(paths).toEqual(expect.arrayContaining([
      "app/occupancynpv/app/page.tsx",
      "app/occupancynpv/app/login/page.tsx",
      "app/occupancynpv/app/checkout/complete/page.tsx",
      "app/api/occupancynpv/auth/signup/route.ts",
      "app/api/occupancynpv/workspaces/route.ts",
      "lib/occupancynpv/npv.ts",
      "lib/occupancynpv/admin.ts",
      "app/api/checkout/start/route.ts",
    ]));
    const checkout = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/api/checkout/start/route.ts")?.content ?? "";
    expect(checkout).toContain("PAYMENT_ACTIVATION_NOT_AUTHORIZED");
    expect(checkout).toContain("const paymentActivation = false");
    const pkg = composed.files.find((file) => file.path.replace(/\\/g, "/") === "package.json")?.content ?? "";
    expect(pkg).toContain("@supabase/ssr");
    expect(pkg).not.toMatch(/unlimited/i);
    expect(checkout).toContain("PAYMENT_ACTIVATION_NOT_AUTHORIZED");
    void evaluateOccupancynpvFulfillmentReadiness();
  });
});
