import { existsSync, readFileSync, writeFile } from "node:fs";
import { writeFile as writeFileAsync } from "node:fs/promises";
import { join } from "node:path";

function loadEnvLocal(): void {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep);
    if (process.env[key] == null) process.env[key] = trimmed.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvLocal();
const token = process.env.VERCEL_TOKEN;
const teamId = process.env.VERCEL_TEAM_ID;
if (!token) throw new Error("VERCEL_TOKEN missing");
const project = "infinity-validation-cre-lease-npv-e72beb7b";
const query = new URLSearchParams({ projectId: project, limit: "8" });
if (teamId) query.set("teamId", teamId);
const res = await fetch(`https://api.vercel.com/v6/deployments?${query}`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!res.ok) throw new Error(`vercel_list_failed:${res.status}`);
const body = (await res.json()) as {
  deployments?: Array<{ uid?: string; url?: string; readyState?: string; created?: number; createdAt?: number; name?: string }>;
};
const rows = (body.deployments ?? []).map((item) => ({
  id: item.uid ?? null,
  url: item.url ? `https://${item.url}` : null,
  state: item.readyState ?? null,
  created: item.createdAt ?? item.created ?? null,
  name: item.name ?? null,
}));
const latest = rows[0] ?? null;
const slim = { project, latest, recent: rows };
await writeFileAsync(".infinity/homepage-hero-deployment-recovery.json", `${JSON.stringify(slim, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(slim, null, 2)}\n`);
