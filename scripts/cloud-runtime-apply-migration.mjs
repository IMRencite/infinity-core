/**
 * Apply ONLY the Cloud Runtime Productionization v1 migration.
 * Does not run supabase db push (would apply unrelated pending migrations).
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const file = "supabase/migrations/20260915120000_cloud_runtime_productionization_v1.sql";
const sql = readFileSync(file, "utf8");
const forbidden = [/\bDROP\b/i, /\bTRUNCATE\b/i, /\bopportunity_scanner_evidence\b/i, /\bDELETE FROM\b/i];
const hit = forbidden.find((rule) => rule.test(sql));
if (hit) {
  console.log(JSON.stringify({ applied: false, reason: "DESTRUCTIVE_OR_UNRELATED", pattern: String(hit) }));
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
  otherMigrationsApplied: 0,
  file,
}, null, 2));
process.exit(result.status ?? 1);
