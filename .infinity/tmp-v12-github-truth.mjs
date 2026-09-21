import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.log(JSON.stringify({ ok: false, reason: "GITHUB_TOKEN_MISSING" }));
  process.exit(1);
}

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "infinity-v12-truth",
    },
  });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
}

const repo = await gh("/repos/IMRencite/infinity-core");
const envs = await gh("/repos/IMRencite/infinity-core/environments");
const branches = await gh("/repos/IMRencite/infinity-core/branches?per_page=100");
const workflows = await gh("/repos/IMRencite/infinity-core/actions/workflows");
const defaultBranch = repo.json?.default_branch || null;
const defaultWorkflows = await gh(`/repos/IMRencite/infinity-core/contents/.github/workflows?ref=${encodeURIComponent(defaultBranch || "main")}`);
const collabs = await gh("/repos/IMRencite/infinity-core/collaborators?affiliation=all");
const owner = await gh("/users/IMRencite");
const org = await gh("/orgs/IMRencite");

const out = {
  collected_at: new Date().toISOString(),
  repo: {
    full_name: repo.json?.full_name || null,
    private: repo.json?.private ?? null,
    visibility: repo.json?.visibility || null,
    default_branch: defaultBranch,
    permissions: repo.json?.permissions || null,
    status: repo.status,
  },
  owner: {
    type: owner.json?.type || org.json?.type || null,
    login: owner.json?.login || org.json?.login || null,
    status: owner.status === 200 ? owner.status : org.status,
  },
  environments: {
    status: envs.status,
    names: Array.isArray(envs.json?.environments) ? envs.json.environments.map((row) => row.name) : [],
    protection: Array.isArray(envs.json?.environments)
      ? envs.json.environments.map((row) => ({
        name: row.name,
        protection_rules: (row.protection_rules || []).map((rule) => ({
          type: rule.type,
          reviewer_count: Array.isArray(rule.reviewers) ? rule.reviewers.length : null,
        })),
      }))
      : [],
  },
  default_workflows: {
    status: defaultWorkflows.status,
    files: Array.isArray(defaultWorkflows.json) ? defaultWorkflows.json.map((row) => row.name) : [],
  },
  remote_workflows: {
    status: workflows.status,
    names: Array.isArray(workflows.json?.workflows) ? workflows.json.workflows.map((row) => ({ name: row.name, path: row.path, state: row.state })) : [],
  },
  branches: Array.isArray(branches.json) ? branches.json.map((row) => row.name) : { status: branches.status },
  collaborators: {
    status: collabs.status,
    logins: Array.isArray(collabs.json) ? collabs.json.map((row) => ({ login: row.login, role: row.role_name || row.permissions })) : [],
  },
};

writeFileSync(join(process.cwd(), ".infinity/blog-os/v12-github-truth.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
