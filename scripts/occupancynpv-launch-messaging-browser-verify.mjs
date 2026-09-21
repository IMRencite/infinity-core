import { chromium } from "@playwright/test";

const origin = "https://occupancynpv.com";
const stale = /if the product is built|not a finished product|not generally available|payment is not collected|this site does not collect payment(?! card)|validation-stage|proposed early-access \/ pilot concept/i;
const routes = ["/", "/pricing", "/early-access", "/how-it-works", "/faq", "/terms-of-service", "/privacy-policy"];
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
];

function footerOk(text) {
  return /Privacy Policy/.test(text)
    && /Terms of Service/.test(text)
    && /Sitemap/.test(text)
    && /An Infinity OS Venture/.test(text)
    && /By IMR/.test(text);
}

const browser = await chromium.launch({ headless: true });
const results = [];
for (const route of routes) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const response = await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(400);
  const text = await page.locator("body").innerText();
  const html = await page.content();
  const heading = (await page.locator("h1").first().innerText().catch(() => "")).trim();
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  const gutters = {};
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(150);
    gutters[vp.name] = await page.evaluate(() => {
      const target = document.querySelector("h1, .pv-display, main") || document.body;
      const r = target.getBoundingClientRect();
      return {
        left: Math.round(r.left * 10) / 10,
        right: Math.round((window.innerWidth - r.right) * 10) / 10,
        overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      };
    });
  }
  const staleHits = [...new Set((text.match(stale) || []).concat(html.match(stale) || []))];
  const pricingOk = route !== "/pricing" || (text.includes("$290") && text.includes("$149"));
  const productExists = /OccupancyNPV|lease comparison|NPV/i.test(text);
  const viewportPass = Object.values(gutters).every((row) => row.left >= 16 && row.right >= 16 && row.overflow === 0);
  results.push({
    route,
    status: response?.status() ?? 0,
    heading: heading.slice(0, 80),
    staleHits,
    pricingOk,
    productExists,
    footer: footerOk(text),
    overflow,
    gutters,
    pass: response?.ok() && staleHits.length === 0 && pricingOk && productExists && footerOk(text) && viewportPass,
  });
  await page.close();
}
await browser.close();
console.log(JSON.stringify({
  allPass: results.every((row) => row.pass),
  results,
}, null, 2));
if (!results.every((row) => row.pass)) process.exit(1);
