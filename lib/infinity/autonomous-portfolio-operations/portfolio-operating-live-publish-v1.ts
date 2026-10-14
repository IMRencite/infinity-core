import { deployOccupancyNpvOrganicLivePage } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";

export async function portfolioOperatingPublishOccupancyNpvPath(input: {
  path: string;
}): Promise<{ ok: boolean; deployment_id?: string | null }> {
  if (!input.path.includes("occupancynpv") && !input.path.startsWith("/blog/")) {
    return { ok: false };
  }
  const deployed = await deployOccupancyNpvOrganicLivePage({
    deploy: true,
    aliasProduction: true,
    enforceBacklogDeployGuard: true,
    pollAttempts: 45,
    pollDelayMs: 8000,
  });
  return { ok: Boolean(deployed?.deployed), deployment_id: deployed?.deployment_id ?? null };
}
