import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
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
const incident = JSON.parse(readFileSync(join(process.cwd(), ".infinity/communication-incident-owner-v11.json"), "utf8"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log(JSON.stringify({ ok: true, storage: "LOCAL_FILE", incident_id: incident.incident_id, owner: incident.owner, deadline_at: incident.deadline_at }));
  process.exit(0);
}
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const written = await client.from("cloud_runtime_state").upsert({
  scope: "communication-incident-owner-v11",
  version: 1,
  instance_id: "communication-incident-owner",
  payload: { ...incident, persisted_at: now },
  updated_at: now,
});
console.log(JSON.stringify({
  ok: !written.error,
  storage: written.error ? "LOCAL_FILE" : "POSTGRES",
  error: written.error?.message ?? null,
  incident_id: incident.incident_id,
  owner: incident.owner,
  deadline_at: incident.deadline_at,
}, null, 2));
if (written.error) process.exit(1);
