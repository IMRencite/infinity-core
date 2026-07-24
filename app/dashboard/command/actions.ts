"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ensureFoundingMission,
  runDiscoveryCommandCycle,
  runNextQueuedJob,
} from "@/lib/infinity/orchestration";
import { createClient } from "@/lib/supabase/server";

export type CommandActionState = {
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

export async function activateDefaultMission(
  _previous: CommandActionState,
): Promise<CommandActionState> {
  void _previous;
  const { supabase, organizationId } = await getOrganizationContext();

  try {
    const result = await ensureFoundingMission(supabase, organizationId);

    revalidatePath("/dashboard");

    if (result.action === "created") {
      return {
        ok: true,
        message: `Founding mission activated: "${result.mission.title}".`,
      };
    }

    if (result.action === "updated") {
      return {
        ok: true,
        message: `Founding mission aligned: "${result.mission.title}".`,
      };
    }

    return {
      ok: true,
      message: `Active mission: "${result.mission.title}".`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Unable to activate mission.",
    };
  }
}

export async function runCommandCycle(
  _previous: CommandActionState,
): Promise<CommandActionState> {
  void _previous;
  const { supabase, organizationId, userId } = await getOrganizationContext();

  try {
    const result = await runDiscoveryCommandCycle(
      supabase,
      organizationId,
      `user:${userId}`,
      "manual",
    );

    revalidatePath("/dashboard");

    if (result.status === "completed") {
      return {
        ok: true,
        message: [
          "Durable Command cycle completed.",
          `Mission ${result.missionId.slice(0, 8)}…`,
          `Cycle ${result.cycleId.slice(0, 8)}…`,
          `Decision ${result.decisionId.slice(0, 8)}…`,
          `Plan ${result.planId.slice(0, 8)}…`,
          `Step ${result.planStepId.slice(0, 8)}…`,
          `Job ${result.jobId.slice(0, 8)}… (${result.jobStatus})`,
          `Worker run ${result.workerRunId.slice(0, 8)}… (${result.workerRunStatus})`,
          result.opportunityScanId
            ? `Scan ${result.opportunityScanId.slice(0, 8)}…`
            : "Scan none",
        ].join(" "),
      };
    }

    if (result.status === "skipped") {
      return {
        ok: true,
        message: result.message,
      };
    }

    return {
      ok: false,
      message: result.message,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Command cycle failed unexpectedly.",
    };
  }
}

export async function runNextQueuedJobAction(
  _previous: CommandActionState,
): Promise<CommandActionState> {
  void _previous;
  const { supabase, organizationId, userId } = await getOrganizationContext();

  try {
    const result = await runNextQueuedJob(
      supabase,
      organizationId,
      `user:${userId}`,
    );

    revalidatePath("/dashboard");

    if (result.status === "completed") {
      return {
        ok: true,
        message: result.message,
      };
    }

    if (result.status === "skipped") {
      return {
        ok: true,
        message: result.message,
      };
    }

    if (
      result.status === "waiting" ||
      result.status === "dead_letter" ||
      result.status === "cancelled" ||
      result.status === "already_terminal"
    ) {
      return {
        ok: result.status === "waiting",
        message: [
          result.message,
          `Job ${result.engineJobId.slice(0, 8)}… (${result.engineJobStatus})`,
          result.workerRunId
            ? `Worker run ${result.workerRunId.slice(0, 8)}… (${result.workerRunStatus})`
            : "Worker run none",
          result.opportunityScanId
            ? `Scan ${result.opportunityScanId.slice(0, 8)}…`
            : "Scan none",
        ].join(" "),
      };
    }

    return {
      ok: false,
      message: result.message,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Queued engine job execution failed unexpectedly.",
    };
  }
}
