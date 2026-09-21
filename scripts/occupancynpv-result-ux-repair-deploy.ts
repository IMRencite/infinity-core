import { executeOccupancynpvResultUxRepairDeployment } from "../lib/infinity/venture-operating-scale/occupancynpv-result-ux-repair-deployment";

async function main() {
  const result = await executeOccupancynpvResultUxRepairDeployment({
    deploy: true,
    persistEvidence: true,
    pollAttempts: 50,
    pollDelayMs: 8000,
  });
  console.log(JSON.stringify({
    deployed: result.deployed,
    deploymentId: result.deploymentId,
    artifactId: result.composed.artifactId,
    digest: result.composed.digest,
    safeError: result.safeError,
    stripeWrites: 0,
    paymentActivationChanged: 0,
  }, null, 2));
  if (!result.deployed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
