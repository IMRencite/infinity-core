import { digestOfAuthorityFiles } from "@/lib/infinity/venture-website-architecture/cre-successor";
import { premiumAuthorityArtifactIdFor } from "@/lib/infinity/venture-website-architecture/compose-authority-artifact";
import { evaluateOccupancynpvFulfillmentReadiness } from "./occupancynpv-fulfillment";
import { composeOccupancynpvPaidProductFiles } from "./occupancynpv-paid-product-surface";
import { applyOccupancynpvFaviconToFiles } from "./occupancynpv-favicon";
import { applyOccupancynpvBrandIdentityToFiles } from "@/lib/infinity/venture-brand-identity/apply";
import { applyLifecycleAwarePublicMessaging } from "./occupancynpv-launch-messaging-repair";
import { applyOccupancynpvVenturePageDepthToFiles } from "./occupancynpv-venture-page-depth";
import { applyCommercialCtaComponent, applyCommercialCtaCss } from "@/lib/infinity/public-venture-design/rendered-interaction/commercial-cta";
import { OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS } from "./occupancynpv-canonical-checkout";
import { OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS } from "./occupancynpv-canonical-webhook";
import {
  occupancynpvPricingBuyerGuideSource,
  occupancynpvPricingFaqSchema,
} from "@/lib/infinity/offer-architecture/pricing-page-quality";

export const OCCUPANCYNPV_PAYMENT_REACTIVATION_SITE_CONTRACT =
  "occupancynpv_live_payment_reactivation_fulfillment_gated_v2" as const;

export const OCCUPANCYNPV_PAID_CHECKOUT_SUCCESS_PATH = "/occupancynpv/app/checkout/complete" as const;

export const OCCUPANCYNPV_IMPROVEMENT_FORM_CSS = `
/* OccupancyNPV public improvement form — reuse venture CTA/field language */
.occupancynpv-improvement-page .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.occupancynpv-improvement-page { padding: 2.5rem 1.25rem 4rem; max-width: 44rem; }
.occupancynpv-improvement-page h1 {
  font-size: var(--pv-font-section, 2rem);
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin: 0.35rem 0 0.75rem;
}
.occupancynpv-improvement-page .pv-lede { margin-bottom: 1.5rem; }
.occupancynpv-improvement-form { display: grid; gap: 1rem; padding: 1.35rem 1.4rem; }
.occupancynpv-improvement-form .vg-form-field { margin-bottom: 0; }
.occupancynpv-improvement-form .vg-form-field span { font-weight: 600; color: var(--pv-text, #152033); }
.occupancynpv-improvement-form .vg-textarea,
.occupancynpv-improvement-form .vg-input,
.occupancynpv-improvement-form textarea,
.occupancynpv-improvement-form input[type="email"] {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  border: 1px solid var(--pv-border, #c5d0da);
  border-radius: var(--pv-radius-sm, 0.5rem);
  padding: 0.65rem 0.75rem;
  font: inherit;
  color: var(--pv-text, #152033);
  background: var(--pv-surface, #ffffff);
  line-height: 1.45;
}
.occupancynpv-improvement-form .vg-textarea,
.occupancynpv-improvement-form textarea {
  min-height: 7.5rem;
  resize: vertical;
}
.occupancynpv-improvement-form .vg-input,
.occupancynpv-improvement-form input[type="email"] {
  min-height: 2.6rem;
}
.occupancynpv-improvement-form .vg-textarea:focus-visible,
.occupancynpv-improvement-form .vg-input:focus-visible,
.occupancynpv-improvement-form textarea:focus-visible,
.occupancynpv-improvement-form input:focus-visible {
  outline: 3px solid var(--pv-accent, #1d4e78);
  outline-offset: 2px;
  border-color: var(--pv-accent, #1d4e78);
}
.occupancynpv-improvement-form .vg-cta {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid transparent;
  cursor: pointer;
  width: fit-content;
  min-width: 12rem;
  font: inherit;
}
.occupancynpv-improvement-back { margin-top: 1.5rem; }
@media (max-width: 640px) {
  .occupancynpv-improvement-page { padding: 1.5rem 1rem 3rem; }
  .occupancynpv-improvement-form { padding: 1.1rem; }
  .occupancynpv-improvement-form .vg-cta { width: 100%; min-width: 0; }
}
`;

export const OCCUPANCYNPV_LIVE_OFFER_CSS = `
.onpv-live-offer {
  position: relative;
  margin: 1.75rem 0 2rem;
  padding: 1.5rem 1.4rem 1.6rem;
  border: 2px solid var(--pv-accent, #1d4e78);
  box-shadow: 0 18px 40px color-mix(in srgb, var(--pv-accent, #1d4e78) 16%, transparent);
}
.onpv-live-offer h2 { font-size: 1.85rem; margin: 0.35rem 0 0.5rem; }
.onpv-live-offer .vg-price { font-size: 2rem; font-weight: 700; margin: 0.4rem 0 0.8rem; }
.onpv-live-offer ul { margin: 0 0 1rem 1.1rem; }
@media (max-width: 640px) {
  .onpv-live-offer { padding: 1.15rem 1rem 1.25rem; }
  .onpv-live-offer .vg-cta { width: 100%; }
}
`;

