import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { reloadCanonicalWorkIfDiskChanged } from "@/lib/infinity/canonical-work/store";
import { refreshMissionActivityFromDurableStores } from "./persist-engine";

/**
 * HQ server must re-read disk + engine on every live request.
 * Writer processes (vite-node deploy scripts) are not the Next process.
 * One-time in-memory hydrate is a cross-process defect.
 */
export async function prepareHqMissionActivityProjection(
  admin: AdminSupabaseClient | null,
  organizationId: string,
): Promise<{ fromDisk: number; fromEngine: number }> {
  reloadCanonicalWorkIfDiskChanged();
  return refreshMissionActivityFromDurableStores(admin, organizationId);
}
