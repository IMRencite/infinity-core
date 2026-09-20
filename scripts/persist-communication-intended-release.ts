import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
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
import {
  COMMUNICATION_CUTOVER_EPOCH_SCOPE,
  COMMUNICATION_INTENDED_RELEASE_SCOPE,
  COMMUNICATION_SCHEMA_VERSION,
} from "../lib/infinity/production-outbound/obligation/release";
import { CONVERSATION_PLANNER_VERSION } from "../lib/infinity/production-outbound/conversation-planner";
import { COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID } from "../lib/infinity/production-outbound/obligation/cutover";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log(JSON.stringify({ ok: false, reason: "SUPABASE_MISSING" }));
  process.exit(1);
}

const sha = process.env.COMMUNICATION_INTENDED_GIT_SHA
  || execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const now = new Date().toISOString();
const epoch = (process.env.COMMUNICATION_CUTOVER_EPOCH === "OBLIGATION" ? "OBLIGATION" : "LEGACY") as "LEGACY" | "OBLIGATION";
const release = {
  release_id: `rel:communication-release-parity-v2:${sha.slice(0, 12)}`,
  intended_git_sha: sha,
  expected_deployment_target: "infinity-runtime",
  expected_deployment_id: process.env.COMMUNICATION_INTENDED_DEPLOYMENT_ID ?? null,
  communication_schema_version: COMMUNICATION_SCHEMA_VERSION,
  planner_version: CONVERSATION_PLANNER_VERSION,
  cutover_epoch: epoch,
  created_at: now,
  status: "INTENDED",
};
const epochRow = {
  epoch,
  cohort_thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
  updated_at: now,
  reversible: true,
  preserves: ["obligation_history", "outbound_ledger", "suppression", "provider_identity"],
};

async function main() {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const intended = await client.from("cloud_runtime_state").upsert({
    scope: COMMUNICATION_INTENDED_RELEASE_SCOPE,
    version: 1,
    instance_id: "communication-intended-release",
    payload: release,
    updated_at: now,
  });
  const cutover = await client.from("cloud_runtime_state").upsert({
    scope: COMMUNICATION_CUTOVER_EPOCH_SCOPE,
    version: 1,
    instance_id: "communication-cutover-epoch",
    payload: epochRow,
    updated_at: now,
  });
  console.log(JSON.stringify({
    ok: !intended.error && !cutover.error,
    release,
    epoch: epochRow,
    intended_error: intended.error?.message ?? null,
    epoch_error: cutover.error?.message ?? null,
  }, null, 2));
  if (intended.error || cutover.error) process.exit(1);
}

void main();
