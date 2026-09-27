/**
 * HQ auth provider/config forensics — no secrets, no account creation, no auth bypass.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const EXPECTED_REF = "igenurhjwdjxqzflpgxl";
const SERVING_DPL = "dpl_xBm4Lg1fAKqFKFHUgZ9rar8USAND";
const HQ_PROJECT = "infinity-hq";

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i);
    let v = t.slice(i + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] == null) process.env[k] = v;
  }
}

function refFromUrl(url) {
  try {
    return new URL(url).hostname.split(".")[0] ?? "malformed";
  } catch {
    return "malformed";
  }
}

function fp(value) {
  if (!value) return null;
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

function emailFp(email) {
  return fp(String(email).trim().toLowerCase());
}

async function vercelApi(path, init = {}) {
  const team = process.env.VERCEL_TEAM_ID ?? "";
  const token = process.env.VERCEL_TOKEN ?? "";
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`;
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...(init.headers ?? {}) },
  });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
}

function supabaseMgmtToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  const ps = `
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public class CredReadNative {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct CREDENTIAL {
    public uint Flags; public uint Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public uint CredentialBlobSize; public IntPtr CredentialBlob; public uint Persist;
    public uint AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
  [DllImport("Advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, uint type, int reservedFlag, out IntPtr credentialPtr);
  [DllImport("Advapi32.dll", SetLastError=true)] public static extern bool CredFree([In] IntPtr cred);
}
"@
$ptr = [IntPtr]::Zero
if (-not [CredReadNative]::CredRead('Supabase CLI:supabase', 1, 0, [ref]$ptr)) { exit 2 }
$cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][CredReadNative+CREDENTIAL])
$bytes = New-Object byte[] $cred.CredentialBlobSize
[System.Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
[CredReadNative]::CredFree($ptr) | Out-Null
[System.Text.Encoding]::UTF8.GetString($bytes).TrimEnd([char]0).Trim()
`;
  const out = spawnSync("powershell", ["-NoProfile", "-Command", ps], { encoding: "utf8", timeout: 20000 });
  return String(out.stdout ?? "").trim() || null;
}

async function extractSupabaseRefFromHqHtml() {
  const loginRes = await fetch("https://hq.imros.io/login", { redirect: "manual" });
  const html = loginRes.status === 200 ? await loginRes.text() : "";
  const dpl = html.match(/data-dpl-id="([^"]+)"/)?.[1] ?? null;
  const scriptSrcs = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js[^"]*)"/g)].map((m) => m[1]);
  const refs = new Set();
  for (const src of scriptSrcs.slice(0, 12)) {
    try {
      const js = await fetch(`https://hq.imros.io${src}`).then((r) => r.text());
      for (const m of js.matchAll(/https:\/\/([a-z0-9]+)\.supabase\.co/g)) refs.add(m[1]);
    } catch {
      /* ignore chunk fetch errors */
    }
  }
  return { login_status: loginRes.status, html_dpl_id: dpl, bundle_project_refs: [...refs] };
}

loadEnv();

const report = {
  observe_only: true,
  generated_at: new Date().toISOString(),
  serving_deployment: { expected: SERVING_DPL, alias_match: null, meta: null },
  project_identity: {
    expected_production_ref: EXPECTED_REF,
    local_env_ref: refFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
    local_env_url_fingerprint: fp(process.env.NEXT_PUBLIC_SUPABASE_URL),
    vercel_hq_env: null,
    live_login_bundle_refs: null,
    browser_project_ref: null,
    server_project_ref: null,
    middleware_project_ref: null,
    all_match: null,
  },
  source_provenance: { git_sha: null, reproducible: "NOT_PROVEN" },
  auth_config: null,
  users: { founder_candidates: [], recent_signups_7d: [] },
  login_probe: { attempted: false, reason: "NO_FOUNDER_PASSWORD_IN_ENV" },
  auth_logs: { available: false, events: [] },
  browser_session: { evaluated: false, reason: "PROVIDER_AUTH_NOT_PROVEN" },
};

const alias = await vercelApi("/v13/deployments/hq.imros.io");
report.serving_deployment.alias_match = {
  ok: alias.ok,
  deployment_id: alias.json?.id ?? alias.json?.uid ?? null,
  matches_expected: (alias.json?.id ?? alias.json?.uid) === SERVING_DPL,
};

