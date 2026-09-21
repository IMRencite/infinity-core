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
delete process.env.INFINITY_RUNTIME_TYPECHECK_ONLY;

const result = spawnSync("node", ["scripts/infinity-runtime-isolated-deploy.mjs"], {
  cwd: "C:/Users/Antivist/Desktop/Infinity/infinity-core-v7-f8e5448",
  env: process.env,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");
process.exit(result.status ?? 1);
