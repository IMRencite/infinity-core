/**
 * Copy local .infinity/founder-daily-reports into durable Postgres.
 * Does not print report payloads or secrets. Skips existing dates.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

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
    if (process.env[key] == null) process.env[key] = val;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log(JSON.stringify({ ok: false, reason: "SUPABASE_UNCONFIGURED" }));
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const probe = await client.from("founder_daily_reports").select("report_date").limit(1);
if (probe.error) {
  console.log(JSON.stringify({ ok: false, reason: "SCHEMA_UNAVAILABLE", code: probe.error.code }));
  process.exit(1);
}

const dir = join(process.cwd(), ".infinity", "founder-daily-reports");
const files = existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith(".json")) : [];
let migrated = 0;
let skipped = 0;
const dates = [];
for (const name of files) {
  const report = JSON.parse(readFileSync(join(dir, name), "utf8"));
  if (!report?.report_date || !report?.report_id) {
    skipped += 1;
    continue;
  }
  const existing = await client.from("founder_daily_reports").select("report_id").eq("report_date", report.report_date).maybeSingle();
  if (existing.data?.report_id) {
    skipped += 1;
    dates.push({ date: report.report_date, action: "exists" });
    continue;
  }
  const { error } = await client.from("founder_daily_reports").upsert({
    report_date: report.report_date,
    report_id: report.report_id,
    status: report.status,
    version: report.version,
    generated_at: report.generated_at,
    updated_at: report.updated_at,
    finalized_at: report.finalized_at ?? null,
    payload: report,
  }, { onConflict: "report_date" });
  if (error) {
    dates.push({ date: report.report_date, action: "error" });
    continue;
  }
  migrated += 1;
  dates.push({ date: report.report_date, action: "migrated", status: report.status, version: report.version });
}

const listed = await client.from("founder_daily_reports").select("report_date, status, version").order("report_date", { ascending: false });
console.log(JSON.stringify({
  ok: true,
  localFiles: files.length,
  migrated,
  skipped,
  dates,
  durableCount: listed.data?.length ?? 0,
  durableDates: (listed.data ?? []).map((row) => ({ date: row.report_date, status: row.status, version: row.version })),
}, null, 2));
