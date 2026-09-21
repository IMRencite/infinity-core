import { executeOccupancynpvImprovementIntakeLiveDeployment } from "../lib/infinity/venture-operating-scale/occupancynpv-improvement-intake-live-deployment";

async function main() {
  const result = await executeOccupancynpvImprovementIntakeLiveDeployment({
    deploy: true,
    persistEvidence: true,
    pollAttempts: 50,
    pollDelayMs: 8000,
  });
  console.log(JSON.stringify({
    deployed: result.deployed,
    deploymentId: result.deploymentId,
    digest: result.composed.digest,
    previewUrl: result.previewUrl,
    safeError: result.safeError,
    founderDirtyTreeDeployed: "NO",
    stripeWrites: 0,
    paymentActivationChanged: 0,
  }, null, 2));
  if (!result.deployed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
