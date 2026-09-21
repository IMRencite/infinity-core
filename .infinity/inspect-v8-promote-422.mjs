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
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const project = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
const id = "dpl_wwjX883fGKaDmQduWnNSuPtkU7so";
const res = await fetch(`https://api.vercel.com/v10/projects/${project}/promote/${id}?teamId=${encodeURIComponent(team)}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
});
const json = await res.json().catch(() => null);
const inspect = await fetch(`https://api.vercel.com/v13/deployments/${id}?teamId=${encodeURIComponent(team)}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const dpl = await inspect.json().catch(() => null);
console.log(JSON.stringify({
  promote_status: res.status,
  promote_error: json,
  candidate: {
    id: dpl?.id,
    target: dpl?.target ?? null,
    readyState: dpl?.readyState,
    readySubstate: dpl?.readySubstate,
    source: dpl?.source,
    gitSource: dpl?.gitSource ?? null,
    buildingAt: dpl?.buildingAt,
    meta: dpl?.meta ?? null,
  },
}, null, 2));
