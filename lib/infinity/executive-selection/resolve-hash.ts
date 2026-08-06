import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { buildExecutiveSelectionContext } from "./context";

export async function resolveExecutiveContextHash(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    runtimeInstanceId: string;
    correlationId: string | null;
  },
): Promise<string> {
  const built = await buildExecutiveSelectionContext({
    admin,
    organizationId: input.organizationId,
    missionId: input.missionId,
    runtimeInstanceId: input.runtimeInstanceId,
    correlationId: input.correlationId,
  });
  return built.contextHash;
}
