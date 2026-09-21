/**
 * OccupancyNPV production schema inspection. Does not print secrets or row payloads.
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = new URL("../.env.local", import.meta.url);
  const path = envPath.pathname.startsWith("/") && process.platform === "win32"
    ? envPath.pathname.slice(1)
    : envPath.pathname;
  const resolved = existsSync(".env.local") ? ".env.local" : decodeURIComponent(path);
  for (const line of readFileSync(resolved, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    let val = trimmed.slice(sep + 1);
    const key = trimmed.slice(0, sep);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) {
  console.log("CONFIG: MISSING");
  process.exit(1);
}

const ref = new URL(url).hostname.split(".")[0];
console.log("project_ref:", ref);
console.log("auth_admin:", "reachable_via_prior_audit");

const admin = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tables = [
  "occupancynpv_customers",
  "occupancynpv_entitlements",
  "occupancynpv_deal_workspaces",
  "occupancynpv_lease_scenarios",
  "occupancynpv_fulfillment_orders",
];

for (const table of tables) {
  const { error } = await admin.from(table).select("*", { head: true, count: "exact" }).limit(0);
  if (!error) {
    console.log(`${table}: EXISTS`);
    continue;
  }
  const missing = error.code === "PGRST205" || /could not find the table/i.test(error.message) || error.code === "42P01";
  console.log(`${table}: ${missing ? "NOT_APPLIED" : "ERROR"} ${error.code ?? ""}`.trim());
}
