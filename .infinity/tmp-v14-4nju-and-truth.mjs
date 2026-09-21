import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
const DPL = "dpl_4NJUPRcDm5KdpJoYgnP4Lqbz8Fty";
const DEST = join(process.env.USERPROFILE || "C:\\Users\\Antivist", "InfinityForensicV14");
mkdirSync(DEST, { recursive: true });

async function vercel(path) {
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
}

const project = await vercel(`/v9/projects/${HQ}`);
const detail = await vercel(`/v13/deployments/${DPL}`);
const files = await vercel(`/v6/deployments/${DPL}/files`);
const fileList = Array.isArray(files.json) ? files.json : (files.json?.files || files.json || []);

function flatten(nodes, prefix = "", out = []) {
  if (!Array.isArray(nodes)) return out;
  for (const node of nodes) {
    const name = node.name || node.path || "";
    const path = prefix ? `${prefix}/${name}` : name;
    out.push({
      path,
      type: node.type || null,
      uid: node.uid || node.id || null,
      mode: node.mode ?? null,
      size: node.size ?? node.length ?? null,
      digest: node.digest || node.hash || node.sha || node.checksum || null,
      children: Array.isArray(node.children) ? node.children.length : 0,
    });
    if (Array.isArray(node.children)) flatten(node.children, path, out);
  }
  return out;
}

const flattened = flatten(fileList);
const contentDir = join(DEST, "4nju-source");
mkdirSync(contentDir, { recursive: true });
let downloaded = 0;
let downloadDenied = 0;
let consecutiveDenied = 0;
const sampleKeys = flattened[0] ? Object.keys(flattened[0]) : [];

for (const row of flattened) {
  if (!row.uid || row.type === "directory") continue;
  const content = await vercel(`/v8/deployments/${DPL}/files/${row.uid}`);
  if (!content.ok) {
    downloadDenied += 1;
    row.content_status = content.status;
    consecutiveDenied += 1;
    if (consecutiveDenied >= 8 && downloaded === 0) break;
    continue;
  }
  const raw = typeof content.json === "string"
    ? content.json
    : (content.json?.data || content.json?.content || null);
  if (typeof raw === "string") {
    const rel = row.path.replace(/^[\\/]+/, "").replace(/[<>:"|?*]/g, "_");
    const dest = join(contentDir, rel);
    mkdirSync(join(dest, ".."), { recursive: true });
    writeFileSync(dest, raw);
    row.local_sha256 = createHash("sha256").update(raw).digest("hex");
    downloaded += 1;
    consecutiveDenied = 0;
  } else {
    row.content_status = content.status;
    row.content_keys = content.json && typeof content.json === "object" ? Object.keys(content.json).slice(0, 12) : [];
    downloadDenied += 1;
    consecutiveDenied += 1;
    if (consecutiveDenied >= 8 && downloaded === 0) break;
  }
}

const retention = {
  autoAssignCustomDomains: project.json?.autoAssignCustomDomains ?? null,
  deploymentExpiration: project.json?.deploymentExpiration ?? project.json?.retention ?? null,
  keys: project.json ? Object.keys(project.json).filter((key) => /retain|expir|protect|delet/i.test(key) || ["autoAssignCustomDomains", "ssoProtection", "targets"].includes(key)) : [],
  raw_retention_fields: {
    deploymentExpiration: project.json?.deploymentExpiration ?? null,
    passwordProtection: Boolean(project.json?.passwordProtection),
    ssoProtection: project.json?.ssoProtection ?? null,
  },
};

const manifest = {
  collected_at: new Date().toISOString(),
  deployment_id: DPL,
  files_status: files.status,
  detail_status: detail.status,
  git_sha: detail.json?.meta?.githubCommitSha || detail.json?.gitSource?.sha || null,
  git_dirty: detail.json?.meta?.gitDirty || null,
  actor: detail.json?.meta?.actor || null,
  bundler: detail.json?.meta?.bundler || null,
  created: detail.json?.createdAt ? new Date(detail.json.createdAt).toISOString() : null,
  ready_state: detail.json?.readyState || null,
  target: detail.json?.target || null,
  file_node_count: flattened.length,
  sample_node_keys: sampleKeys,
  downloaded_contents: downloaded,
  download_denied_or_unavailable: downloadDenied,
  files: flattened,
};

writeFileSync(join(DEST, "4nju-deployment-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(process.cwd(), ".infinity/blog-os/v14-4nju-manifest-summary.json"), `${JSON.stringify({
  collected_at: manifest.collected_at,
  deployment_id: DPL,
  files_status: files.status,
  file_node_count: flattened.length,
  downloaded_contents: downloaded,
  download_denied_or_unavailable: downloadDenied,
  git_sha: manifest.git_sha,
  git_dirty: manifest.git_dirty,
  sample_node_keys: sampleKeys,
  autoAssignCustomDomains: retention.autoAssignCustomDomains,
  retention: retention.raw_retention_fields,
  production_target: project.json?.targets?.production?.id || project.json?.targets?.production?.uid || null,
}, null, 2)}\n`);

console.log(JSON.stringify({
  collected_at: manifest.collected_at,
  files_status: files.status,
  file_node_count: flattened.length,
  downloaded_contents: downloaded,
  download_denied_or_unavailable: downloadDenied,
  git_sha: manifest.git_sha,
  git_dirty: manifest.git_dirty,
  sample_node_keys: sampleKeys,
  autoAssignCustomDomains: retention.autoAssignCustomDomains,
  production_target: project.json?.targets?.production?.id || null,
  retention: retention.raw_retention_fields,
}, null, 2));
