import { createHash } from "node:crypto";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
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

function fingerprint(value) {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function safeError(input) {
  if (!input || typeof input !== "object") return { text: String(input ?? "") };
  const row = input;
  return {
    error: row.error ?? row.code ?? null,
    error_description: row.error_description ?? row.message ?? null,
    status: row.status ?? null,
  };
}

loadEnv();
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const HQ = "prj_AVa1EK79vagoOB8PEtzWAQZTX0xI";
const RUNTIME = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
const KNOWN_MESSAGE_ID = "1a0be7a9feee5375";
const LOCAL_REVOKED_CLIENT_FP = "fc119022f217";
const LOCAL_REVOKED_TOKEN_FP = "ec7f90693f6c";

if (!token || !team) {
  console.log(JSON.stringify({ ok: false, reason: "VERCEL_TOKEN_OR_TEAM_MISSING" }));
  process.exit(1);
}

async function vercel(path, init = {}) {
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
}

function summarizeDeploy(row) {
  if (!row) return null;
  return {
    id: row.uid || row.id || null,
    name: row.name || null,
    url: row.url || null,
    state: row.readyState || row.state || null,
    target: row.target || null,
    created: row.created ? new Date(row.created).toISOString() : (row.createdAt ? new Date(row.createdAt).toISOString() : null),
    source: row.meta?.githubCommitSha || row.meta?.gitCommitSha || row.gitSource?.sha || null,
    inspectorUrl: row.inspectorUrl || null,
  };
}

async function inspectProject(projectId, domainPattern) {
  const project = await vercel(`/v9/projects/${projectId}`);
  const aliases = await vercel(`/v2/aliases?projectId=${projectId}&limit=30`);
  const deployments = await vercel(`/v6/deployments?projectId=${projectId}&limit=25`);
  const prodDeployments = await vercel(`/v6/deployments?projectId=${projectId}&limit=15&target=production`);
  const rows = deployments.json?.deployments || [];
  const prodRows = prodDeployments.json?.deployments || [];
  const aliasRows = aliases.json?.aliases || [];
  const domainAlias = aliasRows.find((row) => domainPattern.test(row.alias || row.domain || "")) || null;
  const latest = rows[0] || null;
  const latestProdAttempt = prodRows[0] || rows.find((row) => row.target === "production") || null;
  const latestReadyProd = prodRows.find((row) => (row.readyState || row.state) === "READY")
    || rows.find((row) => (row.readyState || row.state) === "READY" && row.target === "production")
    || null;
  const failedProd = prodRows
    .filter((row) => ["ERROR", "CANCELED", "FAILED"].includes(row.readyState || row.state || ""))
    .slice(0, 8)
    .map(summarizeDeploy);
  const productionTarget = project.json?.targets?.production || null;
  const cronTries = {};
  for (const path of [
    `/v1/projects/${projectId}/crons`,
    `/v9/projects/${projectId}/crons`,
    `/v1/integrations/cron-jobs?projectId=${projectId}`,
    `/v1/crons?projectId=${projectId}`,
  ]) {
    cronTries[path] = await vercel(path);
  }
  const inspectIds = [
    latestProdAttempt?.uid,
    latestReadyProd?.uid,
    productionTarget?.id || productionTarget?.uid,
    domainAlias?.deploymentId,
  ].filter(Boolean);
  const unique = [...new Set(inspectIds)];
  const inspected = [];
  for (const id of unique) {
    const files = await vercel(`/v6/deployments/${id}/files`);
    const detail = await vercel(`/v13/deployments/${id}`);
    const blob = JSON.stringify(files.json ?? {});
    inspected.push({
      id,
      state: detail.json?.readyState || detail.json?.status || null,
      target: detail.json?.target || null,
      url: detail.json?.url || null,
      created: detail.json?.createdAt ? new Date(detail.json.createdAt).toISOString() : null,
      gitSha: detail.json?.meta?.githubCommitSha || detail.json?.gitSource?.sha || detail.json?.source?.sha || null,
      gitDirty: detail.json?.gitSource || detail.json?.meta || null,
      files_status: files.status,
      organic_tick: blob.includes("organic-tick") ? "YES" : (files.ok ? "NO" : "NOT_PROVEN"),
      communication_tick: blob.includes("communication-tick") ? "YES" : (files.ok ? "NO" : "NOT_PROVEN"),
      qc_v3: blob.includes("blog-render-qc-v3") ? "YES" : (files.ok ? "NO" : "NOT_PROVEN"),
      durable_blog: blob.includes("blog-os/durable") ? "YES" : (files.ok ? "NO" : "NOT_PROVEN"),
      autoAssignCustomDomains: undefined,
    });
  }
  return {
    project: {
      id: projectId,
      name: project.json?.name || null,
      framework: project.json?.framework || null,
      autoAssignCustomDomains: project.json?.autoAssignCustomDomains ?? null,
      ssoProtection: project.json?.ssoProtection ?? null,
      productionTarget: productionTarget ? {
        id: productionTarget.id || productionTarget.uid || null,
        url: productionTarget.url || null,
        alias: productionTarget.alias || null,
      } : null,
    },
    domain_alias: domainAlias ? {
      alias: domainAlias.alias || domainAlias.domain || null,
      deploymentId: domainAlias.deploymentId || null,
    } : null,
    latest_any: summarizeDeploy(latest),
    latest_production_attempt: summarizeDeploy(latestProdAttempt),
    latest_ready_production: summarizeDeploy(latestReadyProd),
    failed_production_attempts: failedProd,
    cron_api: Object.fromEntries(Object.entries(cronTries).map(([path, res]) => [path, {
      status: res.status,
      ok: res.ok,
      keys: res.json && typeof res.json === "object" ? Object.keys(res.json).slice(0, 12) : [],
      count: Array.isArray(res.json?.crons) ? res.json.crons.length : (Array.isArray(res.json) ? res.json.length : null),
      sample: Array.isArray(res.json?.crons) ? res.json.crons.slice(0, 8) : (Array.isArray(res.json) ? res.json.slice(0, 3) : null),
    }])),
    inspected,
    aliases: aliasRows.slice(0, 12).map((row) => ({
      alias: row.alias || row.domain || null,
      deploymentId: row.deploymentId || null,
    })),
  };
}

async function decryptEnv(projectId, key) {
  const listed = await vercel(`/v9/projects/${projectId}/env`);
  const envs = Array.isArray(listed.json?.envs) ? listed.json.envs : [];
  const matches = envs.filter((row) => row.key === key);
  const out = [];
  for (const row of matches) {
    const decrypted = await vercel(`/v9/projects/${projectId}/env/${row.id}?decrypt=true`);
    const value = typeof decrypted.json?.value === "string" ? decrypted.json.value : null;
    out.push({
      id: row.id,
      target: row.target || [],
      present: Boolean(value),
      fingerprint: fingerprint(value),
      value,
      decrypt_status: decrypted.status,
    });
  }
  return { list_status: listed.status, rows: out };
}

const hq = await inspectProject(HQ, /hq\.imros\.io/);
const runtime = await inspectProject(RUNTIME, /infinity-runtime\.vercel\.app|imros/);

const gmailKeys = [
  "GMAIL_OAUTH_CLIENT_ID",
  "GMAIL_OAUTH_CLIENT_SECRET",
  "GMAIL_OAUTH_REFRESH_TOKEN",
  "GMAIL_SENDER_EMAIL",
];
const productionGmail = {};
const productionValues = {};
for (const key of gmailKeys) {
  const decrypted = await decryptEnv(RUNTIME, key);
  const production = decrypted.rows.find((row) => (row.target || []).includes("production")) || decrypted.rows[0] || null;
  productionGmail[key] = {
    list_status: decrypted.list_status,
    present: Boolean(production?.present),
    fingerprint: production?.fingerprint ?? null,
    decrypt_status: production?.decrypt_status ?? null,
    targets: decrypted.rows.map((row) => ({ target: row.target, fingerprint: row.fingerprint, present: row.present })),
  };
  if (production?.value) productionValues[key] = production.value;
}

const localTokenFp = fingerprint(process.env.GMAIL_OAUTH_REFRESH_TOKEN);
const localClientFp = fingerprint(process.env.GMAIL_OAUTH_CLIENT_ID);
const productionTokenFp = productionGmail.GMAIL_OAUTH_REFRESH_TOKEN.fingerprint;
const productionClientFp = productionGmail.GMAIL_OAUTH_CLIENT_ID.fingerprint;
const usedLocalRevoked = localTokenFp === LOCAL_REVOKED_TOKEN_FP || localClientFp === LOCAL_REVOKED_CLIENT_FP;
const usedProduction = Boolean(productionValues.GMAIL_OAUTH_REFRESH_TOKEN && productionValues.GMAIL_OAUTH_CLIENT_ID && productionValues.GMAIL_OAUTH_CLIENT_SECRET);

let gmail = { used: "NONE", note: "Production credential not decryptable" };
if (usedProduction) {
  const clientId = productionValues.GMAIL_OAUTH_CLIENT_ID;
  const clientSecret = productionValues.GMAIL_OAUTH_CLIENT_SECRET;
  const refreshToken = productionValues.GMAIL_OAUTH_REFRESH_TOKEN;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  const accessToken = typeof tokenJson.access_token === "string" ? tokenJson.access_token : "";
  let scopes = typeof tokenJson.scope === "string" ? tokenJson.scope.split(/\s+/).filter(Boolean) : [];
  if (accessToken) {
    const infoRes = await fetch("https://oauth2.googleapis.com/tokeninfo", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: accessToken }),
    });
    const infoJson = await infoRes.json().catch(() => ({}));
    if (typeof infoJson.scope === "string") {
      scopes = [...new Set([...scopes, ...infoJson.scope.split(/\s+/).filter(Boolean)])];
    }
  }
  async function gmailCall(label, path) {
    if (!accessToken) {
      return { label, ok: false, status: 0, error: safeError({ error: tokenJson.error, error_description: tokenJson.error_description }) };
    }
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json().catch(() => ({}));
    return {
      label,
      ok: res.ok,
      status: res.status,
      error: res.ok ? null : safeError(json),
      result_keys: json && typeof json === "object" ? Object.keys(json).slice(0, 12) : [],
      messages_count: Array.isArray(json.messages) ? json.messages.length : null,
      history_count: Array.isArray(json.history) ? json.history.length : null,
      emailAddress_present: Boolean(json.emailAddress),
      historyId_present: Boolean(json.historyId),
      id_present: Boolean(json.id),
    };
  }
  const timeQuery = `after:${Math.floor(new Date("2026-09-20T23:35:31.322Z").getTime() / 1000)}`;
  gmail = {
    used: "PRODUCTION_VERCEL_ENV",
    credential_fingerprint: productionTokenFp,
    client_fingerprint: productionClientFp,
    local_token_fingerprint: localTokenFp,
    local_is_revoked_forensic: usedLocalRevoked,
    local_matches_production: localTokenFp === productionTokenFp,
    token_exchange: tokenRes.ok && Boolean(accessToken) ? "PASS" : "FAIL",
    token_http_status: tokenRes.status,
    google_error: tokenJson.error ?? null,
    google_error_description: tokenJson.error_description ?? null,
    scopes,
    probes: [
      await gmailCall("users.getProfile", "users/me/profile"),
      await gmailCall("messages.get_known", `users/me/messages/${KNOWN_MESSAGE_ID}?format=metadata`),
      await gmailCall("messages.list_max1", "users/me/messages?maxResults=1"),
      await gmailCall("messages.list_label_INBOX", "users/me/messages?maxResults=1&labelIds=INBOX"),
      await gmailCall("messages.list_time_query", `users/me/messages?maxResults=5&q=${encodeURIComponent(timeQuery)}`),
      await gmailCall("history.list", "users/me/history?startHistoryId=1&maxResults=1"),
    ],
  };
}

const sourceCrons = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")).crons;
const now = new Date().toISOString();
const cutoff = "2026-09-21T16:00:00.000Z";
const sep21Due = "2026-09-22T03:59:59.000Z";

const out = {
  collected_at: now,
  now_utc: now,
  sep21_due: sep21Due,
  sep21_decision_cutoff: cutoff,
  cutoff_passed: now >= cutoff,
  hq,
  runtime,
  source_crons: sourceCrons,
  gmail_production: {
    ...gmail,
    env_presence: productionGmail,
  },
  note: "Local revoked forensic token is not used as Production Gmail evidence.",
};

mkdirSync(join(process.cwd(), ".infinity/blog-os"), { recursive: true });
writeFileSync(join(process.cwd(), ".infinity/blog-os/v12-production-truth.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
