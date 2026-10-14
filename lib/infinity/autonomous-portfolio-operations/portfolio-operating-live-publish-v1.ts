import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { pickOccupancyNpvAutonomousBacklogCandidate } from "./portfolio-operating-backlog-publish-v1";
import { deployApprovedVentureProductionBundle } from "./autonomous-venture-production-deployer-v1";

export async function portfolioOperatingPublishOccupancyNpvPath(input: {
  path: string;
}): Promise<{ ok: boolean; deployment_id?: string | null; safe_error?: string | null; published_url?: string }> {
  if (!input.path.startsWith("/blog/") && !input.path.startsWith("/lease-comparison/")) {
    return { ok: false, safe_error: "UNSUPPORTED_PUBLISH_PATH" };
  }
  const candidate = pickOccupancyNpvAutonomousBacklogCandidate();
  if (!candidate) {
    return { ok: false, safe_error: "NO_PUBLISH_ELIGIBLE_BACKLOG_CANDIDATE" };
  }
  const deployed = await deployApprovedVentureProductionBundle({
    venture_id: CRE_VENTURE_ID,
    alias_production: true,
    enforce_backlog_deploy_guard: true,
  });
  return {
    ok: deployed.ok,
    deployment_id: deployed.deployment_id,
    safe_error: deployed.safe_error,
    published_url: deployed.production_url ?? undefined,
  };
}