export const OCCUPANCYNPV_CONVERSION_UX_CSS = `
.onpv-pricing-hero {
  position: relative;
  isolation: isolate;
  min-height: 0;
  padding: 0.35rem 0 0.15rem;
  overflow: hidden;
}
.onpv-pricing-hero-media { display: none; }
.onpv-pricing-hero .vg-container { position: relative; z-index: 1; }
.onpv-pricing-hero:not(.onpv-pricing-hero--overlay) .pv-eyebrow,
.onpv-pricing-hero:not(.onpv-pricing-hero--overlay) .pv-lede,
.onpv-pricing-hero:not(.onpv-pricing-hero--overlay) .onpv-pricing-lede { display: none; }
.onpv-pricing-hero .pv-display {
  font-size: 1.05rem;
  font-weight: 650;
  line-height: 1.2;
  margin: 0;
  letter-spacing: -0.02em;
}
.pv-section[data-section-id="pr_cards"] {
  padding-top: 0;
  padding-bottom: var(--pv-space-visual-gap, 1.5rem);
}
.onpv-pricing-hero + .pv-section[data-section-id="pr_cards"] {
  margin-top: 0;
}
body:has([data-pricing-architecture]) .pv-breadcrumb { display: none; }
.onpv-pricing {
  margin: 0 0 var(--pv-space-visual-gap, 1.5rem);
  padding: 0;
  border: 0;
  box-shadow: none;
  background: transparent;
}
.onpv-trial-offer {
  margin: 0 0 0.85rem;
  padding: 0.65rem 0.9rem 0.7rem;
  border: 2px solid var(--pv-accent, #1d4e78);
  border-radius: var(--pv-radius-sm, 0.5rem);
  background: var(--pv-surface, #ffffff);
  box-shadow: 0 12px 26px color-mix(in srgb, var(--pv-accent, #1d4e78) 12%, transparent);
}
.onpv-trial-offer .pv-eyebrow { margin: 0 0 0.1rem; letter-spacing: 0.04em; }
.onpv-trial-offer h2 {
  margin: 0 0 0.3rem;
  font-size: clamp(1.2rem, 2vw, 1.5rem);
  line-height: 1.15;
}
.onpv-offer-facts {
  margin: 0 0 0.45rem;
  padding: 0;
  list-style: none;
  font-size: 0.92rem;
  line-height: 1.35;
  color: var(--pv-ink, #12202c);
}
.onpv-offer-facts li { margin: 0; display: inline; }
.onpv-offer-facts li + li::before { content: " · "; }
.onpv-trial-terms {
  margin: 0.4rem 0 0;
  font-size: 0.88rem;
  line-height: 1.3;
  color: var(--pv-ink, #12202c);
}
.onpv-trial-offer .vg-cta { width: 100%; max-width: 20rem; min-height: 2.75rem; }
.onpv-buy-now {
  margin: 0 0 0.35rem;
  font-size: 0.88rem;
  font-weight: 650;
  letter-spacing: 0.02em;
}
.onpv-price-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--pv-space-visual-gap, 1.5rem);
}
.onpv-price-grid [data-price-card] {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: "name cta" "price cta" "note cta";
  column-gap: 0.85rem;
  row-gap: 0.1rem;
  align-items: center;
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--pv-border, #c5d0da);
  border-radius: var(--pv-radius-sm, 0.5rem);
  background: var(--pv-surface, #ffffff);
}
.onpv-price-grid [data-price-card] h2,
.onpv-price-grid [data-price-card] h3 { grid-area: name; margin: 0; font-size: 1.05rem; }
.onpv-price-grid [data-price-card] .vg-price {
  grid-area: price;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.1;
  margin: 0;
}
.onpv-price-grid [data-price-card] .onpv-price-note { grid-area: note; margin: 0; font-size: 0.88rem; line-height: 1.3; }
.onpv-price-grid [data-price-card] form { grid-area: cta; margin: 0; }
.onpv-price-grid .vg-cta { width: auto; min-width: 11rem; }
.onpv-pricing + h2,
.onpv-buyer-guide { margin-top: var(--pv-space-visual-gap, 1.5rem); }
.onpv-buyer-guide h2 { margin: 1.75rem 0 0.6rem; font-size: 1.25rem; line-height: 1.25; }
.onpv-buyer-guide h2:first-child { margin-top: 0; }
.onpv-buyer-guide h3 { margin: 1.1rem 0 0.35rem; font-size: 1.02rem; }
.onpv-buyer-guide ul,
.onpv-buyer-guide ol { margin: 0 0 0.8rem; padding-left: 1.2rem; }
.onpv-buyer-guide li { margin: 0 0 0.35rem; line-height: 1.45; }
.onpv-compare {
  display: grid;
  gap: 0;
  border: 1px solid var(--pv-border, #c5d0da);
  border-radius: var(--pv-radius-sm, 0.5rem);
  overflow: hidden;
  margin: 0 0 1rem;
}
.onpv-compare-row {
  display: grid;
  grid-template-columns: minmax(7rem, 0.9fr) minmax(0, 1.1fr) minmax(0, 1.1fr);
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  border-top: 1px solid var(--pv-border, #c5d0da);
  align-items: start;
}
.onpv-compare-row:first-child { border-top: 0; }
.onpv-compare-row--head { font-weight: 650; background: color-mix(in srgb, var(--pv-accent, #1d4e78) 6%, #fff); }
.onpv-steps { padding-left: 1.2rem; }
.onpv-final-cta {
  margin: 1.75rem 0 0;
  padding: 1rem 1.05rem 1.1rem;
  border: 2px solid var(--pv-accent, #1d4e78);
  border-radius: var(--pv-radius-sm, 0.5rem);
}
.onpv-final-paid { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.75rem; }
.onpv-pricing-hero--overlay {
  display: flex;
  align-items: center;
  height: 13.5rem;
  max-height: 13.5rem;
  min-height: 13.5rem;
  padding: 0;
  margin: 0 0 0.5rem;
}
.onpv-pricing-hero--overlay .onpv-pricing-hero-media {
  display: block;
  position: absolute;
  inset: 0;
  margin: 0;
}
.onpv-pricing-hero--overlay .onpv-pricing-hero-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 38%;
}
.onpv-pricing-hero-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(18, 32, 44, 0.82) 0%, rgba(29, 78, 120, 0.58) 52%, rgba(18, 32, 44, 0.28) 100%);
}
.onpv-pricing-hero-copy {
  position: relative;
  z-index: 1;
  max-width: 44rem;
  padding: 0.85rem 0;
  color: #f4f7fa;
}
.onpv-pricing-hero-eyebrow {
  display: block;
  margin: 0 0 0.3rem;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  font-weight: 650;
  color: #d7e4ef;
}
.onpv-pricing-hero-title {
  margin: 0 0 0.35rem;
  font-size: clamp(1.35rem, 2.4vw, 1.85rem);
  line-height: 1.15;
  font-weight: 650;
  color: #ffffff;
}
.onpv-pricing-hero-lede {
  display: block;
  margin: 0 0 0.3rem;
  font-size: 0.95rem;
  line-height: 1.35;
  color: #e8eef4;
}
.onpv-pricing-hero-cue {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.35;
  color: #d7e4ef;
}
.onpv-pricing-title { display: none; }
.onpv-price-grid [data-price-card] { min-height: 0; align-items: center; }
@media (max-width: 720px) {
  .onpv-price-grid { grid-template-columns: 1fr; }
  .onpv-price-grid [data-price-card] {
    grid-template-columns: 1fr;
    grid-template-areas: "name" "price" "note" "cta";
    min-height: 0;
  }
  .onpv-price-grid .vg-cta,
  .onpv-trial-offer .vg-cta { width: 100%; max-width: none; }
  .onpv-compare-row { grid-template-columns: 1fr; }
  .onpv-pricing-hero--overlay {
    height: 10rem;
    max-height: 10rem;
    min-height: 10rem;
  }
  .onpv-pricing-hero-copy { padding: 0.7rem 0; max-width: 100%; }
  .onpv-pricing-hero-title { font-size: 1.2rem; }
  .onpv-pricing-hero-lede { font-size: 0.88rem; }
  .onpv-offer-facts { font-size: 0.88rem; }
}
.onpv-related-paths[data-surface] {
  background: transparent;
  padding-block: 1.5rem;
}
.onpv-related-paths > .vg-container.pv-authority-shell {
  width: min(100%, var(--pv-authority-shell, 70rem));
  max-width: var(--pv-authority-shell, 70rem);
  margin-inline: auto;
  box-sizing: border-box;
}
.onpv-related-paths .sn-block,
.onpv-related-paths .sn-block.pv-wide-module {
  width: 100%;
  max-width: 100%;
  margin-inline: 0;
  background: var(--pv-surface-card, #ffffff);
  padding: 1.25rem 1.3rem 1.4rem;
  border-radius: var(--pv-radius-sm, 0.5rem);
  box-sizing: border-box;
}
.onpv-related-paths .sn-grid {
  width: 100%;
}
.onpv-home-hero {
  padding-block: 2.25rem 2.4rem;
}
.onpv-home-hero .pv-hero-grid > div:first-child {
  max-width: min(42rem, 100%);
}
.onpv-home-hero .pv-eyebrow {
  margin: 0 0 0.15rem;
}
.onpv-home-title,
.pv-hero-photo.pv-hero--split.onpv-home-hero .pv-display.onpv-home-title,
.pv-hero-photo--compact.onpv-home-hero .pv-display.onpv-home-title {
  max-width: 28ch;
  font-size: clamp(1.58rem, 2.6vw, 2.12rem);
  line-height: 1.22;
  letter-spacing: -0.03em;
  margin: 1.05rem 0 1.4rem;
}
.onpv-home-offer {
  margin: 0 0 1rem;
  padding: 0.7rem 0.9rem;
  max-width: 28rem;
  color: #f4f7fb;
  background: color-mix(in srgb, #0b1520 68%, transparent);
  border: 1px solid rgba(255, 255, 255, 0.38);
  border-radius: var(--pv-radius-sm, 0.5rem);
}
.onpv-home-offer p { margin: 0; color: inherit; font-size: 0.94rem; line-height: 1.4; }
.onpv-home-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
}
.onpv-see-pricing {
  display: inline-flex;
  align-items: center;
  min-height: 2.55rem;
  padding: 0.4rem 0.9rem;
  color: #f7fbff;
  background: color-mix(in srgb, #0b1520 74%, transparent);
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 0.45rem;
  text-decoration: underline;
  text-underline-offset: 0.18em;
  font-weight: 600;
}
.onpv-see-pricing:hover,
.onpv-see-pricing:focus-visible {
  color: #ffffff;
  background: color-mix(in srgb, #0b1520 86%, transparent);
  outline: 3px solid #f7fbff;
  outline-offset: 2px;
}
.onpv-see-pricing:visited { color: #eef4fb; }
.onpv-home-secondary {
  color: #f4f7fb;
  text-decoration: underline;
  text-underline-offset: 0.16em;
  font-weight: 600;
}
.onpv-home-support { padding-top: 1.75rem; }
.onpv-faq h2 {
  margin: 2.1rem 0 0.8rem;
  padding-top: 1.1rem;
  border-top: 1px solid var(--pv-border, #c5d0da);
}
.onpv-faq h2:first-of-type {
  margin-top: 0.35rem;
  padding-top: 0;
  border-top: 0;
}
.onpv-faq h3 { margin: 1.2rem 0 0.4rem; max-width: 46rem; }
.onpv-faq p { max-width: 46rem; line-height: 1.55; }
.onpv-article-h1,
.pv-article-hero .pv-display,
.pv-hero-photo.pv-article-hero .pv-display,
.pv-hero-photo.pv-hero-photo--article .pv-display,
.pv-hero-photo--article .pv-display {
  max-width: min(42rem, 100%);
}
.pv-hero-photo--article .pv-display,
.pv-article-hero .pv-display {
  color: inherit;
}
@media (max-width: 640px) {
  .onpv-home-hero { padding-block: 1.2rem 1.35rem; }
  .onpv-home-title { max-width: 16ch; font-size: 1.4rem; margin: 0.7rem 0 0.95rem; }
  .onpv-home-actions .vg-cta,
  .onpv-see-pricing { width: 100%; justify-content: center; }
  .onpv-article-h1,
  .pv-article-hero .pv-display,
  .pv-hero-photo--article .pv-display { max-width: 100%; }
}
`

