import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const ORIGIN = process.env.OCCUPANCYNPV_ORIGIN ?? "https://occupancynpv.com";
const OUT = ".infinity/venture-operating-scale/venture-page-depth-qc";
const ROUTES = [
  "/",
  "/how-it-works",
  "/compare-commercial-leases",
  "/resources",
  "/faq",
  "/suggest-improvement",
  "/pricing",
] as const;
const VIEWPORTS = [
  { name: "desktop-1366x768", width: 1366, height: 768 },
  { name: "mobile-390x844", width: 390, height: 844 },
] as const;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const rows = [];
  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const url = `${ORIGIN}${route}`;
      const response = await page.goto(url, { waitUntil: "networkidle" });
      await page.evaluate("window.scrollTo(0, 0)");
      const slug = route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "-");
      const prefix = join(OUT, `${slug}--${viewport.name}`);
      await page.screenshot({ path: `${prefix}--initial.png`, fullPage: false });
      await page.screenshot({ path: `${prefix}--full.png`, fullPage: true });
      const measured = await page.evaluate(`(() => {
        const box = (selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width };
        };
        return {
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          relatedContainer: box(".onpv-related-paths > .vg-container") || box(".onpv-related-paths"),
          relatedBackground: box(".onpv-related-paths .sn-block"),
          h1: document.querySelector("h1") ? (document.querySelector("h1").textContent || "").slice(0, 80) : null,
        };
      })()`) as {
        overflowX: boolean;
        relatedContainer: { left: number; right: number; width: number } | null;
        relatedBackground: { left: number; right: number; width: number } | null;
        h1: string | null;
      };
      rows.push({
        route,
        viewport: viewport.name,
        status: response?.status() ?? 0,
        overflowX: measured.overflowX,
        relatedContainer: measured.relatedContainer,
        relatedBackground: measured.relatedBackground,
        h1: measured.h1,
      });
      await page.close();
    }
  }
  await browser.close();
  console.log(JSON.stringify({ origin: ORIGIN, rows }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
