export const ONPV_LEGACY_DEPLOY_PRODUCTION_MUTATION_FORBIDDEN =
  "ONPV_LEGACY_DEPLOY_PRODUCTION_MUTATION_FORBIDDEN" as const;

/**
 * Historical one-off OccupancyNPV repair deploy helpers are retired from production mutation.
 * Use deployOccupancyNpvOrganicLivePage (canonical ONPV path) instead.
 */
export function occupancynpvLegacyProductionDeployBlockedReason(): string | null {
  return ONPV_LEGACY_DEPLOY_PRODUCTION_MUTATION_FORBIDDEN;
}

export function applyOccupancynpvLegacyDeployBlock(
  input: { deploy?: boolean },
  safeError: string | null,
): string | null {
  if (safeError) return safeError;
  if (input.deploy === false) return null;
  return occupancynpvLegacyProductionDeployBlockedReason();
}