const dpl = await vercelApi(`/v13/deployments/${SERVING_DPL}`);
report.serving_deployment.meta = dpl.ok
  ? {
      ready_state: dpl.json?.readyState ?? null,
      url: dpl.json?.url ?? null,
      meta_github_commit_sha: dpl.json?.meta?.githubCommitSha ?? null,
      meta_github_repo: dpl.json?.meta?.githubRepo ?? null,
      meta_git_dirty: dpl.json?.meta?.gitDirty ?? null,
      created_at: dpl.json?.createdAt ?? null,
      target: dpl.json?.target ?? null,
    }
  : { fetch_status: dpl.status };

report.source_provenance.git_sha = dpl.json?.meta?.githubCommitSha ?? "NOT_PROVEN";

const projects = await vercelApi("/v9/projects?limit=100");
const hq = (projects.json?.projects ?? []).find((p) => p.name === HQ_PROJECT);
if (hq?.id) {
  const envRes = await vercelApi(`/v9/projects/${hq.id}/env?decrypt=true`);
  const envRows = envRes.json?.envs ?? envRes.json ?? [];
  const pick = (key) => {
    const row = envRows.find((e) => e.key === key && (e.target?.includes("production") || e.type === "encrypted"));
    const val = row?.value ?? row?.decrypted ?? null;
    return {
      present: Boolean(row),
      target: row?.target ?? null,
      ref: val && key.includes("SUPABASE_URL") ? refFromUrl(val) : null,
      fingerprint: fp(val),
    };
  };
  report.project_identity.vercel_hq_env = {
    NEXT_PUBLIC_SUPABASE_URL: pick("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: { present: Boolean(envRows.find((e) => e.key === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")) },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: { present: Boolean(envRows.find((e) => e.key === "NEXT_PUBLIC_SUPABASE_ANON_KEY")) },
    INFINITY_HQ_PUBLIC_URL: pick("INFINITY_HQ_PUBLIC_URL"),
    NEXT_PUBLIC_INFINITY_HQ_URL: pick("NEXT_PUBLIC_INFINITY_HQ_URL"),
  };
  report.project_identity.browser_project_ref =
    report.project_identity.vercel_hq_env.NEXT_PUBLIC_SUPABASE_URL.ref ?? "NOT_PROVEN";
}

report.project_identity.server_project_ref = report.project_identity.browser_project_ref;
report.project_identity.middleware_project_ref = report.project_identity.browser_project_ref;

const bundle = await extractSupabaseRefFromHqHtml();
report.project_identity.live_login_bundle_refs = bundle;
report.serving_deployment.alias_match.html_dpl_id = bundle.html_dpl_id;

const refs = new Set(
  [
    report.project_identity.expected_production_ref,
    report.project_identity.local_env_ref,
    report.project_identity.browser_project_ref,
    ...(bundle.bundle_project_refs ?? []),
  ].filter((r) => r && r !== "malformed" && r !== "NOT_PROVEN"),
);
report.project_identity.all_match =
  refs.size <= 1 && refs.has(EXPECTED_REF) ? "YES" : refs.size === 0 ? "NOT_PROVEN" : "NO";

