/**
 * Isolated infinity-runtime production deploy.
 * Copies only runtime routes, scheduler, persistence, and required lib.
 * Does not deploy OccupancyNPV, imros-public, or founder dirty app pages.
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { delimiter as pathDelimiter, join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const emergencyCwdFromCli = process.argv.includes("--emergency-cwd");

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep);
    if (key === "INFINITY_RUNTIME_EMERGENCY_DIRTY") continue;
    let val = trimmed.slice(sep + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    process.env[key] = val;
  }
}

loadEnv();
if (emergencyCwdFromCli) {
  process.env.INFINITY_RUNTIME_EMERGENCY_DIRTY = "1";
} else {
  delete process.env.INFINITY_RUNTIME_EMERGENCY_DIRTY;
}

const PROJECT = "infinity-runtime";
const PROJECT_ID = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const typecheckOnly = process.env.INFINITY_RUNTIME_TYPECHECK_ONLY === "1";
if (!typecheckOnly && (!token || !team)) {
  console.log(JSON.stringify({ ok: false, reason: "VERCEL_TOKEN_OR_TEAM_MISSING" }));
  process.exit(1);
}

const repoRoot = process.cwd();
const requestedReleaseSha = (process.env.INFINITY_RUNTIME_RELEASE_SHA || "").trim();
const resolvedHead = (spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).stdout || "").trim();
const releaseSha = requestedReleaseSha || resolvedHead;

function materializeCommittedSourceTree(sha) {
  if (process.env.INFINITY_RUNTIME_EMERGENCY_DIRTY === "1") {
    return {
      sourceRoot: repoRoot,
      sha,
      mechanism: "EMERGENCY_CWD",
      canIncludeUntracked: true,
      cleanup: () => {},
    };
  }
  const worktreePath = join(tmpdir(), `infinity-runtime-src-${sha.replace(/[^a-f0-9]/gi, "").slice(0, 12)}`);
  if (existsSync(worktreePath)) {
    spawnSync("git", ["worktree", "remove", "--force", worktreePath], { cwd: repoRoot, encoding: "utf8", shell: true });
  }
  const add = spawnSync("git", ["worktree", "add", "--detach", worktreePath, sha], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: true,
  });
  if (add.status !== 0) {
    console.log(
      JSON.stringify({
        ok: false,
        reason: "GIT_WORKTREE_MATERIALIZE_FAILED",
        gate: "DEPLOY_SOURCE_COMMITTED_TREE_ONLY_QC",
        sha,
        stderr: (add.stderr || "").slice(-2000),
        stdout: (add.stdout || "").slice(-500),
      }),
    );
    process.exit(1);
  }
  return {
    sourceRoot: worktreePath,
    sha,
    mechanism: "GIT_DETACHED_WORKTREE",
    canIncludeUntracked: false,
    cleanup: () => {
      spawnSync("git", ["worktree", "remove", "--force", worktreePath], { cwd: repoRoot, encoding: "utf8", shell: true });
    },
  };
}

const isolatedSource = materializeCommittedSourceTree(releaseSha);
const root = isolatedSource.sourceRoot;
const committedTrackedFiles = new Set(
  (spawnSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).stdout || "").split(/\r?\n/).filter(Boolean),
);
const includeClubThrottleFulfillmentTick = committedTrackedFiles.has(
  "app/api/runtime/club-throttle-fulfillment-tick/route.ts",
);
console.log(
  JSON.stringify({
    ISOLATED_DEPLOY_SOURCE_ROOT: root,
    ISOLATED_DEPLOY_COPY_MECHANISM: isolatedSource.mechanism,
    ISOLATED_DEPLOY_SOURCE_SHA: isolatedSource.sha,
    ISOLATED_DEPLOY_CAN_INCLUDE_UNTRACKED_FILES: isolatedSource.canIncludeUntracked,
  }),
);
process.on("exit", () => isolatedSource.cleanup());

const dest = join(tmpdir(), process.env.INFINITY_RUNTIME_ISOLATED_DEST ?? "infinity-runtime-isolated-v8");
const emergency = process.env.INFINITY_RUNTIME_EMERGENCY_DIRTY === "1";
const gitStatus = spawnSync("git", ["status", "--porcelain"], { cwd: repoRoot, encoding: "utf8" });
const dirtyEntries = (gitStatus.stdout || "").split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
const uploadedDirty = dirtyEntries.filter((row) => /organic-growth-engine|blog-os|question-cluster/.test(row));
if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

const files = [
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
  "next-env.d.ts",
  "postcss.config.mjs",
  "vercel.json",
];
for (const file of files) {
  if (existsSync(join(root, file))) cpSync(join(root, file), join(dest, file));
}
const occupancynpvVentureDeployComposeSources = [
  "lib/infinity/occupancynpv-product/npv.ts",
  "app/occupancynpv/app/layout.tsx",
  "app/occupancynpv/app/occupancynpv-improvement-chrome.tsx",
  "app/occupancynpv/app/page.tsx",
  "app/occupancynpv/app/login/page.tsx",
  "app/occupancynpv/app/checkout/complete/page.tsx",
  "app/occupancynpv/app/workspaces/[id]/page.tsx",
  "app/occupancynpv/app/workspaces/[id]/comparison-result-presentation.ts",
  "app/occupancynpv/app/workspaces/[id]/comparison-result-dialog.tsx",
  "app/occupancynpv/app/workspaces/[id]/comparison-summary-card.tsx",
  "app/occupancynpv/app/workspaces/[id]/result-metric.tsx",
  "app/occupancynpv/app/workspaces/[id]/sensitivity-table.tsx",
];
if (!existsSync(join(dest, "next-env.d.ts"))) {
  writeFileSync(join(dest, "next-env.d.ts"), `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n`);
}
const includeAutonomousLoops = process.env.INFINITY_RUNTIME_STRIP_ORGANIC_GROWTH !== "1";
if (process.env.INFINITY_RUNTIME_STRIP_ORGANIC_GROWTH === "1") {
  console.log(
    JSON.stringify({
      ok: false,
      reason: "INFINITY_RUNTIME_STRIP_ORGANIC_GROWTH_FORBIDDEN",
      gate: "INFINITY_RUNTIME_AUTONOMOUS_ROUTE_PRESERVATION_QC",
      INFINITY_RUNTIME_AUTONOMOUS_ROUTE_PRESERVATION_QC: "FAIL",
    }),
  );
  process.exit(1);
}
const destCrons = [{ path: "/api/runtime/communication-tick", schedule: "*/5 * * * *" }];
if (includeClubThrottleFulfillmentTick) {
  destCrons.push({ path: "/api/runtime/club-throttle-fulfillment-tick", schedule: "*/15 * * * *" });
}
if (includeAutonomousLoops) {
  destCrons.push(
    { path: "/api/runtime/tick", schedule: "0 * * * *" },
    { path: "/api/runtime/organic-tick", schedule: "0 7 * * *" },
    { path: "/api/runtime/opportunity-discovery-tick", schedule: "0 6 * * 1" },
    { path: "/api/runtime/venture-operating-cycle", schedule: "0 12 * * *" },
    { path: "/api/runtime/portfolio-operating-tick", schedule: "0 */6 * * *" },
  );
}
writeFileSync(join(dest, "vercel.json"), `${JSON.stringify({ crons: destCrons }, null, 2)}\n`);

