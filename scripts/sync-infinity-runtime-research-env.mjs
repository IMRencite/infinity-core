/**
 * Upsert research provider env on infinity-runtime (production/preview/dev).
 * Uses existing local .env.local values — no new vendor or credentials.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ID = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = line.slice(eq + 1).trim().replace(/^"|"$/g, "");
  }
}

loadEnv();

const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
if (!token || !team) {
  console.log(JSON.stringify({ ok: false, reason: "VERCEL_TOKEN_OR_TEAM_MISSING" }));
  process.exit(1);
}

const keys = {
  RESEARCH_PROVIDER: process.env.RESEARCH_PROVIDER,
  RESEARCH_ENABLED: process.env.RESEARCH_ENABLED ?? "true",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  GEMINI_RESEARCH_MODEL: process.env.GEMINI_RESEARCH_MODEL,
};

async function upsertEnv(key, value) {
  if (!value) return { key, ok: false, reason: "MISSING_LOCAL_VALUE" };
  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(PROJECT_ID)}/env?teamId=${team}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ key, value, type: "encrypted", target: ["production", "preview", "development"] }),
  });
  return { key, ok: res.ok || res.status === 409, status: res.status };
}

const results = [];
for (const [key, value] of Object.entries(keys)) {
  results.push(await upsertEnv(key, value));
}

console.log(JSON.stringify({ ok: results.every((r) => r.ok || r.reason === "MISSING_LOCAL_VALUE"), results }, null, 2));
