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
const base = process.env.INFINITY_RUNTIME_URL || "https://infinity-runtime.vercel.app";
const secret = process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET;
const unauth = await fetch(`${base}/api/runtime/operating-state`, { cache: "no-store" });
const auth = await fetch(`${base}/api/runtime/operating-state`, {
  cache: "no-store",
  headers: { authorization: `Bearer ${secret}` },
});
const body = await auth.json().catch(() => ({}));
const cloud = body.cloudRuntime && typeof body.cloudRuntime === "object" ? body.cloudRuntime : {};
console.log(JSON.stringify({
  unauth: unauth.status,
  auth: auth.status,
  topKeys: Object.keys(body),
  cloudKeys: Object.keys(cloud),
  status: body.status ?? null,
  persistence: cloud.persistence || null,
  persistenceKind: cloud.persistence_kind || null,
  runtimeState: cloud.runtime_state || cloud.state || null,
  deploymentId: cloud.deployment_id || null,
  runtimeVersion: cloud.runtime_version || null,
  freshness: cloud.freshness || body.freshness || null,
  lastWake: Boolean(cloud.last_wake_at),
  lastSuccess: Boolean(cloud.last_successful_iteration_at),
  leaseHeld: cloud.lease_held ?? null,
}, null, 2));
