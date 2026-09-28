import { createHash } from "node:crypto";
import { CLUB_THROTTLE_VENTURE_ID } from "./club-throttle";

export type CommerceOrder = {
  commerce_order_id: string;
  venture_id: typeof CLUB_THROTTLE_VENTURE_ID;
  environment: "SANDBOX";
  test_provenance: true;
  live_customer: false;
  payment: "NON_LIVE";
  provider: "GELATO";
  product_id: string;
  variant_id: string;
  provider_product_uid: string;
  artwork_url: string;
  quantity: 1;
  created_at: string;
};

export type FulfillmentOrder = {
  fulfillment_order_id: string;
  commerce_order_id: string;
  provider: "GELATO";
  environment: "SANDBOX";
  provider_submission_key: string;
  provider_order_id: string | null;
  quantity: 1;
  artwork_url: string;
};

export function clubThrottleSandboxIdempotencyKey(input: {
  product_id: string;
  variant_id: string;
  provider_product_uid: string;
  artwork_url: string;
}): string {
  return createHash("sha256")
    .update(
      [
        CLUB_THROTTLE_VENTURE_ID,
        "SANDBOX",
        "gelato-canary-v1",
        input.product_id,
        input.variant_id,
        input.provider_product_uid,
        input.artwork_url,
        "1",
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 32);
}

export function assembleClubThrottleSandboxCommerceOrder(input: {
  product_id: string;
  variant_id: string;
  provider_product_uid: string;
  artwork_url: string;
}): { order: CommerceOrder; fulfillment: FulfillmentOrder; provider_submission_key: string } {
  const key = clubThrottleSandboxIdempotencyKey(input);
  const commerce_order_id = `cord_ct_sandbox_${key}`;
  const fulfillment_order_id = `ford_ct_sandbox_${key}`;
  return {
    provider_submission_key: key,
    order: {
      commerce_order_id,
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      environment: "SANDBOX",
      test_provenance: true,
      live_customer: false,
      payment: "NON_LIVE",
      provider: "GELATO",
      product_id: input.product_id,
      variant_id: input.variant_id,
      provider_product_uid: input.provider_product_uid,
      artwork_url: input.artwork_url,
      quantity: 1,
      created_at: new Date().toISOString(),
    },
    fulfillment: {
      fulfillment_order_id,
      commerce_order_id,
      provider: "GELATO",
      environment: "SANDBOX",
      provider_submission_key: key,
      provider_order_id: null,
      quantity: 1,
      artwork_url: input.artwork_url,
    },
  };
}
