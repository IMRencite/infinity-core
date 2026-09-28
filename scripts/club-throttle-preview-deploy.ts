import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { executeClubThrottleProductionDeployment } from "../lib/infinity/commerce/club-throttle-deployment";
import { VercelDomainBindingAdapter } from "../lib/infinity/commercialization/providers/vercel/domain-binding-adapter";

const reportPath = ".infinity/blog-os/v5-club-throttle-candidate-deploy-20260928.json";

async function main() {
  const mode = process.argv[2];
  const releaseSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  if (mode === "promote") {
    const deploymentId = process.argv[3];
    if (!deploymentId?.startsWith("dpl_")) throw new Error("DEPLOYMENT_ID_REQUIRED");
    const vercel = new VercelDomainBindingAdapter();
    const alias = await vercel.assignDeploymentAlias(deploymentId, "clubthrottle.com");
    const report = {
      collected_at: new Date().toISOString(),
      release_sha: releaseSha,
      action: "promote",
      deployment_id: deploymentId,
      domain: "clubthrottle.com",
      aliased: alias.ok,
      safe_error: alias.ok ? null : alias.safeError ?? "VERCEL_ALIAS_FAILED",
    };
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    if (!alias.ok) process.exit(1);
    return;
  }

  const result = await executeClubThrottleProductionDeployment({
    deploy: true,
    persistEvidence: true,
    pollAttempts: 60,
    pollDelayMs: 8000,
    aliasProduction: false,
  });
  const report = {
    collected_at: new Date().toISOString(),
    release_sha: releaseSha,
    action: "preview",
    deployment_id: result.evidence.deployment_id,
    preview_url: result.evidence.deployment_url,
    digest: result.evidence.digest,
    aliased: result.deployed && result.evidence.production_deployment === "PASS",
    deployed_ready: result.deployed,
    safe_error: result.safeError,
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!result.evidence.deployment_id || result.safeError || !result.evidence.deployment_url) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "DEPLOY_FAILED");
  process.exit(1);
});