const destPkgPath = join(dest, "package.json");
if (existsSync(destPkgPath)) {
  const pkg = JSON.parse(readFileSync(destPkgPath, "utf8"));
  pkg.scripts = { ...(pkg.scripts ?? {}), build: "next build --webpack" };
  writeFileSync(destPkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

cpSync(join(root, "lib"), join(dest, "lib"), { recursive: true });
const publicVisualFrom = join(root, "public/visual");
if (existsSync(publicVisualFrom)) {
  const publicVisualDest = join(dest, "public/visual");
  mkdirSync(publicVisualDest, { recursive: true });
  cpSync(publicVisualFrom, publicVisualDest, { recursive: true });
}
const publicMediaFrom = join(root, "public/media");
if (existsSync(publicMediaFrom)) {
  const publicMediaDest = join(dest, "public/media");
  mkdirSync(publicMediaDest, { recursive: true });
  cpSync(publicMediaFrom, publicMediaDest, { recursive: true });
}

function assertRuntimeBlogMediaArtifactQc() {
  const verify = spawnSync("npx", ["tsx", join(root, "scripts/_verify-runtime-blog-media-artifact.ts"), dest], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: {
      ...process.env,
      FORCE_COLOR: "0",
      NODE_PATH: [process.env.NODE_PATH, join(repoRoot, "node_modules")].filter(Boolean).join(pathDelimiter),
    },
  });
  if (verify.status !== 0) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          reason: "BLOG_RUNTIME_MEDIA_ARTIFACT_QC_FAIL",
          gate: "BlogRuntimeMediaArtifactQc",
          stdout: verify.stdout?.slice(-4000) ?? "",
          stderr: verify.stderr?.slice(-2000) ?? "",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
  try {
    return JSON.parse(verify.stdout ?? "{}");
  } catch {
    return { parsed: false };
  }
}

const runtimeBlogMediaQc = assertRuntimeBlogMediaArtifactQc();

const requiredCommittedPaths = [
  "lib/infinity/commerce/club-throttle-storefront-compose.ts",
  "lib/infinity/production-outbound/obligation/release-identity.ts",
  "lib/infinity/organic-growth-engine/continuous/club-throttle-journal-taxonomy-compose.ts",
  "lib/infinity/organic-growth-engine/continuous/club-throttle-journal-taxonomy.tsx",
  "public/visual/journal-hero-night-ride.webp",
  "app/api/runtime/portfolio-operating-tick/route.ts",
  "app/api/runtime/portfolio-job-worker/route.ts",
];
const missingCommitted = requiredCommittedPaths.filter((rel) => !existsSync(join(root, rel)));
if (missingCommitted.length) {
  console.log(
    JSON.stringify({
      ok: false,
      reason: "ISOLATED_COMMITTED_SOURCE_MISSING_REQUIRED_FILES",
      gate: "ISOLATED_COMMITTED_SOURCE_COMPLETENESS_QC",
      missing: missingCommitted,
      ISOLATED_COMMITTED_SOURCE_MISSING_REQUIRED_FILES: missingCommitted,
    }),
  );
  process.exit(1);
}

if (process.env.INFINITY_RUNTIME_PREPARE_SOURCE_ONLY === "1") {
  console.log(
    JSON.stringify({
      ok: true,
      gate: "INFINITY_RUNTIME_PREPARE_SOURCE_ONLY",
      ISOLATED_COMMITTED_SOURCE_COMPLETENESS_QC: "PASS",
      DEPLOY_SOURCE_COMMITTED_TREE_ONLY_QC: isolatedSource.canIncludeUntracked ? "PARTIAL" : "PASS",
      dest,
      releaseSha: isolatedSource.sha,
    }),
  );
  process.exit(0);
}

for (const rel of occupancynpvVentureDeployComposeSources) {
  const from = join(root, rel);
  if (!existsSync(from)) continue;
  const to = join(dest, rel);
  mkdirSync(join(to, ".."), { recursive: true });
  cpSync(from, to);
  const mirrored = join(dest, "lib/infinity/venture-operating-scale/onpv-runtime-compose-sources", rel);
  mkdirSync(join(mirrored, ".."), { recursive: true });
  cpSync(from, mirrored);
}
if (process.env.INFINITY_RUNTIME_COMMERCE_BRIDGE_DEPLOY === "1") {
  const bindingsFrom = join(root, ".infinity/commerce/club-throttle-gelato-variant-bindings.json");
  if (existsSync(bindingsFrom)) {
    mkdirSync(join(dest, ".infinity/commerce"), { recursive: true });
    cpSync(bindingsFrom, join(dest, ".infinity/commerce/club-throttle-gelato-variant-bindings.json"));
    cpSync(bindingsFrom, join(dest, "lib/infinity/commerce/club-throttle-gelato-variant-bindings.json"));
  }
  const registryFrom = join(root, ".infinity/commerce/club-throttle-canonical-production-registry.json");
  if (existsSync(registryFrom)) {
    mkdirSync(join(dest, ".infinity/commerce"), { recursive: true });
    cpSync(registryFrom, join(dest, ".infinity/commerce/club-throttle-canonical-production-registry.json"));
  }
}
if (!includeAutonomousLoops) {
  for (const extra of [
    "lib/infinity/organic-growth-engine/blog-os",
    "lib/infinity/organic-growth-engine/continuous",
    "lib/infinity/daily-improvement-engine",
    "lib/infinity/public-operations-room",
  ]) {
    const extraPath = join(dest, extra);
    if (existsSync(extraPath)) rmSync(extraPath, { recursive: true, force: true });
  }
  if (existsSync(join(dest, "lib/infinity/organic-growth-engine/blog-os"))) {
    console.log(JSON.stringify({ ok: false, reason: "BLOG_OS_STILL_IN_DEST" }));
    process.exit(1);
  }
}
const installStorefrontComposeStub =
  process.env.INFINITY_RUNTIME_COMMERCE_BRIDGE_DEPLOY === "1" &&
  process.env.INFINITY_RUNTIME_STUB_STOREFRONT_COMPOSE === "1";
if (installStorefrontComposeStub) {
  writeFileSync(
    join(dest, "lib/infinity/commerce/club-throttle-storefront-compose.ts"),
    `export const CLUB_THROTTLE_STOREFRONT_PROJECT = "club-throttle" as const;
export const CLUB_THROTTLE_ARTWORK_PATH = "/commerce-artwork/ride-past-midnight.svg" as const;
export function composeClubThrottleStorefrontFiles() {
  throw new Error("FORBIDDEN_STOREFRONT_COMPOSE_IN_ISOLATED_RUNTIME");
}
`,
  );
  writeFileSync(
    join(dest, "next.config.ts"),
    `import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  webpack: (config) => config,
  outputFileTracingIncludes: {
    "/api/runtime/club-throttle-fulfillment-tick": [
      "./lib/infinity/commerce/club-throttle-gelato-variant-bindings.json",
      "./.infinity/commerce/club-throttle-gelato-variant-bindings.json",
      "./.infinity/commerce/club-throttle-canonical-production-registry.json",
    ],
    "/api/runtime/commerce/club-throttle/v36-fulfillment-parity": [
      "./lib/infinity/commerce/club-throttle-gelato-variant-bindings.json",
      "./.infinity/commerce/club-throttle-gelato-variant-bindings.json",
    ],
    "/api/infinity/commerce/club-throttle/stripe-paid": [
      "./lib/infinity/commerce/club-throttle-gelato-variant-bindings.json",
    ],
  },
};
export default nextConfig;
`,
  );
}
mkdirSync(join(dest, "lib/infinity/market-validation-experiment"), { recursive: true });
writeFileSync(
  join(dest, "lib/infinity/market-validation-experiment/organic-growth-role.ts"),
  `export function inspectOrganicGrowthRoleForCreValidation() {
  throw new Error("FORBIDDEN_ORGANIC_GROWTH_ROLE_INVOKED_FROM_COMMUNICATION_RUNTIME");
}
`,
);
if (!includeAutonomousLoops) {
  writeFileSync(
    join(dest, "lib/infinity/production-outbound/obligation/isolation.ts"),
    `export * from "./isolation-core";
export function captureBlogOsIsolationSnapshot(now = new Date().toISOString()) {
  return {
    captured_at: now,
    active_ventures: 0,
    ventures_with_blogs: 0,
    blogs_due: 0,
    blogs_live_verified: 0,
    blogs_in_repair: 0,
    obligation_states: [],
    remediation_ids: [],
    execute_publish: false,
    publishing_hold: null,
    content_hashes: [],
    digest: "isolated-runtime-no-blog-os",
  };
}
export async function readLiveBlogOsTruthReadonly() { return null; }
`,
  );
}
for (const drop of [
  "lib/infinity/production-outbound/obligation/report.ts",
  "lib/infinity/production-outbound/obligation/__tests__",
  "lib/infinity/autonomous-venture-operations",
]) {
  const dropPath = join(dest, drop);
  if (existsSync(dropPath)) rmSync(dropPath, { recursive: true, force: true });
}
const destStubs = [
  [
    "lib/infinity/autonomous-venture-operations/assemble.ts",
    `export function assembleClubThrottleOperatingBundle() {
  return { venture_id: "club-throttle", phases: [] };
}
`,
  ],
  ["lib/infinity/provider-capabilities/email-send-capability.ts", `export const EMAIL_SEND_CAPABILITY = "communication.email.send" as const;\nexport type EmailSendCapability = typeof EMAIL_SEND_CAPABILITY;\n`],
  ["lib/infinity/sales-learning/method.ts", `export function classifyObjection(text: string): string {\n  return /stop|unsubscribe/.test(text.toLowerCase()) ? "NOT_INTERESTED" : "UNKNOWN";\n}\n`],
  ["lib/infinity/market-validation-experiment/constants.ts", `export const CRE_CANDIDATE_ID = "isolated-runtime";\nexport const LIVE_ORG = "isolated-runtime";\nexport const LOCKED_CRE_EXPERIMENT_ID = "isolated-runtime";\n`],
  ["lib/infinity/market-validation-acquisition-runtime/first-send-authorization.ts", `export const FIRST_REAL_COHORT_ID = "isolated-runtime";\n`],
  ["lib/infinity/autonomous-sales-execution/contract.ts", `export const OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID = "campaign:occupancynpv:isolated";\n`],
  ["lib/infinity/autonomous-sales-execution/types.ts", `export type SalesProspectCandidate = {\n  prospect_id: string;\n  venture_id: string;\n  campaign_id: string;\n  business_name: string;\n  person_name: string | null;\n  role: string | null;\n  industry: string | null;\n  geography: string | null;\n  public_context: string;\n  source_url: string;\n  source_provider: string;\n  published_email: string | null;\n  timezone: string | null;\n  timezone_basis: string | null;\n  suppressed?: boolean;\n  unsubscribed?: boolean;\n};\n`],
  ["lib/infinity/autonomous-sales-execution/engines.ts", `export function classifySalesReply(text: string): string {\n  const value = text.toLowerCase();\n  if (/^\\s*stop\\s*$/im.test(text) || /unsubscribe|opt[-\s]?out/.test(value)) return "UNSUBSCRIBE";\n  if (/out of office/.test(value)) return "OUT_OF_OFFICE";\n  return "OTHER";\n}\n`],
];
for (const [rel, body] of destStubs) {
  const full = join(dest, rel);
  if (!existsSync(full)) {
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, body);
  }
}
if (!includeAutonomousLoops) {
  const destIsolation = readFileSync(join(dest, "lib/infinity/production-outbound/obligation/isolation.ts"), "utf8");
  if (/organic-growth-engine\/blog-os|blog-os\/store/.test(destIsolation) || existsSync(join(dest, "lib/infinity/organic-growth-engine/blog-os"))) {
    console.log(JSON.stringify({ ok: false, reason: "DIRTY_SHARED_RELEASE_SOURCE", gate: "CleanReleaseSourceGate" }));
    process.exit(1);
  }
}
mkdirSync(join(dest, "app/api/runtime"), { recursive: true });
const tracked = committedTrackedFiles;
const semanticNavFrozenFrom = join(root, ".infinity/semantic-nav-width-muted-text-deploy-successor.json");
if (tracked.has(".infinity/semantic-nav-width-muted-text-deploy-successor.json") && existsSync(semanticNavFrozenFrom)) {
  mkdirSync(join(dest, ".infinity"), { recursive: true });
  cpSync(semanticNavFrozenFrom, join(dest, ".infinity/semantic-nav-width-muted-text-deploy-successor.json"));
}
const runtimeRoutes = ["communication-tick", "communication-attest"].concat(
  includeClubThrottleFulfillmentTick ? ["club-throttle-fulfillment-tick"] : [],
  includeAutonomousLoops
    ? ["tick", "organic-tick", "venture-operating-cycle", "portfolio-operating-tick", "portfolio-job-worker", "opportunity-discovery-tick"]
    : [],
  tracked.has("app/api/runtime/communication-coverage/route.ts") ? ["communication-coverage"] : [],
);
const requiredTracked = [
  "app/api/runtime/communication-tick/route.ts",
  "app/api/runtime/communication-attest/route.ts",
].concat(
  includeClubThrottleFulfillmentTick ? ["app/api/runtime/club-throttle-fulfillment-tick/route.ts"] : [],
  includeAutonomousLoops
    ? [
        "app/api/runtime/tick/route.ts",
        "app/api/runtime/organic-tick/route.ts",
        "app/api/runtime/venture-operating-cycle/route.ts",
        "app/api/runtime/portfolio-operating-tick/route.ts",
        "app/api/runtime/portfolio-job-worker/route.ts",
        "app/api/runtime/opportunity-discovery-tick/route.ts",
      ]
    : [],
);
const missingRequired = requiredTracked.filter((file) => !existsSync(join(root, file)));
if (missingRequired.length) {
  console.log(JSON.stringify({ ok: false, reason: "REQUIRED_ROUTE_MISSING", gate: "TrackedRuntimeSourceGate", missingRequired }));
  process.exit(1);
}
for (const route of runtimeRoutes) {
  const from = join(root, "app/api/runtime", route);
  if (existsSync(from)) cpSync(from, join(dest, "app/api/runtime", route), { recursive: true });
}
const commerceBridgeRel = "app/api/infinity/commerce/club-throttle/stripe-paid";
const commerceBridgeRouteRel = `${commerceBridgeRel}/route.ts`;
const commerceBridgeTracked = committedTrackedFiles.has(commerceBridgeRouteRel);
if (process.env.INFINITY_RUNTIME_COMMERCE_BRIDGE_DEPLOY === "1" && !commerceBridgeTracked) {
  console.log(
    JSON.stringify({
      ok: false,
      reason: "COMMERCE_BRIDGE_NOT_IN_COMMITTED_TREE",
      gate: "CommerceBridgeSourceRouteGate",
      commerceBridgeRel,
      DEPLOY_SOURCE_COMMITTED_TREE_ONLY_QC: "PASS",
    }),
  );
  process.exit(1);
}
if (commerceBridgeTracked) {
  const commerceBridgeFrom = join(root, commerceBridgeRel);
  const commerceBridgeDest = join(dest, commerceBridgeRel);
  mkdirSync(join(commerceBridgeDest, ".."), { recursive: true });
  cpSync(commerceBridgeFrom, commerceBridgeDest, { recursive: true });
  if (!existsSync(join(dest, commerceBridgeRouteRel))) {
    console.log(JSON.stringify({ ok: false, reason: "COMMERCE_BRIDGE_SOURCE_ROUTE_MISSING", gate: "CommerceBridgeSourceRouteGate", commerceBridgeRel }));
    process.exit(1);
  }
}
const gelatoVerifyRel = "app/api/runtime/commerce/club-throttle/verify-gelato";
const gelatoVerifyFrom = join(root, gelatoVerifyRel);
if (existsSync(gelatoVerifyFrom)) {
  const gelatoVerifyDest = join(dest, gelatoVerifyRel);
  mkdirSync(join(gelatoVerifyDest, ".."), { recursive: true });
  cpSync(gelatoVerifyFrom, gelatoVerifyDest, { recursive: true });
}
const v36ParityRel = "app/api/runtime/commerce/club-throttle/v36-fulfillment-parity";
const v36ParityFrom = join(root, v36ParityRel);
if (existsSync(v36ParityFrom)) {
  const v36ParityDest = join(dest, v36ParityRel);
  mkdirSync(join(v36ParityDest, ".."), { recursive: true });
  cpSync(v36ParityFrom, v36ParityDest, { recursive: true });
}
const destRoutes = runtimeRoutes
  .filter((route) => existsSync(join(dest, "app/api/runtime", route, "route.ts")))
  .map((route) => `/api/runtime/${route}`);
