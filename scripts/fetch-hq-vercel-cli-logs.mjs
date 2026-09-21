import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const projectId = "prj_AVa1EK79vagoOB8PEtzWAQZTX0xI";
if (!token || !team) {
  console.error("missing vercel credentials");
  process.exit(1);
}

const commands = [
  [
    "logs",
    "--project",
    "infinity-hq",
    "--environment",
    "production",
    "--level",
    "error",
    "--since",
    "6h",
    "--json",
    "--no-follow",
    "--limit",
    "100",
  ],
  [
    "logs",
    "dpl_HizvEusPYZETPmp1yTpcjVHaSfgF",
    "--no-follow",
    "--since",
    "6h",
    "--json",
    "--limit",
    "80",
  ],
];

const results = [];
for (const args of commands) {
  const run = spawnSync(
    "npx",
    ["vercel@latest", ...args, `--token=${token}`, `--scope=${team}`],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: true,
      env: { ...process.env, VERCEL_ORG_ID: team, VERCEL_PROJECT_ID: projectId },
      timeout: 90000,
    },
  );
  const combined = `${run.stdout || ""}\n${run.stderr || ""}`
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]")
    .replace(/--token=[^\s]+/g, "--token=[redacted]");
  results.push({
    args: args.join(" "),
    status: run.status,
    output: combined.slice(0, 40000),
  });
}

const outDir = join(process.cwd(), ".infinity", "hq-production-deployment");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "vercel-cli-logs-1885360420.json"), JSON.stringify({ fetchedAt: new Date().toISOString(), results }, null, 2));
console.log(JSON.stringify({
  fetchedAt: new Date().toISOString(),
  results: results.map((row) => ({ args: row.args, status: row.status, preview: row.output.slice(0, 4000) })),
}, null, 2));
