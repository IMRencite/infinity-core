import { executeOccupancynpvPricingUxRepairDeployment } from "../lib/infinity/venture-operating-scale/occupancynpv-pricing-ux-repair-deployment";

async function main() {
  const result = await executeOccupancynpvPricingUxRepairDeployment({
    deploy: true,
    persistEvidence: true,
    pollAttempts: 50,
    pollDelayMs: 8000,
  });
  console.log(JSON.stringify({
    deployed: result.deployed,
    liveVisible: result.liveVisible,
    deploymentId: result.deploymentId,
    digest: result.composed.digest,
    previewUrl: result.previewUrl,
    safeError: result.safeError,
    founderDirtyTreeDeployed: result.evidence.founder_dirty_tree_deployed,
    stripeWrites: result.evidence.stripe_writes,
    paymentActivationChanged: result.evidence.payment_activation_changed,
  }, null, 2));
  if (!result.deployed || !result.liveVisible) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
