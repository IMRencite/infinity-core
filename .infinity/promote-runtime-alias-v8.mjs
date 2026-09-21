import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const envPath = "c:/Users/Antivist/Desktop/Infinity/infinity-core/.env.local";
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

const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const candidate = "dpl_wwjX883fGKaDmQduWnNSuPtkU7so";
const result = spawnSync(
  "npx",
  ["vercel@latest", "alias", candidate, "infinity-runtime.vercel.app", `--token=${token}`, `--scope=${team}`],
  { encoding: "utf8", shell: true },
);
console.log(JSON.stringify({
  ok: result.status === 0,
  status: result.status,
  candidate,
  promoted_to: "infinity-runtime.vercel.app",
  stdout: (result.stdout || "").slice(0, 2000),
  stderr: (result.stderr || "").slice(0, 2000),
}, null, 2));
process.exit(result.status ?? 1);
