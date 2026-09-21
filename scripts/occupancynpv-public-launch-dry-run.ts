import { evaluatePublicLaunchReadinessGate } from "../lib/infinity/venture-operating-scale/occupancynpv-public-launch-readiness";
import { executeOccupancynpvPublicLaunch } from "../lib/infinity/venture-operating-scale/occupancynpv-public-launch";
import { occupancynpvPubliclyLaunched } from "../lib/infinity/venture-operating-scale/occupancynpv-public-launch-evidence";

async function main() {
  const gate = evaluatePublicLaunchReadinessGate();
  console.log(JSON.stringify({
    publiclyLaunched: occupancynpvPubliclyLaunched(),
    result: gate.result,
    failed: gate.failed,
    missing: gate.missingEvidence,
    categories: gate.categories,
    nextState: gate.nextState,
  }, null, 2));
  const dry = await executeOccupancynpvPublicLaunch({ persist: false, liveVerify: true });
  console.log("DRY", JSON.stringify({
    attempted: dry.attempted,
    succeeded: dry.succeeded,
    nextState: dry.nextState,
    live: dry.live,
    failed: dry.readiness.failed,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
