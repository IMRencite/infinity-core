import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

function loadEnv() {
  const envPath = "c:/Users/Antivist/Desktop/Infinity/infinity-core/.env.local";
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
const now = new Date().toISOString();
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const intended = {
  status: "INTENDED",
  created_at: now,
  recorded_at: now,
  owner: "ENGINEERING",
  reason: "EMERGENCY_KNOWN_GOOD_RESTORE",
  release_id: "rel:communication-emergency-restore-v10:dpl_8sX5",
  cutover_epoch: "LEGACY",
  planner_version: "conversation-planner-v1",
  intended_git_sha: "837f7ec12480f6884c4b4eb9c8b6d7394fc29b3e",
  expected_deployment_id: "dpl_8sX5jqiu7YUPox4gJoto3td6f5mS",
  expected_deployment_target: "infinity-runtime",
  communication_schema_version: "communication-recovery-release-v8",
  supersedes: "rel:communication-release-parity-v2:234776a70970",
  original_lineage: "dpl_6saLKJDLFKFhPoscmEhTW9QdhHeo",
};
const human = await client.from("cloud_runtime_state").select("payload").eq("scope", "communication-human-attestation-v7").maybeSingle();
const requests = ((human.data?.payload?.requests) ?? []).map((row) => ({
  ...row,
  status: row.status === "ATTESTED" || row.status === "REJECTED" ? row.status : "SUPERSEDED_PATH_UNREACHABLE",
  reason: row.status === "ATTESTED" || row.status === "REJECTED" ? row.reason : "PATH_UNREACHABLE",
  next_action: "NONE",
  founder_penalized_for_expiry: false,
  updated_at: now,
}));
const a = await client.from("cloud_runtime_state").upsert({
  scope: "communication-intended-release-v1",
  version: 1,
  instance_id: "communication-intended-release",
  payload: intended,
  updated_at: now,
});
const b = await client.from("cloud_runtime_state").upsert({
  scope: "communication-human-attestation-v7",
  version: 1,
  instance_id: "communication-human-attestation",
  payload: { requests, owner: "FOUNDER", status: "SUPERSEDED_PATH_UNREACHABLE", clock_started: false, reason: "PATH_UNREACHABLE" },
  updated_at: now,
});
console.log(JSON.stringify({
  intended_ok: !a.error,
  human_ok: !b.error,
  intended_error: a.error?.message ?? null,
  human_error: b.error?.message ?? null,
  superseded: requests.map((row) => ({ id: row.id, status: row.status })),
}, null, 2));
