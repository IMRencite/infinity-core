import { executeOccupancynpvPublicLaunch } from "../lib/infinity/venture-operating-scale/occupancynpv-public-launch";

async function main() {
  const result = await executeOccupancynpvPublicLaunch({ persist: true, liveVerify: true });
  console.log(JSON.stringify({
    attempted: result.attempted,
    succeeded: result.succeeded,
    nextState: result.nextState,
    publiclyLaunched: result.publiclyLaunched,
    launchTimestamp: result.launchTimestamp,
    launchEvent: "launchEvent" in result ? result.launchEvent : null,
    remaining: result.commercialization?.remaining ?? null,
    searchDiscovery: "searchDiscovery" in result ? result.searchDiscovery : null,
    writes: result.writes,
    live: result.live,
    failed: result.readiness.failed,
  }, null, 2));
  if (!result.succeeded) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
