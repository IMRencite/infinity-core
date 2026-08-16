import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    let val = trimmed.slice(separator + 1);
    const key = trimmed.slice(0, separator);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await admin
  .from("product_asset_builder_runs")
  .select("id,status,engine_version,cumulative_cost_usd,builder_report,completed_at,idempotency_key")
  .eq("engine_version", "product_asset_builder_v2")
  .order("completed_at", { ascending: false })
  .limit(5);

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));

const { data: artifacts, error: artErr } = await admin
  .from("product_asset_production_artifacts")
  .select("id,status,product_asset_builder_run_id,created_at")
  .order("created_at", { ascending: false })
  .limit(5);
console.log("=== ARTIFACTS ===");
if (artErr) console.error(artErr);
console.log(JSON.stringify(artifacts, null, 2));
