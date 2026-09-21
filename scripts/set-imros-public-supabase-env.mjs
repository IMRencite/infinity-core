import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq < 1) continue;
  const key = line.slice(0, eq).trim();
  const value = line.slice(eq + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

const token = process.env.VERCEL_TOKEN;
const scope = process.env.VERCEL_TEAM_ID;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!token || !scope || !url || !publishable) {
  console.log(JSON.stringify({ ok: false, reason: "MISSING_ENV" }));
  process.exit(1);
}

function addEnv(name, value) {
  const file = join(tmpdir(), `imros-env-${name}.txt`);
  writeFileSync(file, value, "utf8");
  const result = spawnSync(
    "npx",
    ["vercel", "env", "add", name, "production", "--force", "--token", token, "--scope", scope],
    { encoding: "utf8", shell: true, input: `${value}\n`, cwd: join(process.cwd(), "..", "imros-public-deploy") },
  );
  try { unlinkSync(file); } catch { /* ignore */ }
  return { name, status: result.status, stderr: (result.stderr || "").slice(0, 500), stdout: (result.stdout || "").slice(0, 500) };
}

const results = [addEnv("NEXT_PUBLIC_SUPABASE_URL", url), addEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishable)];
console.log(JSON.stringify({ ok: results.every((row) => row.status === 0), results: results.map((row) => ({ name: row.name, status: row.status, stdout: row.stdout, stderr: row.stderr })) }, null, 2));
