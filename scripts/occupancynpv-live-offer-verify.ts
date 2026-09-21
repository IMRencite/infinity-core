import { writeFileSync } from "node:fs";
import { activateOccupancyNpvLivePaidFirstOffer, OCCUPANCYNPV_HIGH_FRICTION_PAID_FIRST_JUSTIFICATION } from "../lib/infinity/offer-architecture/occupancynpv-live-activation";
import { projectVentureOfferArchitectureHq } from "../lib/infinity/offer-architecture/hq";
import { CRE_VENTURE_ID } from "../lib/infinity/venture-operating-scale/constants";
import { persistOccupancynpvLiveOfferSurface } from "../lib/infinity/venture-operating-scale/occupancynpv-live-offer-surface";
import { evaluateOccupancynpvCommercialOfferCompleteness, inferRenderedOfferFromHtml } from "../lib/infinity/universal-venture-system-qc/commercial-offer";
import { occupancynpvCommercialOfferVerification } from "../lib/infinity/universal-venture-system-qc/occupancynpv";
import { projectVentureCustomerSuggestions, evaluateFounderFeedbackVisibilityGate } from "../lib/infinity/product-improvement-loop";
import { inspectFounderSuggestionsSurface } from "../lib/infinity/product-improvement-loop/suggestions-qc";
import { readLiveCommercialCheckoutHealth } from "../lib/infinity/venture-operating-scale/occupancynpv-live-checkout-health";
import { OCCUPANCYNPV_LIVE_OFFER_DEPLOY_EVIDENCE_PATH } from "../lib/infinity/venture-operating-scale/occupancynpv-live-offer-deployment";

async function htmlFrom(url: string) {
  const response = await fetch(url, { redirect: "follow", cache: "no-store" });
  return { ok: response.ok, status: response.status, body: await response.text() };
}

async function main() {
  const pricing = await htmlFrom("https://occupancynpv.com/pricing");
  const login = await htmlFrom("https://occupancynpv.com/occupancynpv/app/login");
  const offerVisible = pricing.ok
    && pricing.body.includes("data-offer-block")
    && pricing.body.includes("Start Professional")
    && pricing.body.includes("Start One Deal")
    && /what you get/i.test(pricing.body);
  if (offerVisible) {
    persistOccupancynpvLiveOfferSurface({
      captured_at: new Date().toISOString(),
      origin: "https://occupancynpv.com/pricing",
      html: pricing.body,
      status: pricing.status,
      offer_block: true,
      primary_cta: true,
    });
  }
  const activated = activateOccupancyNpvLivePaidFirstOffer();
  const completeness = evaluateOccupancynpvCommercialOfferCompleteness({
    html: pricing.body,
    canonical: activated.offer,
    commercial_activation_claimed: true,
    claimed_lifecycle: "ACTIVE",
    high_friction_justification: OCCUPANCYNPV_HIGH_FRICTION_PAID_FIRST_JUSTIFICATION,
  });
  const verification = occupancynpvCommercialOfferVerification({ html: pricing.body });
  const rendered = inferRenderedOfferFromHtml(pricing.body);
  const hq = projectVentureOfferArchitectureHq(CRE_VENTURE_ID);
  const suggestions = projectVentureCustomerSuggestions(CRE_VENTURE_ID);
  const surface = inspectFounderSuggestionsSurface();
  const feedback = evaluateFounderFeedbackVisibilityGate({
    canonical_feedback_count: suggestions.counts.real,
    suggestions_tab_present: surface.suggestions_tab_present,
    suggestions_surface_reachable: surface.suggestions_surface_reachable,
  });
  const checkout = readLiveCommercialCheckoutHealth();
  const evidence = {
    live_visible: offerVisible,
    pricing_status: pricing.status,
    login_status: login.status,
    completeness: completeness.result,
    reasons: completeness.reasons,
    surfaces: completeness.surfaces.result,
    price_only: completeness.price_only.result,
    parity: completeness.parity.result,
    ttv: completeness.ttv.result,
    cta: completeness.cta.result,
    journey: completeness.journey.result,
    measurement: completeness.measurement.result,
    disclosure: completeness.disclosure.result,
    commercial_offer: verification.verification.status,
    cta_label: rendered.cta_label,
    checkout_health: checkout?.result ?? "UNKNOWN",
    payment_health: checkout?.result ?? "UNKNOWN",
    fulfillment_health: checkout?.fulfillment ?? "UNKNOWN",
    suggestions_real: suggestions.counts.real,
    suggestions_synthetic: suggestions.counts.synthetic,
    founder_feedback: feedback.result,
    hq_current_offer: hq.current_offer,
    hq_offer_type: hq.offer_type,
    hq_offer_status: hq.offer_status,
    hq_friction: hq.purchase_friction,
    hq_ttv: hq.time_to_value,
    hq_cta: hq.primary_cta,
    hq_experiment: hq.experiment_status,
    login_has_auth: /sign in|password|email/i.test(login.body),
    checkout_form: /\/api\/checkout\/start/.test(pricing.body),
    primary_button: /data-offer-cta="primary"/.test(pricing.body),
  };
  writeFileSync(
    OCCUPANCYNPV_LIVE_OFFER_DEPLOY_EVIDENCE_PATH,
    `${JSON.stringify({
      ...JSON.parse(await import("node:fs").then((fs) => fs.readFileSync(OCCUPANCYNPV_LIVE_OFFER_DEPLOY_EVIDENCE_PATH, "utf8"))),
      live_visible: offerVisible,
      safe_error: offerVisible ? null : "LIVE_PRICING_OFFER_NOT_VISIBLE",
      verified_at: new Date().toISOString(),
    }, null, 2)}\n`,
  );
  console.log(JSON.stringify(evidence, null, 2));
  if (!offerVisible || completeness.result !== "PASS") process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
