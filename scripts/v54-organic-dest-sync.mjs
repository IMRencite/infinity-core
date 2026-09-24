import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const src = process.cwd();
const dest = join(tmpdir(), "infinity-organic-isolated-v28");
const seeds = [
  "lib/infinity/organic-growth-engine/blog-os/durable/effective-execution-state.ts",
  "lib/infinity/organic-growth-engine/obligation/persist.ts",
  "lib/infinity/organic-growth-engine/obligation/scheduler.ts",
  "lib/infinity/organic-growth-engine/obligation/hq.ts",
  "lib/infinity/organic-growth-engine/obligation/authorization-projection.ts",
  "lib/infinity/organic-growth-engine/blog-os/durable/persist.ts",
  "lib/infinity/organic-growth-engine/blog-os/durable/store.ts",
  "lib/infinity/organic-growth-engine/blog-os/durable/scheduled-execution.ts",
  "lib/infinity/organic-growth-engine/blog-os/durable/scheduled-live-publisher.ts",
  "lib/infinity/organic-growth-engine/continuous/blog-quality-core.ts",
  "lib/infinity/organic-growth-engine/continuous/public.ts",
  "lib/infinity/organic-growth-engine/continuous/occupancynpv-cam-first-year-page.ts",
  "lib/infinity/organic-growth-engine/continuous/occupancynpv-organic-publish-adapter.ts",
  "lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher.ts",
  "app/api/runtime/organic-tick/route.ts",
  "lib/infinity/product-asset-builder/v2/providers/preflight.ts",
  "lib/infinity/production-outbound/obligation/provider-identity.ts",
  "lib/infinity/production-outbound/obligation/live-shadow.ts",
  "lib/infinity/venture-intelligence/load.ts",
];

function resolveImport(fromRel, spec) {
  let next = spec.startsWith("@/")
    ? spec.slice(2)
    : spec.startsWith(".")
      ? join(dirname(fromRel), spec).replace(/\\/g, "/")
      : null;
  if (!next) return null;
  const candidates = [
    `${next}.ts`,
    `${next}.tsx`,
    `${next}/index.ts`,
    `${next}/index.tsx`,
    next.endsWith(".ts") || next.endsWith(".tsx") ? next : null,
  ].filter(Boolean);
  return candidates.find((row) => {
    const full = join(src, row);
    return existsSync(full) && statSync(full).isFile();
  }) ?? null;
}

function collect(rel, seen) {
  const file = rel.replace(/\\/g, "/");
  if (seen.has(file) || !existsSync(join(src, file))) return;
  seen.add(file);
  const text = readFileSync(join(src, file), "utf8");
  for (const match of text.matchAll(/from ["']([^"']+)["']/g)) {
    const resolved = resolveImport(file, match[1]);
    if (resolved) collect(resolved, seen);
  }
}

const seen = new Set();
for (const seed of seeds) collect(seed, seen);
const copied = [];
for (const file of [...seen].sort()) {
  const from = join(src, file);
  const to = join(dest, file);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, readFileSync(from));
  copied.push(file);
}

const cron = JSON.parse(readFileSync(join(dest, "vercel.json"), "utf8"));
const route = readFileSync(join(dest, "app/api/runtime/organic-tick/route.ts"), "utf8");
const execution = readFileSync(join(dest, "lib/infinity/organic-growth-engine/blog-os/durable/scheduled-execution.ts"), "utf8");
const hq = readFileSync(join(dest, "lib/infinity/organic-growth-engine/obligation/hq.ts"), "utf8");
const out = {
  dest,
  copied_count: copied.length,
  copied,
  cron_untouched: cron.crons?.[0]?.path === "/api/runtime/organic-tick" && cron.crons?.[0]?.schedule === "*/15 * * * *",
  route_calls_shared_workflow: /executeOrganicScheduledWorkflow/.test(route),
  route_not_inline_publisher: !/deployOccupancyNpvOrganicLivePage/.test(route),
  recheck_before_publish: /readCanonical/.test(execution),
  hq_uses_effective: /projectOrganicAuthorizationForSurfaces/.test(hq),
  publisher_present: existsSync(join(dest, "lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher.ts")),
};
writeFileSync(join(src, ".infinity/blog-os/v54-organic-dest-sync.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify({ ...out, copied: copied.slice(0, 20) }, null, 2));
if (!out.cron_untouched || !out.route_calls_shared_workflow || !out.recheck_before_publish || !out.hq_uses_effective || !out.publisher_present) {
  process.exit(1);
}
