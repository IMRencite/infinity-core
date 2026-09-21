import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const file = "supabase/migrations/20260920230000_communication_recovery_release_v8.sql";
const sql = readFileSync(file, "utf8");
const forbidden = [/\bDROP TABLE\b/i, /\bTRUNCATE\b/i, /\bDELETE FROM\b/i, /\bDROP CONSTRAINT\b/i];
const hit = forbidden.find((rule) => rule.test(sql));
if (hit) {
  console.log(JSON.stringify({ applied: false, reason: "DESTRUCTIVE", pattern: String(hit) }));
  process.exit(1);
}

const result = spawnSync("npx", ["supabase@latest", "db", "query", "--linked", "-f", file], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  shell: true,
});

console.log(JSON.stringify({
  applied: result.status === 0,
  status: result.status,
  stdout: (result.stdout || "").slice(0, 4000),
  stderr: (result.stderr || "").slice(0, 4000),
  schema_version_required: "communication-recovery-release-v8",
  file,
}, null, 2));
process.exit(result.status ?? 1);
