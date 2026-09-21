import { deployOccupancyNpvOrganicLivePage } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";

async function main() {
  const result = await deployOccupancyNpvOrganicLivePage({ deploy: true });
  console.log(JSON.stringify({
    adapter: result.adapter,
    deployed: result.deployed,
    aliased: result.aliased,
    live_url: result.live_url,
    live_status: result.live_status,
    deployment_id: result.deployment_id,
    safe_error: result.safe_error,
    file_count: result.file_count,
  }, null, 2));
  if (!result.deployed) process.exitCode = 1;
}

void main();