export function applyOccupancynpvImprovementFormCss(css: string): string {
  let next = css;
  if (!next.includes("occupancynpv-improvement-form")) next = `${next}\n${OCCUPANCYNPV_IMPROVEMENT_FORM_CSS}\n`;
  if (!next.includes(".onpv-live-offer")) next = `${next}\n${OCCUPANCYNPV_LIVE_OFFER_CSS}\n`;
  if (!next.includes(".onpv-pricing-hero")) next = `${next}\n${OCCUPANCYNPV_CONVERSION_UX_CSS}\n`;
  if (!next.includes(".onpv-pricing-hero--overlay")) next = `${next}\n${OCCUPANCYNPV_CONVERSION_UX_CSS}\n`;
  else if (!next.includes(".onpv-buyer-guide")) next = `${next}\n${OCCUPANCYNPV_CONVERSION_UX_CSS}\n`;
  if (!next.includes(".onpv-related-paths")) next = `${next}\n${OCCUPANCYNPV_CONVERSION_UX_CSS}\n`;
  if (!next.includes(".onpv-home-hero")) next = `${next}\n${OCCUPANCYNPV_CONVERSION_UX_CSS}\n`;
  if (!next.includes(".onpv-faq h2")) next = `${next}\n${OCCUPANCYNPV_CONVERSION_UX_CSS}\n`;
  if (!next.includes(".onpv-article-h1")) next = `${next}\n${OCCUPANCYNPV_CONVERSION_UX_CSS}\n`;
  return next;
}

export function occupancynpvOfferBeaconSource(): string {
  return `"use client";
import { useEffect } from "react";

function emit(event: string) {
  void fetch("/api/occupancynpv/offer-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, offer_id: "offer:candidate:7e7e924e-0741-4155-a729-8d529da77ea9:paid-first-rendered-v2", source: "pricing" }),
    keepalive: true,
  }).catch(() => undefined);
}

export function OccupancynpvOfferBeacon() {
  useEffect(() => {
    emit("offer_view");
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const cta = target?.closest("[data-offer-cta]");
      if (!cta) return;
      emit("offer_cta_click");
      emit("offer_start");
      emit("checkout_start");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
`;
}

export function occupancynpvTrialStartRouteSource(): string {
  return `import { NextResponse } from "next/server";
import { durableStartProfessionalTrial, durableUser } from "../../../../lib/occupancynpv/durable";

export async function POST() {
  const session = await durableUser();
  if (!session) {
    return NextResponse.redirect(new URL("/occupancynpv/app/login?intent=trial", process.env.NEXT_PUBLIC_SITE_URL || "https://occupancynpv.com"), 303);
  }
  const granted = await durableStartProfessionalTrial();
  if (!granted.ok && granted.reason === "TRIAL_ALREADY_USED") {
    return NextResponse.redirect(new URL("/occupancynpv/app?trial=already", process.env.NEXT_PUBLIC_SITE_URL || "https://occupancynpv.com"), 303);
  }
  if (!granted.ok) {
    return NextResponse.redirect(new URL("/pricing?trial=failed", process.env.NEXT_PUBLIC_SITE_URL || "https://occupancynpv.com"), 303);
  }
  return NextResponse.redirect(new URL("/occupancynpv/app?trial=started", process.env.NEXT_PUBLIC_SITE_URL || "https://occupancynpv.com"), 303);
}
`;
}

