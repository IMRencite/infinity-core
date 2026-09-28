import { describe, expect, it } from "vitest";
import { CLUB_THROTTLE_BRAND_PROFILE } from "../brand/club-throttle-profile";
import { composeClubThrottleStorefrontFiles } from "../club-throttle-storefront-compose";
import { assembleClubThrottleSandboxCommerceOrder } from "../sandbox-order";
import { authorizeGelatoSandboxFulfillment } from "@/lib/infinity/commercialization/providers/gelato/order-adapter";

describe("club throttle storefront brand and sandbox order", () => {
  it("binds the founder-approved logo through BrandProfile", () => {
    const composed = composeClubThrottleStorefrontFiles();
    expect(CLUB_THROTTLE_BRAND_PROFILE.status).toBe("EXISTING_APPROVED_BRAND");
    expect(CLUB_THROTTLE_BRAND_PROFILE.generate_replacement_logo).toBe(false);
    expect(composed.logo_bound).toBe(true);
    expect(composed.founder_dirty_tree_deployed).toBe(false);
    expect(composed.files.some((file) => file.path === "public/brand/club-throttle/logo-primary.png" && file.encoding === "base64")).toBe(true);
    const mark = composed.files.find((file) => file.path === "app/components/brand-mark.tsx")?.content ?? "";
    const header = composed.files.find((file) => file.path === "app/components/header.tsx")?.content ?? "";
    const footer = composed.files.find((file) => file.path === "app/components/footer.tsx")?.content ?? "";
    expect(mark).toContain("brand.primary_logo_path");
    expect(header).toContain("<BrandMark");
    expect(header.toLowerCase()).not.toContain("infinity os venture");
    expect(footer).toContain("relationship_imros");
    expect(header).not.toContain("generated-logo");
    expect(composed.files.some((file) => file.path === "public/commerce-artwork/ride-past-midnight.svg")).toBe(true);
  });

  it("authorizes exactly one sandbox commerce order path", () => {
    const assembled = assembleClubThrottleSandboxCommerceOrder({
      product_id: "cprod_club_throttle_midnight_tee_v1",
      variant_id: "cvar_club_throttle_midnight_tee_m_black",
      provider_product_uid: "gelato_uid",
      artwork_url: "https://example.vercel.app/commerce-artwork/ride-past-midnight.svg",
    });
    expect(assembled.order.environment).toBe("SANDBOX");
    expect(assembled.order.test_provenance).toBe(true);
    expect(assembled.order.live_customer).toBe(false);
    expect(assembled.order.quantity).toBe(1);
    const again = assembleClubThrottleSandboxCommerceOrder({
      product_id: "cprod_club_throttle_midnight_tee_v1",
      variant_id: "cvar_club_throttle_midnight_tee_m_black",
      provider_product_uid: "gelato_uid",
      artwork_url: "https://example.vercel.app/commerce-artwork/ride-past-midnight.svg",
    });
    expect(again.provider_submission_key).toBe(assembled.provider_submission_key);
    expect(authorizeGelatoSandboxFulfillment({
      artwork_url: "http://localhost:3000/x.svg",
      canonical_product: true,
      variant_mapping: true,
      economics: true,
      margin: true,
      idempotency: true,
    }).decision).toBe("REFUSED");
    expect(authorizeGelatoSandboxFulfillment({
      artwork_url: assembled.order.artwork_url,
      canonical_product: true,
      variant_mapping: true,
      economics: true,
      margin: true,
      idempotency: true,
    }).decision).toBe("FULFILLMENT_AUTHORIZED_SANDBOX");
  });
});
