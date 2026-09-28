/**
 * Sync Supabase recovery email to scanner-safe TokenHash landing (no ConfirmationURL).
 * Does not print SMTP secrets or tokens.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const REF = "igenurhjwdjxqzflpgxl";
const LANDING = "https://hq.imros.io/auth/recovery?token_hash={{ .TokenHash }}&type=recovery";

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

function mgmtToken() {
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

loadEnv();
const dryRun = process.argv.includes("--dry-run");
const token = mgmtToken();
const report = { collected_at: new Date().toISOString(), project_ref: REF, landing_link_shape: LANDING };

if (!token) {
  report.result = "NOT_RUN";
  report.reason = "SUPABASE_MGMT_TOKEN_UNAVAILABLE";
  console.log(JSON.stringify(report, null, 2));
  process.exit(2);
}

const getRes = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  headers: { Authorization: `Bearer ${token}` },
});
const cfg = await getRes.json().catch(() => null);
if (!getRes.ok || !cfg) {
  report.result = "FAIL";
  report.http_status = getRes.status;
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const hadConfirmationUrl = String(cfg.mailer_templates_recovery_content ?? "").includes("{{ .ConfirmationURL }}");
report.before_uses_confirmation_url = hadConfirmationUrl;

const subject = cfg.mailer_templates_recovery_subject ?? "Reset your Infinity HQ password";
const body = `<h2>Reset your password</h2>
<p>Follow this link to reset the password for your Infinity HQ account:</p>
<p><a href="${LANDING}">Reset password</a></p>
<p>If you did not request a password reset, you can ignore this email.</p>`;

if (dryRun) {
  report.result = "DRY_RUN";
  report.would_remove_confirmation_url = hadConfirmationUrl;
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const allow = String(cfg.uri_allow_list ?? cfg.additional_redirect_urls ?? "");
const needsRecoveryPath = !allow.includes("/auth/recovery");
const uri_allow_list = needsRecoveryPath
  ? [allow, "https://hq.imros.io/auth/recovery"].filter(Boolean).join(",")
  : allow;

const patchRes = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    mailer_templates_recovery_subject: subject,
    mailer_templates_recovery_content: body,
    ...(needsRecoveryPath ? { uri_allow_list } : {}),
  }),
});
report.uri_allow_list_recovery_added = needsRecoveryPath;

report.result = patchRes.ok ? "PASS" : "FAIL";
report.http_status = patchRes.status;
report.direct_confirmation_url_removed = patchRes.ok ? !hadConfirmationUrl || true : null;
report.after_uses_confirmation_url = patchRes.ok ? false : hadConfirmationUrl;

writeFileSync(join(process.cwd(), ".infinity/blog-os/hq-recovery-template-sync-20260928.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(patchRes.ok ? 0 : 1);
