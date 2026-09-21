/**
 * Independent missing-row dead-man for OccupancyNPV daily blog obligation.
 * Checks shortly after 07:00 UTC. Does NOT create the obligation.
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep);
    let val = trimmed.slice(sep + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

function operatingDateInNewYork(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const operating_date = operatingDateInNewYork();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const snapshot = {
  observer: "organic-missing-obligation-deadman",
  operating_timezone: "America/New_York",
  operating_date,
  create_attempted: false,
  scheduled: process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_EVENT_NAME === "schedule",
  obligation_exists: null,
  page: false,
  reason: null,
};

if (!url || !key) {
  snapshot.reason = "READ_ONLY_DB_UNAVAILABLE";
  snapshot.page = true;
  console.log(JSON.stringify({ ok: false, snapshot }, null, 2));
  process.exit(2);
}

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await client
  .from("blog_daily_obligations")
  .select("id,operating_date,pipeline_state,due_at")
  .eq("venture_id", "occupancynpv")
  .eq("operating_date", operating_date)
  .maybeSingle();

if (error) {
  snapshot.reason = error.message;
  snapshot.page = true;
  console.log(JSON.stringify({ ok: false, snapshot }, null, 2));
  process.exit(2);
}

snapshot.obligation_exists = Boolean(data?.id);
snapshot.obligation = data ?? null;
if (!data) {
  snapshot.page = true;
  snapshot.reason = "EXPECTED_DAILY_OBLIGATION_MISSING";
  console.log(JSON.stringify({ ok: false, snapshot }, null, 2));
  process.exit(2);
}

console.log(JSON.stringify({ ok: true, snapshot }, null, 2));
