/**
 * Measure customer-facing viewport gutters on occupancynpv.com.
 * Read-only. No Stripe, DNS, or schema writes.
 */
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const origin = process.env.ONPV_ORIGIN || "https://occupancynpv.com";
const widths = [375, 390, 768, 1280];

const routes = [
  { id: "home", path: "/", content: "h1, .pv-display, main" },
  { id: "pricing", path: "/pricing", content: "h1, .pv-display, main" },
  { id: "pilot", path: "/early-access", content: "h1, .pv-display, .vg-form, main" },
  { id: "pilot_success", path: "/early-access?checkout=success", content: "h1, .pv-display, main" },
  { id: "login", path: "/occupancynpv/app/login", content: "h1, main" },
  { id: "dashboard", path: "/occupancynpv/app", content: "h1, main" },
  { id: "checkout_complete", path: "/occupancynpv/app/checkout/complete", content: "h1, main" },
  { id: "privacy", path: "/privacy-policy", content: "h1, main" },
  { id: "terms", path: "/terms-of-service", content: "h1, main" },
];

function measureFn() {
  const viewportWidth = window.innerWidth;
  const overflow = Math.max(0, document.documentElement.scrollWidth - viewportWidth);
  const candidates = [
    ...document.querySelectorAll("h1, .pv-display, .vg-form, main, .vg-container, .pv-container"),
  ];
  let best = null;
  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 8) continue;
    const left = Math.round(r.left * 10) / 10;
    const right = Math.round((viewportWidth - r.right) * 10) / 10;
    const sample = {
      tag: el.tagName.toLowerCase(),
      className: String(el.className || "").slice(0, 80),
      text: (el.textContent || "").trim().slice(0, 48),
      left,
      right,
      width: Math.round(r.width * 10) / 10,
      top: Math.round(r.top * 10) / 10,
    };
    if (!best || left < best.left || (left === best.left && right < best.right)) best = sample;
  }
  const heading = document.querySelector("h1, .pv-display");
  const hr = heading ? heading.getBoundingClientRect() : null;
  const form = document.querySelector("form, .vg-form");
  const fr = form ? form.getBoundingClientRect() : null;
  const main = document.querySelector("main, .pv-shell, .vg-shell, body");
  const mr = main ? main.getBoundingClientRect() : null;
  return {
    title: document.title,
    heading: heading ? (heading.textContent || "").trim().slice(0, 80) : null,
    viewportWidth,
    overflow,
    bodyScrollWidth: document.documentElement.scrollWidth,
    closest: best,
    headingGutter: hr ? { left: Math.round(hr.left * 10) / 10, right: Math.round((viewportWidth - hr.right) * 10) / 10 } : null,
    formGutter: fr ? { left: Math.round(fr.left * 10) / 10, right: Math.round((viewportWidth - fr.right) * 10) / 10 } : null,
    mainGutter: mr ? { left: Math.round(mr.left * 10) / 10, right: Math.round((viewportWidth - mr.right) * 10) / 10 } : null,
  };
}

const browser = await chromium.launch({ headless: true });
const out = { origin, capturedAt: new Date().toISOString(), samples: [] };

for (const route of routes) {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const url = `${origin}${route.path}`;
    let status = 0;
    let finalUrl = url;
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      status = res?.status() ?? 0;
      finalUrl = page.url();
      await page.waitForTimeout(400);
      const geo = await page.evaluate(measureFn);
      out.samples.push({ id: route.id, path: route.path, width, status, finalUrl, ...geo });
      if (route.id === "login" && (width === 375 || width === 1280)) {
        await page.getByRole("button", { name: /Need an account|Already have/i }).click().catch(() => {});
        await page.waitForTimeout(200);
        const signup = await page.evaluate(measureFn);
        out.samples.push({ id: "signup", path: route.path, width, status, finalUrl, state: "signup", ...signup });
      }
    } catch (error) {
      out.samples.push({ id: route.id, path: route.path, width, status, finalUrl, error: String(error) });
    }
    await page.close();
  }
}

await browser.close();
const dest = ".infinity/venture-operating-scale/occupancynpv-customer-gutter-before.json";
writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
for (const sample of out.samples) {
  const g = sample.headingGutter || sample.closest;
  console.log(
    [sample.id, sample.width, sample.status, g ? `${g.left}/${g.right}` : "n/a", sample.overflow ?? "", (sample.heading || "").slice(0, 40)].join("\t"),
  );
}
console.log("wrote", dest, "samples", out.samples.length);
