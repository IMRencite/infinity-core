import { existsSync, readFileSync } from "node:fs";

function loadEnv() {
  const envPath = "c:/Users/Antivist/Desktop/Infinity/infinity-core/.env.local";
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
const project = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
const url = `https://api.vercel.com/v9/projects/${project}?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}`;
const before = await fetch(url, { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` } }).then((res) => res.json());
const patched = await fetch(url, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ autoAssignCustomDomains: false }),
});
const after = await patched.json().catch(() => null);
console.log(JSON.stringify({
  status: patched.status,
  before: before.autoAssignCustomDomains ?? null,
  after: after?.autoAssignCustomDomains ?? after?.error ?? null,
}, null, 2));
