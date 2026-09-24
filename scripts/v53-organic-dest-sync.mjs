import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const dest = join(tmpdir(), "infinity-organic-isolated-v28");
const files = [
  "lib/infinity/organic-growth-engine/blog-os/durable/effective-execution-state.ts",
  "lib/infinity/organic-growth-engine/obligation/persist.ts",
  "lib/infinity/organic-growth-engine/obligation/scheduler.ts",
  "lib/infinity/organic-growth-engine/blog-os/durable/persist.ts",
  "app/api/runtime/organic-tick/route.ts",
];
const copied = [];
for (const file of files) {
  const from = join(process.cwd(), file);
  const to = join(dest, file);
  if (!existsSync(from)) {
    console.log(JSON.stringify({ ok: false, reason: "SOURCE_MISSING", file }));
    process.exit(1);
  }
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, readFileSync(from));
  copied.push(file);
}
const cron = JSON.parse(readFileSync(join(dest, "vercel.json"), "utf8"));
const persist = readFileSync(join(dest, "lib/infinity/organic-growth-engine/obligation/persist.ts"), "utf8");
const durable = readFileSync(join(dest, "lib/infinity/organic-growth-engine/blog-os/durable/persist.ts"), "utf8");
const route = readFileSync(join(dest, "app/api/runtime/organic-tick/route.ts"), "utf8");
const out = {
  dest,
  copied,
  cron_untouched: cron.crons?.[0]?.path === "/api/runtime/organic-tick" && cron.crons?.[0]?.schedule === "*/15 * * * *",
  live_canonical_read: /deriveEffectiveOrganicExecutionState/.test(persist) && /CANONICAL_ORGANIC_HOLD_KEY/.test(persist),
  no_second_canary_reforce: !/second_canary_status !== "V3_REPAIRED_PASS"/.test(persist),
  persist_freezes_projection: /freezeSchedulerAuthorizationProjection/.test(persist),
  persist_uses_update: /\.update\(/.test(persist) && !/\.upsert\(/.test(persist),
  durable_live_canonical: /deriveEffectiveOrganicExecutionState/.test(durable),
  route_uses_effective: /effective_execution/.test(route) && /getLastOrganicEffectiveExecutionState/.test(route),
};
writeFileSync(join(process.cwd(), ".infinity/blog-os/v53-organic-dest-sync.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
if (!out.cron_untouched || !out.live_canonical_read || !out.no_second_canary_reforce || !out.persist_freezes_projection || !out.durable_live_canonical || !out.route_uses_effective) {
  process.exit(1);
}
