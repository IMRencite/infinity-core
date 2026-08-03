import { redirect } from "next/navigation";
import { MissionRuntimePanel } from "@/components/dashboard/mission-runtime-panel";
import { buildMissionRuntimeDiagnostics } from "@/lib/infinity/mission-runtime";
import { inspectMissionRuntimeStage } from "@/lib/infinity/mission-runtime/stage-inspection";
import { parseRuntimeContext } from "@/lib/infinity/mission-runtime/types";
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
      ? await (async () => {
          const row = runtimeRows[0]!;
          const instance = {
            id: String(row.id),
            organizationId: String(row.organization_id),
            missionId: String(row.mission_id),
            runtimeVersion: String(row.runtime_version),
            status: row.status as import("@/lib/infinity/mission-runtime").MissionRuntimeInstance["status"],
            currentStage: row.current_stage as import("@/lib/infinity/mission-runtime").MissionRuntimeInstance["currentStage"],
            previousStage: (row.previous_stage as import("@/lib/infinity/mission-runtime").MissionRuntimeInstance["currentStage"]) ?? null,
            stateVersion: Number(row.state_version),
            startedAt: row.started_at as string | null,
            lastAdvancedAt: row.last_advanced_at as string | null,
            pausedAt: row.paused_at as string | null,
            resumedAt: row.resumed_at as string | null,
            completedAt: row.completed_at as string | null,
            failedAt: row.failed_at as string | null,
            cancelledAt: row.cancelled_at as string | null,
            wakeAt: row.wake_at as string | null,
            correlationId: row.correlation_id as string | null,
            lockedBy: row.locked_by as string | null,
            lockedAt: row.locked_at as string | null,
            leaseExpiresAt: row.lease_expires_at as string | null,
            heartbeatAt: row.heartbeat_at as string | null,
            lastError: row.last_error ?? {},
            context: parseRuntimeContext(row.context as import("@/lib/supabase/database.types").Json),
            metadata: row.metadata ?? {},
            createdAt: String(row.created_at),
            updatedAt: String(row.updated_at),
          };
          const inspection = await inspectMissionRuntimeStage(
            supabase,
            organizationId,
            instance.missionId,
            instance.id,
          );
          return buildMissionRuntimeDiagnostics(instance, { inspection });
        })()
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
