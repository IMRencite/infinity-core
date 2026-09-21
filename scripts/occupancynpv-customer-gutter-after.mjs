/**
 * After-repair customer-facing gutter measurement + evidence writer.
 */
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const sep = trimmed.indexOf("=");
  if (sep === -1) continue;
  let val = trimmed.slice(sep + 1);
  const key = trimmed.slice(0, sep);
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  process.env[key] = val;
}

const origin = process.env.ONPV_ORIGIN || "https://occupancynpv.com";

function classify(route) {
  const path = (route.split("?")[0] || "/").replace(/\/$/, "") || "/";
  if (/\/(login|signin|signup|sign-up|auth)(\/|$)/i.test(path)) return "AUTH";
  if (/checkout\/(complete|success)/i.test(path)) return "CHECKOUT_COMPLETION";
  if (/\/(workspaces?|deals?|projects?)\/[^/]+/i.test(path)) return "PRODUCT_WORKSPACE";
  if (/\/(app|dashboard|account|portal)\/?$/i.test(path)) return "DASHBOARD";
  if (/(early-access|pilot-access|waitlist|\/pilot)/i.test(route)) return "EARLY_ACCESS_OR_PILOT";
  if (/\/pricing(\/|$)/i.test(path)) return "PRICING";
  if (/(privacy|terms|legal)/i.test(path)) return "LEGAL";
  if (path === "/" || /^\/(how-it-works|compare|resources|faq|for\/)/i.test(path)) return "PUBLIC_MARKETING";
  return "OTHER_CUSTOMER_FACING";
}

function measurePrimary() {
  const viewportWidth = window.innerWidth;
  const overflowPx = Math.max(0, document.documentElement.scrollWidth - viewportWidth);
  const heading = document.querySelector("h1, .pv-display");
  const form = document.querySelector("form, .vg-form");
  const target = heading || form || document.querySelector("main") || document.body;
  const r = target.getBoundingClientRect();
  const left = Math.round(r.left * 10) / 10;
  const right = Math.round((viewportWidth - r.right) * 10) / 10;
  return {
    heading: heading ? (heading.textContent || "").trim().slice(0, 80) : null,
    overflowPx,
    leftGutterPx: left,
    rightGutterPx: right,
    contentTouchesViewport: left <= 0 || right <= 0,
    clippedInteractive: Boolean(form && (form.getBoundingClientRect().width > viewportWidth + 1)),
  };
}

const samples = [];
const browser = await chromium.launch({ headless: true });

async function capture(route, state, width, after) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  if (after) await after(page);
  await page.waitForTimeout(250);
  const geo = await page.evaluate(measurePrimary);
  const row = {
    route: route.includes("workspaces") ? "/occupancynpv/app/workspaces/:id" : route.split("?")[0],
    state,
    routeClass: classify(route),
    viewportWidth: width,
    ...geo,
  };
  samples.push(row);
  console.log([row.route, state, width, `${row.leftGutterPx}/${row.rightGutterPx}`, row.overflowPx, row.heading || ""].join("\t"));
  await page.close();
  return row;
}

for (const width of [375, 390, 768, 1280]) {
  await capture("/", "default", width);
  await capture("/pricing", "default", width);
  await capture("/early-access", "default", width);
  await capture("/early-access?checkout=success", "success", width);
  await capture("/occupancynpv/app/login", "signin", width);
}
for (const width of [375, 1280]) {
  await capture("/occupancynpv/app/login", "signup", width, async (page) => {
    await page.getByRole("button", { name: /Need an account/i }).click().catch(() => {});
  });
  await capture("/occupancynpv/app/checkout/complete", "unauthenticated", width);
  await capture("/privacy-policy", "default", width);
  await capture("/terms-of-service", "default", width);
}

