import { describe, expect, it } from "vitest";
import { composeClubThrottleStorefrontFiles } from "../club-throttle-storefront-compose";
import {
  auditCommerceCatalogDrift,
  clubThrottleCoreTeeProductRecord,
  ensureCanonicalProductInventory,
  listCanonicalProducts,
  resetCanonicalProductInventory,
} from "../canonical-product-inventory";
import { composeClubThrottleApparelDesign, evaluateGeometricKnownBadCreative } from "../creative-media/apparel-design-intelligence";
import { composeKickstandsUpConcept } from "../creative-media/creative-trend-intelligence";
import { auditImrStripeReuse, authorizeBrowserPrice, stripeEventIdempotency } from "../imr-stripe-authority";
import { addLineToCart, buyAgainToCart, createPersistentCart, mergeGuestCartIntoAccount, resetPersistentCartsForTests, saveLineForLater } from "../persistent-cart";
import { amazonCreatorsConnectorState, amazonCreatorsRequestGuard } from "@/lib/infinity/marketplace-intelligence/amazon-creators-connector";
import { evaluateMarketplaceTrendFramework } from "@/lib/infinity/marketplace-intelligence/trend-intelligence";
import { classifyCreateProductFromTemplateSideEffect, classifyGelatoVisualizationCapability, planHiddenTemplateProductVisualization } from "@/lib/infinity/commercialization/providers/gelato/template-visualization";
import {
  assembleClubThrottleOperatingBundle,
  assembleOccupancyNpvOperatingBundle,
  communicationProfileReadiness,
} from "@/lib/infinity/autonomous-venture-operations/assemble";