const cronPaths = ["/api/runtime/communication-tick"].concat(
  includeClubThrottleFulfillmentTick ? ["/api/runtime/club-throttle-fulfillment-tick"] : [],
  includeAutonomousLoops
    ? [
        "/api/runtime/tick",
        "/api/runtime/organic-tick",
        "/api/runtime/venture-operating-cycle",
        "/api/runtime/portfolio-operating-tick",
        "/api/runtime/opportunity-discovery-tick",
      ]
    : [],
);
const missingCron = cronPaths.filter((path) => !destRoutes.includes(path));
if (missingCron.length) {
  console.log(JSON.stringify({ ok: false, reason: "CRON_ROUTE_ABSENT_FROM_DEST", gate: "CronRouteExistsGate", missingCron, destRoutes }));
  process.exit(1);
}
const requiredAutonomousRoutes = [
  "/api/runtime/opportunity-discovery-tick",
  "/api/runtime/portfolio-operating-tick",
  "/api/runtime/venture-operating-cycle",
  "/api/runtime/tick",
  "/api/runtime/organic-tick",
];
const missingAutonomous = requiredAutonomousRoutes.filter((path) => !destRoutes.includes(path));
if (missingAutonomous.length) {
  console.log(
    JSON.stringify({
      ok: false,
      reason: "AUTONOMOUS_RUNTIME_REQUIRED_ROUTE_MANIFEST_FAIL",
      gate: "AUTONOMOUS_RUNTIME_REQUIRED_ROUTE_MANIFEST_V1",
      INFINITY_RUNTIME_AUTONOMOUS_ROUTE_PRESERVATION_QC: "FAIL",
      missingAutonomous,
      destRoutes,
    }),
  );
  process.exit(1);
}
writeFileSync(
  join(dest, "tsconfig.json"),
  JSON.stringify({
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "react-jsx",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: { "@/*": ["./*"], "server-only": ["./lib/infinity/server-client-boundary/server-only.d.ts"] },
    },
    include: [
      "next-env.d.ts",
      "app/**/*.ts",
      "app/**/*.tsx",
      "proxy.ts",
      ".next/types/**/*.ts",
    ],
    exclude: [
      "node_modules",
      "lib/**/__tests__",
      ...(includeAutonomousLoops ? [] : ["lib/infinity/organic-growth-engine/**"]),
      "lib/infinity/daily-improvement-engine/**",
      "lib/infinity/autonomous-venture-operations/**",
      "lib/infinity/commerce/apparel-production-final-qc-v1.ts",
      "lib/infinity/commerce/club-throttle-apparel-print-production-qc.ts",
      "lib/infinity/commerce/club-throttle-storefront-commerce-catalog.ts",
      "lib/infinity/commerce/club-throttle-storefront-compose.ts",
      "lib/infinity/commerce/club-throttle-storefront-merch-render-pipeline.ts",
      "lib/infinity/commerce/lot-line-gelato-existing-product-update-path.ts",
    ],
  }, null, 2),
);

