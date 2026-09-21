import { chromium } from "@playwright/test";
import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { inspectProductImprovementLoop } from "../lib/infinity/product-improvement-loop/store";
import { hydrateCanonicalImprovementIntakeFromOutbox } from "../lib/infinity/venture-improvement-intake/durable-outbox";
import { CRE_VENTURE_ID } from "../lib/infinity/venture-operating-scale/constants";

async function fetchText(url: string) {
  const response = await fetch(url, { redirect: "follow" });
  return { status: response.status, ok: response.ok, text: await response.text() };
}

async function main() {
  loadServerEnvFromLocalFile();
  await hydrateCanonicalImprovementIntakeFromOutbox();
  const loop = inspectProductImprovementLoop();
  const synthetic = loop.feedback.filter((row) => row.synthetic && row.venture_id === CRE_VENTURE_ID);
  const realOpps = loop.opportunities.filter((row) => row.venture_id === CRE_VENTURE_ID && !row.synthetic);

  const routes = [
    "/",
    "/lease-comparison",
    "/pricing",
    "/suggest-improvement",
    "/occupancynpv/app/login",
    "/privacy-policy",
    "/terms-of-service",
    "/sitemap.xml",
  ];
  const pages = Object.fromEntries(await Promise.all(routes.map(async (route) => {
    const page = await fetchText(`https://occupancynpv.com${route}`);
    return [route, { status: page.status, ok: page.ok, dpl: /data-dpl-id="([^"]+)"/.exec(page.text)?.[1] ?? null, hasSuggest: page.text.includes("Suggest an Improvement"), hasFooter: page.text.includes("An Infinity OS Venture") || page.text.includes("Privacy"), has290: page.text.includes("$290"), has149: page.text.includes("$149") }] as const;
  })));

  const browser = await chromium.launch({ headless: true });
  const consoleErrors: string[] = [];
  const networkFails: string[] = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    if (res.status() >= 500) networkFails.push(`${res.status()} ${res.url()}`);
  });
  await page.goto("https://occupancynpv.com/", { waitUntil: "domcontentloaded", timeout: 45000 });
  const homeNav = await page.locator("a").filter({ hasText: /Pricing|Login|Suggest/i }).count();
  await page.goto("https://occupancynpv.com/suggest-improvement", { waitUntil: "domcontentloaded" });
  const formOk = await page.locator("textarea.vg-textarea, textarea").count() >= 1 && await page.locator("button.vg-cta").count() >= 1;
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileSubmit = await page.locator("button.vg-cta").first().isVisible();
  await page.goto("https://occupancynpv.com/pricing", { waitUntil: "domcontentloaded" });
  const checkoutEntry = await page.locator("a, button").filter({ hasText: /Start|Checkout|Professional|Per-Deal/i }).count();
  await browser.close();

  console.log(JSON.stringify({
    pages,
    homeNav,
    formOk,
    mobileSubmit,
    checkoutEntry,
    consoleErrors: consoleErrors.filter((row) => /TypeError|Hydration|Failed to fetch/i.test(row)),
    networkFails,
    synthetic_feedback: synthetic.length,
    real_opportunities: realOpps.length,
    synthetic_opportunity: loop.opportunities.some((row) => row.synthetic),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "failed");
  process.exit(1);
});