const stamp = Date.now();
const email = `onpv.gutter.${stamp}@example.com`;
const password = "OccupancyNpvTest1";
let workspaceRoute = "/occupancynpv/app/workspaces/demo";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const context = await browser.newContext();
const page = await context.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`${origin}/occupancynpv/app/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.getByRole("button", { name: /Need an account/i }).click().catch(() => {});
await page.locator('input[type="email"]').fill(email);
await page.locator('input[type="password"]').fill(password);
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForTimeout(1500);
const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const user = (users.users ?? []).find((row) => row.email === email);
let customerId = null;
if (user) {
  customerId = `cust_${user.id.replace(/-/g, "").slice(0, 16)}`;
  await admin.from("occupancynpv_customers").upsert({
    customer_id: customerId,
    venture_id: "occupancynpv",
    auth_identity_id: user.id,
    email,
    status: "ACTIVE",
  });
  await admin.from("occupancynpv_entitlements").upsert({
    entitlement_id: `ent_gutter_${stamp}`,
    customer_id: customerId,
    offer_id: "PROFESSIONAL",
    payment_reference: `pay_gutter_${stamp}`,
    entitlement_type: "PROFESSIONAL_ACCESS",
    quantity: 1,
    status: "ACTIVE",
  }, { onConflict: "payment_reference,offer_id" });
}
await page.goto(`${origin}/occupancynpv/app/login`, { waitUntil: "domcontentloaded" });
await page.locator('input[type="email"]').fill(email);
await page.locator('input[type="password"]').fill(password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForTimeout(1200);
if (!page.url().includes("/occupancynpv/app")) {
  await page.goto(`${origin}/occupancynpv/app`, { waitUntil: "domcontentloaded" });
}
await page.locator("input").last().fill("Gutter QC deal").catch(() => {});
await page.getByRole("button", { name: /Create workspace/i }).click().catch(() => {});
await page.waitForTimeout(1200);
if (page.url().includes("/workspaces/")) workspaceRoute = page.url().replace(origin, "");
for (const width of [375, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${origin}/occupancynpv/app`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const dash = await page.evaluate(measurePrimary);
  samples.push({
    route: "/occupancynpv/app",
    state: "default",
    routeClass: "DASHBOARD",
    viewportWidth: width,
    ...dash,
  });
  console.log(["/occupancynpv/app", "default", width, `${dash.leftGutterPx}/${dash.rightGutterPx}`, dash.overflowPx].join("\t"));
  await page.goto(`${origin}${workspaceRoute}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const ws = await page.evaluate(measurePrimary);
  samples.push({
    route: "/occupancynpv/app/workspaces/:id",
    state: "valid_workspace",
    routeClass: "PRODUCT_WORKSPACE",
    viewportWidth: width,
    ...ws,
  });
  console.log(["workspace", "valid_workspace", width, `${ws.leftGutterPx}/${ws.rightGutterPx}`, ws.overflowPx].join("\t"));
}
await context.close();
if (customerId) {
  await admin.from("occupancynpv_lease_scenarios").delete().eq("workspace_id", workspaceRoute.split("/").pop() ?? "");
  await admin.from("occupancynpv_deal_workspaces").delete().eq("customer_id", customerId);
  await admin.from("occupancynpv_entitlements").delete().eq("customer_id", customerId);
  await admin.from("occupancynpv_fulfillment_orders").delete().eq("customer_id", customerId);
  await admin.from("occupancynpv_customers").delete().eq("customer_id", customerId);
}
if (user?.id) await admin.auth.admin.deleteUser(user.id);
await browser.close();

const evidence = { validatedAt: new Date().toISOString(), samples };
writeFileSync(".infinity/venture-operating-scale/occupancynpv-customer-gutter-after.json", `${JSON.stringify(evidence, null, 2)}\n`);
writeFileSync(".infinity/venture-operating-scale/occupancynpv-customer-gutter-evidence.json", `${JSON.stringify(evidence, null, 2)}\n`);
console.log("samples", samples.length);
