/**
 * Founder HQ production deploy → infinity-hq + hq.imros.io
 * Does not deploy imros-public or infinity-runtime.
 * Does not print secret values.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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
    if (process.env[key] == null) process.env[key] = val;
  }
}

loadEnv();

const PROJECT = "infinity-hq";
const HOST = "hq.imros.io";
const ORIGIN = "https://hq.imros.io";
const PUBLIC_ORIGIN = "https://imros.io";
const RUNTIME = "https://infinity-runtime.vercel.app";
const FORBIDDEN_PROJECTS = new Set(["imros-public", "infinity-runtime", "infinity-validation-cre-lease-npv-e72beb7b"]);
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
if (!token || !team) {
  console.log(JSON.stringify({ ok: false, reason: "VERCEL_TOKEN_OR_TEAM_MISSING" }));
  process.exit(1);
}

const root = process.cwd();
const vercelApi = (path, init = {}) => fetch(`https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`, {
  ...init,
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(init.headers ?? {}),
  },
});

function present(value) {
  return Boolean(value && String(value).trim());
}

function fingerprint(value) {
  if (!value) return null;
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

async function json(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

const listed = await vercelApi("/v9/projects?limit=100");
const projects = ((await json(listed)).projects ?? []).map((row) => ({ id: row.id, name: row.name }));
const existingHq = projects.find((row) => row.name === PROJECT || (row.name ?? "").includes("infinity-hq") || (row.name ?? "") === "imros-hq");
if (existingHq && FORBIDDEN_PROJECTS.has(existingHq.name)) {
  console.log(JSON.stringify({ ok: false, reason: "HQ_PROJECT_COLLIDES_WITH_PUBLIC_OR_RUNTIME", name: existingHq.name }));
  process.exit(1);
}

let projectId = existingHq?.id ?? null;
let projectName = existingHq?.name ?? PROJECT;
if (!projectId) {
  const created = await vercelApi("/v10/projects", {
    method: "POST",
    body: JSON.stringify({ name: PROJECT, framework: "nextjs" }),
  });
  const body = await json(created);
  projectId = body.id ?? null;
  projectName = body.name ?? PROJECT;
  if (!projectId) {
    console.log(JSON.stringify({ ok: false, reason: "HQ_PROJECT_CREATE_FAILED", status: created.status, safe: body.error?.message ?? "UNKNOWN" }));
    process.exit(1);
  }
}

mkdirSync(join(root, ".vercel"), { recursive: true });
writeFileSync(join(root, ".vercel/project.json"), JSON.stringify({ projectId, orgId: team, projectName }, null, 2));

async function upsertEnv(key, value) {
  if (!present(value)) return { key, present: false, upserted: false };
  const listedEnv = await vercelApi(`/v9/projects/${encodeURIComponent(projectId)}/env`);
  const envJson = await json(listedEnv);
  const envs = Array.isArray(envJson.envs) ? envJson.envs : [];
  const existing = envs.find((row) => row.key === key);
  if (existing?.id) {
    const patched = await vercelApi(`/v9/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ value, type: key.startsWith("NEXT_PUBLIC_") ? "plain" : "encrypted", target: ["production"] }),
    });
    return { key, present: true, upserted: patched.ok || patched.status === 409 };
  }
  const created = await vercelApi(`/v10/projects/${encodeURIComponent(projectId)}/env`, {
    method: "POST",
    body: JSON.stringify({
      key,
      value,
      type: key.startsWith("NEXT_PUBLIC_") ? "plain" : "encrypted",
      target: ["production"],
    }),
  });
  return { key, present: true, upserted: created.ok || created.status === 409 };
}

const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const envPlan = [
  ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishable],
  ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
  ["INFINITY_RUNTIME_URL", RUNTIME],
  ["CRON_SECRET", process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET],
  ["INFINITY_RUNTIME_TICK_SECRET", process.env.INFINITY_RUNTIME_TICK_SECRET || process.env.CRON_SECRET],
  ["INFINITY_HQ_SURFACE", "1"],
  ["INFINITY_HQ_PUBLIC_URL", ORIGIN],
  ["NEXT_PUBLIC_INFINITY_HQ_URL", ORIGIN],
  ["FOUNDER_DAILY_REPORT_STORE", "postgres"],
  ["MERCURY_ENABLED", process.env.MERCURY_ENABLED],
  ["MERCURY_ENV", process.env.MERCURY_ENV],
  ["MERCURY_API_TOKEN", process.env.MERCURY_API_TOKEN],
  ["OPENAI_API_KEY", process.env.OPENAI_API_KEY],
];

const envResults = [];
for (const [key, value] of envPlan) {
  envResults.push(await upsertEnv(key, value));
}

const sql = readFileSync(join(root, "supabase/migrations/20260917120000_founder_daily_reports_v1.sql"), "utf8");
let schemaApplied = false;
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (dbUrl) {
  const psql = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8", shell: true });
  schemaApplied = psql.status === 0;
}
if (!schemaApplied && process.env.SUPABASE_ACCESS_TOKEN && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
  const applied = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  schemaApplied = applied.ok;
}

let migrated = 0;
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const dir = join(root, ".infinity", "founder-daily-reports");
  if (existsSync(dir)) {
    for (const name of readdirSync(dir).filter((row) => row.endsWith(".json"))) {
      const report = JSON.parse(readFileSync(join(dir, name), "utf8"));
      if (!report?.report_date) continue;
      const existing = await client.from("founder_daily_reports").select("report_id").eq("report_date", report.report_date).maybeSingle();
      if (existing.data?.report_id) continue;
      const { error } = await client.from("founder_daily_reports").upsert({
        report_date: report.report_date,
        report_id: report.report_id,
        status: report.status,
        version: report.version,
        generated_at: report.generated_at,
        updated_at: report.updated_at,
        payload: report,
      }, { onConflict: "report_date" });
      if (!error) migrated += 1;
    }
  }
}

const deploy = spawnSync(
  "npx",
  ["vercel@latest", "deploy", "--prod", "--yes", "--archive=tgz", `--token=${token}`, `--scope=${team}`, "--local-config", "vercel.hq.json"],
  {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, VERCEL_ORG_ID: team, VERCEL_PROJECT_ID: projectId },
  },
);
const combined = `${deploy.stdout || ""}\n${deploy.stderr || ""}`.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]");
mkdirSync(join(root, ".infinity", "hq-production-deployment"), { recursive: true });
writeFileSync(join(root, ".infinity", "hq-production-deployment", "vercel-deploy.log"), combined);

const inspect = await vercelApi(`/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=3`);
const latest = inspect.ok ? (await json(inspect)).deployments?.[0] : null;
const attached = await vercelApi(`/v10/projects/${encodeURIComponent(projectId)}/domains`, {
  method: "POST",
  body: JSON.stringify({ name: HOST }),
});
const attachedBody = await json(attached);
const domainState = await vercelApi(`/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(HOST)}`);
const domainJson = await json(domainState);
const config = await vercelApi(`/v6/domains/${encodeURIComponent(HOST)}/config`);
const configJson = await json(config);
const recommended = Array.isArray(configJson.recommendedCNAME) ? configJson.recommendedCNAME : [];
const cnameTarget = recommended[0]?.value || recommended[0] || "cname.vercel-dns.com";

let dns = { ok: false, mode: "DNS_ONLY", type: "CNAME", target: String(cnameTarget).replace(/\.$/, ""), unchanged: false };
if (process.env.CLOUDFLARE_API_TOKEN) {
  const zones = await fetch(`https://api.cloudflare.com/client/v4/zones?name=imros.io`, {
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, Accept: "application/json" },
  });
  const zoneJson = await json(zones);
  const zoneId = zoneJson.result?.[0]?.id;
  if (zoneId) {
    const records = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${HOST}`, {
      headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, Accept: "application/json" },
    });
    const recJson = await json(records);
    const existing = (recJson.result ?? []).find((row) => row.type === "CNAME" || row.type === "A");
    const body = { type: "CNAME", name: HOST, content: dns.target, proxied: false, ttl: 1 };
    const write = existing
      ? await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${existing.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      : await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    const writeJson = await json(write);
    dns = {
      ok: Boolean(writeJson.success),
      mode: writeJson.result?.proxied ? "PROXIED" : "DNS_ONLY",
      type: writeJson.result?.type ?? "CNAME",
      target: String(writeJson.result?.content ?? dns.target).replace(/\.$/, ""),
      unchanged: existing && existing.content === dns.target && existing.proxied === false,
    };
  }
}

async function probe(url) {
  try {
    const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "infinity-hq-production-probe" } });
    return {
      status: res.status,
      location: res.headers.get("location"),
      robots: res.headers.get("x-robots-tag"),
      cache: res.headers.get("cache-control"),
      csp: res.headers.get("content-security-policy"),
      xcto: res.headers.get("x-content-type-options"),
      referrer: res.headers.get("referrer-policy"),
      frame: res.headers.get("x-frame-options"),
    };
  } catch {
    return { status: 0 };
  }
}

const anonymous = {
  root: await probe(ORIGIN),
  dashboard: await probe(`${ORIGIN}/dashboard`),
  daily: await probe(`${ORIGIN}/dashboard/daily-reports`),
  api: await probe(`${ORIGIN}/api/operator-console/daily-report`),
  runtime: await probe(`${ORIGIN}/api/hq/production-runtime`),
  publicSite: await probe(PUBLIC_ORIGIN),
};

const proof = {
  ok: deploy.status === 0,
  project: projectName,
  projectId,
  deploymentId: latest?.uid ?? latest?.id ?? null,
  productionUrl: latest?.url ? `https://${latest.url}` : null,
  customDomain: HOST,
  domainAttached: attached.ok || attached.status === 409 || domainState.ok,
  domainVerified: domainJson.verified === true,
  dns,
  env: envResults.map((row) => ({ key: row.key, present: row.present, upserted: row.upserted })),
  schemaApplied,
  reportsMigrated: migrated,
  anonymous,
  secrets: {
    supabaseUrl: present(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabasePublishable: present(publishable),
    serviceRole: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
    cron: present(process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET),
    mercury: present(process.env.MERCURY_API_TOKEN),
    supabaseUrlFingerprint: fingerprint(process.env.NEXT_PUBLIC_SUPABASE_URL),
  },
  existingProjects: projects.map((row) => row.name),
  exit: deploy.status,
  logTail: combined.split(/\r?\n/).filter(Boolean).slice(-40),
};

writeFileSync(join(root, ".infinity", "hq-production-deployment", "proof.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify({
  ok: proof.ok,
  project: proof.project,
  projectId: proof.projectId,
  deploymentId: proof.deploymentId,
  domainAttached: proof.domainAttached,
  domainVerified: proof.domainVerified,
  dns: { ok: dns.ok, mode: dns.mode, type: dns.type, target: dns.target },
  schemaApplied,
  reportsMigrated: migrated,
  envPresent: envResults.filter((row) => row.present).length,
  envMissing: envResults.filter((row) => !row.present).map((row) => row.key),
  anonymousStatuses: Object.fromEntries(Object.entries(anonymous).map(([key, value]) => [key, value.status])),
  exit: deploy.status,
}, null, 2));
if (!proof.ok) process.exit(1);