describe("canonical commerce, marketplace, gelato visuals", () => {
  it("derives Club Throttle shop surfaces from one product inventory", () => {
    resetCanonicalProductInventory();
    const products = ensureCanonicalProductInventory();
    expect(products.map((row) => row.slug)).toEqual(["kickstands-up-tee", "club-throttle-core-tee"]);
    expect(listCanonicalProducts("club-throttle").every((row) => row.source === "CANONICAL_INVENTORY")).toBe(true);
    expect(auditCommerceCatalogDrift({
      venture_id: "club-throttle",
      pdp: "CANONICAL_INVENTORY",
      shop: "CANONICAL_INVENTORY",
      collections: "CANONICAL_INVENTORY",
      search: "CANONICAL_INVENTORY",
      new_releases: "CANONICAL_INVENTORY",
      related: "CANONICAL_INVENTORY",
      recommendations: "CANONICAL_INVENTORY",
      buy_again: "CANONICAL_INVENTORY",
      cart: "CANONICAL_INVENTORY",
    }).required_action).toBe("NONE");
    const composed = composeClubThrottleStorefrontFiles();
    const catalog = composed.files.find((file) => file.path === "lib/catalog.ts")?.content ?? "";
    expect(catalog).toContain("kickstands-up-tee");
    expect(catalog).not.toContain("territory_id");
    expect(composed.files.some((file) => file.path === "public/visual/product-kickstands-up-garment.svg")).toBe(true);
    const about = composed.files.find((file) => file.path === "app/about/page.tsx")?.content ?? "";
    expect(about.toLowerCase()).not.toContain("territory");
    expect(about).toContain("motorcycle street brand");
    const mark = composed.files.find((file) => file.path === "app/globals.css")?.content ?? "";
    expect(mark).toContain("height:88px");
    expect(mark).toContain("background:transparent");
  });

  it("keeps Amazon competitive use POLICY_BLOCKED and clusters trends without secrets", () => {
    const amazon = amazonCreatorsConnectorState({
      AMAZON_CREATORS_CLIENT_ID: "present",
      AMAZON_CREATORS_CLIENT_SECRET: "present",
    });
    expect(amazon.credentials).toBe("PRESENT");
    expect(amazon.competitive_use).toBe("POLICY_BLOCKED");
    expect(amazon.unauthorized_amazon_analysis).toBe(false);
    expect(amazon.live_request).toBe("DISABLED");
    expect(JSON.stringify(amazon)).not.toContain("AMAZON_CREATORS_CLIENT_SECRET=present");
    expect(amazonCreatorsRequestGuard("competitive_product_intelligence").ok).toBe(false);
    const trends = evaluateMarketplaceTrendFramework();
    expect(trends.framework).toBe("PASS");
    expect(trends.amazon_policy).toBe("POLICY_BLOCKED");
    expect(trends.cluster.ip_safe).toBe(true);
  });

  it("rejects Kickstands Up as known-bad and fails geometric known-bad", () => {
    const concept = composeKickstandsUpConcept();
    expect(concept.commercial.result).toBe("FAIL");
    const apparel = composeClubThrottleApparelDesign();
    expect(apparel.commercial.result).toBe("FAIL");
    expect(apparel.composition.placement).toBe("SMALL_FRONT_LARGE_BACK");
    expect(evaluateGeometricKnownBadCreative().result).toBe("FAIL");
    const gelato = classifyGelatoVisualizationCapability();
    expect(gelato.standalone_mockup_endpoint).toBe("NOT_FOUND");
    expect(gelato.template_based_product_visualization).toBe("SUPPORTED");
    const proof = planHiddenTemplateProductVisualization();
    expect(proof.fulfillment_order).toBe(false);
    expect(proof.real_charge).toBe(false);
    expect(proof.customer_product_public).toBe(false);
    expect(proof.provider_preview).toBe("NOT_RUN");
    const side = classifyCreateProductFromTemplateSideEffect();
    expect(side.side_effect).toBe("UNPROVEN_PREFLIGHT");
    expect(side.previously_called).toBe(false);
    expect(side.financial_charge_risk).toBe("NONE");
    expect(side.fulfillment).toBe("NO");
  });

  it("reuses IMR Stripe and keeps Club Throttle sender unauthorized", () => {
    const stripe = auditImrStripeReuse();
    expect(stripe.new_payment_engine).toBe(false);
    expect(stripe.raw_card_storage).toBe(false);
    expect(stripe.live_checkout).toBe("CLOSED");
    expect(authorizeBrowserPrice({
      server_unit_price_usd: 42,
      browser_unit_price_usd: 1,
      quantity: 2,
      currency: "usd",
      live_checkout: false,
    }).ok).toBe(false);
    const seen = new Set<string>();
    expect(stripeEventIdempotency(seen, "evt_1").accepted).toBe(true);
    expect(stripeEventIdempotency(seen, "evt_1").duplicate).toBe(true);
    const ct = communicationProfileReadiness(assembleClubThrottleOperatingBundle().communication);
    expect(ct.state).toBe("PROFILE_READY");
    expect(ct.sender).toBe("SENDER_UNAUTHORIZED");
    expect(assembleOccupancyNpvOperatingBundle().communication.engine).toBe("CANONICAL_COMMUNICATION");
    expect(assembleOccupancyNpvOperatingBundle().organic.content_quality_framework).toBe("content-quality-framework-v2");
    expect(assembleClubThrottleOperatingBundle().organic.comments_community).toBe("NOT_IN_SCOPE");
  });

  it("persists a guest cart and does not auto-charge Buy Again", () => {
    resetPersistentCartsForTests();
    const guest = createPersistentCart({ venture_id: "club-throttle", guest_id: "g1" });
    addLineToCart(guest, {
      product_id: "cprod_club_throttle_core_tee_v1",
      variant_id: "M:black",
      size: "M",
      color: "black",
      quantity: 1,
      browser_unit_price_usd: 42,
    });
    expect(guest.lines.map((row) => row.product_id)).toEqual(["cprod_club_throttle_core_tee_v1"]);
    saveLineForLater(guest, "cprod_club_throttle_core_tee_v1");
    expect(guest.lines).toHaveLength(0);
    expect(guest.saved_for_later).toHaveLength(1);
    const merged = mergeGuestCartIntoAccount({
      venture_id: "club-throttle",
      guest_id: "g1",
      account_id: "acct_1",
    });
    expect(merged.account_id).toBe("acct_1");
    expect(merged.saved_for_later).toHaveLength(1);
    const again = buyAgainToCart({
      cart: merged,
      product: clubThrottleCoreTeeProductRecord(),
      variant_id: "M:black",
      size: "M",
      color: "black",
      quantity: 1,
      browser_unit_price_usd: 42,
    });
    expect(again.charged).toBe(false);
    expect(again.ordered).toBe(false);
    expect(again.ok).toBe(false);
  });
});
