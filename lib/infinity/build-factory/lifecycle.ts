import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { BuildStatus } from "./constants";
import { emitBuildFactoryEvent } from "./events";

export async function updateBuildStatus(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildId: string,
  status: BuildStatus,
  extra?: Record<string, unknown>,
): Promise<void> {
  await admin
    .from("builds")
    .update({
      status,
      ...extra,
    })
    .eq("id", buildId)
    .eq("organization_id", organizationId);
}

export async function markBuildInternallyComplete(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildId: string,
  correlationId?: string,
): Promise<void> {
  await admin
    .from("builds")
    .update({
      status: "internally_complete",
      review_status: "passed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", buildId)
    .eq("organization_id", organizationId);

  if (correlationId) {
    await emitBuildFactoryEvent(admin, {
      organizationId,
      eventType: "build.internally_completed",
      message: "Internal build complete — not deployed or published",
      correlationId,
      buildId,
    });
  }
}
