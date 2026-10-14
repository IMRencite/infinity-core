import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const sql = `
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'autonomous_portfolio_cycles',
    'autonomous_portfolio_jobs',
    'autonomous_runtime_scheduled_execution_ledger',
    'autonomous_venture_publication_registry',
    'autonomous_venture_deploy_telemetry'
  )
ORDER BY table_name;

SELECT c.column_name, c.data_type, c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'autonomous_portfolio_jobs'
ORDER BY c.ordinal_position;

SELECT tc.constraint_name, tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public' AND tc.table_name = 'autonomous_portfolio_jobs';

SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'autonomous_portfolio_jobs';
`;

import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const tmp = join(tmpdir(), "verify-portfolio-durable-schema.sql");
writeFileSync(tmp, sql);
const result = spawnSync("npx", ["supabase@latest", "db", "query", "--linked", "-f", tmp], {
  encoding: "utf8",
  shell: true,
});
try {
  unlinkSync(tmp);
} catch {
  /* ignore */
}
console.log(
  JSON.stringify(
    {
      ok: result.status === 0,
      stdout: result.stdout,
      stderr_tail: (result.stderr || "").slice(-400),
    },
    null,
    2,
  ),
);