export function occupancynpvOfferEventsRouteSource(): string {
  return `import { NextResponse } from "next/server";
import { durablePersistOfferEvent } from "../../../../lib/occupancynpv/durable";

const EVENTS = [
  "offer_view", "offer_cta_click", "offer_start", "offer_activation", "meaningful_use",
  "checkout_start", "paid_conversion", "cancel", "refund", "offer_limit_hit", "upgrade_prompt", "upgrade_conversion",
];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { event?: string; offer_id?: string; source?: string };
  if (!EVENTS.includes(String(body.event ?? ""))) {
    return NextResponse.json({ ok: false, reason: "UNKNOWN_OFFER_EVENT" }, { status: 400 });
  }
  const persisted = await durablePersistOfferEvent({
    event: String(body.event),
    offer_id: String(body.offer_id ?? "offer:candidate:7e7e924e-0741-4155-a729-8d529da77ea9:paid-first-rendered-v2"),
    source: body.source ?? "pricing",
  });
  const runtime = process.env.INFINITY_OFFER_EVENTS_URL || process.env.INFINITY_IMPROVEMENT_INTAKE_URL;
  if (runtime) {
    try {
      await fetch(runtime.replace(/\\/$/, "") + "/api/occupancynpv/offer-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // live measurement still persisted locally
    }
  }
  return NextResponse.json({ ok: persisted.ok, event: body.event });
}
`;
}

export function occupancynpvPublicImprovementPageSource(): string {
  return `import Link from "next/link";
import { OccupancynpvPublicImprovementForm } from "../../components/occupancynpv-public-improvement-form";
import { VentureFooter } from "../../components/venture-footer";

export const metadata = {
  title: "Suggest an Improvement | OccupancyNPV",
  robots: { index: true, follow: true },
};

export default function OccupancynpvSuggestImprovementPage() {
  return (
    <>
    <main className="vg-page" data-page-id="/suggest-improvement">
      <div className="vg-container occupancynpv-improvement-page">
        <p className="pv-eyebrow">OccupancyNPV</p>
        <h1>Suggest an Improvement</h1>
        <p className="pv-lede">
          Suggestions are for product, workflow, and result-clarity improvements. After you submit, OccupancyNPV stores the note for review. This is product feedback, not a promise a change will be built. Contact email is optional. Do not send SSNs, bank details, or lease files. Useful examples: a missing input, a confusing NPV label, or a save/archive gap.
        </p>
        <OccupancynpvPublicImprovementForm />
        <p className="occupancynpv-improvement-back"><Link href="/" className="vg-cta vg-cta--secondary">Back to OccupancyNPV</Link></p>
      </div>
    </main>
    <VentureFooter />
    </>
  );
}
`;
}

export function occupancynpvPublicImprovementFormSource(): string {
  return `"use client";

import { useId, useState } from "react";

export function OccupancynpvPublicImprovementForm() {
  const titleId = useId();
  const [message, setMessage] = useState("");
  const [goal, setGoal] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const res = await fetch("/api/occupancynpv/improvement-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "PUBLIC_SITE_FEEDBACK",
          message,
          goal_or_context: goal || null,
          contact_email: email || null,
          submission_id: crypto.randomUUID(),
          page_url_or_route: "/suggest-improvement",
          workflow_context: "public marketing / help",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.reason === "string" ? json.reason : "We could not send that suggestion. Try again.");
        return;
      }
      setSuccess(typeof json.acknowledgement === "string" ? json.acknowledgement : "Thanks — your suggestion has been received and will be evaluated as product feedback.");
      setMessage("");
      setGoal("");
    } catch {
      setError("We could not send that suggestion. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} aria-labelledby={titleId} className="pv-surface vg-form occupancynpv-improvement-form" data-venture-form="improvement-intake">
      <h2 id={titleId} className="sr-only">Suggest an Improvement</h2>
      <label className="vg-form-field" htmlFor="occupancynpv-improvement-message">
        <span>What would make this product work better for you?</span>
        <textarea id="occupancynpv-improvement-message" className="vg-textarea" required value={message} onChange={(event) => setMessage(event.target.value)} rows={5} />
      </label>
      <label className="vg-form-field" htmlFor="occupancynpv-improvement-goal">
        <span>What are you trying to accomplish? <span className="pv-muted">(optional)</span></span>
        <textarea id="occupancynpv-improvement-goal" className="vg-textarea" value={goal} onChange={(event) => setGoal(event.target.value)} rows={3} />
      </label>
      <label className="vg-form-field" htmlFor="occupancynpv-improvement-email">
        <span>Email <span className="pv-muted">(optional)</span></span>
        <input id="occupancynpv-improvement-email" className="vg-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
      </label>
      {error ? <p role="alert" className="vg-form-error">{error}</p> : null}
      {success ? <p role="status" className="vg-form-success">{success}</p> : null}
      <button type="submit" className="vg-cta vg-cta--primary" disabled={busy}>{busy ? "Sending…" : "Send suggestion"}</button>
    </form>
  );
}
`;
}

