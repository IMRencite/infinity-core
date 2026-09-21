import { createHash } from "node:crypto";
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
    process.env[key] = val;
  }
}

function fingerprint(value) {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

loadEnv();

const PROJECT_ID = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const localFingerprint = fingerprint(process.env.GMAIL_OAUTH_REFRESH_TOKEN);
const apply = process.argv.includes("--apply");

if (!token || !team) {
  console.log(JSON.stringify({ ok: false, reason: "VERCEL_TOKEN_OR_TEAM_MISSING" }));
  process.exit(1);
}

const api = (path, init = {}) => fetch(`https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`, {
  ...init,
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(init.headers ?? {}),
  },
});

const listed = await api(`/v9/projects/${encodeURIComponent(PROJECT_ID)}/env`);
const json = await listed.json();
const envs = Array.isArray(json.envs) ? json.envs : [];
const targets = { production: null, preview: null, development: null };
for (const row of envs) {
  if (row.key !== "GMAIL_OAUTH_REFRESH_TOKEN") continue;
  const rowTargets = Array.isArray(row.target) ? row.target : [];
  const decrypted = await api(`/v9/projects/${encodeURIComponent(PROJECT_ID)}/env/${encodeURIComponent(row.id)}?decrypt=true`);
  const body = await decrypted.json().catch(() => ({}));
  const value = typeof body.value === "string" ? body.value : null;
  const fp = fingerprint(value);
  for (const target of rowTargets) {
    if (target in targets) targets[target] = { id: row.id, fingerprint: fp, present: Boolean(value) };
  }
}

const productionFingerprint = targets.production?.fingerprint ?? null;
const match = Boolean(localFingerprint && productionFingerprint && localFingerprint === productionFingerprint);
let updated = false;
if (apply && !match && process.env.GMAIL_OAUTH_REFRESH_TOKEN && targets.production?.id) {
  const existing = envs.find((row) => row.id === targets.production.id);
  const patched = await api(`/v9/projects/${encodeURIComponent(PROJECT_ID)}/env/${encodeURIComponent(targets.production.id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      value: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
      type: "encrypted",
      target: existing?.target ?? ["production"],
    }),
  });
  updated = patched.ok || patched.status === 409;
}

console.log(JSON.stringify({
  contract: "GmailProductionGrantParityV1",
  project: "infinity-runtime",
  projectId: PROJECT_ID,
  local_fingerprint: localFingerprint,
  production_fingerprint: productionFingerprint,
  preview_fingerprint: targets.preview?.fingerprint ?? null,
  development_fingerprint: targets.development?.fingerprint ?? null,
  match,
  updated,
  apply,
  env_key: "GMAIL_OAUTH_REFRESH_TOKEN",
}, null, 2));
if (!listed.ok) process.exit(1);
