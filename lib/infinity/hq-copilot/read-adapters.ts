import { createAdminClient, type AdminSupabaseClient } from "@/lib/supabase/admin";
import { loadPortfolioSummary } from "@/lib/infinity/operator-console/portfolio/load-portfolio-summary";
import { loadOperatorVentureList, loadOperatorVentureSnapshot } from "@/lib/infinity/operator-console/operator-read-model";
import { loadTreasuryHqForOrg } from "@/lib/infinity/treasury/hq/load";
import { loadPersistedProviderVerifications } from "@/lib/infinity/commercialization/hq/load-provider-verifications";
import { buildProviderInventory } from "@/lib/infinity/commercialization/probes/inventory";
import type { HqCopilotReadRuntime } from "./context-builder";

/**
 * Canonical read-only adapters. This module must not import Treasury mutations,
 * EAG, live provider probes, mission writers, or artifact writers.
 */
export function createHqCopilotReadRuntime(admin: AdminSupabaseClient = createAdminClient()): HqCopilotReadRuntime {
  return {
    loadPortfolio: (organizationId) => loadPortfolioSummary(admin, organizationId),
    loadVentureList: (organizationId) => loadOperatorVentureList(admin, organizationId, 40),
    loadVentureSnapshot: (organizationId, ventureId) =>
      loadOperatorVentureSnapshot(admin, organizationId, ventureId),
    loadTreasury: (organizationId) => loadTreasuryHqForOrg(admin, organizationId),
    loadProviderVerifications: (organizationId) =>
      loadPersistedProviderVerifications(
        admin as unknown as Parameters<typeof loadPersistedProviderVerifications>[0],
        organizationId,
      ),
    loadProviderInventory: () => buildProviderInventory(),
  };
}
