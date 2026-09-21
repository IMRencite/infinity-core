import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "@playwright/test";
import {
  DESIGN_SYSTEM_CARD_GAP_PX,
  DESIGN_SYSTEM_VISUAL_GAP_PX,
  evaluateFounderViewportCommercialQc,
  FOUNDER_VIEWPORT_QC_EVIDENCE_PATH,
  SUPERSEDED_FALSE_POSITIVE,
  type FounderViewportProfile,
} from "../lib/infinity/offer-architecture/founder-viewport-commercial-qc";
import { pricingUxReady } from "../lib/infinity/venture-operating-scale/occupancynpv-pricing-ux-repair-deployment";

const TARGET = process.env.OCCUPANCYNPV_PRICING_URL ?? "https://occupancynpv.com/pricing";
const OUT_DIR = ".infinity/venture-operating-scale/founder-viewport-qc";

const PROFILES = [
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "founder-chrome-1366x640", width: 1366, height: 640 },
  { name: "mobile-390x844", width: 390, height: 844 },
] as const;

async function measure(url: string, width: number, height: number, name: string): Promise<{
  profile: FounderViewportProfile;
  html: string;
}> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate("window.scrollTo(0, 0)");
  const measured = await page.evaluate(`(() => {
    const rect = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return { top: -1, bottom: -1, left: -1, right: -1, height: 0, width: 0 };
      const box = el.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, height: box.height, width: box.width };
    };
    const professional = rect('[data-price-card="professional"]');
    const perDeal = rect('[data-price-card="per-deal"]');
    const group = rect("[data-commercial-decision='primary'], .onpv-price-grid");
    const nextHeading = [...document.querySelectorAll("h2")].find((node) => /how the 3-day free trial works/i.test(node.textContent || ""));
    const nextRect = nextHeading ? nextHeading.getBoundingClientRect() : null;
    const stacked = professional.bottom > 0 && perDeal.top > professional.bottom - 8;
    const siblingGap = stacked
      ? perDeal.top - professional.bottom
      : professional.right > 0 && perDeal.left > 0
        ? perDeal.left - professional.right
        : perDeal.top - professional.bottom;
    const sectionGap = nextRect && group.bottom > 0 ? nextRect.top - group.bottom : -1;
    return {
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
      professionalPrice: rect('[data-price-card="professional"] .vg-price'),
      startFreeTrial: rect('[data-offer-cta="primary"]'),
      startProfessional: rect('[data-offer-cta="secondary"]'),
      perDealPrice: rect('[data-price-card="per-deal"] .vg-price'),
      startOneDeal: rect('[data-offer-cta="tertiary"]'),
      hero: rect("[data-commercial-hero='compact'], header.pv-hero, header.onpv-pricing-hero"),
      pricingCardProfessional: professional,
      pricingCardPerDeal: perDeal,
      pricingGroup: group,
      nextCommercialPanel: nextRect
        ? { top: nextRect.top, bottom: nextRect.bottom, left: nextRect.left, right: nextRect.right, height: nextRect.height, width: nextRect.width }
        : { top: -1, bottom: -1, height: 0, width: 0 },
      siblingGapPx: siblingGap,
      pricingGroupToNextSectionGapPx: sectionGap,
      relatedPathsContainer: rect(".onpv-related-paths > .vg-container, .onpv-related-paths"),
      relatedPathsBackground: rect(".onpv-related-paths .sn-block"),
      relatedPathsContent: rect(".onpv-related-paths .sn-grid"),
      relatedPathsOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  })()`) as Omit<FounderViewportProfile, "name" | "width" | "height">;
  mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({
    path: join(OUT_DIR, `${name}.png`),
    fullPage: false,
  });
  if (name === "1366x768" || name === "mobile-390x844") {
    await page.screenshot({
      path: join(OUT_DIR, `${name}-full.png`),
      fullPage: true,
    });
  }
  const html = await page.content();
  await browser.close();
  return {
    profile: {
      name,
      width,
      height,
      ...measured,
    },
    html,
  };
}

async function main() {
  const profiles: FounderViewportProfile[] = [];
  let html = "";
  for (const viewport of PROFILES) {
    const result = await measure(TARGET, viewport.width, viewport.height, viewport.name);
    profiles.push(result.profile);
    if (viewport.name === "1366x768") html = result.html;
  }
  const desktop = profiles.find((row) => row.name === "1366x768") ?? profiles[0];
  const qc = evaluateFounderViewportCommercialQc({ html, profile: desktop });
  const evidence = {
    url: TARGET,
    captured_at: new Date().toISOString(),
    prior_cta_above_fold_pass: SUPERSEDED_FALSE_POSITIVE,
    prior_spacing_pass: SUPERSEDED_FALSE_POSITIVE,
    root_cause: {
      auto_scroll: false,
      wrong_viewport: true,
      dom_existence_mistaken_for_visibility: true,
      hero_omitted_from_geometry: true,
      wrong_artifact: false,
      other: "pricingUxReady and source-inference hierarchy/density gates treated HTML existence as above-fold visibility; 22rem photo hero and 5rem section padding were excluded from geometry; representative 1366x768/1440x900 scrollY=0 was not measured.",
    },
    html_ready: pricingUxReady(html),
    fake_paid_first: /Primary offer · paid-first|data-offer-block/i.test(html),
    start_professional: html.includes("Start Professional"),
    start_one_deal: html.includes("Start One Deal"),
    prices: { professional: html.includes("$290"), perDeal: html.includes("$149") },
    design_system_minimum: {
      card_gap_px: DESIGN_SYSTEM_CARD_GAP_PX,
      visual_gap_px: DESIGN_SYSTEM_VISUAL_GAP_PX,
    },
    profiles,
    qc,
  };
  mkdirSync(dirname(FOUNDER_VIEWPORT_QC_EVIDENCE_PATH), { recursive: true });
  writeFileSync(FOUNDER_VIEWPORT_QC_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({
    url: TARGET,
    htmlReady: evidence.html_ready,
    profiles: profiles.map((row) => ({
      name: row.name,
      scrollY: row.scrollY,
      viewportHeight: row.viewportHeight,
      startFreeTrial: row.startFreeTrial ? { top: row.startFreeTrial.top, bottom: row.startFreeTrial.bottom } : null,
      startProfessional: { top: row.startProfessional.top, bottom: row.startProfessional.bottom },
      startOneDeal: { top: row.startOneDeal.top, bottom: row.startOneDeal.bottom },
      siblingGapPx: row.siblingGapPx,
      sectionGapPx: row.pricingGroupToNextSectionGapPx,
    })),
    qc: Object.fromEntries(Object.entries(qc).map(([key, value]) => [key, value.result])),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
