import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const sep = trimmed.indexOf("=");
  if (sep === -1) continue;
  let val = trimmed.slice(sep + 1);
  const key = trimmed.slice(0, sep);
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  if (!process.env[key]) process.env[key] = val;
}

const project = "prj_vSCXLOYDoExYUAR8ypnYz2W1Lu7d";
const token = process.env.VERCEL_TOKEN;
const team = (process.env.VERCEL_TEAM_ID ?? "").trim();
const res = await fetch(`https://api.vercel.com/v9/projects/${project}/env${team ? `?teamId=${encodeURIComponent(team)}` : ""}`, {
  headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
});
const json = await res.json();
const envs = Array.isArray(json.envs) ? json.envs : [];
const wanted = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
console.log("env_http", res.status);
for (const key of wanted) {
  const rows = envs.filter((row) => row.key === key);
  console.log(key, rows.length ? `PRESENT targets=${rows.map((row) => (row.target ?? []).join("+")).join(",")}` : "MISSING");
}
console.log("other_public_keys", envs.filter((row) => String(row.key).startsWith("NEXT_PUBLIC_")).map((row) => row.key).join(",") || "NONE");
