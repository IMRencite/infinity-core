/**
 * OccupancyNPV production schema readback. Prints table/column names only.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const sep = trimmed.indexOf("=");
  if (sep === -1) continue;
  let val = trimmed.slice(sep + 1);
  const key = trimmed.slice(0, sep);
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  process.env[key] = val;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const openApi = await fetch(`${url}/rest/v1/`, {
  headers: {
    apikey: service,
    Authorization: `Bearer ${service}`,
    Accept: "application/openapi+json",
  },
});
const spec = await openApi.json();
const paths = Object.keys(spec.paths ?? {}).filter((path) => path.includes("occupancynpv"));
const defs = Object.keys(spec.definitions ?? {});
const schemas = Object.keys(spec.components?.schemas ?? {});
console.log("openapi_occupancynpv_paths:", paths.join(",") || "NONE");
console.log("openapi_def_count:", defs.length, "schema_count:", schemas.length);
console.log("openapi_occupancynpv_defs:", defs.filter((name) => name.includes("occupancynpv")).join(",") || "NONE");
console.log("openapi_occupancynpv_schemas:", schemas.filter((name) => name.includes("occupancynpv")).join(",") || "NONE");

const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const wanted = [
  "occupancynpv_customers",
  "occupancynpv_entitlements",
  "occupancynpv_deal_workspaces",
  "occupancynpv_lease_scenarios",
  "occupancynpv_fulfillment_orders",
];
for (const name of wanted) {
  const { error, data } = await admin.from(name).select("*").limit(1);
  if (error) {
    console.log(`${name}: QUERY_ERROR ${error.code} ${error.message}`);
    continue;
  }
  const sample = data?.[0] ?? null;
  console.log(`${name}: QUERY_OK rows_sampled=${data?.length ?? 0} columns=${sample ? Object.keys(sample).join(",") : "EMPTY_TABLE_NO_COLUMN_HINT"}`);
}

const anon = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
for (const name of wanted) {
  const { error, data } = await anon.from(name).select("*").limit(5);
  if (error) console.log(`anon ${name}: ${error.code} ${error.message}`);
  else console.log(`anon ${name}: rows=${data?.length ?? 0}`);
}
