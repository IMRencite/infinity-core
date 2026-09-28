import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { CRE_VERCEL_PROJECT_ID, OCCUPANCYNPV_DOMAIN } from "../lib/infinity/venture-operating-scale/constants";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { activateVercelTokenForProject } from "../lib/infinity/commercialization/providers/vercel/token-select";
import { deployOccupancyNpvOrganicLivePage } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import { VercelDomainBindingAdapter } from "../lib/infinity/commercialization/providers/vercel/domain-binding-adapter";

const reportPath = ".infinity/blog-os/v5-occupancy-candidate-deploy-20260928.json";

async function main() {
  const mode = process.argv[2];
  loadServerEnvFromLocalFile();
  reloadVercelFromLocalFile();
  await activateVercelTokenForProject({ projectId: CRE_VERCEL_PROJECT_ID });
  const releaseSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  if (mode === "promote") {
    const deploymentId = process.argv[3];
    if (!deploymentId?.startsWith("dpl_")) throw new Error("DEPLOYMENT_ID_REQUIRED");
    const vercel = new VercelDomainBindingAdapter();
    const alias = await vercel.assignDeploymentAlias(deploymentId, OCCUPANCYNPV_DOMAIN);
    const promote = await vercel.promoteDeployment(CRE_VERCEL_PROJECT_ID, deploymentId);
    const report = {
      collected_at: new Date().toISOString(),
      release_sha: releaseSha,
      action: "promote",
      deployment_id: deploymentId,
      domain: OCCUPANCYNPV_DOMAIN,
      aliased: alias.ok,
      promote_ok: promote.ok,
      safe_error: alias.ok || promote.ok ? null : alias.safeError ?? promote.safeError ?? "VERCEL_ALIAS_FAILED",
    };
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    if (!alias.ok && !promote.ok) process.exit(1);
    return;
  }

  const deploy = await deployOccupancyNpvOrganicLivePage({
    deploy: true,
    pollAttempts: 60,
    pollDelayMs: 8000,
    aliasProduction: false,
  });
  const report = {
    collected_at: new Date().toISOString(),
    release_sha: releaseSha,
    action: "preview",
    deployment_id: deploy.deployment_id,
    preview_url: deploy.preview_url,
    aliased: deploy.aliased,
    deployed_ready: deploy.deployed,
    file_count: deploy.file_count,
    safe_error: deploy.safe_error,
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!deploy.deployment_id || deploy.safe_error || !deploy.preview_url) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "DEPLOY_FAILED");
  process.exit(1);
});
