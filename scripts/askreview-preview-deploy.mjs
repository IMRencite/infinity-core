/**
 * Isolated AskReview founder preview. New Vercel project. No OccupancyNPV alias.
 * No domain bind. No Stripe env. Staging/non-prod deploy only.
 */
import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
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

const PROJECT = "infinity-askreview-founder-preview";
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
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

async function findOrCreateProject() {
  const listed = await api(`/v9/projects/${encodeURIComponent(PROJECT)}`);
  if (listed.ok) {
    const json = await listed.json();
    return { id: json.id, name: json.name, created: false };
  }
  const created = await api("/v11/projects", {
    method: "POST",
    body: JSON.stringify({
      name: PROJECT,
      framework: "nextjs",
    }),
  });
  const json = await created.json();
  if (!created.ok) return { id: null, name: PROJECT, created: false, error: json.error?.message ?? `HTTP_${created.status}` };
  return { id: json.id, name: json.name ?? PROJECT, created: true };
}

async function upsertEnv(projectId, key, value) {
  const listed = await api(`/v9/projects/${encodeURIComponent(projectId)}/env`);
  const json = await listed.json();
  const envs = Array.isArray(json.envs) ? json.envs : [];
  const existing = envs.find((row) => row.key === key);
  const body = { key, value, type: "encrypted", target: ["production", "preview", "development"] };
  if (existing?.id) {
    const patched = await api(`/v9/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ value, type: "encrypted", target: ["production", "preview", "development"] }),
    });
    return patched.ok || patched.status === 409;
  }
  const created = await api(`/v10/projects/${encodeURIComponent(projectId)}/env`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return created.ok || created.status === 409;
}

const project = await findOrCreateProject();
if (!project.id) {
  console.log(JSON.stringify({ ok: false, reason: project.error ?? "PROJECT_CREATE_FAILED" }));
  process.exit(1);
}

const envKeys = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ASKREVIEW_ISOLATED_PREVIEW: "1",
};

const envOk = {};
for (const [key, value] of Object.entries(envKeys)) {
  envOk[key] = value ? await upsertEnv(project.id, key, value) : false;
}

await api(`/v9/projects/${encodeURIComponent(project.id)}`, {
  method: "PATCH",
  body: JSON.stringify({ autoAssignCustomDomains: false }),
}).catch(() => null);

const stripeCopied = false;
const hadVercelLink = existsSync(".vercel");
const deploy = spawnSync(
  "npx",
  ["vercel@latest", "deploy", "--yes", `--name=${PROJECT}`, `--token=${token}`, `--scope=${team}`],
  { encoding: "utf8", shell: true, env: { ...process.env, VERCEL_ORG_ID: team, VERCEL_PROJECT_ID: project.id } },
);

if (!hadVercelLink && existsSync(".vercel")) {
  rmSync(".vercel", { recursive: true, force: true });
}

const urlMatch = (deploy.stdout || "").match(/https:\/\/[a-z0-9-]+\.vercel\.app/gi) ?? [];
const previewUrl = urlMatch.find((row) => row.includes("askreview") || row.includes(PROJECT)) ?? urlMatch[urlMatch.length - 1] ?? null;

const report = {
  ok: deploy.status === 0 && Boolean(previewUrl),
  projectId: project.id,
  projectName: PROJECT,
  projectCreated: project.created,
  envOk,
  stripeCopied,
  occupancynpvAliasTouched: false,
  domainBound: false,
  publicLaunch: false,
  incrementalCost: "UNKNOWN_EXISTING_TEAM",
  previewUrl,
  deployStatus: deploy.status,
  stdoutTail: (deploy.stdout || "").slice(-2500),
  stderrTail: (deploy.stderr || "").slice(-1500),
};

mkdirSync(".infinity/askreview", { recursive: true });
writeFileSync(".infinity/askreview/preview-deploy.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  ...report,
  stdoutTail: report.stdoutTail.replaceAll(token, "[REDACTED_VERCEL]"),
  stderrTail: report.stderrTail.replaceAll(token, "[REDACTED_VERCEL]"),
}, null, 2));
process.exit(report.ok ? 0 : 1);
