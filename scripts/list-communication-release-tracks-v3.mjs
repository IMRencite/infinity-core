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
if (!token || !team) {
  console.log(JSON.stringify({ ok: false, reason: "VERCEL_TOKEN_OR_TEAM_MISSING" }));
  process.exit(1);
}

function classify(row) {
  const ready = row.readyState || row.state || "UNKNOWN";
  const error = Boolean(row.errorMessage || row.errorCode);
  if (ready === "CANCELED" || ready === "CANCELLED") return "CANCELLED";
  if (ready === "ERROR" || error) return "BUILD_FAILED";
  if (ready === "READY" && row.target === "production") return "PROMOTED";
  if (ready === "READY") return "READY_NOT_PROMOTED";
  return ready || "UNKNOWN";
}

async function listProject(projectId, name) {
  const res = await fetch(`https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=20&teamId=${encodeURIComponent(team)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return {
    project: name,
    projectId,
    ok: res.ok,
    deployments: (json.deployments || []).map((row) => ({
      id: row.uid || row.id,
      created_at: row.created ? new Date(row.created).toISOString() : null,
      build_status: row.readyState || row.state || "UNKNOWN",
      ready_status: row.readyState || "UNKNOWN",
      promotion_status: classify(row),
      aliases: row.aliases || [],
      source: row.source || null,
      release_sha: row.meta?.githubCommitSha || row.meta?.gitCommitSha || null,
      target: row.target || null,
      url: row.url || null,
      build_error: row.errorMessage || row.errorCode || null,
    })),
  };
}

const runtime = await listProject("prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox", "infinity-runtime");
const hq = await listProject("prj_AVa1EK79vagoOB8PEtzWAQZTX0xI", "infinity-hq");
console.log(JSON.stringify({ ok: runtime.ok && hq.ok, runtime, hq }, null, 2));
