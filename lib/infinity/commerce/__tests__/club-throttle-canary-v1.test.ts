import { describe, expect, it } from "vitest";
import { assembleClubThrottleCanaryProduct, clubThrottleCanaryArtworkProvenance } from "../club-throttle-canary";

describe("club throttle gelato canary product", () => {
  it("keeps Gelato IDs as mappings and blocks weak margin", () => {
    const art = clubThrottleCanaryArtworkProvenance();
    expect(art.original).toBe(true);
    expect(art.ip_safety).toBe("ALLOW");
    const ready = assembleClubThrottleCanaryProduct({
      provider_product_uid: "gelato_external_tee_uid",
      retail_usd: 42,
      provider_base_cost_usd: 12.5,
      shipping_usd: 5,
    });
    expect(ready.product.product_id).not.toBe("gelato_external_tee_uid");
    expect(ready.product_mapping.provider_product_uid).toBe("gelato_external_tee_uid");
    expect(ready.product.published).toBe(false);
    expect(ready.economics).toBe("PASS");
    const blocked = assembleClubThrottleCanaryProduct({
      provider_product_uid: "gelato_external_tee_uid",
      retail_usd: 18,
      provider_base_cost_usd: 14,
    });
    expect(blocked.economics).toBe("BLOCK_MARGIN");
  });
});