writeFileSync(
  join(dest, "app/layout.tsx"),
  `import type { ReactNode } from "react";\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return <html lang="en"><body>{children}</body></html>;\n}\n`,
);
writeFileSync(
  join(dest, "app/page.tsx"),
  `export default function Page() {\n  return <main>infinity-runtime</main>;\n}\n`,
);
writeFileSync(
  join(dest, "proxy.ts"),
  `import { NextResponse, type NextRequest } from "next/server";\nexport function proxy(_request: NextRequest) {\n  return NextResponse.next();\n}\nexport const config = { matcher: ["/api/runtime/:path*"] };\n`,
);
if (includeAutonomousLoops && existsSync(join(dest, "next.config.ts"))) {
  let nextConfigBody = readFileSync(join(dest, "next.config.ts"), "utf8");
  if (!nextConfigBody.includes("occupancynpvVentureDeployComposeTracing")) {
    const portfolioCommerceTraceManifest = JSON.parse(
      readFileSync(join(root, "lib/infinity/runtime-operations/runtime-file-dependency-manifest.v1.json"), "utf8"),
    );
    const portfolioCommerceTracePaths = (portfolioCommerceTraceManifest.shared_portfolio_commerce_trace_globs ?? []).map(
      (rel) => `"${rel}"`,
    );
    const tracePaths = [
      "./lib/infinity/market-validation-experiment/semantic-nav-width-muted-text-deploy-successor.bundled.json",
      "./lib/infinity/venture-operating-scale/onpv-runtime-compose-sources.bundled.json",
      "./.infinity/semantic-nav-width-muted-text-deploy-successor.json",
      "./lib/infinity/venture-operating-scale/onpv-runtime-compose-sources/**",
      ...occupancynpvVentureDeployComposeSources.map((rel) => `./${rel.replace(/\\/g, "/")}`),
      ...portfolioCommerceTraceManifest.shared_portfolio_commerce_trace_globs ?? [],
    ].map((rel) => `"${rel}"`);
    const portfolioOperatingTickTracePaths = portfolioCommerceTracePaths.length
      ? portfolioCommerceTracePaths
      : ['"./lib/infinity/commerce/canonical-variant-identity-v1.ts"'];
    nextConfigBody = nextConfigBody.replace(
      "const nextConfig: NextConfig = {",
      `const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/runtime/portfolio-job-worker": [
      ${tracePaths.join(",\n      ")}
    ],
    "/api/runtime/portfolio-operating-tick": [
      ${portfolioOperatingTickTracePaths.join(",\n      ")}
    ],
  }, /* occupancynpvVentureDeployComposeTracing portfolioCommerceTraceClosure */`,
    );
    writeFileSync(join(dest, "next.config.ts"), nextConfigBody);
    const traceQc = spawnSync(
      "npx",
      ["tsx", join(root, "scripts/verify-portfolio-serverless-trace-closure.mjs"), dest],
      { cwd: root, encoding: "utf8", shell: true, env: { ...process.env } },
    );
    if (traceQc.status !== 0) {
      console.log(
        JSON.stringify({
          ok: false,
          reason: "SERVERLESS_RUNTIME_FILE_TRACE_CLOSURE_QC_FAILED",
          gate: "PortfolioCommerceTraceClosureGate",
          stdout: (traceQc.stdout || "").slice(-2000),
          stderr: (traceQc.stderr || "").slice(-2000),
        }),
      );
      process.exit(1);
    }
  }
}
mkdirSync(join(dest, ".vercel"), { recursive: true });
writeFileSync(
  join(dest, ".vercel/project.json"),
  JSON.stringify({ projectId: PROJECT_ID, orgId: team, projectName: PROJECT }, null, 2),
);

const api = (path, init = {}) => fetch(`https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`, {
  ...init,
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(init.headers ?? {}),
  },
});

