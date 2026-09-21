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
const HQ = "prj_AVa1EK79vagoOB8PEtzWAQZTX0xI";
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const before = await fetch(`https://api.vercel.com/v9/projects/${HQ}?teamId=${encodeURIComponent(team)}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const beforeJson = await before.json();
const previous = beforeJson.autoAssignCustomDomains;
const patch = await fetch(`https://api.vercel.com/v9/projects/${HQ}?teamId=${encodeURIComponent(team)}`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ autoAssignCustomDomains: false }),
});
const afterJson = await patch.json().catch(() => ({}));
const out = {
  previous_setting: previous,
  new_setting: afterJson.autoAssignCustomDomains ?? null,
  changed_at: new Date().toISOString(),
  actor: "v14-recovery-agent",
  status: patch.status,
  ok: patch.ok,
};
writeFileSync(join(process.cwd(), ".infinity/blog-os/v14-autoassign.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
