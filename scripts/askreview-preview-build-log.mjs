import { readFileSync } from "node:fs";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
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
const id = process.argv[2] ?? "dpl_FJr9nS5WUScLovURQCdL2JupZKwB";
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const res = await fetch(`https://api.vercel.com/v3/deployments/${id}/events?teamId=${team}&limit=200`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await res.json();
const lines = (json ?? []).map((row) => row.payload?.text ?? row.text ?? JSON.stringify(row)).filter(Boolean);
const missing = lines.filter((line) => /Can't resolve|Module not found|Can't find|Did you mean/i.test(line));
console.log(JSON.stringify({ status: res.status, missing: missing.slice(0, 40), tail: lines.slice(-30) }, null, 2));
