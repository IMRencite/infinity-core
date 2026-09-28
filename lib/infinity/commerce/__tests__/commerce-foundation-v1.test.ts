import { describe, expect, it } from "vitest";
import { clubThrottlePodFulfillmentContract, clubThrottlePodOffer, clubThrottleStorefrontRoutes } from "../club-throttle";
import { receiveDesignSuggestion, clearDesignSuggestionsForTests } from "../design-suggestion";
import { evaluateProductEconomics, snapshotContributionMargin } from "../economics";
import { evaluateMerchandiseIpSafety } from "../ip-safety";
import { assembleClubThrottleOperatingBundle } from "@/lib/infinity/autonomous-venture-operations/assemble";

describe("club throttle commerce foundation", () => {
  it("reuses PHYSICAL_GOOD fulfillment and existing payment boundary", () => {
    const offer = clubThrottlePodOffer();
    const contract = clubThrottlePodFulfillmentContract();
    expect(offer.delivery_type).toBe("PHYSICAL_GOOD");
    expect(contract.fulfillment_type).toBe("PHYSICAL_GOOD");
    expect(contract.delivery_executor).toBe("GELATO");
    expect(offer.price_binding.price_id).toBe("UNCONFIGURED");
    expect(clubThrottleStorefrontRoutes().some((row) => row.path === "/suggest-a-design")).toBe(true);
  });

  it("blocks unlicensed marks and treats suggestions as demand only", () => {
    clearDesignSuggestionsForTests();
    expect(evaluateMerchandiseIpSafety("Harley-Davidson eagle tee").decision).toBe("BLOCK_IP_REVIEW");
    expect(evaluateMerchandiseIpSafety("midnight neon ride").decision).toBe("ALLOW");
    const first = receiveDesignSuggestion({
      venture_id: "club-throttle",
      suggestion_text: "midnight neon ride",
    });
    const duplicate = receiveDesignSuggestion({
      venture_id: "club-throttle",
      suggestion_text: "midnight neon ride",
    });
    expect(first.is_authorization_to_publish).toBe(false);
    expect(duplicate.status).toBe("DUPLICATE");
  });

  it("blocks weak margin and cost drift", () => {
    const economics = snapshotContributionMargin({
      retail_usd: 40,
      provider_base_cost_usd: 12,
      shipping_usd: 6,
      payment_fee_usd: 2,
    });
    expect(evaluateProductEconomics({
      snapshot: {
        snapshot_id: "s1",
        product_id: "p1",
        retail_usd: 40,
        provider_base_cost_usd: 12,
        print_cost_usd: 0,
        shipping_usd: 6,
        payment_fee_usd: 2,
        refund_allowance_usd: 0,
        gross_profit_usd: economics.gross_profit_usd,
        contribution_margin: economics.contribution_margin,
        quoted_at: "2026-09-23T14:00:00.000Z",
        provider_mapping_id: "map_1",
        environment: "SANDBOX",
      },
    })).toBe("PASS");
    expect(evaluateProductEconomics({
      snapshot: {
        snapshot_id: "s2",
        product_id: "p1",
        retail_usd: 20,
        provider_base_cost_usd: 16,
        print_cost_usd: 0,
        shipping_usd: 0,
        payment_fee_usd: 0,
        refund_allowance_usd: 0,
        gross_profit_usd: 4,
        contribution_margin: 0.2,
        quoted_at: "2026-09-23T14:00:00.000Z",
        provider_mapping_id: "map_1",
        environment: "SANDBOX",
      },
    })).toBe("BLOCK_MARGIN");
    const bundle = assembleClubThrottleOperatingBundle();
    expect(bundle.venture_id).toBe("club-throttle");
    expect(bundle.commerce.live_paid_orders).toBe(false);
    expect(bundle.communication.sender_authorization).toBe("UNAUTHORIZED");
  });
});
