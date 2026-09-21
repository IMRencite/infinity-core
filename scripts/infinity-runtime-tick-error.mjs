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
const secret = process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET;
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const headers = { authorization: `Bearer ${secret}`, "content-type": "application/json" };
const tick = await fetch("https://infinity-runtime.vercel.app/api/runtime/tick", { method: "POST", headers, cache: "no-store" });
const body = await tick.text();
const parsed = (() => { try { return JSON.parse(body); } catch { return null; } })();
const state = await fetch("https://infinity-runtime.vercel.app/api/runtime/operating-state", { headers, cache: "no-store" }).then((r) => r.json());
const project = await fetch(`https://api.vercel.com/v9/projects/prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox?teamId=${encodeURIComponent(team)}`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());
console.log(JSON.stringify({
  tickStatus: tick.status,
  tickKeys: parsed && typeof parsed === "object" ? Object.keys(parsed) : ["raw"],
  tickError: parsed?.error || parsed?.message || parsed?.reason || (body.includes("<") ? "HTML" : body.slice(0, 240)),
  afterWake: {
    runtimeState: state.cloudRuntime?.runtime_state,
    lastWake: Boolean(state.cloudRuntime?.last_wake_at),
    lastSuccess: Boolean(state.cloudRuntime?.last_successful_iteration_at),
    persistenceKind: state.cloudRuntime?.persistence_kind,
    deploymentId: state.cloudRuntime?.deployment_id,
    version: state.cloudRuntime?.runtime_version,
    freshness: state.cloudRuntime?.freshness,
    action: state.cloudRuntime?.last_meaningful_action,
  },
  cronPaths: (project.crons || []).map((row) => row.path || row.href || row),
  framework: project.framework || null,
}, null, 2));
