import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const routes = [
  "https://occupancynpv.com/blog/",
  "https://occupancynpv.com/blog/valuation/how-interest-rates-affect-commercial-property-values/",
  "https://occupancynpv.com/blog/category/valuation/",
  "https://occupancynpv.com/blog/tag/interest-rates/",
  "https://occupancynpv.com/blog/tag/cap-rates/",
  "https://occupancynpv.com/blog/tag/commercial-real-estate/",
];
const widths = [1440, 1280, 1024, 768, 390];
const outDir = join(process.cwd(), ".infinity", "occupancynpv-live-visual-qc");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];
for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: width >= 1024 ? 900 : 844 } });
  for (const url of routes) {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(800);
    const slug = url.replace("https://occupancynpv.com", "").replace(/\/+$/, "").replace(/\W+/g, "_") || "root";
    const file = join(outDir, `${slug}_${width}.png`);
    await page.screenshot({ path: file, fullPage: true });
    const metrics = await page.evaluate(() => {
      const chips = [...document.querySelectorAll("[data-blog-taxonomy-chip]")];
      const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      return {
        chips: chips.length,
        chip_labels: chips.map((el) => (el.textContent || "").trim()).slice(0, 12),
        overflow,
        title: document.querySelector("h1")?.textContent?.trim() ?? null,
      };
    });
    results.push({
      url,
      width,
      status: response?.status() ?? 0,
      screenshot: file,
      ...metrics,
    });
  }
  await page.close();
}
await browser.close();
writeFileSync(join(outDir, "summary.json"), `${JSON.stringify({ checked_at: new Date().toISOString(), results }, null, 2)}\n`);
console.log(JSON.stringify({
  ok: results.every((row) => row.status === 200 && row.chips > 0 && !row.overflow),
  widths: Object.fromEntries(widths.map((width) => [width, results.filter((row) => row.width === width).every((row) => row.status === 200 && row.chips > 0 && !row.overflow)])),
  results,
}, null, 2));
