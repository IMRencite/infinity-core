"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  cancelMissionRuntime,
  pauseMissionRuntime,
  resumeMissionRuntime,
  runMissionRuntimeTick,
  startMissionRuntime,
} from "@/lib/infinity/mission-runtime";
import { getActiveMission } from "@/lib/infinity/missions";
import { createClient } from "@/lib/supabase/server";

export type RuntimeActionState = {
  ok: boolean;
  message: string;
};

async function getOrganizationContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (error || !membership) {
    redirect("/dashboard/onboarding");
  }

  return {
    supabase,
    organizationId: membership.organization_id,
    userId: user.id,
  };
}

export async function startMissionRuntimeAction(
  _previous: RuntimeActionState,
): Promise<RuntimeActionState> {
  void _previous;
  const { supabase, organizationId } = await getOrganizationContext();

  try {
    const mission = await getActiveMission(supabase, organizationId);
    if (!mission) {
      return { ok: false, message: "No active mission to start runtime for." };
    }

    const result = await startMissionRuntime({
      supabase,
      organizationId,
      missionId: mission.id,
    });

    revalidatePath("/dashboard/runtime");

    return {
      ok: true,
      message:
        result.status === "created"
          ? "Mission runtime started."
          : "Mission runtime already active.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to start runtime.",
    };
  }
}

export async function runMissionRuntimeTickAction(
  _previous: RuntimeActionState,
): Promise<RuntimeActionState> {
  void _previous;
  const { supabase, organizationId } = await getOrganizationContext();

  try {
    const tick = await runMissionRuntimeTick({
      supabase,
      organizationId,
      limit: 1,
      lockedBy: `dev:${organizationId}`,
    });

    revalidatePath("/dashboard/runtime");

    return {
      ok: true,
      message: `Development tick processed ${tick.processed} runtime instance(s).`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Tick failed.",
    };
  }
}

export async function pauseMissionRuntimeAction(
  _previous: RuntimeActionState,
  formData: FormData,
): Promise<RuntimeActionState> {
  void _previous;
  const { organizationId } = await getOrganizationContext();
  const runtimeInstanceId = String(formData.get("runtimeInstanceId") ?? "");

  try {
    await pauseMissionRuntime({
      organizationId,
      runtimeInstanceId,
      reason: "Development pause control.",
    });
    revalidatePath("/dashboard/runtime");
    return { ok: true, message: "Mission runtime paused." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Pause failed.",
    };
  }
}

export async function resumeMissionRuntimeAction(
  _previous: RuntimeActionState,
  formData: FormData,
): Promise<RuntimeActionState> {
  void _previous;
  const { organizationId } = await getOrganizationContext();
  const runtimeInstanceId = String(formData.get("runtimeInstanceId") ?? "");

  try {
    await resumeMissionRuntime({ organizationId, runtimeInstanceId });
    revalidatePath("/dashboard/runtime");
    return { ok: true, message: "Mission runtime resumed." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Resume failed.",
    };
  }
}

export async function cancelMissionRuntimeAction(
  _previous: RuntimeActionState,
  formData: FormData,
): Promise<RuntimeActionState> {
  void _previous;
  const { organizationId } = await getOrganizationContext();
  const runtimeInstanceId = String(formData.get("runtimeInstanceId") ?? "");

  try {
    await cancelMissionRuntime({
      organizationId,
      runtimeInstanceId,
      reason: "Development cancel control.",
    });
    revalidatePath("/dashboard/runtime");
    return { ok: true, message: "Mission runtime cancelled (history preserved)." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Cancel failed.",
    };
  }
}
