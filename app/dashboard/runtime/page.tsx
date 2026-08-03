import { redirect } from "next/navigation";
import { MissionRuntimePanel } from "@/components/dashboard/mission-runtime-panel";
import { buildMissionRuntimeDiagnostics } from "@/lib/infinity/mission-runtime";
import { createClient } from "@/lib/supabase/server";

type OrganizationMembership = {
  organization_id: string;
  organizations: { id: string; name: string } | null;
};

export default async function RuntimePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select(
      `
        organization_id,
        organizations (
          id,
          name
        )
      `,
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle<OrganizationMembership>();

  if (membershipError || !membership?.organizations) {
    redirect("/dashboard/onboarding");
  }

  const organizationId = membership.organization_id;

  const { data: instances } = await supabase
    .from("mission_runtime_instances")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(10);

  const runtimeRows = instances ?? [];

  const runtimeInstanceId = runtimeRows[0]?.id;
  let transitions: Array<Record<string, unknown>> = [];
  let checkpoints: Array<Record<string, unknown>> = [];

  if (runtimeInstanceId) {
    const [transitionResult, checkpointResult] = await Promise.all([
      supabase
        .from("mission_runtime_transitions")
        .select("*")
        .eq("runtime_instance_id", runtimeInstanceId)
        .order("occurred_at", { ascending: false })
        .limit(8),
      supabase
        .from("mission_runtime_checkpoints")
        .select("*")
        .eq("runtime_instance_id", runtimeInstanceId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    transitions = (transitionResult.data ?? []) as Array<Record<string, unknown>>;
    checkpoints = (checkpointResult.data ?? []) as Array<Record<string, unknown>>;
  }

  const diagnostics =
    runtimeRows[0] != null
      ? buildMissionRuntimeDiagnostics({
          id: String(runtimeRows[0].id),
          organizationId: String(runtimeRows[0].organization_id),
          missionId: String(runtimeRows[0].mission_id),
          runtimeVersion: String(runtimeRows[0].runtime_version),
          status: runtimeRows[0].status as import("@/lib/infinity/mission-runtime").MissionRuntimeInstance["status"],
          currentStage: runtimeRows[0].current_stage as import("@/lib/infinity/mission-runtime").MissionRuntimeInstance["currentStage"],
          previousStage: (runtimeRows[0].previous_stage as import("@/lib/infinity/mission-runtime").MissionRuntimeInstance["currentStage"]) ?? null,
          stateVersion: Number(runtimeRows[0].state_version),
          startedAt: runtimeRows[0].started_at as string | null,
          lastAdvancedAt: runtimeRows[0].last_advanced_at as string | null,
          pausedAt: runtimeRows[0].paused_at as string | null,
          resumedAt: runtimeRows[0].resumed_at as string | null,
          completedAt: runtimeRows[0].completed_at as string | null,
          failedAt: runtimeRows[0].failed_at as string | null,
          cancelledAt: runtimeRows[0].cancelled_at as string | null,
          wakeAt: runtimeRows[0].wake_at as string | null,
          correlationId: runtimeRows[0].correlation_id as string | null,
          lockedBy: runtimeRows[0].locked_by as string | null,
          lockedAt: runtimeRows[0].locked_at as string | null,
          leaseExpiresAt: runtimeRows[0].lease_expires_at as string | null,
          heartbeatAt: runtimeRows[0].heartbeat_at as string | null,
          lastError: runtimeRows[0].last_error ?? {},
          context: {
            idempotency: {},
            stageArtifacts: {},
            blockingReason: null,
            lastWorkRequestKey: null,
            recoveryNotes: [],
          },
          metadata: runtimeRows[0].metadata ?? {},
          createdAt: String(runtimeRows[0].created_at),
          updatedAt: String(runtimeRows[0].updated_at),
        })
      : null;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-white sm:text-[2.125rem]">
          Runtime
        </h1>
        <p className="mt-2 text-[15px] font-medium text-zinc-300">
          {membership.organizations.name}
        </p>
        <p className="mt-1 text-[13px] text-zinc-500">
          Read-only mission lifecycle state. Production advancement runs autonomously via bounded
          ticks — manual controls below are development-only.
        </p>
      </header>

      <MissionRuntimePanel
        instances={runtimeRows}
        transitions={transitions}
        checkpoints={checkpoints}
        diagnostics={diagnostics}
      />
    </div>
  );
}
