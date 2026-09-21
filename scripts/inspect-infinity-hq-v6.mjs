import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
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
const HQ = "prj_AVa1EK79vagoOB8PEtzWAQZTX0xI";

async function vercel(path) {
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
}

function hasRoute(filesJson) {
  const blob = JSON.stringify(filesJson ?? {});
  return blob.includes("organic-tick");
}

const project = await vercel(`/v9/projects/${HQ}`);
const aliases = await vercel(`/v2/aliases?projectId=${HQ}&limit=20`);
const deployments = await vercel(`/v6/deployments?projectId=${HQ}&limit=20`);
const rows = deployments.json?.deployments || [];
const latest = rows[0] || null;
const latestReadyProd = rows.find((row) => (row.readyState || row.state) === "READY" && row.target === "production") || null;
const latestProdAttempt = rows.find((row) => row.target === "production") || null;
const productionTarget = project.json?.targets?.production || null;
const domainAlias = (aliases.json?.aliases || []).find((row) => /hq\.imros\.io/.test(row.alias || row.domain || "")) || null;

async function inspectDeploy(id) {
  if (!id) return null;
  const files = await vercel(`/v6/deployments/${id}/files`);
  const detail = await vercel(`/v13/deployments/${id}`);
  return {
    id,
    state: detail.json?.readyState || detail.json?.status || null,
    target: detail.json?.target || null,
    url: detail.json?.url || null,
    created: detail.json?.createdAt ? new Date(detail.json.createdAt).toISOString() : null,
    route_present: hasRoute(files.json) ? "YES" : (files.ok ? "NO" : "NOT_PROVEN"),
    files_status: files.status,
    qc_version: JSON.stringify(files.json ?? {}).includes("blog-render-qc-v3") ? "blog-render-qc-v3" : "NOT_PROVEN",
    durable_present: JSON.stringify(files.json ?? {}).includes("blog-os/durable") ? "YES" : "NOT_PROVEN",
  };
}

const inspectIds = [
  latestProdAttempt?.uid,
  latestReadyProd?.uid,
  productionTarget?.id || productionTarget?.uid,
  domainAlias?.deploymentId,
].filter(Boolean);
const unique = [...new Set(inspectIds)];
const inspected = [];
for (const id of unique) inspected.push(await inspectDeploy(id));

const out = {
  collected_at: new Date().toISOString(),
  project: {
    id: HQ,
    name: project.json?.name,
    autoAssignCustomDomains: project.json?.autoAssignCustomDomains ?? project.json?.autoExposeSystemEnvs ?? null,
    ssoProtection: project.json?.ssoProtection ?? null,
    keys: project.json ? Object.keys(project.json).slice(0, 40) : [],
  },
  domain_alias: domainAlias,
  production_target: productionTarget,
  latest_production_attempt: latestProdAttempt ? { id: latestProdAttempt.uid, state: latestProdAttempt.readyState, created: new Date(latestProdAttempt.created).toISOString() } : null,
  latest_ready_production: latestReadyProd ? { id: latestReadyProd.uid, state: latestReadyProd.readyState, created: new Date(latestReadyProd.created).toISOString() } : null,
  latest_any: latest ? { id: latest.uid, state: latest.readyState, target: latest.target } : null,
  inspected,
  source_crons: JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")).crons,
};
mkdirSync(join(process.cwd(), ".infinity/blog-os"), { recursive: true });
writeFileSync(join(process.cwd(), ".infinity/blog-os/hq-runtime-v6.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