export function occupancynpvFulfillmentGatedCheckoutRouteSource(input: {
  paymentActivation: boolean;
  fulfillmentReady: boolean;
}): string {
  const professional = OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PROFESSIONAL;
  const perDeal = OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS.PER_DEAL;
  return `import { NextResponse } from "next/server";
import { durableUser } from "../../../../lib/occupancynpv/durable";

const ACCOUNT = "acct_18h5CjLdvXKx7R7G";
const SUCCESS = "https://occupancynpv.com${OCCUPANCYNPV_PAID_CHECKOUT_SUCCESS_PATH}";
const CANCEL = "https://occupancynpv.com/pricing";
const paymentActivation: boolean = ${input.paymentActivation};
const fulfillmentReady: boolean = ${input.fulfillmentReady};
const BINDINGS = {
  PROFESSIONAL: { priceId: "${professional.priceId}", productId: "${professional.productId}", mode: "subscription", amount: ${professional.amount}, currency: "usd" },
  PER_DEAL: { priceId: "${perDeal.priceId}", productId: "${perDeal.productId}", mode: "payment", amount: ${perDeal.amount}, currency: "usd" },
} as const;

function resolveOffer(offer: string | null, priceId: string | null, amount: string | null, currency: string | null) {
  if (offer !== "PROFESSIONAL" && offer !== "PER_DEAL") return { ok: false as const, reason: "UNKNOWN_OFFER" };
  const binding = BINDINGS[offer];
  if (priceId && priceId !== binding.priceId) return { ok: false as const, reason: "ARBITRARY_PRICE_BLOCKED" };
  if (amount && Number(amount) !== binding.amount) return { ok: false as const, reason: "ARBITRARY_AMOUNT_BLOCKED" };
  if (currency && currency.toLowerCase() !== binding.currency) return { ok: false as const, reason: "ARBITRARY_CURRENCY_BLOCKED" };
  return { ok: true as const, reason: "CANONICAL_OFFER", binding, offer };
}

export async function GET() {
  return NextResponse.json({
    activated: paymentActivation === true && fulfillmentReady === true,
    createSession: false,
    paymentActivation,
    fulfillment: fulfillmentReady === true ? "PASS" : "FAIL",
    offers: ["PROFESSIONAL", "PER_DEAL"],
    account: ACCOUNT,
  });
}

export async function POST(req: Request) {
  if (fulfillmentReady !== true) {
    return NextResponse.json({ ok: false, reason: "FULFILLMENT_NOT_READY", createSession: false, paymentActivation }, { status: 403 });
  }
  if (paymentActivation !== true) {
    return NextResponse.json({ ok: false, reason: "PAYMENT_ACTIVATION_NOT_AUTHORIZED", createSession: false, paymentActivation }, { status: 403 });
  }
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!key) return NextResponse.json({ ok: false, reason: "STRIPE_SECRET_KEY_MISSING", createSession: false }, { status: 503 });
  const contentType = req.headers.get("content-type") ?? "";
  let offer: string | null = null;
  let clientPriceId: string | null = null;
  let clientAmount: string | null = null;
  let clientCurrency: string | null = null;
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    offer = typeof body.offer === "string" ? body.offer : null;
    clientPriceId = typeof body.priceId === "string" ? body.priceId : null;
    clientAmount = body.amount != null ? String(body.amount) : null;
    clientCurrency = typeof body.currency === "string" ? body.currency : null;
  } else {
    const form = await req.formData().catch(() => null);
    offer = form?.get("offer") ? String(form.get("offer")) : null;
    clientPriceId = form?.get("priceId") ? String(form.get("priceId")) : null;
    clientAmount = form?.get("amount") ? String(form.get("amount")) : null;
    clientCurrency = form?.get("currency") ? String(form.get("currency")) : null;
  }
  const resolved = resolveOffer(offer, clientPriceId, clientAmount, clientCurrency);
  if (!resolved.ok) return NextResponse.json({ ok: false, reason: resolved.reason, createSession: false }, { status: 400 });
  const session = await durableUser();
  if (!session) {
    const accept = req.headers.get("accept") ?? "";
    if (accept.includes("text/html") || !contentType.includes("application/json")) {
      return NextResponse.redirect("https://occupancynpv.com/occupancynpv/app/login", 303);
    }
    return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED", createSession: false }, { status: 401 });
  }
  const body = new URLSearchParams();
  body.set("mode", resolved.binding.mode);
  body.set("line_items[0][price]", resolved.binding.priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", SUCCESS);
  body.set("cancel_url", CANCEL);
  body.set("client_reference_id", session.customer_id);
  body.set("metadata[infinity_venture]", "occupancynpv");
  body.set("metadata[infinity_offer]", resolved.offer);
  body.set("metadata[infinity_environment]", "production");
  body.set("metadata[infinity_stripe_account]", ACCOUNT);
  body.set("metadata[infinity_customer_id]", session.customer_id);
  const created = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: \`Bearer \${key}\`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await created.json().catch(() => ({})) as { url?: string; error?: { type?: string; code?: string; request_id?: string } };
  if (!created.ok || !json.url) {
    const accept = req.headers.get("accept") ?? "";
    const html = accept.includes("text/html") || !contentType.includes("application/json");
    console.error(JSON.stringify({
      provider: "stripe",
      errorType: json.error?.type ?? "UNKNOWN",
      errorCode: json.error?.code ?? "CHECKOUT_SESSION_CREATE_FAILED",
      requestId: json.error?.request_id ?? null,
      binding: resolved.binding.priceId,
      offer: resolved.offer,
      venture: "occupancynpv",
      deployment: process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "UNKNOWN",
      timestamp: new Date().toISOString(),
    }));
    if (html) {
      return new NextResponse(\`<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Checkout unavailable</title></head><body><main><h1>Checkout unavailable</h1><p>We couldn't start checkout. Please try again or contact support.</p><p><a href="/pricing">Return to pricing</a></p></main></body></html>\`, {
        status: 502,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return NextResponse.json({ ok: false, reason: "CHECKOUT_UNAVAILABLE", createSession: false }, { status: 502 });
  }
  return NextResponse.redirect(json.url, 303);
}
`;
}

export function occupancynpvFulfillingWebhookRouteSource(): string {
  const events = OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS.map((event) => `"${event}"`).join(", ");
  return `import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { durableFulfillStripeEvent } from "../../../../lib/occupancynpv/durable";

const ALLOWED = new Set([${events}]);

function verify(secret: string, signature: string, rawBody: string) {
  if (!secret || !signature || !rawBody) return false;
  const parts = Object.fromEntries(signature.split(",").map((part) => {
    const [key, ...rest] = part.split("=");
    return [key?.trim() ?? "", rest.join("=")];
  }));
  const timestamp = Number(parts.t);
  const expected = parts.v1;
  if (!Number.isFinite(timestamp) || !expected) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;
  const digest = createHmac("sha256", secret).update(\`\${timestamp}.\${rawBody}\`).digest("hex");
  const actual = Buffer.from(digest);
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export async function GET() {
  return NextResponse.json({ ready: true, createCustomerState: false });
}

export async function POST(req: Request) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  const signature = req.headers.get("stripe-signature") ?? "";
  const rawBody = await req.text();
  if (!verify(secret, signature, rawBody)) {
    return NextResponse.json({ ok: false, reason: "INVALID_SIGNATURE" }, { status: 400 });
  }
  let parsed: { id?: string; type?: string; data?: { object?: Record<string, unknown> } } = {};
  try { parsed = JSON.parse(rawBody) as typeof parsed; } catch {
    return NextResponse.json({ ok: false, reason: "INVALID_JSON" }, { status: 400 });
  }
  if (!parsed.id || !parsed.type || !ALLOWED.has(parsed.type)) {
    return NextResponse.json({ ok: false, reason: "UNSUBSCRIBED_OR_INVALID" }, { status: 400 });
  }
  const fulfilled = await durableFulfillStripeEvent({ eventId: parsed.id, type: parsed.type, object: parsed.data?.object ?? {} });
  return NextResponse.json(fulfilled);
}
`;
}

