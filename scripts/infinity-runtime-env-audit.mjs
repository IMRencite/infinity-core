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
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const projectId = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
const required = {
  NEXT_PUBLIC_SUPABASE_URL: "REQUIRED",
  SUPABASE_SERVICE_ROLE_KEY: "REQUIRED",
  CRON_SECRET: "REQUIRED",
  INFINITY_RUNTIME_TICK_SECRET: "OPTIONAL",
  INFINITY_RUNTIME_WAKE_SECRET: "OPTIONAL",
  INFINITY_CLOUD_RUNTIME: "REQUIRED",
  VERCEL: "OPTIONAL",
  VERCEL_DEPLOYMENT_ID: "OPTIONAL",
  VERCEL_GIT_COMMIT_SHA: "OPTIONAL",
};

const listed = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?teamId=${encodeURIComponent(team)}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await listed.json();
const names = new Set((json.envs || []).map((row) => row.key));
const audit = Object.fromEntries(Object.entries(required).map(([key, kind]) => {
  const present = names.has(key) || (key === "VERCEL" && true);
  if (key === "VERCEL") return [key, { status: "OPTIONAL", note: "SET_BY_VERCEL_RUNTIME" }];
  if (key === "VERCEL_DEPLOYMENT_ID" || key === "VERCEL_GIT_COMMIT_SHA") {
    return [key, { status: "OPTIONAL", note: "SET_BY_VERCEL_RUNTIME" }];
  }
  if (names.has(key)) return [key, { status: "PRESENT", kind }];
  if (kind === "OPTIONAL" && (key === "INFINITY_RUNTIME_TICK_SECRET" || key === "INFINITY_RUNTIME_WAKE_SECRET") && names.has("CRON_SECRET")) {
    return [key, { status: "OPTIONAL", note: "FALLBACK_CRON_SECRET" }];
  }
  return [key, { status: present ? "PRESENT" : "MISSING", kind }];
}));
console.log(JSON.stringify({ ok: listed.ok, project: "infinity-runtime", audit }, null, 2));
void names;
