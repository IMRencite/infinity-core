import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import {
  evaluateHeroCompositionGate,
  evaluateHomepageInitialViewportCommercialActionGate,
  evaluateInteractiveTextContrastGate,
  evaluateFAQCompletenessGate,
  evaluatePageDepthBundle,
  contrastRatio,
} from "../lib/infinity/customer-page-depth";
import { evaluateCommercialVisualHierarchyGate } from "../lib/infinity/offer-architecture/founder-viewport-commercial-qc";
import { evaluateHeroTextReadabilityGate } from "../lib/infinity/offer-architecture/pricing-page-quality";

const ORIGIN = process.env.OCCUPANCYNPV_ORIGIN ?? "https://occupancynpv.com";
const OUT = ".infinity/venture-operating-scale/homepage-hero-qc";
const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1366x640", width: 1366, height: 640 },
  { name: "mobile-390x844", width: 390, height: 844 },
] as const;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const html = await (await fetch(`${ORIGIN}/`, { cache: "no-store" })).text();
  const browser = await chromium.launch({ headless: true });
  const rows = [];
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
    await page.evaluate("window.scrollTo(0, 0)");
    const measured = await page.evaluate(`(() => {
      const box = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
      };
      const color = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const style = getComputedStyle(el);
        const parse = (value) => {
          const match = value.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
          return match ? { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) } : null;
        };
        return { fg: parse(style.color), bg: parse(style.backgroundColor) };
      };
      return {
        hero: box("header.pv-hero, header.onpv-home-hero"),
        h1: box("h1"),
        eyebrow: box(".pv-eyebrow"),
        offer: box("[data-home-offer], .onpv-home-offer"),
        startFreeTrial: box('[data-offer-cta="primary"]'),
        seePricing: box(".onpv-see-pricing"),
        workflow: box(".onpv-home-secondary"),
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        audienceInsideHero: Boolean(document.querySelector("header .onpv-home-support, header [data-question-id]")),
        h1LineCount: (() => {
          const el = document.querySelector("h1");
          if (!el) return 0;
          const style = getComputedStyle(el);
          const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
          return line ? Math.round(el.getBoundingClientRect().height / line) : 0;
        })(),
        pricingColor: color(".onpv-see-pricing"),
      };
    })()`) as {
      hero: { top: number; bottom: number; width: number; height: number } | null;
      h1: { top: number; bottom: number; width: number; height: number } | null;
      eyebrow: { bottom: number } | null;
      offer: { top: number; bottom: number } | null;
      startFreeTrial: { top: number; bottom: number } | null;
      seePricing: { top: number; bottom: number } | null;
      workflow: { top: number; bottom: number } | null;
      overflowX: boolean;
      audienceInsideHero: boolean;
      h1LineCount: number;
      pricingColor: { fg: { r: number; g: number; b: number } | null; bg: { r: number; g: number; b: number } | null } | null;
    };
    await page.screenshot({ path: join(OUT, `${viewport.name}--initial.png`), fullPage: false });
    await page.screenshot({ path: join(OUT, `${viewport.name}--full.png`), fullPage: true });
    await page.close();
    const composition = evaluateHeroCompositionGate({
      html,
      observation: measured.hero && measured.h1 ? {
        heroHeight: measured.hero.height,
        heroWidth: measured.hero.width,
        h1Top: measured.h1.top,
        h1Height: measured.h1.height,
        h1Width: measured.h1.width,
        gapEyebrowToH1: measured.eyebrow ? measured.h1.top - measured.eyebrow.bottom : 16,
        gapH1ToOffer: measured.offer ? measured.offer.top - measured.h1.bottom : 16,
        stackedHeroBlocks: 4,
        audienceInsideHero: measured.audienceInsideHero,
        offerInsideHeroAsFullSection: false,
        overflowX: measured.overflowX,
        h1LineCount: measured.h1LineCount,
      } : null,
    });
    const fold = evaluateHomepageInitialViewportCommercialActionGate({
      scrollY: 0,
      viewportHeight: viewport.height,
      h1: measured.h1 ?? undefined,
      trial: measured.offer ?? undefined,
      startFreeTrial: measured.startFreeTrial ?? undefined,
      secondaryAction: measured.seePricing ?? measured.workflow ?? undefined,
    });
    const contrast = measured.pricingColor?.fg && measured.pricingColor.bg
      ? {
          ratio: contrastRatio(measured.pricingColor.fg, measured.pricingColor.bg),
          gate: evaluateInteractiveTextContrastGate({
            html,
            samples: [{
              selector: ".onpv-see-pricing",
              foreground: measured.pricingColor.fg,
              background: measured.pricingColor.bg.r + measured.pricingColor.bg.g + measured.pricingColor.bg.b === 0
                ? { r: 11, g: 21, b: 32 }
                : measured.pricingColor.bg,
              onImageBackground: true,
            }],
          }),
        }
      : { ratio: null, gate: evaluateInteractiveTextContrastGate({ html }) };
    rows.push({
      viewport: viewport.name,
      measured,
      composition: composition.result,
      compositionReasons: composition.reasons,
      fold: fold.result,
      foldReasons: fold.reasons,
      contrast: contrast.gate.result,
      contrastRatio: contrast.ratio,
    });
  }
  const faqPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await faqPage.goto(`${ORIGIN}/faq`, { waitUntil: "networkidle" });
  const faqHtml = await (await fetch(`${ORIGIN}/faq`, { cache: "no-store" })).text();
  const faqMeasured = await faqPage.evaluate(`(() => ({
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    groups: [...document.querySelectorAll(".onpv-faq h2")].map((el) => el.textContent?.trim()),
    questions: document.querySelectorAll(".onpv-faq h3").length,
    evidenceGaps: (document.body.innerText.match(/EVIDENCE_GAP/g) || []).length,
  }))()`);
  await faqPage.screenshot({ path: join(OUT, "faq-1440x900--initial.png"), fullPage: false });
  await faqPage.screenshot({ path: join(OUT, "faq-1440x900--full.png"), fullPage: true });
  await faqPage.close();
  const mobileFaq = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobileFaq.goto(`${ORIGIN}/faq`, { waitUntil: "networkidle" });
  const faqMobile = await mobileFaq.evaluate(`(() => ({
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    groups: [...document.querySelectorAll(".onpv-faq h2")].map((el) => el.textContent?.trim()),
  }))()`);
  await mobileFaq.screenshot({ path: join(OUT, "faq-mobile-390x844--initial.png"), fullPage: false });
  await mobileFaq.close();
  await browser.close();
  const faqBundle = evaluatePageDepthBundle({ route: "/faq", html: faqHtml, pageType: "FAQ", archetype: "calculator" });
  console.log(JSON.stringify({
    origin: ORIGIN,
    heroText: evaluateHeroTextReadabilityGate(html).result,
    hierarchy: evaluateCommercialVisualHierarchyGate(html).result,
    rows,
    faq: {
      completeness: evaluateFAQCompletenessGate(faqHtml).result,
      completenessReasons: evaluateFAQCompletenessGate(faqHtml).reasons,
      question: faqBundle.question.result,
      thinness: faqBundle.thinness.result,
      gain: faqBundle.gain.result,
      measured: faqMeasured,
      mobile: faqMobile,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
