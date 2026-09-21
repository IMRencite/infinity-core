import { executeOccupancynpvFaviconRepairDeployment } from "../lib/infinity/venture-operating-scale/occupancynpv-favicon-repair-deployment";

async function main() {
  const result = await executeOccupancynpvFaviconRepairDeployment({
    deploy: true,
    persistEvidence: true,
    pollAttempts: 50,
    pollDelayMs: 8000,
  });
  console.log(JSON.stringify({
    deployed: result.deployed,
    deploymentId: result.deploymentId,
    digest: result.composed.digest,
    safeError: result.safeError,
    founderDirtyTreeDeployed: result.evidence.founder_dirty_tree_deployed,
  }, null, 2));
  if (!result.deployed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
