import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const file = "supabase/migrations/20261014153000_autonomous_portfolio_durable_execution_v1.sql";
const sql = readFileSync(file, "utf8");
if (/\bDROP\b/i.test(sql) || /\bTRUNCATE\b/i.test(sql)) {
  console.log(JSON.stringify({ applied: false, reason: "DESTRUCTIVE_SQL_BLOCKED" }));
  process.exit(1);
}
const result = spawnSync("npx", ["supabase@latest", "db", "query", "--linked", "-f", file], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  shell: true,
});
const out = {
  AUTONOMOUS_PORTFOLIO_DURABLE_MIGRATION_QC: result.status === 0 ? "PASS" : "FAIL",
  applied: result.status === 0,
  status: result.status,
  file,
  migration_id: "20261014153000_autonomous_portfolio_durable_execution_v1",
  stdout_tail: (result.stdout || "").slice(-1200),
  stderr_tail: (result.stderr || "").slice(-1200),
};
console.log(JSON.stringify(out, null, 2));
process.exit(result.status === 0 ? 0 : 1);
