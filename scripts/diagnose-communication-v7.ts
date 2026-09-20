import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

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

async function main() {
  loadEnv();
  const commit = "c2c5aa5bda86a08413ce6db399a5a76ba07012f5";
  const sha = execSync(`git rev-parse ${commit}`, { encoding: "utf8" }).trim();
  const tree = execSync(`git log -1 --format=%T ${commit}`, { encoding: "utf8" }).trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  const ownership = client
    ? await client.from("communication_outbound_ownership").select("*").eq("thread_id", "1a0af74557b0eb36")
    : { data: null, error: { message: "NO_CLIENT" } };
  const obligations = client
    ? await client.from("communication_obligations").select("id,state,provider_message_id")
    : { data: null, error: { message: "NO_CLIENT" } };
  const snap = client
    ? await client.from("cloud_runtime_state").select("payload").eq("scope", "communication-thread-snapshot-v5").maybeSingle()
    : { data: null };
  const closed = client
    ? await client.from("cloud_runtime_state").select("payload").eq("scope", "production-outbound-closed-loop-v1").maybeSingle()
    : { data: null };
  const messages = ((snap.data?.payload as { messages?: Array<Record<string, unknown>> } | undefined)?.messages ?? []);
  const target = messages.find((row) => row.provider_message_id === "1a0be7a9feee5375") ?? null;
  const falseStop = messages.find((row) => row.provider_message_id === "1a0b254b39f5c645") ?? null;
  const suppression = (closed.data?.payload as { suppression?: Record<string, unknown> } | undefined)?.suppression ?? null;
  console.log(JSON.stringify({
    source: { git_commit_sha: sha, git_tree_sha: tree, dirty_worktree_not_hashed: true },
    ownership_rows: ownership.data ?? [],
    ownership_error: (ownership as { error?: { message?: string } }).error?.message ?? null,
    obligation_count: Array.isArray(obligations.data) ? obligations.data.length : null,
    snapshot_count: messages.length,
    snapshot_ids: messages.map((row) => row.provider_message_id),
    target,
    false_stop: falseStop,
    suppression,
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});
