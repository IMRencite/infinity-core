import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import {
  evaluateH1WidthUtilizationGate,
  evaluateH1WrapQualityGate,
  evaluateUnusedHeroSpaceBalanceGate,
  evaluateHeroCompositionGate,
  inferH1LayoutContext,
} from "../lib/infinity/customer-page-depth";

const ORIGIN = process.env.OCCUPANCYNPV_ORIGIN ?? "https://occupancynpv.com";
const OUT = ".infinity/venture-operating-scale/h1-composition-qc";
const ROUTES = ["/", "/resources", "/how-it-works", "/compare-commercial-leases", "/pricing", "/faq", "/early-access"] as const;
const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1366x640", width: 1366, height: 640 },
  { name: "mobile-390x844", width: 390, height: 844 },
] as const;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const rows = [];
  for (const route of ROUTES) {
    const html = await (await fetch(`${ORIGIN}${route}`, { cache: "no-store" })).text();
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      await page.goto(`${ORIGIN}${route}`, { waitUntil: "networkidle" });
      await page.evaluate("window.scrollTo(0, 0)");
      const measured = await page.evaluate(`(() => {
        const box = (el) => {
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
        };
        const h1 = document.querySelector("h1");
        const hero = document.querySelector("header.pv-hero, header.onpv-home-hero, header.onpv-pricing-hero");
        const container = document.querySelector("header .vg-container, header .pv-container, main .vg-container") || document.body;
        const style = h1 ? getComputedStyle(h1) : null;
        const line = style ? (parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2) : 0;
        const h1Box = box(h1);
        const containerBox = box(container);
        const heroBox = box(hero) || containerBox;
        return {
          h1: h1Box,
          container: containerBox,
          hero: heroBox,
          heading: h1?.textContent?.trim() || "",
          fontSize: style ? parseFloat(style.fontSize) : 0,
          lineHeight: line,
          lineCount: h1Box && line ? Math.round(h1Box.height / line) : 0,
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        };
      })()`) as {
        h1: { top: number; bottom: number; left: number; width: number; height: number } | null;
        container: { left: number; width: number; height: number } | null;
        hero: { height: number; width: number } | null;
        heading: string;
        fontSize: number;
        lineHeight: number;
        lineCount: number;
        overflowX: boolean;
      };
      await page.screenshot({ path: join(OUT, `${route.replace(/\//g, "_") || "home"}--${viewport.name}.png`), fullPage: false });
      await page.close();
      const available = measured.container?.width ?? 0;
      const unused = Math.max(0, available - (measured.h1?.width ?? 0));
      const observation = measured.h1 && measured.container ? {
        viewportWidth: viewport.width,
        containerWidth: measured.container.width,
        h1Width: measured.h1.width,
        h1Height: measured.h1.height,
        availableTitleWidth: available,
        adjacentOccupiedWidth: 0,
        unusedHorizontalWidth: unused,
        lineCount: measured.lineCount,
        headingLength: measured.heading.length,
        fontSize: measured.fontSize,
        lineHeight: measured.lineHeight,
        layout: inferH1LayoutContext(html),
      } : null;
      const width = evaluateH1WidthUtilizationGate({ html, observation });
      const wrap = evaluateH1WrapQualityGate({ html, observation });
      const space = evaluateUnusedHeroSpaceBalanceGate({ html, observation });
      const composition = evaluateHeroCompositionGate({
        html,
        observation: measured.h1 && measured.hero ? {
          heroHeight: measured.hero.height,
          heroWidth: measured.hero.width,
          h1Top: measured.h1.top,
          h1Height: measured.h1.height,
          h1Width: measured.h1.width,
          gapEyebrowToH1: 16,
          gapH1ToOffer: 16,
          stackedHeroBlocks: 3,
          audienceInsideHero: false,
          offerInsideHeroAsFullSection: false,
          overflowX: measured.overflowX,
          h1LineCount: measured.lineCount,
          containerWidth: measured.container?.width,
          availableTitleWidth: available,
          unusedHorizontalWidth: unused,
          headingLength: measured.heading.length,
          fontSize: measured.fontSize,
          lineHeight: measured.lineHeight,
        } : null,
      });
      rows.push({
        route,
        viewport: viewport.name,
        heading: measured.heading,
        h1: measured.h1,
        container: measured.container,
        heroHeight: measured.hero?.height ?? null,
        lineCount: measured.lineCount,
        utilization: measured.h1 && available ? Number((measured.h1.width / available).toFixed(3)) : null,
        unused,
        width: width.result,
        wrap: wrap.result,
        space: space.result,
        composition: composition.result,
        reasons: [...width.reasons, ...wrap.reasons, ...space.reasons, ...composition.reasons],
      });
    }
  }
  await browser.close();
  console.log(JSON.stringify({ origin: ORIGIN, rows }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
