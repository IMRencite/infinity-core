import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

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

async function vercel(path: string) {
  const token = process.env.VERCEL_TOKEN;
  const team = process.env.VERCEL_TEAM_ID;
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${team}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
}

async function main() {
  loadEnv();
  const trackedF8 = spawnSync("git", ["ls-tree", "-r", "--name-only", "f8e5448d4ad06856571ac2cf946ede0c86eb0fdb"], { encoding: "utf8" }).stdout || "";
  const tracked601 = spawnSync("git", ["ls-tree", "-r", "--name-only", "601e2c501f8236a1a95e99e20e6bee00a3c84962"], { encoding: "utf8" }).stdout || "";
  const dpl5 = await vercel("/v13/deployments/dpl_5iC51KgrdBghubsk5pzajV5pvm1B");
  const dpl6 = await vercel("/v13/deployments/dpl_6saLKJDLFKFhPoscmEhTW9QdhHeo");
  const aliases = await vercel("/v2/aliases?projectId=prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox&limit=20");
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const beats = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-heartbeats-v1").maybeSingle();
  const scheduler = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-scheduler-v1").maybeSingle();
  const payload = (beats.data?.payload ?? {}) as {
    runtimes?: Record<string, { last_success_at?: string; deployment_id?: string; timestamp?: string }>;
    updated_at?: string;
  };
  const sched = (scheduler.data?.payload ?? {}) as { last_success_at?: string; last_failure_at?: string; active_deployment_id?: string };
  const aliasRows = Array.isArray((aliases.json as { aliases?: Array<Record<string, unknown>> })?.aliases)
    ? (aliases.json as { aliases: Array<Record<string, unknown>> }).aliases
    : [];
  const prodAlias = aliasRows.filter((row) => String(row.alias || "").includes("infinity-runtime.vercel.app"));
  console.log(JSON.stringify({
    tick_in_f8e5448: trackedF8.split(/\r?\n/).includes("app/api/runtime/communication-tick/route.ts"),
    tick_in_601e2c5: tracked601.split(/\r?\n/).includes("app/api/runtime/communication-tick/route.ts"),
    attest_in_f8e5448: trackedF8.split(/\r?\n/).includes("app/api/runtime/communication-attest/route.ts"),
    dpl_5iC51: dpl5.ok ? {
      id: (dpl5.json as { id?: string }).id,
      createdAt: (dpl5.json as { createdAt?: number }).createdAt,
      ready: (dpl5.json as { ready?: number }).ready,
      buildingAt: (dpl5.json as { buildingAt?: number }).buildingAt,
      url: (dpl5.json as { url?: string }).url,
      meta: (dpl5.json as { meta?: unknown }).meta,
    } : { error: dpl5.status },
    dpl_6saL: dpl6.ok ? {
      id: (dpl6.json as { id?: string }).id,
      createdAt: (dpl6.json as { createdAt?: number }).createdAt,
      ready: (dpl6.json as { ready?: number }).ready,
      url: (dpl6.json as { url?: string }).url,
    } : { error: dpl6.status },
    aliases: prodAlias.map((row) => ({
      alias: row.alias,
      deploymentId: row.deploymentId,
      created: row.created,
    })),
    heartbeat_updated_at: beats.data?.updated_at ?? null,
    scheduler_updated_at: scheduler.data?.updated_at ?? null,
    scheduler_last_success_at: sched.last_success_at ?? null,
    scheduler_last_failure_at: sched.last_failure_at ?? null,
    scheduler_deployment: sched.active_deployment_id ?? null,
    runtimes: payload.runtimes ?? null,
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});
