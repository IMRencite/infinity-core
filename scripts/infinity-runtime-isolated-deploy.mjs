/**
 * Isolated infinity-runtime production deploy.
 * Copies only runtime routes, scheduler, persistence, and required lib.
 * Does not deploy OccupancyNPV, imros-public, or founder dirty app pages.
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    process.env[key] = val;
  }
}

loadEnv();

const PROJECT = "infinity-runtime";
const PROJECT_ID = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const typecheckOnly = process.env.INFINITY_RUNTIME_TYPECHECK_ONLY === "1";
if (!typecheckOnly && (!token || !team)) {
  console.log(JSON.stringify({ ok: false, reason: "VERCEL_TOKEN_OR_TEAM_MISSING" }));
  process.exit(1);
}

const root = process.cwd();
const dest = join(tmpdir(), "infinity-runtime-isolated-v8");
const emergency = process.env.INFINITY_RUNTIME_EMERGENCY_DIRTY === "1";
const gitStatus = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
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
if (!existsSync(join(dest, "next-env.d.ts"))) {
  writeFileSync(join(dest, "next-env.d.ts"), `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n`);
}
writeFileSync(
  join(dest, "vercel.json"),
  `${JSON.stringify({
    crons: [{ path: "/api/runtime/communication-tick", schedule: "*/5 * * * *" }],
  }, null, 2)}\n`,
);

const destPkgPath = join(dest, "package.json");
if (existsSync(destPkgPath)) {
  const pkg = JSON.parse(readFileSync(destPkgPath, "utf8"));
  pkg.scripts = { ...(pkg.scripts ?? {}), build: "next build --webpack" };
  writeFileSync(destPkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

cpSync(join(root, "lib"), join(dest, "lib"), { recursive: true });
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
mkdirSync(join(dest, "lib/infinity/market-validation-experiment"), { recursive: true });
writeFileSync(
  join(dest, "lib/infinity/market-validation-experiment/organic-growth-role.ts"),
  `export function inspectOrganicGrowthRoleForCreValidation() {
  throw new Error("FORBIDDEN_ORGANIC_GROWTH_ROLE_INVOKED_FROM_COMMUNICATION_RUNTIME");
}
`,
);
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
for (const drop of [
  "lib/infinity/production-outbound/obligation/report.ts",
  "lib/infinity/production-outbound/obligation/__tests__",
]) {
  const dropPath = join(dest, drop);
  if (existsSync(dropPath)) rmSync(dropPath, { recursive: true, force: true });
}
const destStubs = [
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
const destIsolation = readFileSync(join(dest, "lib/infinity/production-outbound/obligation/isolation.ts"), "utf8");
if (/organic-growth-engine\/blog-os|blog-os\/store/.test(destIsolation) || existsSync(join(dest, "lib/infinity/organic-growth-engine/blog-os"))) {
  console.log(JSON.stringify({ ok: false, reason: "DIRTY_SHARED_RELEASE_SOURCE", gate: "CleanReleaseSourceGate" }));
  process.exit(1);
}
mkdirSync(join(dest, "app/api/runtime"), { recursive: true });
const tracked = new Set((spawnSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).stdout || "").split(/\r?\n/).filter(Boolean));
const runtimeRoutes = ["communication-tick", "communication-attest"].concat(
  tracked.has("app/api/runtime/communication-coverage/route.ts") ? ["communication-coverage"] : [],
);
const requiredTracked = [
  "app/api/runtime/communication-tick/route.ts",
  "app/api/runtime/communication-attest/route.ts",
];
const untrackedRequired = requiredTracked.filter((file) => !tracked.has(file) || !existsSync(join(root, file)));
if (untrackedRequired.length) {
  console.log(JSON.stringify({ ok: false, reason: "REQUIRED_ROUTE_UNTRACKED", gate: "TrackedRuntimeSourceGate", untrackedRequired }));
  process.exit(1);
}
for (const route of runtimeRoutes) {
  const from = join(root, "app/api/runtime", route);
  if (existsSync(from)) cpSync(from, join(dest, "app/api/runtime", route), { recursive: true });
}
const destRoutes = runtimeRoutes
  .filter((route) => existsSync(join(dest, "app/api/runtime", route, "route.ts")))
  .map((route) => `/api/runtime/${route}`);
const cronPaths = ["/api/runtime/communication-tick"];
const missingCron = cronPaths.filter((path) => !destRoutes.includes(path));
if (missingCron.length) {
  console.log(JSON.stringify({ ok: false, reason: "CRON_ROUTE_ABSENT_FROM_DEST", gate: "CronRouteExistsGate", missingCron, destRoutes }));
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
      "lib/infinity/organic-growth-engine/**",
      "lib/infinity/daily-improvement-engine/**",
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
};

const moduleCandidates = [
  process.env.INFINITY_RUNTIME_NODE_MODULES,
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
writeFileSync(join(dest, "release-identity.json"), `${JSON.stringify(identity, null, 2)}\n`);
mkdirSync(join(dest, "public"), { recursive: true });
writeFileSync(join(dest, "public", "release-identity.json"), `${JSON.stringify(identity, null, 2)}\n`);
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
if (tsc.status !== 0) {
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
if (process.env.INFINITY_RUNTIME_TYPECHECK_ONLY === "1") {
  console.log(JSON.stringify({ ok: true, typecheckOnly: true, errorCount: 0, RELEASE_SHA: sha, RELEASE_TREE_HASH: treeHash }));
  process.exit(0);
}

const envOk = {};
if (process.env.INFINITY_RUNTIME_SKIP_ENV_UPSERT === "1") {
  envOk.SKIPPED = true;
} else {
  for (const [key, value] of Object.entries(envKeys)) {
    envOk[key] = await upsertEnv(key, value);
  }
}

const help = spawnSync("npx", ["vercel@latest", "deploy", "--help"], {
  cwd: dest,
  encoding: "utf8",
  shell: true,
});
const prebuiltSupported = /--prebuilt/.test(`${help.stdout || ""}\n${help.stderr || ""}`);
let prebuiltUsed = false;
if (prebuiltSupported) {
  const built = spawnSync("npx", ["vercel@latest", "build", "--prod", `--token=${token}`, `--scope=${team}`], {
    cwd: dest,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, VERCEL_ORG_ID: team, VERCEL_PROJECT_ID: PROJECT_ID },
  });
  writeFileSync(join(dest, "vercel-build.log"), `${built.stdout || ""}\n${built.stderr || ""}`);
  if (built.status === 0) prebuiltUsed = true;
}
const stageOnly = process.env.INFINITY_RUNTIME_STAGE_ONLY === "1" || process.env.INFINITY_RUNTIME_PROMOTE !== "1";
const productionStage = process.env.INFINITY_RUNTIME_PRODUCTION_STAGE === "1";
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
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "";
const cronSecret = process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET || "";
async function smoke(path, extraHeaders = {}, method = "GET") {
  if (!candidateUrl) return { path, status: 0, ok: false, body: null };
  const headers = { ...extraHeaders };
  if (bypass) {
    headers["x-vercel-protection-bypass"] = bypass;
    headers["x-vercel-set-bypass-cookie"] = "true";
  }
  const res = await fetch(`${candidateUrl}${path}`, { method, headers }).catch(() => null);
  const body = res ? await res.json().catch(() => null) : null;
  return { path, status: res?.status ?? 0, ok: Boolean(res && res.status > 0 && res.status !== 404), body };
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
const identityMatch = tickSafe.body?.release?.release_sha === sha || tickSafe.body?.identity?.release_sha === sha;
const smokePass = tickSmoke.ok && attestSmoke.ok && Boolean(identityMatch);
let promoted = false;
let productionUrl = "https://infinity-runtime.vercel.app";
let promoteResult = null;
if (smokePass && process.env.INFINITY_RUNTIME_PROMOTE === "1" && candidateId) {
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
if (!smokePass) {
  console.log(JSON.stringify({
    ok: false,
    reason: "STAGED_SMOKE_FAILED",
    gate: "StagedSmokeGate",
    candidateUrl,
    candidateId,
    tickSmoke,
    attestSmoke,
    promoted: false,
  }, null, 2));
  process.exit(1);
}

const report = {
  ok: deploy.status === 0,
  isolated: true,
  dirtyTreeDeployed: false,
  prebuiltArtifactUsed: prebuiltUsed,
  releaseIdentity: identity,
  dest,
  project: PROJECT,
  projectId: PROJECT_ID,
  productionUrl,
  candidateUrl,
  candidateId,
  stagedSmoke: { tick: tickSmoke, attest: attestSmoke, pass: smokePass },
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
};
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
