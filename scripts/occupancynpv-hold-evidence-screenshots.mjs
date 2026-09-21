import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const CANARY = "https://occupancynpv.com/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/";
const outDir = join(process.cwd(), ".infinity/blog-os/evidence");
mkdirSync(outDir, { recursive: true });

const knownBad = `<!doctype html><html><body style="margin:0;background:#1d4e78;min-height:100vh;display:flex;align-items:flex-end;padding:48px">
<div class="pv-cta-panel" style="padding:24px">
<a class="vg-cta" style="color:#122033;background:#1d4e78;padding:12px 20px;font:600 16px/1.4 sans-serif;text-decoration:none">Start the 3-day trial</a>
</div></body></html>`;

const browser = await chromium.launch();
const shots = [];

async function capture(name, pageFn) {
  const page = await browser.newPage();
  await pageFn(page);
  const path = join(outDir, name);
  await page.screenshot({ path, fullPage: true });
  shots.push(name);
  await page.close();
}

await capture("known-bad-cta-desktop.png", async (page) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.setContent(knownBad);
});
await capture("canary-live-desktop.png", async (page) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(CANARY, { waitUntil: "networkidle", timeout: 45000 });
});
await capture("canary-live-tablet.png", async (page) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(CANARY, { waitUntil: "networkidle", timeout: 45000 });
});
await capture("canary-live-mobile.png", async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(CANARY, { waitUntil: "networkidle", timeout: 45000 });
});

await browser.close();
writeFileSync(join(outDir, "screenshots.json"), `${JSON.stringify({
  collected_at: new Date().toISOString(),
  canary: CANARY,
  shots,
}, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, shots }, null, 2));