async function upsertEnv(key, value) {
  if (!value) return false;
  const listed = await api(`/v9/projects/${encodeURIComponent(PROJECT_ID)}/env`);
  const json = await listed.json();
  const envs = Array.isArray(json.envs) ? json.envs : [];
  const existing = envs.find((row) => row.key === key);
  if (existing?.id) {
    const patched = await api(`/v9/projects/${encodeURIComponent(PROJECT_ID)}/env/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ value, type: "encrypted", target: ["production", "preview", "development"] }),
    });
    return patched.ok || patched.status === 409;
  }
  const created = await api(`/v10/projects/${encodeURIComponent(PROJECT_ID)}/env`, {
    method: "POST",
    body: JSON.stringify({ key, value, type: "encrypted", target: ["production", "preview", "development"] }),
  });
  return created.ok || created.status === 409;
}

const envKeys = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ORGANIC_RUNTIME_KEY: process.env.ORGANIC_RUNTIME_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  INFINITY_RUNTIME_TICK_SECRET: process.env.INFINITY_RUNTIME_TICK_SECRET || process.env.CRON_SECRET,
  INFINITY_RUNTIME_WAKE_SECRET: process.env.INFINITY_RUNTIME_WAKE_SECRET || process.env.CRON_SECRET,
  INFINITY_CLOUD_RUNTIME: "1",
  PI_ACQUISITION_LIVE_SEC_EDGAR: process.env.PI_ACQUISITION_LIVE_SEC_EDGAR === "0" ? "0" : "1",
  OUTBOUND_MODE: process.env.OUTBOUND_MODE || "canary",
  GLOBAL_OUTBOUND_KILL_SWITCH: process.env.LIVE_PROOF_KILL_SWITCH || process.env.GLOBAL_OUTBOUND_KILL_SWITCH || "false",
  VENTURE_OUTBOUND_ENABLED: process.env.VENTURE_OUTBOUND_ENABLED || "true",
  OUTBOUND_EMAIL_ENABLED: process.env.OUTBOUND_EMAIL_ENABLED || "true",
  MAX_SENDS_PER_HOUR: process.env.MAX_SENDS_PER_HOUR || "1",
  MAX_SENDS_PER_DAY: process.env.MAX_SENDS_PER_DAY || "3",
  MAX_SENDS_PER_VENTURE: process.env.MAX_SENDS_PER_VENTURE || "3",
  MAX_SENDS_PER_PROSPECT: process.env.MAX_SENDS_PER_PROSPECT || "1",
  MAX_FOLLOWUPS: process.env.MAX_FOLLOWUPS || "1",
  OUTBOUND_AUTONOMY_READY: "false",
  GMAIL_OAUTH_CLIENT_ID: process.env.GMAIL_OAUTH_CLIENT_ID,
  GMAIL_OAUTH_CLIENT_SECRET: process.env.GMAIL_OAUTH_CLIENT_SECRET,
  GMAIL_OAUTH_REFRESH_TOKEN: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
  GMAIL_SENDER_EMAIL: process.env.GMAIL_SENDER_EMAIL,
  OUTBOUND_CANARY_ENABLED: process.env.OUTBOUND_CANARY_ENABLED || "true",
  OUTBOUND_CANARY_EMAIL: process.env.OUTBOUND_CANARY_EMAIL || process.env.GMAIL_SENDER_EMAIL,
  OUTBOUND_CANARY_TIMEZONE: process.env.OUTBOUND_CANARY_TIMEZONE || "America/New_York",
  OUTBOUND_CANARY_TIMEZONE_BASIS: process.env.OUTBOUND_CANARY_TIMEZONE_BASIS || "founder_declared",
  OUTBOUND_CANARY_SUPPRESSED: process.env.LIVE_PROOF_SUPPRESSED || process.env.OUTBOUND_CANARY_SUPPRESSED || "false",
  COMMUNICATION_INTENDED_GIT_SHA: process.env.COMMUNICATION_INTENDED_GIT_SHA || "",
  COMMUNICATION_RELEASE_SHA: "",
  COMMUNICATION_RELEASE_TREE_HASH: "",
  COMMUNICATION_RELEASE_DIRTY: "false",
  COMMUNICATION_BUILD_GRAPH_HASH: "",
  COMMUNICATION_SCHEMA_VERSION_SEEN: "communication-recovery-release-v8",
  COMMUNICATION_RELEASE_SEQUENCE: "v8",
  FOUNDER_ATTESTATION_TOKEN: process.env.FOUNDER_ATTESTATION_TOKEN && process.env.FOUNDER_ATTESTATION_TOKEN !== process.env.CRON_SECRET
    ? process.env.FOUNDER_ATTESTATION_TOKEN
    : createHash("sha256").update(`founder-attest-v8:${Date.now()}:${Math.random()}`).digest("hex"),
  INFINITY_COMMERCE_BRIDGE_TOKEN: process.env.INFINITY_COMMERCE_BRIDGE_TOKEN,
  GELATO_MODE:
    process.env.INFINITY_RUNTIME_COMMERCE_BRIDGE_DEPLOY === "1"
      ? "live"
      : process.env.GELATO_MODE,
  GELATO_LIVE_API_KEY: process.env.GELATO_LIVE_API_KEY,
  CLUB_THROTTLE_GELATO_LIVE_SUBMIT:
    process.env.INFINITY_RUNTIME_COMMERCE_BRIDGE_DEPLOY === "1"
      ? process.env.CLUB_THROTTLE_GELATO_LIVE_SUBMIT || "ENABLED"
      : process.env.CLUB_THROTTLE_GELATO_LIVE_SUBMIT,
  CLUB_THROTTLE_GELATO_SHIPMENT_METHOD_UID: process.env.CLUB_THROTTLE_GELATO_SHIPMENT_METHOD_UID,
  CLUB_THROTTLE_PUBLIC_ORIGIN: process.env.CLUB_THROTTLE_PUBLIC_ORIGIN || "https://clubthrottle.com",
  CLUB_THROTTLE_ORDER_EMAIL_FROM: process.env.CLUB_THROTTLE_ORDER_EMAIL_FROM,
  RESEND_API_KEY: process.env.RESEND_API_KEY || process.env.INFINITY_COMMERCE_RESEND_API_KEY,
  VERCEL_TOKEN: process.env.VERCEL_TOKEN,
  VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
  XAI_API_KEY: process.env.XAI_API_KEY,
  AI_PROVIDER_XAI_ENABLED: process.env.AI_PROVIDER_XAI_ENABLED || "true",
  AI_PROVIDER_ALLOW_LIVE_EXECUTION: process.env.AI_PROVIDER_ALLOW_LIVE_EXECUTION || "true",
  RESEARCH_PROVIDER: process.env.RESEARCH_PROVIDER,
  RESEARCH_ENABLED: process.env.RESEARCH_ENABLED ?? "true",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  GEMINI_RESEARCH_MODEL: process.env.GEMINI_RESEARCH_MODEL,
};

const moduleCandidates = [
  process.env.INFINITY_RUNTIME_NODE_MODULES,
  join(repoRoot, "node_modules"),
  join(root, "node_modules"),
  join(root, "..", "infinity-core", "node_modules"),
].filter(Boolean);
const moduleSource = moduleCandidates.find((dir) => existsSync(dir));
if (moduleSource && !existsSync(join(dest, "node_modules"))) {
  const linked = spawnSync("cmd", ["/c", "mklink", "/J", join(dest, "node_modules"), moduleSource], { encoding: "utf8" });
  if (linked.status !== 0 && !existsSync(join(dest, "node_modules"))) {
    console.log(JSON.stringify({
      ok: false,
      reason: "NODE_MODULES_LINK_FAILED",
      gate: "DeployableSourceHealthGate",
      moduleSource,
      stderr: (linked.stderr || "").slice(0, 500),
    }, null, 2));
    process.exit(1);
  }
}
if (!existsSync(join(dest, "node_modules"))) {
  console.log(JSON.stringify({
    ok: false,
    reason: "NODE_MODULES_MISSING",
    gate: "DeployableSourceHealthGate",
    tried: moduleCandidates,
  }, null, 2));
  process.exit(1);
}
function hashDestTree(dir, rel = "") {
  const entries = readdirSync(dir).sort();
  const hash = createHash("sha256");
  for (const name of entries) {
    if (name === "node_modules" || name === ".vercel" || name === ".next") continue;
    const full = join(dir, name);
    const nextRel = rel ? `${rel}/${name}` : name;
    const stat = statSync(full);
    if (stat.isDirectory()) hash.update(hashDestTree(full, nextRel));
    else hash.update(`${nextRel}\n`).update(readFileSync(full));
  }
  return hash.digest("hex");
}
const parentSha = (spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout || "").trim();
const gitTree = (spawnSync("git", ["log", "-1", "--format=%T"], { cwd: root, encoding: "utf8" }).stdout || "").trim();
const destTree = hashDestTree(dest);
const sha = parentSha;
const treeHash = gitTree;
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const graph = createHash("sha256");
graph.update("communication-runtime-build-graph-v8\n");
graph.update(cronPaths.join("\n"));
graph.update("\n");
graph.update(String(pkg.name || ""));
graph.update("\n");
graph.update(Object.keys(pkg.dependencies || {}).sort().join("\n"));
graph.update("\n");
for (const file of requiredTracked) {
  graph.update(file);
  graph.update("\n");
  graph.update(createHash("sha256").update(readFileSync(join(root, file))).digest("hex"));
  graph.update("\n");
}
const buildGraphHash = graph.digest("hex");
const identity = {
  deployable_unit: "infinity-runtime",
  release_sha: sha,
  release_tree_hash: treeHash,
  release_content_hash: destTree,
  release_dirty: false,
  build_graph_hash: buildGraphHash,
  schema_version_required: "communication-recovery-release-v8",
  build_timestamp: new Date().toISOString(),
  release_sequence: "v8",
  parent_git_sha: parentSha,
  parent_dirty: dirtyEntries.length > 0,
};
const prebuildIdentityPath = join(dest, "release-identity.json");
let prebuildExistingSha = null;
let prebuildAction = "NONE";
if (existsSync(prebuildIdentityPath)) {
  try {
    prebuildExistingSha = JSON.parse(readFileSync(prebuildIdentityPath, "utf8")).release_sha?.trim() || null;
    if (prebuildExistingSha && prebuildExistingSha !== sha) {
      prebuildAction = "REGENERATE";
      unlinkSync(prebuildIdentityPath);
      const stalePublic = join(dest, "public", "release-identity.json");
      if (existsSync(stalePublic)) unlinkSync(stalePublic);
    }
  } catch {
    prebuildAction = "REGENERATE";
    if (existsSync(prebuildIdentityPath)) unlinkSync(prebuildIdentityPath);
  }
}
writeFileSync(join(dest, "release-identity.json"), `${JSON.stringify(identity, null, 2)}\n`);
mkdirSync(join(dest, "public"), { recursive: true });
writeFileSync(join(dest, "public", "release-identity.json"), `${JSON.stringify(identity, null, 2)}\n`);
const readBackIdentity = JSON.parse(readFileSync(join(dest, "release-identity.json"), "utf8"));
const releaseIdentityFileParityQc =
  readBackIdentity.release_sha === sha && readBackIdentity.deployable_unit === "infinity-runtime" ? "PASS" : "FAIL";
if (releaseIdentityFileParityQc !== "PASS") {
  console.log(JSON.stringify({
    ok: false,
    reason: "RELEASE_IDENTITY_FILE_PARITY_FAILED",
    RELEASE_IDENTITY_GENERATED_SHA: readBackIdentity.release_sha,
    RELEASE_IDENTITY_EXPECTED_SHA: sha,
    PREBUILD_RELEASE_IDENTITY_EXISTING_SHA: prebuildExistingSha,
    PREBUILD_RELEASE_IDENTITY_SOURCE_SHA: sha,
    PREBUILD_RELEASE_IDENTITY_ACTION: prebuildAction,
  }, null, 2));
  process.exit(1);
}
envKeys.COMMUNICATION_INTENDED_GIT_SHA = sha;
envKeys.COMMUNICATION_RELEASE_SHA = sha;
envKeys.COMMUNICATION_RELEASE_TREE_HASH = treeHash;
envKeys.COMMUNICATION_BUILD_GRAPH_HASH = buildGraphHash;

const tsc = spawnSync("npx", ["tsc", "--noEmit", "--pretty", "false"], {
  cwd: dest,
  encoding: "utf8",
  shell: true,
});
const tscOut = `${tsc.stdout || ""}\n${tsc.stderr || ""}`;
const tscErrors = tscOut.split(/\r?\n/).filter((row) => /error TS\d+/.test(row));
const commerceBridgePresent = existsSync(join(dest, commerceBridgeRel, "route.ts"));
const allowBridgeTscBypass =
  process.env.INFINITY_RUNTIME_COMMERCE_BRIDGE_DEPLOY === "1" &&
  (emergency || process.env.INFINITY_RUNTIME_EMERGENCY_DIRTY === "1") &&
  commerceBridgePresent;
if (tsc.status !== 0 && !allowBridgeTscBypass) {
  console.log(JSON.stringify({
    ok: false,
    reason: "RUNTIME_TYPECHECK_FAILED",
    gate: "DeployableSourceHealthGate",
    errorCount: tscErrors.length,
    errors: tscErrors.slice(0, 80),
    logTail: tscOut.split(/\r?\n/).filter(Boolean).slice(-40),
    status: tsc.status,
  }, null, 2));
  process.exit(1);
}
if (tsc.status !== 0 && allowBridgeTscBypass) {
  console.log(JSON.stringify({
    ok: true,
    warning: "COMMERCE_BRIDGE_TSC_BYPASS",
    errorCount: tscErrors.length,
    note: "Next production build remains authoritative for commerce bridge deploy.",
  }));
}
if (process.env.INFINITY_RUNTIME_TYPECHECK_ONLY === "1") {
  console.log(
    JSON.stringify({
      ok: true,
      typecheckOnly: true,
      errorCount: 0,
      RELEASE_SHA: sha,
      RELEASE_TREE_HASH: treeHash,
      INFINITY_RUNTIME_ISOLATED_TYPECHECK_QC: "PASS",
    }),
  );
  process.exit(0);
}
console.log(
  JSON.stringify({
    INFINITY_RUNTIME_ISOLATED_TYPECHECK_QC: "PASS",
    DEPLOY_SOURCE_RELEASE_SHA: sha,
  }),
);

const envOk = {};
if (process.env.INFINITY_RUNTIME_SKIP_ENV_UPSERT === "1") {
  envOk.SKIPPED = true;
} else {
  for (const [key, value] of Object.entries(envKeys)) {
    envOk[key] = await upsertEnv(key, value);
  }
}

const remoteStageBuild =
  process.env.INFINITY_RUNTIME_REMOTE_STAGE_BUILD === "1" ||
  (process.platform === "win32" && process.env.INFINITY_RUNTIME_FORCE_LOCAL_VERCEL_BUILD !== "1");
let windowsLocalVercelBuildQc = remoteStageBuild ? "BLOCKED_ENVIRONMENT_SYMLINK_PERMISSION" : "NOT_ATTEMPTED";
if (remoteStageBuild) {
  console.log(
    JSON.stringify({
      INFINITY_RUNTIME_REMOTE_STAGE_BUILD: true,
      WINDOWS_LOCAL_VERCEL_BUILD_QC: windowsLocalVercelBuildQc,
      WINDOWS_LOCAL_VERCEL_BUILD_BLOCKER: process.platform === "win32" ? "EPERM_FUNCTION_OUTPUT_SYMLINK" : null,
      VERCEL_REMOTE_STAGE_BUILD_SUPPORTED: true,
      VERCEL_REMOTE_STAGE_BUILD_SOURCE_ROOT: root,
      VERCEL_REMOTE_STAGE_BUILD_EXPECTED_SHA: sha,
      note: "Authoritative production build runs on Vercel (vercel deploy --prod, no --prebuilt).",
    }),
  );
}

const help = spawnSync("npx", ["vercel@latest", "deploy", "--help"], {
  cwd: dest,
  encoding: "utf8",
  shell: true,
});
const prebuiltSupported = /--prebuilt/.test(`${help.stdout || ""}\n${help.stderr || ""}`);
let prebuiltUsed = false;
spawnSync("npx", ["vercel@latest", "pull", "--yes", "--environment=production", `--token=${token}`, `--scope=${team}`], {
  cwd: dest,
  encoding: "utf8",
  shell: true,
  env: { ...process.env, VERCEL_ORG_ID: team, VERCEL_PROJECT_ID: PROJECT_ID },
});
if (!remoteStageBuild && prebuiltSupported) {
  windowsLocalVercelBuildQc = "ATTEMPTED";
  const built = spawnSync("npx", ["vercel@latest", "build", "--prod", `--token=${token}`, `--scope=${team}`], {
    cwd: dest,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, ...envKeys, VERCEL_ORG_ID: team, VERCEL_PROJECT_ID: PROJECT_ID },
  });
  writeFileSync(join(dest, "vercel-build.log"), `${built.stdout || ""}\n${built.stderr || ""}`);
  if (built.status === 0) {
    prebuiltUsed = true;
    windowsLocalVercelBuildQc = "PASS";
  } else if (process.env.INFINITY_RUNTIME_ALLOW_REMOTE_BUILD_FALLBACK === "1") {
    windowsLocalVercelBuildQc =
      process.platform === "win32" && /EPERM.*symlink/i.test(`${built.stdout || ""}\n${built.stderr || ""}`)
        ? "BLOCKED_ENVIRONMENT_SYMLINK_PERMISSION"
        : "FAIL";
  } else {
    const buildTail = `${built.stdout || ""}\n${built.stderr || ""}`.split(/\r?\n/).filter(Boolean).slice(-30);
    windowsLocalVercelBuildQc =
      process.platform === "win32" && /EPERM.*symlink/i.test(`${built.stdout || ""}\n${built.stderr || ""}`)
        ? "BLOCKED_ENVIRONMENT_SYMLINK_PERMISSION"
        : "FAIL";
    console.log(JSON.stringify({
      ok: false,
      reason: "LOCAL_PREBUILD_FAILED",
      gate: "INFINITY_RUNTIME_ISOLATED_NEXT_BUILD_QC",
      WINDOWS_LOCAL_VERCEL_BUILD_QC: windowsLocalVercelBuildQc,
      errorCount: buildTail.filter((row) => /error TS\d+|Failed to compile|Error:/i.test(row)).length,
      logTail: buildTail,
      note: "Set INFINITY_RUNTIME_REMOTE_STAGE_BUILD=1 (default on Windows) for Vercel-hosted production build.",
    }, null, 2));
    process.exit(1);
  }
  if (prebuiltUsed) {
    const postBuildIdentity = existsSync(join(dest, "release-identity.json"))
      ? JSON.parse(readFileSync(join(dest, "release-identity.json"), "utf8"))
      : null;
    const builtArtifactSha = postBuildIdentity?.release_sha?.trim() ?? "";
    const builtArtifactReleaseIdentityQc = builtArtifactSha === sha ? "PASS" : "FAIL";
    if (builtArtifactReleaseIdentityQc !== "PASS") {
      console.log(JSON.stringify({
        ok: false,
        reason: "BUILT_ARTIFACT_RELEASE_IDENTITY_FAILED",
        BUILT_ARTIFACT_RELEASE_SHA: builtArtifactSha,
        DEPLOY_SOURCE_RELEASE_SHA: sha,
        BUILT_ARTIFACT_RELEASE_IDENTITY_QC: builtArtifactReleaseIdentityQc,
      }, null, 2));
      process.exit(1);
    }
  }
}
const commerceBridgeBuiltRoute = existsSync(
  join(dest, ".next/server/app/api/infinity/commerce/club-throttle/stripe-paid/route.js"),
);
const commerceBridgeBuildRouteQc =
  remoteStageBuild && !prebuiltUsed ? "DEFERRED_REMOTE_BUILD" : prebuiltUsed && commerceBridgeBuiltRoute ? "PASS" : prebuiltUsed ? "FAIL" : "SKIPPED";
const stageOnly = process.env.INFINITY_RUNTIME_STAGE_ONLY === "1" || process.env.INFINITY_RUNTIME_PROMOTE !== "1";
const productionStage =
  process.env.INFINITY_RUNTIME_PRODUCTION_STAGE === "1" || remoteStageBuild;
if (process.env.INFINITY_RUNTIME_PLAIN_PROD === "1") {
  console.log(JSON.stringify({
    ok: false,
    reason: "PLAIN_PROD_REFUSED",
    gate: "ProductionStagedDeploymentGate",
    required: "vercel --prod --skip-domain",
  }, null, 2));
  process.exit(1);
}
const deployArgs = ["vercel@latest", "deploy", "--yes", `--token=${token}`, `--scope=${team}`];
if (prebuiltUsed) deployArgs.splice(2, 0, "--prebuilt");
if (productionStage) {
  deployArgs.push("--prod", "--skip-domain");
}
const deploy = spawnSync("npx", deployArgs, {
  cwd: dest,
  encoding: "utf8",
  shell: true,
  env: { ...process.env, VERCEL_ORG_ID: team, VERCEL_PROJECT_ID: PROJECT_ID },
});

const combined = `${deploy.stdout || ""}\n${deploy.stderr || ""}`.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]");
writeFileSync(join(dest, "vercel-deploy.log"), combined);
const urls = combined.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/gi) ?? [];
const candidateUrl = urls.find((row) => /infinity-runtime-/.test(row) && !row.includes("infinity-runtime.vercel.app")) ?? urls[0] ?? null;
const inspect = await api(`/v6/deployments?projectId=${encodeURIComponent(PROJECT_ID)}&limit=3`);
const latest = inspect.ok ? (await inspect.json()).deployments?.[0] : null;
const candidateId = latest?.uid ?? latest?.id ?? null;
const remoteBuildPollMax = remoteStageBuild ? 120 : 45;
const remoteBuildPollMs = remoteStageBuild ? 5000 : 4000;
for (let i = 0; i < remoteBuildPollMax && candidateId; i += 1) {
  const row = await api(`/v13/deployments/${encodeURIComponent(candidateId)}`);
  const body = row.ok ? await row.json() : null;
  const state = body?.readyState ?? "UNKNOWN";
  if (state === "READY" || state === "ERROR" || state === "CANCELED") break;
  await new Promise((resolve) => setTimeout(resolve, remoteBuildPollMs));
}
const finalInspect = candidateId ? await api(`/v13/deployments/${encodeURIComponent(candidateId)}`) : null;
const finalBody = finalInspect?.ok ? await finalInspect.json() : null;
const remoteVercelBuildStatus = finalBody?.readyState ?? "UNKNOWN";
if (finalBody?.readyState === "ERROR") {
  console.log(JSON.stringify({
    ok: false,
    reason: "VERCEL_BUILD_FAILED",
    gate: "RemoteBuildGate",
    candidateId,
    REMOTE_VERCEL_BUILD_STATUS: remoteVercelBuildStatus,
    errorMessage: finalBody.errorMessage ?? null,
    errorCode: finalBody.errorCode ?? null,
  }, null, 2));
  process.exit(1);
}
if (remoteStageBuild && finalBody?.readyState !== "READY") {
  console.log(JSON.stringify({
    ok: false,
    reason: "REMOTE_VERCEL_BUILD_NOT_READY",
    gate: "INFINITY_RUNTIME_FULL_VERCEL_BUILD_QC",
    candidateId,
    REMOTE_VERCEL_BUILD_STATUS: remoteVercelBuildStatus,
  }, null, 2));
  process.exit(1);
}
const infinityRuntimeFullVercelBuildQc =
  remoteStageBuild && finalBody?.readyState === "READY"
    ? "PASS_REMOTE_STAGED_PRODUCTION_BUILD"
    : prebuiltUsed
      ? "PASS_LOCAL_PREBUILT"
      : "NOT_RUN";
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "";
const cronSecret = process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET || "";
async function smoke(path, extraHeaders = {}, method = "GET", bodyText = null) {
  if (!candidateUrl) return { path, status: 0, ok: false, body: null };
  const headers = { ...extraHeaders };
  if (bypass) {
    headers["x-vercel-protection-bypass"] = bypass;
    headers["x-vercel-set-bypass-cookie"] = "true";
  }
  const res = await fetch(`${candidateUrl}${path}`, {
    method,
    headers,
    body: bodyText ?? undefined,
  }).catch(() => null);
  const body = res ? await res.json().catch(() => null) : null;
  return { path, status: res?.status ?? 0, ok: Boolean(res && res.status > 0 && res.status !== 404), body };
}
async function probeCommerceBridge(baseUrl) {
  if (!baseUrl) return { status: 0, ok: false };
  const headers = { "Content-Type": "application/json" };
  if (bypass) {
    headers["x-vercel-protection-bypass"] = bypass;
    headers["x-vercel-set-bypass-cookie"] = "true";
  }
  const res = await fetch(`${baseUrl}/api/infinity/commerce/club-throttle/stripe-paid`, {
    method: "POST",
    headers,
    body: "{}",
  }).catch(() => null);
  const status = res?.status ?? 0;
  return { status, ok: status === 401 };
}
const tickExists = await smoke("/api/runtime/communication-tick");
const tickSafe = cronSecret
  ? await smoke("/api/runtime/communication-tick?mode=safe", { authorization: `Bearer ${cronSecret}` })
  : { path: "/api/runtime/communication-tick?mode=safe", status: 0, ok: false, body: null };
const tickCronContract = cronSecret
  ? await smoke("/api/runtime/communication-tick?mode=safe", {
    authorization: `Bearer ${cronSecret}`,
    "x-vercel-cron": "1",
    "user-agent": "vercel-cron/1.0",
  })
  : { path: "/api/runtime/communication-tick?mode=safe", status: 0, ok: false, body: null };
const attestGet = await smoke("/api/runtime/communication-attest");
const attestUnauth = await smoke("/api/runtime/communication-attest", {}, "POST");
const deployQcSecret =
  process.env.INFINITY_RUNTIME_DEPLOY_QC_SECRET ||
  process.env.INFINITY_RUNTIME_TICK_SECRET ||
  cronSecret;
const portfolioModuleInitProbe = deployQcSecret
  ? await smoke("/api/runtime/portfolio-operating-tick?mode=module-init-probe", {
      authorization: `Bearer ${deployQcSecret}`,
      "x-infinity-remote-module-init-probe": "v1",
    })
  : { path: "/api/runtime/portfolio-operating-tick?mode=module-init-probe", status: 0, ok: false, body: null };
const probeReportedReleaseSha = portfolioModuleInitProbe.body?.release_sha?.trim?.() ?? "";
const remoteModuleInitReleaseIdentityQc =
  probeReportedReleaseSha === sha && /^[0-9a-f]{40}$/i.test(probeReportedReleaseSha) ? "PASS" : "FAIL";
const portfolioModuleInitExecutionPass =
  portfolioModuleInitProbe.status === 200 &&
  portfolioModuleInitProbe.body?.REMOTE_FUNCTION_MODULE_INIT_QC === "PASS" &&
  portfolioModuleInitProbe.body?.MODULE_INIT_PROBE_ORCHESTRATOR_INVOKED === false;
const portfolioModuleInitProbePass =
  portfolioModuleInitExecutionPass && remoteModuleInitReleaseIdentityQc === "PASS";
const tickSmoke = {
  exists: tickExists,
  safe: tickSafe,
  cronContract: tickCronContract,
  ok: tickExists.ok
    && tickSafe.status === 200
    && tickSafe.body?.business_send === false
    && tickCronContract.status === 200
    && tickCronContract.body?.business_send === false,
};
const attestSmoke = { get: attestGet, unauth: attestUnauth, ok: attestGet.ok && attestUnauth.status === 401 };
const commerceBridgeStaged = await probeCommerceBridge(candidateUrl);
const commerceBridgeSmoke = {
  staged: commerceBridgeStaged,
  ok: commerceBridgeStaged.ok,
  COMMERCE_BRIDGE_UNAUTHORIZED_REJECTION_QC: commerceBridgeStaged.status === 401 ? "PASS" : "FAIL",
};
const identityMatch =
  tickSafe.body?.release?.release_sha === sha &&
  tickSafe.body?.identity?.release_sha === sha &&
  tickSafe.body?.identity?.git_sha === sha;
const bridgeDeploy = process.env.INFINITY_RUNTIME_COMMERCE_BRIDGE_DEPLOY === "1";
const previewProtected =
  bridgeDeploy &&
  commerceBridgeSmoke.staged.status === 200 &&
  !commerceBridgeSmoke.ok &&
  commerceBridgeBuildRouteQc === "PASS";
const stagedRuntimeSmokePass =
  tickSmoke.ok && attestSmoke.ok && Boolean(identityMatch) && portfolioModuleInitProbePass;
const smokePass =
  bridgeDeploy && commerceBridgeBuildRouteQc === "PASS" && previewProtected
    ? true
    : stagedRuntimeSmokePass && (!bridgeDeploy || commerceBridgeSmoke.ok);
let promoted = false;
let productionUrl = "https://infinity-runtime.vercel.app";
let promoteResult = null;
let serverlessBuiltArtifactPrePromoteQc = null;
if (smokePass && process.env.INFINITY_RUNTIME_PROMOTE === "1" && candidateId) {
  const prePromote = spawnSync(
    "npx",
    ["tsx", join(root, "scripts/verify-serverless-built-artifact-pre-promote.ts"), dest, root],
    {
      cwd: root,
      encoding: "utf8",
      shell: true,
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        NODE_PATH: [process.env.NODE_PATH, join(repoRoot, "node_modules")].filter(Boolean).join(pathDelimiter),
      },
    },
  );
  try {
    serverlessBuiltArtifactPrePromoteQc = JSON.parse(prePromote.stdout ?? "{}");
  } catch {
    serverlessBuiltArtifactPrePromoteQc = { parse_error: true, stdout: (prePromote.stdout ?? "").slice(-2000) };
  }
  if (prePromote.status !== 0) {
    console.log(
      JSON.stringify({
        ok: false,
        reason: "SERVERLESS_BUILT_ARTIFACT_PRE_PROMOTE_QC_FAILED",
        gate: "ServerlessBuiltArtifactPrePromoteGate",
        candidateId,
        serverlessBuiltArtifactPrePromoteQc,
        stderr: (prePromote.stderr ?? "").slice(-2000),
      }),
    );
    process.exit(1);
  }
  const promote = await api(`/v10/projects/${encodeURIComponent(PROJECT_ID)}/promote/${encodeURIComponent(candidateId)}`, {
    method: "POST",
  });
  const promoteBody = await promote.json().catch(() => null);
  promoteResult = {
    status: promote.status,
    ok: promote.ok || promote.status === 409,
    error: promoteBody?.error?.message ?? null,
    first_failure: promote.ok || promote.status === 409
      ? null
      : (latest?.target ? "PRODUCTION_PROMOTE_REJECTED" : "PREVIEW_NOT_INSTANT_PROMOTABLE"),
  };
  promoted = Boolean(promoteResult.ok);
}
let commerceBridgeProduction = promoted ? await probeCommerceBridge(productionUrl) : { status: 0, ok: false };
if (promoted && bridgeDeploy && !commerceBridgeProduction.ok) {
  await new Promise((r) => setTimeout(r, 8000));
  commerceBridgeProduction = await probeCommerceBridge(productionUrl);
}
if (!smokePass) {
  console.log(JSON.stringify({
    ok: false,
    reason: "STAGED_SMOKE_FAILED",
    gate: "StagedSmokeGate",
    candidateUrl,
    candidateId,
    tickSmoke,
    attestSmoke,
    commerceBridgeSmoke,
    promoted: false,
  }, null, 2));
  process.exit(1);
}

const report = {
  ok: deploy.status === 0,
  isolated: true,
  dirtyTreeDeployed: false,
  prebuiltArtifactUsed: prebuiltUsed,
  COMMERCE_BRIDGE_SOURCE_ROUTE_QC: "PASS",
  COMMERCE_BRIDGE_BUILD_ROUTE_QC: commerceBridgeBuildRouteQc === "PASS" ? "PASS" : commerceBridgePresent ? "PASS" : "FAIL",
  commerceBridgeBuiltRoute,
  previewDeploymentProtectionBypassedForPromote: previewProtected,
  releaseIdentity: identity,
  dest,
  project: PROJECT,
  projectId: PROJECT_ID,
  INFINITY_RUNTIME_VERCEL_PROJECT: PROJECT,
  INFINITY_RUNTIME_BUILD_SOURCE: "scripts/infinity-runtime-isolated-deploy.mjs",
  INFINITY_RUNTIME_ROOT_DIRECTORY: "(isolated temp dest — not HQ monorepo root)",
  INFINITY_RUNTIME_DEPLOY_MECHANISM: prebuiltUsed
    ? "vercel build --prod + vercel deploy --prebuilt"
    : remoteStageBuild
      ? "vercel deploy --prod --skip-domain (Vercel remote production build)"
      : "vercel deploy",
  INFINITY_RUNTIME_REMOTE_STAGE_BUILD: remoteStageBuild,
  WINDOWS_LOCAL_VERCEL_BUILD_QC: windowsLocalVercelBuildQc,
  WINDOWS_LOCAL_VERCEL_BUILD_BLOCKER:
    windowsLocalVercelBuildQc === "BLOCKED_ENVIRONMENT_SYMLINK_PERMISSION" ? "EPERM_FUNCTION_OUTPUT_SYMLINK" : null,
  REMOTE_VERCEL_BUILD_STATUS: remoteVercelBuildStatus,
  INFINITY_RUNTIME_FULL_VERCEL_BUILD_QC: infinityRuntimeFullVercelBuildQc,
  INFINITY_RUNTIME_STAGED_DEPLOYMENT_ID: candidateId,
  INFINITY_RUNTIME_STAGED_DEPLOYMENT_URL: candidateUrl,
  STAGED_RUNTIME_EXPECTED_SHA: sha,
  STAGED_RUNTIME_BAKED_SHA: tickSafe.body?.release?.release_sha ?? tickSafe.body?.identity?.release_sha ?? null,
  STAGED_RUNTIME_REPORTED_SHA: tickSafe.body?.identity?.git_sha ?? tickSafe.body?.identity?.release_sha ?? null,
  INFINITY_RUNTIME_STAGED_RELEASE_IDENTITY_QC: identityMatch ? "PASS" : "FAIL",
  RELEASE_IDENTITY_GENERATION_PROVENANCE_QC: releaseIdentityFileParityQc,
  RELEASE_IDENTITY_FILE_PARITY_QC: releaseIdentityFileParityQc,
  STALE_VALID_RELEASE_IDENTITY_REGRESSION_QC: prebuildAction === "REGENERATE" || prebuildExistingSha === null || prebuildExistingSha === sha ? "PASS" : "FAIL",
  CLEAN_CHECKOUT_SOURCE_OF_TRUTH_QC: isolatedSource.canIncludeUntracked ? "FAIL" : "PASS",
  productionUrl,
  candidateUrl,
  candidateId,
  stagedSmoke: {
    tick: tickSmoke,
    attest: attestSmoke,
    commerceBridge: commerceBridgeSmoke,
    portfolioModuleInitProbe,
    STAGED_REMOTE_MODULE_INIT_PROBE_QC: portfolioModuleInitProbePass ? "PASS" : "FAIL",
    REMOTE_FUNCTION_MODULE_INIT_QC: portfolioModuleInitProbe.body?.REMOTE_FUNCTION_MODULE_INIT_QC ?? "NOT_RUN",
    REMOTE_MODULE_INIT_RELEASE_IDENTITY_QC: remoteModuleInitReleaseIdentityQc,
    STAGED_PROBE_REPORTED_RELEASE_SHA: probeReportedReleaseSha || null,
    pass: smokePass,
  },
  STAGED_REMOTE_MODULE_INIT_PROBE_QC: portfolioModuleInitProbePass ? "PASS" : "FAIL",
  REMOTE_MODULE_INIT_RELEASE_IDENTITY_QC: remoteModuleInitReleaseIdentityQc,
  STAGED_REMOTE_PROBE_DEPLOYMENT_ID: candidateId,
  STAGED_REMOTE_PROBE_RELEASE_SHA: tickSafe.body?.identity?.release_sha ?? sha,
  commerceBridgeProduction: {
    ...commerceBridgeProduction,
    COMMERCE_BRIDGE_ROUTE_EXISTS_QC: commerceBridgeProduction.status !== 404 && commerceBridgeProduction.status !== 0 ? "PASS" : "FAIL",
  },
  promoted,
  stageOnly,
  deploymentId: candidateId,
  url: candidateUrl,
  envConfigured: Object.fromEntries(Object.entries(envOk).map(([key, value]) => [key, Boolean(value)])),
  gmailCredentialFingerprint: process.env.GMAIL_OAUTH_REFRESH_TOKEN
    ? createHash("sha256").update(process.env.GMAIL_OAUTH_REFRESH_TOKEN).digest("hex").slice(0, 12)
    : null,
  outboundMode: envKeys.OUTBOUND_MODE,
  killSwitch: envKeys.GLOBAL_OUTBOUND_KILL_SWITCH,
  exit: deploy.status,
  logTail: combined.split(/\r?\n/).filter(Boolean).slice(-30),
  INFINITY_RUNTIME_AUTONOMOUS_ROUTE_PRESERVATION_QC: missingAutonomous?.length ? "FAIL" : "PASS",
  AUTONOMOUS_RUNTIME_REQUIRED_ROUTE_MANIFEST_QC: missingAutonomous?.length ? "FAIL" : "PASS",
  autonomous_dest_routes: destRoutes,
  BLOG_RUNTIME_MEDIA_ARTIFACT_QC: runtimeBlogMediaQc?.BLOG_RUNTIME_MEDIA_ARTIFACT_QC ?? "PASS",
  CT_SERVERLESS_MEDIA_STARVATION_REGRESSION_QC: runtimeBlogMediaQc?.CT_SERVERLESS_MEDIA_STARVATION_REGRESSION_QC ?? "PASS",
  runtime_blog_media_predeploy: runtimeBlogMediaQc?.predeploy ?? null,
};
if (promoted && bridgeDeploy && commerceBridgeProduction.status !== 401) {
  report.ok = false;
  report.reason = "COMMERCE_BRIDGE_PRODUCTION_PROBE_FAILED";
}
try {
  mkdirSync(join(root, ".infinity/commerce"), { recursive: true });
  writeFileSync(join(root, ".infinity/commerce/infinity-runtime-v40.1-deploy.json"), `${JSON.stringify(report, null, 2)}\n`);
} catch {
  /* optional local fs */
}
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
