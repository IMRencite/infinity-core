import { existsSync, readFileSync } from "node:fs";
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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log(JSON.stringify({ persistence: "UNAVAILABLE" }));
    return;
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const tables = [
    "communication_obligations",
    "communication_attempts",
    "communication_outbound_ledger",
    "communication_transition_log",
  ];
  const found: Record<string, string> = {};
  for (const table of tables) {
    const { error } = await client.from(table).select("*").limit(1);
    found[table] = error ? "MISSING" : "READY";
  }
  console.log(JSON.stringify({
    persistence: Object.values(found).every((row) => row === "READY") ? "POSTGRES" : "MISSING",
    tables: found,
  }));
}

main().catch((error) => {
  console.log(JSON.stringify({ persistence: "ERROR", reason: error instanceof Error ? error.message.slice(0, 80) : "FAILED" }));
});
