import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { loadOperatorVentureSnapshot } from "./operator-read-model";
import type { OperatorVentureSnapshot } from "./types";

export async function loadVentureSnapshotForHq(
  admin: AdminSupabaseClient,
  organizationId: string,
  ventureId: string,
): Promise<OperatorVentureSnapshot | null> {
  return loadOperatorVentureSnapshot(admin, organizationId, ventureId);
}
