import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const result = spawnSync(
  "npx",
  ["supabase@latest", "db", "query", "--linked", "-f", "scripts/askreview-schema-readback.sql"],
  { encoding: "utf8", shell: true },
);

const payload = {
  status: result.status,
  stdout: (result.stdout || "").slice(0, 20000),
  stderr: (result.stderr || "").slice(0, 2000),
};

mkdirSync(".infinity/askreview", { recursive: true });
writeFileSync(".infinity/askreview/schema-readback.json", `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload, null, 2));
process.exit(result.status ?? 1);
