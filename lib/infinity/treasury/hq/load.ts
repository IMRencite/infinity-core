import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { loadTreasuryStore } from "../persistence";
import { loadMercuryPublicConfig } from "../providers/mercury/config";
import { emptyTreasuryHqReadModel, buildTreasuryHqReadModel, type TreasuryHqReadModel } from "./read-model";

export async function loadTreasuryHqForOrg(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<TreasuryHqReadModel> {
  const mercury = loadMercuryPublicConfig();
  try {
    const store = await loadTreasuryStore(admin, organizationId);
    return buildTreasuryHqReadModel(store, organizationId, undefined, { mercury });
  } catch {
    return emptyTreasuryHqReadModel(organizationId, mercury);
  }
}
