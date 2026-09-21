/**
 * Production OccupancyNPV paid-app browser verification. No Stripe objects.
 * Prints statuses only.
 */
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

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

const origin = "https://occupancynpv.com";
const stamp = Date.now();
const emailA = `onpv.prod.a.${stamp}@example.com`;
const emailB = `onpv.prod.b.${stamp}@example.com`;
const password = "OccupancyNpvTest1";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = {
  login: "FAIL",
  account_creation: "FAIL",
  dashboard: "FAIL",
  workspace_creation: "FAIL",
  scenario_entry: "FAIL",
  npv_results: "FAIL",
  sensitivity: "FAIL",
  persistence_reload: "FAIL",
  tenant_isolation: "FAIL",
  unauthenticated_redirect: "FAIL",
  signout: "FAIL",
};

async function seedProfessional(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return null;
  const user = (data.users ?? []).find((row) => row.email === email);
  if (!user) return null;
  const customerId = `cust_${user.id.replace(/-/g, "").slice(0, 16)}`;
  await admin.from("occupancynpv_customers").upsert({
    customer_id: customerId,
    venture_id: "occupancynpv",
    auth_identity_id: user.id,
    email,
    status: "ACTIVE",
  });
  await admin.from("occupancynpv_entitlements").upsert({
    entitlement_id: `ent_browser_${stamp}_${customerId.slice(-8)}`,
    customer_id: customerId,
    offer_id: "PROFESSIONAL",
    payment_reference: `pay_browser_${stamp}_${customerId.slice(-8)}`,
    entitlement_type: "PROFESSIONAL_ACCESS",
    quantity: 1,
    status: "ACTIVE",
  }, { onConflict: "payment_reference,offer_id" });
  return { userId: user.id, customerId };
}

async function cleanup(ids) {
  for (const customerId of ids.customerIds) {
    await admin.from("occupancynpv_lease_scenarios").delete().eq("workspace_id", ids.workspaceId ?? "");
    await admin.from("occupancynpv_deal_workspaces").delete().eq("customer_id", customerId);
    await admin.from("occupancynpv_entitlements").delete().eq("customer_id", customerId);
    await admin.from("occupancynpv_fulfillment_orders").delete().eq("customer_id", customerId);
    await admin.from("occupancynpv_customers").delete().eq("customer_id", customerId);
  }
  for (const userId of ids.userIds) {
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
}

const tracked = { userIds: [], customerIds: [], workspaceId: null };
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const unauth = await page.goto(`${origin}/occupancynpv/app`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  if (page.url().includes("/occupancynpv/app/login") || unauth?.status() === 200) {
    results.unauthenticated_redirect = page.url().includes("/login") ? "PASS" : "FAIL";
  }

  await page.goto(`${origin}/occupancynpv/app/login`, { waitUntil: "networkidle" });
  results.login = (await page.locator("h1").innerText()).match(/sign in|create account/i) ? "PASS" : "FAIL";
  await page.getByRole("button", { name: /need an account/i }).click();
  await page.getByPlaceholder("Work email").fill(emailA);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL("**/occupancynpv/app", { timeout: 20000 });
  results.account_creation = page.url().includes("/occupancynpv/app") && !page.url().includes("/login") ? "PASS" : "FAIL";

  const seededA = await seedProfessional(emailA);
  if (seededA) {
    tracked.userIds.push(seededA.userId);
    tracked.customerIds.push(seededA.customerId);
  }
  await page.reload({ waitUntil: "networkidle" });
  results.dashboard = (await page.locator("h1").innerText()).includes("workspace") ? "PASS" : "FAIL";

  await page.locator("input").first().fill("Browser durable workspace");
  await page.getByRole("button", { name: /create workspace/i }).click();
  await page.waitForURL("**/occupancynpv/app/workspaces/**", { timeout: 20000 });
  tracked.workspaceId = page.url().split("/").pop();
  results.workspace_creation = tracked.workspaceId ? "PASS" : "FAIL";

  results.scenario_entry = (await page.locator("legend").count()) >= 2 ? "PASS" : "FAIL";
  await page.getByRole("button", { name: /compare npv/i }).click();
  await page.waitForTimeout(2000);
  const body = await page.locator("body").innerText();
  results.npv_results = /NPV:/i.test(body) ? "PASS" : "FAIL";
  results.sensitivity = /Discount-rate sensitivity/i.test(body) ? "PASS" : "FAIL";

  await page.reload({ waitUntil: "networkidle" });
  const reloaded = await page.locator("body").innerText();
  results.persistence_reload = /NPV:/i.test(reloaded) ? "PASS" : "FAIL";

  await page.goto(`${origin}/occupancynpv/app`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForURL("**/occupancynpv/app/login", { timeout: 20000 });
  results.signout = page.url().includes("/login") ? "PASS" : "FAIL";

  await page.goto(`${origin}/occupancynpv/app/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /need an account/i }).click();
  await page.getByPlaceholder("Work email").fill(emailB);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL("**/occupancynpv/app", { timeout: 20000 });
  const seededB = await seedProfessional(emailB);
  if (seededB) {
    tracked.userIds.push(seededB.userId);
    tracked.customerIds.push(seededB.customerId);
  }
  await page.goto(`${origin}/occupancynpv/app/workspaces/${tracked.workspaceId}`, { waitUntil: "networkidle" });
  const isolated = await page.locator("body").innerText();
  results.tenant_isolation = /cannot open this workspace/i.test(isolated) ? "PASS" : "FAIL";
} catch (error) {
  console.log("browser_error:", error instanceof Error ? error.message : "UNKNOWN");
} finally {
  if (browser) await browser.close();
  await cleanup(tracked);
}

for (const [key, value] of Object.entries(results)) {
  console.log(`${key}: ${value}`);
}