function occupancynpvWebhookDurableHelpers(): string {
  return `
export async function durableFulfillStripeEvent(input: { eventId: string; type: string; object: Record<string, unknown> }) {
  const admin = createOccupancynpvAdmin();
  if (!admin) return { ok: false as const, reason: "ADMIN_MISSING", duplicate: false };
  const existing = await admin.from("occupancynpv_fulfillment_orders").select("order_id").eq("order_id", input.eventId).maybeSingle();
  if (existing.data) return { ok: true as const, duplicate: true, eventId: input.eventId, type: input.type };
  const metadata = (input.object.metadata ?? {}) as Record<string, unknown>;
  const offer = metadata.infinity_offer === "PER_DEAL" ? "PER_DEAL" : metadata.infinity_offer === "PROFESSIONAL" ? "PROFESSIONAL" : null;
  const customerId = typeof metadata.infinity_customer_id === "string" ? metadata.infinity_customer_id : null;
  const paymentReference = typeof input.object.id === "string" ? input.object.id : input.eventId;
  if (input.type === "checkout.session.completed" && offer && customerId) {
    const customer = await admin.from("occupancynpv_customers").select("customer_id").eq("customer_id", customerId).maybeSingle();
    if (!customer.data) {
      await admin.from("occupancynpv_fulfillment_orders").insert({
        order_id: input.eventId,
        customer_id: customerId,
        offer_id: offer,
        payment_reference: paymentReference,
        state: "FULFILLMENT_FAILED",
      });
      return { ok: false as const, reason: "ORPHANED_PAID_CUSTOMER", duplicate: false, eventId: input.eventId, type: input.type };
    }
    const subscription = typeof input.object.subscription === "string" ? input.object.subscription : null;
    const row = {
      entitlement_id: "ent_" + input.eventId.replace(/\\W/g, "").slice(-16),
      customer_id: customerId,
      offer_id: offer,
      payment_reference: paymentReference,
      subscription_reference: subscription,
      entitlement_type: offer === "PROFESSIONAL" ? "PROFESSIONAL_ACCESS" : "ONE_DEAL_WORKSPACE",
      quantity: 1,
      quantity_remaining: offer === "PER_DEAL" ? 1 : null,
      status: "ACTIVE",
    };
    const inserted = await admin.from("occupancynpv_entitlements").upsert(row, { onConflict: "payment_reference,offer_id" });
    await admin.from("occupancynpv_fulfillment_orders").insert({
      order_id: input.eventId,
      customer_id: customerId,
      offer_id: offer,
      payment_reference: paymentReference,
      state: inserted.error ? "FULFILLMENT_FAILED" : "ENTITLEMENT_ACTIVE",
    });
    return { ok: !inserted.error, duplicate: false, eventId: input.eventId, type: input.type };
  }
  if ((input.type === "invoice.paid" || input.type === "invoice.payment_failed" || input.type === "customer.subscription.deleted") && customerId && offer) {
    const periodEnd = typeof input.object.period_end === "number" ? new Date(input.object.period_end * 1000).toISOString() : null;
    if (input.type === "invoice.paid") {
      await admin.from("occupancynpv_entitlements").update({ status: "ACTIVE", expires_at: periodEnd }).eq("customer_id", customerId).eq("offer_id", "PROFESSIONAL");
    }
    if (input.type === "customer.subscription.deleted" && periodEnd) {
      await admin.from("occupancynpv_entitlements").update({ expires_at: periodEnd }).eq("customer_id", customerId).eq("offer_id", "PROFESSIONAL");
    }
    await admin.from("occupancynpv_fulfillment_orders").insert({
      order_id: input.eventId,
      customer_id: customerId,
      offer_id: offer,
      payment_reference: paymentReference,
      state: input.type === "invoice.payment_failed" ? "PAST_DUE_RECORDED" : "RECONCILED",
    });
    return { ok: true as const, duplicate: false, eventId: input.eventId, type: input.type };
  }
  if (customerId) {
    await admin.from("occupancynpv_fulfillment_orders").insert({
      order_id: input.eventId,
      customer_id: customerId,
      offer_id: offer ?? "PROFESSIONAL",
      payment_reference: paymentReference,
      state: "RECONCILED",
    });
  }
  return { ok: true as const, duplicate: false, eventId: input.eventId, type: input.type, mapped: true };
}

export async function durablePersistOfferEvent(input: { event: string; offer_id: string; source?: string }) {
  const admin = createOccupancynpvAdmin();
  if (!admin) return { ok: false as const, reason: "ADMIN_MISSING" };
  const bucket = "occupancynpv-offer-events";
  await admin.storage.createBucket(bucket, { public: false }).catch(() => null);
  const id = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const uploaded = await admin.storage.from(bucket).upload("events/" + id + ".json", JSON.stringify({
    ...input,
    venture_id: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
    created_at: new Date().toISOString(),
  }), { contentType: "application/json", upsert: true });
  if (uploaded.error) return { ok: false as const, reason: "OFFER_EVENT_PERSIST_FAILED" };
  return { ok: true as const, id };
}
`;
}

const TRIAL_START_CTA = `<button type="submit" className="vg-cta vg-cta--primary" data-offer-cta="primary">Start Free Trial</button>`;
const PROFESSIONAL_CHECKOUT_CTA = `<button type="submit" className="vg-cta vg-cta--secondary" data-offer-cta="secondary">Start Professional</button>`;
const PER_DEAL_CHECKOUT_CTA = `<button type="submit" className="vg-cta vg-cta--secondary" data-offer-cta="tertiary">Start One Deal</button>`;

function compactPricingHero(): string {
  return `<header className="onpv-pricing-hero onpv-pricing-hero--overlay" data-section-type="PRICING" data-section-id="pr_hero" data-commercial-hero="overlay" data-pattern-id="TRUST_NEAR_DECISION" data-surface="EDITORIAL">
          <figure className="onpv-pricing-hero-media" aria-hidden="true">
            <img src="/media/hero-building.webp" alt="" width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="onpv-pricing-hero-shade" aria-hidden="true" />
          <div className="vg-container onpv-pricing-hero-copy">
            <p className="onpv-pricing-hero-eyebrow">OCCUPANCYNPV</p>
            <h1 className="onpv-pricing-hero-title">Compare commercial lease scenarios with confidence</h1>
            <p className="onpv-pricing-hero-lede">Model cash flow, NPV, and sensitivity in one focused workspace built for tenant-rep lease comparisons.</p>
            <p className="onpv-pricing-hero-cue">Start with a 3-day free trial. No credit card required.</p>
          </div>
        </header>`;
}

function brandedCheckoutSurface(): string {
  return `<section
              data-pricing-architecture="true"
              data-purchase-model="ANNUAL_SUBSCRIPTION+PER_TRANSACTION"
              data-promotional-offer="THREE_DAY_NO_CARD_TRIAL"
              data-offer-type="NO_CARD_TRIAL"
              data-customer-advantage="3-day free trial"
              data-card-required="false"
              data-auto-convert="false"
              data-offer-events="true"
              data-commercial-decision="primary"
              className="onpv-pricing"
            >
              <article data-acquisition-offer="true" className="onpv-trial-offer">
                <p className="pv-eyebrow">3-day free trial</p>
                <h2>Try OccupancyNPV free for 3 days</h2>
                <p className="onpv-offer-facts">1 user · 1 DealWorkspace · 72 hours · No credit card required · No automatic billing</p>
                <form action="/api/trial/start" method="post" data-trial-start="professional">
                  ${TRIAL_START_CTA}
                </form>
                <p className="onpv-trial-terms">After 3 days, Professional is $290/year or Per-Deal is $149. Cancel anytime. No charge if you stop.</p>
              </article>
              <p className="onpv-buy-now">Or buy now</p>
              <div data-payment-surface="occupancynpv-canonical" className="onpv-price-grid">
                <article data-price-card="professional">
                  <h2>Professional</h2>
                  <p className="vg-price">$290/year</p>
                  <p className="onpv-price-note">Annual workspace after the trial.</p>
                  <form action="/api/checkout/start" method="post" data-checkout-start="professional">
                    <input type="hidden" name="offer" value="PROFESSIONAL" />
                    ${PROFESSIONAL_CHECKOUT_CTA}
                  </form>
                </article>
                <article data-price-card="per-deal">
                  <h2>Per-Deal</h2>
                  <p className="vg-price">$149</p>
                  <p className="onpv-price-note">One complete lease comparison.</p>
                  <form action="/api/checkout/start" method="post" data-checkout-start="per-deal">
                    <input type="hidden" name="offer" value="PER_DEAL" />
                    ${PER_DEAL_CHECKOUT_CTA}
                  </form>
                </article>
              </div>
              <OccupancynpvOfferBeacon />
            </section>`;
}

