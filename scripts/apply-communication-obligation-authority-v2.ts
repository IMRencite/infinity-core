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
    console.log(JSON.stringify({ ok: false, reason: "SUPABASE_UNAVAILABLE" }));
    return;
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260920120000_communication_obligation_authority_v2.sql"), "utf8");
  const statements = sql
    .split(/;\s*\n/)
    .map((row) => row.trim())
    .filter((row) => row && !row.startsWith("--"));
  const results: Array<{ ok: boolean; preview: string }> = [];
  for (const statement of statements) {
    const { error } = await client.rpc("exec_sql", { sql: `${statement};` });
    results.push({ ok: !error, preview: statement.slice(0, 48) });
  }
  const probe = await client.from("communication_obligations").select("id").limit(1);
  console.log(JSON.stringify({
    rpc_attempts: results.length,
    rpc_ok: results.filter((row) => row.ok).length,
    table_probe: probe.error ? probe.error.message.slice(0, 80) : "READY",
    persistence: probe.error ? "MISSING" : "POSTGRES",
  }));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, reason: error instanceof Error ? error.message.slice(0, 80) : "FAILED" }));
});
