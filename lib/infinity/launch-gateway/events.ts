import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { recordEngineEvent } from "@/lib/infinity/events";
import { LAUNCH_GATEWAY_EVENTS } from "./constants";

export async function emitLaunchGatewayEvent(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    eventType: string;
    message: string;
    correlationId?: string | null;
    missionId?: string;
    launchPlanId?: string;
    externalActionId?: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "launch_gateway",
    eventType: input.eventType,
    entityType: input.externalActionId ? "external_action" : "launch_plan",
    entityId: input.externalActionId ?? input.launchPlanId ?? input.organizationId,
    message: input.message,
    correlationId: input.correlationId ?? undefined,
    payload: {
      mission_id: input.missionId,
      launch_plan_id: input.launchPlanId,
      external_action_id: input.externalActionId,
      ...(input.payload ?? {}),
    } as Json,
  });
}

export { LAUNCH_GATEWAY_EVENTS };
