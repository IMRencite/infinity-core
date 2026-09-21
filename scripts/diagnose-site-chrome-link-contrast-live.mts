import { writeFile } from "node:fs/promises";
import {
  evaluateRenderedLinkContrastGate,
  RENDERED_LINK_CONTRAST_BROWSER_SCRIPT,
  isHiddenOrInertLinkSample,
  type RenderedLinkSample,
} from "../lib/infinity/venture-website-architecture/public-authority-standard/rendered-link-contrast-gate.ts";
import { contrastRatio, parseCssColor } from "../lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate.ts";
import { searchDepthRouteManifest } from "../lib/infinity/market-validation-experiment/cre-authority-expansion-routes.ts";
import { SEO_GEO_REDIRECTS } from "../lib/infinity/venture-website-architecture/digital-real-estate-catalog.ts";

const url = "https://infinity-validation-cre-lease-npv-e72beb7b-lf5grlck3.vercel.app";
const redirects = new Set(SEO_GEO_REDIRECTS.map((item) => item.from));
const routes = searchDepthRouteManifest().pageRoutes.filter((route) => !redirects.has(route));
const { chromium } = await import("@playwright/test");
const browser = await chromium.launch({ headless: true });
const failing: Array<Record<string, unknown>> = [];
let visible = 0;
let wcag = 0;
try {
  for (const route of routes) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${url}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const samples = (await page.evaluate(RENDERED_LINK_CONTRAST_BROWSER_SCRIPT)) as RenderedLinkSample[];
    const gate = evaluateRenderedLinkContrastGate({ html: await page.content(), css: "", samples });
    for (const sample of samples) {
      if (isHiddenOrInertLinkSample(sample)) continue;
      visible += 1;
      const fg = parseCssColor(sample.color);
      const bg = parseCssColor(sample.background);
      const ratio = fg && bg ? contrastRatio(fg, bg) : null;
      const large = /title|heading|cta/i.test(sample.role);
      const floor = large ? 3 : 4.5;
      if (ratio == null || ratio < floor) {
        wcag += 1;
        if (failing.length < 40) {
          failing.push({
            route,
            text: sample.text,
            href: sample.href,
            role: sample.role,
            color: sample.color,
            background: sample.background,
            contrast: ratio,
            floor,
            gateOverall: gate.overall,
          });
        }
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}
const out = { routes: routes.length, visible, wcag, failing };
await writeFile(".infinity/site-chrome-link-contrast-live-diagnosis.json", `${JSON.stringify(out, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