function patchPricingForLiveCheckout(content: string): string {
  let next = content
    .replace("Checkout is not open.", "Authenticated checkout uses only the canonical Professional and Per-Deal prices.")
    .replace("or checkout on this page.", "or extra seats.")
    .replace("Payment is not collected. Willingness to pay is not yet proven.", "Professional is $290 per year. Per-Deal is $149 per deal.")
    .replace("Payment is not collected.", "Authenticated checkout is available for the two canonical prices.");
  next = next.replace(
    /<button type="submit">Continue to Professional checkout — \$290\/year<\/button>/g,
    () => PROFESSIONAL_CHECKOUT_CTA,
  );
  next = next.replace(
    /<button type="submit">Continue to Per-Deal checkout — \$149\/deal<\/button>/g,
    () => PER_DEAL_CHECKOUT_CTA,
  );
  next = next.replace(
    /<button type="submit" className="vg-cta vg-cta--primary">Get Professional — \$290\/year<\/button>/g,
    () => PROFESSIONAL_CHECKOUT_CTA,
  );
  next = next.replace(
    /<button type="submit" className="vg-cta vg-cta--secondary">Purchase One Deal — \$149<\/button>/g,
    () => PER_DEAL_CHECKOUT_CTA,
  );
  if (/<header className="pv-hero[\s\S]*?<\/header>/.test(next)) {
    next = next.replace(/<header className="pv-hero[\s\S]*?<\/header>/, () => compactPricingHero());
  } else if (/<header className="onpv-pricing-hero/.test(next)) {
    next = next.replace(/<header className="onpv-pricing-hero[\s\S]*?<\/header>/, () => compactPricingHero());
  } else if (!next.includes("onpv-pricing-hero--overlay")) {
    next = next.replace(
      /<SiteBreadcrumb[\s\S]*?\/>/,
      (match) => `${match}\n        ${compactPricingHero()}`,
    );
  }
  next = next.replace(
    /<div className="vg-container">\s*<h1 className="onpv-pricing-title[\s\S]*?<\/h1>\s*<\/div>/,
    "",
  );
  next = next.replace(/<div data-question-id[\s\S]*?<\/div>/, "");
  next = next.replace(
    /<p>These offers exist because[\s\S]*?<\/p>\s*<div className="pv-pricing-split">[\s\S]*?<\/div>\s*/,
    "",
  );
  next = next.replace(/<div className="pv-pricing-split">[\s\S]*?<\/div>\s*/, "");
  if (next.includes("data-offer-block") || next.includes("Primary offer · paid-first") || next.includes("onpv-live-offer")) {
    next = next.replace(/<section[^>]*data-offer-block[\s\S]*?<\/section>/, () => brandedCheckoutSurface());
    next = next.replace(/<section[^>]*onpv-live-offer[\s\S]*?<\/section>/, () => brandedCheckoutSurface());
  }
  if (next.includes("data-pricing-architecture")) {
    next = next.replace(/<section[^>]*data-pricing-architecture[\s\S]*?<\/section>/, () => brandedCheckoutSurface());
  } else if (next.includes("data-payment-surface=\"occupancynpv-canonical\"")) {
    next = next.replace(
      /<div data-payment-surface="occupancynpv-canonical">[\s\S]*?<\/div>/,
      () => brandedCheckoutSurface(),
    );
  } else if (!next.includes("/api/checkout/start")) {
    next = next.replace(
      /<div className="vg-container pv-prose pv-authority-shell">/,
      () => `<div className="vg-container pv-prose pv-authority-shell">
            ${brandedCheckoutSurface()}`,
    );
  }
  next = next
    .replace(/Why these offers exist/g, "Why these prices exist")
    .replace(/Professional entitlement remains ACTIVE/g, "Professional access continues through the paid period")
    .replace(/fulfillment grants Professional access/gi, "checkout completes the purchase");
  next = stripStalePricingBelowFold(next);
  next = injectPricingBuyerGuide(next);
  next = injectPricingFaqSchema(next);
  next = repairRelatedProductPathsWidth(next);
  if (!next.includes("occupancynpv-offer-beacon")) {
    next = next.replace(
      `from "../../components/site-chrome";`,
      `from "../../components/site-chrome";\nimport { OccupancynpvOfferBeacon } from "../../components/occupancynpv-offer-beacon";`,
    );
  }
  if (/\bunlimited\b/i.test(next) && !/does not include unlimited/i.test(next)) {
    next = next.replace(/\bunlimited\b/gi, "uncapped-by-number");
  }
  return repairPricingPageCloseTags(next);
}

function stripStalePricingBelowFold(next: string): string {
  return next
    .replace(/<h2>Why these prices exist<\/h2>[\s\S]*?<\/p>/g, "")
    .replace(/<h2>Who should not use it<\/h2>[\s\S]*?<\/p>/g, "")
    .replace(/<h2>Who is this not for<\/h2>[\s\S]*?<\/p>/g, "")
    .replace(/<h2>Objections worth answering now<\/h2>[\s\S]*?<\/p>/g, "")
    .replace(/<h2>Does OccupancyNPV exist as a working product\?<\/h2>\s*<p>[\s\S]*?<\/p>/g, "")
    .replace(/<h2>Can I purchase OccupancyNPV\?<\/h2>\s*<p>[\s\S]*?<\/p>/g, "")
    .replace(/<h2>Is this a finished product\?<\/h2>\s*<p>[\s\S]*?<\/p>/g, "")
    .replace(/<h2>Is payment collected here\?<\/h2>\s*<p>[\s\S]*?<\/p>/g, "")
    .replace(/<section className="pv-section pv-cta-band"[\s\S]*?<\/section>/g, "")
    .replace(/<p><PrimaryCTA href="\/early-access">Request Pilot Access<\/PrimaryCTA><\/p>/g, "");
}

function injectPricingBuyerGuide(next: string): string {
  if (next.includes("data-pricing-depth")) return next;
  const guide = occupancynpvPricingBuyerGuideSource();
  if (next.includes("<OccupancynpvOfferBeacon />")) {
    return next.replace(/<OccupancynpvOfferBeacon \/>\s*<\/section>/, () =>
      `<OccupancynpvOfferBeacon />\n            </section>\n            ${guide}`,
    );
  }
  return next.replace(
    /<div className="vg-container pv-prose pv-authority-shell">/,
    (match) => `${match}\n            ${guide}`,
  );
}

function injectPricingFaqSchema(next: string): string {
  if (next.includes('"@type": "FAQPage"') || !next.includes("JsonLdBlock")) return next;
  const schema = occupancynpvPricingFaqSchema();
  if (!next.includes("const PRICING_FAQ_SCHEMA")) {
    next = next.replace(
      /export default function Page\(\)/,
      () => `const PRICING_FAQ_SCHEMA = ${schema};\n\nexport default function Page()`,
    );
  }
  return next.replace(
    /<JsonLdBlock data=\{SITE_SCHEMA\["\/pricing"\]\} \/>/,
    "<JsonLdBlock data={SITE_SCHEMA[\"/pricing\"]} />\n        <JsonLdBlock data={PRICING_FAQ_SCHEMA} />",
  );
}

function repairRelatedProductPathsWidth(next: string): string {
  const match = next.match(/<section className="pv-section" data-section-type="SEMANTIC_NAVIGATION"[\s\S]*?<\/section>/);
  if (!match) return next;
  let section = match[0]
    .replace('className="pv-section"', 'className="pv-section onpv-related-paths"')
    .replace('<div className="vg-container">', '<div className="vg-container pv-authority-shell">')
    .replace(/ pv-wide-module/g, "");
  next = next.replace(match[0], "");
  if (next.includes("<VentureFooter")) {
    return next.replace("<VentureFooter", `${section}\n        <VentureFooter`);
  }
  return `${next}\n${section}`;
}

function repairPricingPageCloseTags(next: string): string {
  next = next.replace(/<\/section><\/div>/g, "</section>\n            </div>");
  next = next.replace(/<\/div(?![>\s/])/g, "</div>");
  return next;
}

export function composeOccupancynpvPaymentReactivationFiles() {
  const paid = composeOccupancynpvPaidProductFiles();
  const fulfillmentReady = evaluateOccupancynpvFulfillmentReadiness().result === "PASS";
  const checkout = occupancynpvFulfillmentGatedCheckoutRouteSource({
    paymentActivation: true,
    fulfillmentReady,
  });
  const webhook = occupancynpvFulfillingWebhookRouteSource();
  const files = paid.files.map((file) => {
    const path = file.path.replace(/\\/g, "/");
    if (path === "app/api/checkout/start/route.ts") return { ...file, content: checkout };
    if (path === "app/api/webhooks/stripe/route.ts") return { ...file, content: webhook };
    if (path === "app/occupancynpv/app/checkout/complete/page.tsx") {
      return {
        ...file,
        content: `import { redirect } from "next/navigation";
import { durableUser } from "../../../../../lib/occupancynpv/durable";

export default async function OccupancynpvCheckoutCompletePage() {
  const session = await durableUser();
  if (!session) redirect("/occupancynpv/app/login");
  redirect("/occupancynpv/app");
}
`,
      };
    }
    if (path === "app/pricing/page.tsx") return file;
    if (path === "lib/occupancynpv/durable.ts") {
      return { ...file, content: `${file.content}\n${occupancynpvWebhookDurableHelpers()}` };
    }
    return file;
  });
  const withLogin = files.map((file) => {
    const path = file.path.replace(/\\/g, "/");
    if (path === "components/site-chrome.tsx") {
      let content = file.content;
      if (!content.includes("/occupancynpv/app/login")) {
        content = content.replace(
          `{ href: "/faq", label: "FAQ" },`,
          `{ href: "/faq", label: "FAQ" },\n  { href: "/occupancynpv/app/login", label: "Log In" },`,
        );
      }
      if (!content.includes("Suggest an Improvement")) {
        content = content.replace(
          `{ href: "/faq", label: "FAQ" },`,
          `{ href: "/faq", label: "FAQ" },\n  { href: "/suggest-improvement", label: "Suggest an Improvement" },`,
        );
      }
      content = content.replace(/\s*\{ href: "\/early-access", label: "Request Pilot Access" \},?/g, "");
      return content === file.content ? file : { ...file, content };
    }
    if (path === "components/venture-footer.tsx") {
      let content = file.content;
      if (!content.includes("Suggest an Improvement")) {
        content = content.replace(
          "</nav>",
          `</nav>\n        <p className="vg-legal-nav"><a href="/suggest-improvement">Suggest an Improvement</a></p>`,
        );
      }
      content = content.replace(
        /<p className="vg-legal-nav"><a href="\/early-access">Request Pilot Access<\/a><\/p>/g,
        `<p className="vg-legal-nav"><a href="/pricing">Start Free Trial</a></p>`,
      );
      if (!content.includes("Start Free Trial") && !content.includes("/pricing")) {
        content = content.replace(
          "</nav>",
          `</nav>\n        <p className="vg-legal-nav"><a href="/pricing">Start Free Trial</a></p>`,
        );
      }
      return content === file.content ? file : { ...file, content };
    }
    return file;
  });
  if (!withLogin.some((file) => file.path.replace(/\\/g, "/") === "app/suggest-improvement/page.tsx")) {
    withLogin.push(
      { path: "app/suggest-improvement/page.tsx", content: occupancynpvPublicImprovementPageSource() },
      { path: "components/occupancynpv-public-improvement-form.tsx", content: occupancynpvPublicImprovementFormSource() },
    );
  }
  if (!withLogin.some((file) => file.path.replace(/\\/g, "/") === "components/occupancynpv-offer-beacon.tsx")) {
    withLogin.push({ path: "components/occupancynpv-offer-beacon.tsx", content: occupancynpvOfferBeaconSource() });
  }
  if (!withLogin.some((file) => file.path.replace(/\\/g, "/") === "app/api/occupancynpv/offer-events/route.ts")) {
    withLogin.push({ path: "app/api/occupancynpv/offer-events/route.ts", content: occupancynpvOfferEventsRouteSource() });
  }
  if (!withLogin.some((file) => file.path.replace(/\\/g, "/") === "app/api/trial/start/route.ts")) {
    withLogin.push({ path: "app/api/trial/start/route.ts", content: occupancynpvTrialStartRouteSource() });
  }
  const messaged = applyLifecycleAwarePublicMessaging(withLogin, {
    productBuilt: true,
    paymentActive: true,
    fulfillmentReady,
  }).map((file) => {
    const path = file.path.replace(/\\/g, "/");
    if (path === "app/pricing/page.tsx") return { ...file, content: patchPricingForLiveCheckout(file.content) };
    if (path !== "styles/globals.css") return file;
    return { ...file, content: applyOccupancynpvImprovementFormCss(applyCommercialCtaCss(file.content)) };
  });
  const repaired = applyOccupancynpvBrandIdentityToFiles(
    applyOccupancynpvFaviconToFiles(
      applyOccupancynpvVenturePageDepthToFiles(
        applyCommercialCtaComponent(messaged),
      ),
    ),
  );
  const artifactId = premiumAuthorityArtifactIdFor({
    planId: paid.artifactId,
    packageId: "occupancynpv-payment-reactivation-v2",
    packageVersion: "1",
    contract: OCCUPANCYNPV_PAYMENT_REACTIVATION_SITE_CONTRACT,
  });
  return {
    artifactId,
    digest: digestOfAuthorityFiles(repaired),
    predecessorArtifactId: paid.artifactId,
    predecessorDigest: paid.digest,
    files: repaired,
    fulfillmentReady,
    checkoutRequiresFulfillment: checkout.includes("if (fulfillmentReady !== true)") && checkout.includes("if (paymentActivation !== true)"),
    successPath: OCCUPANCYNPV_PAID_CHECKOUT_SUCCESS_PATH,
  };
}
