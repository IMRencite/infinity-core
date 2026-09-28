import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { execSync } from "node:child_process";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "../lib/infinity/communication-provider/load-local-env.ts";

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i);
    let v = t.slice(i + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] == null) process.env[k] = v;
  }
}

loadEnv();
loadServerEnvFromLocalFile();
reloadVercelFromLocalFile();
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const projectId = "prj_AVa1EK79vagoOB8PEtzWAQZTX0xI";
const mode = process.argv[2] ?? "preview";
const promoteId = process.argv[3];

if (mode === "promote") {
  if (!promoteId?.startsWith("dpl_")) {
    console.error("usage: hq-production-candidate-deploy.mjs promote <dpl_id>");
    process.exit(1);
  }
  const { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } = await import(
    "../lib/infinity/communication-provider/load-local-env.ts"
  );
  const { VercelDomainBindingAdapter } = await import(
    "../lib/infinity/commercialization/providers/vercel/domain-binding-adapter.ts"
  );
  loadServerEnvFromLocalFile();
  reloadVercelFromLocalFile();
  const vercel = new VercelDomainBindingAdapter();
  const alias = await vercel.assignDeploymentAlias(promoteId, "hq.imros.io");
  const report = {
    collected_at: new Date().toISOString(),
    release_sha: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
    action: "promote",
    deployment_id: promoteId,
    aliased: alias.ok,
    domain: "hq.imros.io",
    safe_error: alias.ok ? null : alias.safeError,
  };
  writeFileSync(".infinity/blog-os/hq-recovery-deploy-20260928.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(alias.ok ? 0 : 1);
}

if (!token || !team) {
  console.log(JSON.stringify({ ok: false, reason: "VERCEL_TOKEN_OR_TEAM_MISSING" }));
  process.exit(2);
}

mkdirSync(join(process.cwd(), ".vercel"), { recursive: true });
writeFileSync(
  join(process.cwd(), ".vercel/project.json"),
  JSON.stringify({ projectId, orgId: team, projectName: "infinity-hq" }, null, 2),
);

const args = ["vercel@latest", "deploy", "--yes", "--archive=tgz", `--token=${token}`, `--scope=${team}`];
if (mode === "production") args.splice(2, 0, "--prod");

const deploy = spawnSync("npx", args, {
  cwd: process.cwd(),
  encoding: "utf8",
  shell: true,
  env: { ...process.env, VERCEL_ORG_ID: team, VERCEL_PROJECT_ID: projectId },
  timeout: 600000,
});

const text = `${deploy.stdout || ""}\n${deploy.stderr || ""}`;
const idMatch = text.match(/dpl_[A-Za-z0-9]+/);
const urlMatch = text.match(/https:\/\/[^\s]+vercel\.app/gi);
const report = {
  collected_at: new Date().toISOString(),
  release_sha: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
  action: mode,
  deployment_id: idMatch?.[0] ?? null,
  preview_url: urlMatch?.find((u) => /infinity/i.test(u)) ?? urlMatch?.[0] ?? null,
  exit: deploy.status,
  deploy_tail: text.split("\n").slice(-25),
};
writeFileSync(".infinity/blog-os/hq-recovery-deploy-20260928.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(deploy.status === 0 && report.deployment_id ? 0 : 1);
