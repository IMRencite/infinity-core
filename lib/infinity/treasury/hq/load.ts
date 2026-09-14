import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { overlayCanonicalTreasuryOnHqReadModel } from "@/lib/infinity/financial-truth/treasury-overlay";
import { loadCachedFinancialTruthView } from "@/lib/infinity/financial-truth/live";
import { loadTreasuryStore } from "../persistence";
import { loadMercuryPublicConfig } from "../providers/mercury/config";
import { emptyTreasuryHqReadModel, buildTreasuryHqReadModel, type TreasuryHqReadModel } from "./read-model";

function overlayFromCanonical(model: TreasuryHqReadModel): TreasuryHqReadModel {
  if (process.env.VITEST && process.env.INFINITY_FINANCIAL_TRUTH_LIVE !== "1") return model;
  try {
    const view = loadCachedFinancialTruthView();
    return overlayCanonicalTreasuryOnHqReadModel(model, view.treasury_control);
  } catch {
    return model;
  }
}

export async function loadTreasuryHqForOrg(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<TreasuryHqReadModel> {
  const mercury = loadMercuryPublicConfig();
  try {
    const store = await loadTreasuryStore(admin, organizationId);
    return overlayFromCanonical(buildTreasuryHqReadModel(store, organizationId, undefined, { mercury }));
  } catch {
    return overlayFromCanonical(emptyTreasuryHqReadModel(organizationId, mercury));
  }
}
