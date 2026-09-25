import { writeFileSync } from "node:fs";
import { CRE_VERCEL_PROJECT_ID } from "../lib/infinity/venture-operating-scale/constants.ts";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "../lib/infinity/communication-provider/load-local-env.ts";
import { activateVercelTokenForProject } from "../lib/infinity/commercialization/providers/vercel/token-select.ts";
import { deployOccupancyNpvOrganicLivePage } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher.ts";

loadServerEnvFromLocalFile();
reloadVercelFromLocalFile();
await activateVercelTokenForProject({ projectId: CRE_VERCEL_PROJECT_ID });
const deploy = await deployOccupancyNpvOrganicLivePage({ deploy: true, pollAttempts: 60, pollDelayMs: 8000 });
const report = {
  collected_at: new Date().toISOString(),
  deployment_id: deploy.deployment_id,
  preview_url: deploy.preview_url,
  aliased: deploy.aliased,
  deployed: deploy.deployed,
  reconciled: deploy.reconciled ?? false,
  safe_error: deploy.safe_error,
};
writeFileSync(".infinity/blog-os/v64-occupancy-deploy.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!deploy.deployment_id || deploy.safe_error) process.exitCode = 1;