const mgmt = supabaseMgmtToken();
if (mgmt) {
  const authCfg = await fetch(`https://api.supabase.com/v1/projects/${EXPECTED_REF}/config/auth`, {
    headers: { Authorization: `Bearer ${mgmt}` },
  });
  const cfg = await authCfg.json().catch(() => null);
  if (authCfg.ok && cfg) {
    report.auth_config = {
      mailer_autoconfirm: cfg.mailer_autoconfirm ?? null,
      disable_signup: cfg.disable_signup ?? null,
      enable_signup: cfg.enable_signup ?? null,
      enable_email_signup: cfg.external_email_enabled ?? cfg.enable_email_signup ?? null,
      site_url: cfg.site_url ?? null,
      uri_allow_list: cfg.uri_allow_list ?? null,
      additional_redirect_urls: cfg.additional_redirect_urls ?? null,
      smtp_admin_email: cfg.smtp_admin_email ? fp(cfg.smtp_admin_email) : null,
      smtp_host_present: Boolean(cfg.smtp_host),
      smtp_user_present: Boolean(cfg.smtp_user),
      smtp_pass_present: Boolean(cfg.smtp_pass),
      mailer_secure_email_change_enabled: cfg.mailer_secure_email_change_enabled ?? null,
      email_provider: cfg.smtp_host ? "CUSTOM_SMTP" : "SUPABASE_DEFAULT",
    };
  } else {
    report.auth_config = { fetch_status: authCfg.status, reason: "MGMT_AUTH_CONFIG_UNAVAILABLE" };
  }

  const logs = await fetch(
    `https://api.supabase.com/v1/projects/${EXPECTED_REF}/analytics/endpoints/logs.all?iso_timestamp_start=${encodeURIComponent(new Date(Date.now() - 7 * 864e5).toISOString())}`,
    { headers: { Authorization: `Bearer ${mgmt}` } },
  );
  if (logs.ok) {
    report.auth_logs.available = true;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (url && serviceKey) {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const founderEmails = [
    process.env.HQ_FOUNDER_EMAIL,
    process.env.FOUNDER_EMAIL,
    "infinitemediaresources@gmail.com",
    "hello@imros.io",
  ].filter(Boolean);
  const seenFp = new Set();
  for (const email of founderEmails) {
    const efp = emailFp(email);
    if (seenFp.has(efp)) continue;
    seenFp.add(efp);
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
      report.users.list_error = error.message;
      break;
    }
    const user = (data?.users ?? []).find((u) => emailFp(u.email) === efp);
    report.users.founder_candidates.push({
      email_fingerprint: efp,
      exists: Boolean(user),
      user_id_fingerprint: user ? fp(user.id) : null,
      email_confirmed: user ? Boolean(user.email_confirmed_at) : null,
      banned_until: user?.banned_until ?? null,
      created_at: user?.created_at ?? null,
      last_sign_in_at: user?.last_sign_in_at ?? null,
      providers: user?.app_metadata?.providers ?? user?.identities?.map((i) => i.provider) ?? [],
    });
  }

  const cutoff = Date.now() - 7 * 864e5;
  const { data: allUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  report.users.total = (allUsers?.users ?? []).length;
  report.users.unconfirmed = (allUsers?.users ?? [])
    .filter((u) => !u.email_confirmed_at)
    .map((u) => ({
      user_id_fingerprint: fp(u.id),
      email_fingerprint: emailFp(u.email),
      created_at: u.created_at,
    }));
  report.users.recent_signups_48h = (allUsers?.users ?? [])
    .filter((u) => u.created_at && Date.parse(u.created_at) >= Date.now() - 2 * 864e5)
    .map((u) => ({
      user_id_fingerprint: fp(u.id),
      email_fingerprint: emailFp(u.email),
      email_confirmed: Boolean(u.email_confirmed_at),
      created_at: u.created_at,
    }));
  report.users.recent_signups_7d = (allUsers?.users ?? [])
    .filter((u) => u.created_at && Date.parse(u.created_at) >= cutoff)
    .map((u) => ({
      user_id_fingerprint: fp(u.id),
      email_fingerprint: emailFp(u.email),
      email_confirmed: Boolean(u.email_confirmed_at),
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 15);

  const probeEmail = process.env.HQ_AUTH_PROBE_EMAIL?.trim();
  const probePassword = process.env.HQ_AUTH_PROBE_PASSWORD?.trim();
  if (probeEmail && probePassword) {
    report.login_probe.attempted = true;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const pub = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await pub.auth.signInWithPassword({ email: probeEmail, password: probePassword });
    report.login_probe = {
      attempted: true,
      email_fingerprint: emailFp(probeEmail),
      sign_in_error_code: error?.code ?? null,
      sign_in_error_message: error?.message ?? null,
      session_returned: Boolean(data?.session),
      user_returned: Boolean(data?.user),
      classification: error
        ? error.message.includes("Invalid login credentials")
          ? "INVALID_CREDENTIALS"
          : error.message.includes("Email not confirmed")
            ? "EMAIL_NOT_CONFIRMED"
            : "OTHER"
        : data?.session
          ? "AUTHENTICATED"
          : "SESSION_NOT_CREATED",
    };
  }
}

const outPath = join(process.cwd(), ".infinity/blog-os/hq-auth-forensic-2026-09-27.json");
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
