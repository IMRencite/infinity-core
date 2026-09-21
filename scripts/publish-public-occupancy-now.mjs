import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq < 1) continue;
  const key = line.slice(0, eq).trim();
  const value = line.slice(eq + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

const now = new Date().toISOString();
const departments = {
  OPERATIONS: "MONITORING",
  RESEARCH: "IDLE",
  GROWTH: "MONITORING",
  VALIDATION: "MONITORING",
  SYSTEMS: "IDLE",
  FINANCE: "IDLE",
  PRODUCT: "IDLE",
  CREATIVE: "IDLE",
  PROSPECT_INTELLIGENCE: "MONITORING",
};
const sales_rooms = {
  OUTBOUND_ACQUISITION: "MONITORING",
  INBOUND_CONVERSION: "MONITORING",
  EXPANSION_RETENTION: "IDLE",
  PARTNERSHIPS_CHANNEL: "MONITORING",
  OFFER_CLOSING: "MONITORING",
};
const agents = {
  "public-ops": "MONITORING",
  "public-ops-2": "MONITORING",
  "public-research": "IDLE",
  "public-growth": "MONITORING",
  "public-growth-2": "MONITORING",
  "public-validation": "MONITORING",
  "public-systems": "IDLE",
  "public-finance": "IDLE",
  "public-product": "IDLE",
  "public-creative": "IDLE",
  "public-prospect-scout": "MONITORING",
  "public-prospect-resolver": "MONITORING",
  "public-sales-out": "MONITORING",
  "public-sales-in": "MONITORING",
  "public-sales-partner": "MONITORING",
};
const occupancy = {
  contract: "CanonicalPublicOccupancy",
  version: "occupancy-v1",
  generated_at: now,
  summary: "MONITORING",
  departments,
  sales_rooms,
  agents,
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log(JSON.stringify({ ok: false, reason: "SUPABASE_UNCONFIGURED" }));
  process.exit(1);
}
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { error } = await client.from("cloud_runtime_state").upsert({
  scope: "public-operations-occupancy",
  version: 1,
  instance_id: "public-occupancy",
  payload: occupancy,
  updated_at: now,
});
if (error) {
  console.log(JSON.stringify({ ok: false, reason: error.message }));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, summary: occupancy.summary, generated_at: now }));
