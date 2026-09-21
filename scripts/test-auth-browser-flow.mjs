/**
 * Browser auth test: verifyOtp on /login page, then test dashboard persistence.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const sep = trimmed.indexOf("=");
  if (sep === -1) continue;
  process.env[trimmed.slice(0, sep)] = trimmed.slice(sep + 1).replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = process.env.AUTH_BASE_URL ?? "http://localhost:3000";

const admin = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: users } = await admin.auth.admin.listUsers({ perPage: 1 });
const email = users?.users?.[0]?.email;
if (!email) {
  console.log("No user");
  process.exit(1);
}

const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
});
if (linkError || !linkData.properties?.hashed_token) {
  console.log("generateLink failed:", linkError?.message ?? "no token");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });

const browserAuth = await page.evaluate(
  async ({ supabaseUrl, supabaseKey, tokenHash }) => {
    const { createBrowserClient } = await import(
      "https://esm.sh/@supabase/ssr@0.12.3"
    );
    const supabase = createBrowserClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });
    const cookieNames = document.cookie
      .split(";")
      .map((part) => part.trim().split("=")[0])
      .filter((name) => name.includes("-auth-token"));
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      error: error?.message ?? null,
      user: Boolean(user),
      session: Boolean(session),
      cookieNames,
    };
  },
  { supabaseUrl: url, supabaseKey: publishable, tokenHash: linkData.properties.hashed_token },
);

console.log("verifyOtp in browser:", JSON.stringify(browserAuth, null, 2));

const cookies = await context.cookies();
console.log(
  "Playwright cookie names:",
  cookies.filter((c) => c.name.includes("-auth-token")).map((c) => c.name).join(", ") || "(none)",
);

await page.goto(`${baseUrl}/api/auth/diagnostic`, { waitUntil: "networkidle" });
console.log("Diagnostic:", await page.locator("body").innerText());

await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
const dashboardUrl = page.url();
console.log("Dashboard URL:", dashboardUrl);
const dashboardOk =
  dashboardUrl.includes("/dashboard") && !dashboardUrl.endsWith("/login");
console.log("Dashboard reachable while authenticated:", dashboardOk ? "YES" : "NO");

await page.reload({ waitUntil: "networkidle" });
console.log("After refresh:", page.url());

await browser.close();
process.exit(dashboardOk ? 0 : 1);
