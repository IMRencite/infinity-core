import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { loadTreasuryStore } from "../persistence";
import { buildTreasuryHqReadModel, emptyTreasuryHqReadModel, type TreasuryHqReadModel } from "./read-model";

export async function loadTreasuryHqForOrg(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<TreasuryHqReadModel> {
  try {
    const store = await loadTreasuryStore(admin, organizationId);
    return buildTreasuryHqReadModel(store, organizationId);
  } catch {
    return emptyTreasuryHqReadModel(organizationId);
  }
}
