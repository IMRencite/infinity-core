"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createMission,
  getActiveMission,
  runDiscoveryCommandCycle,
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

  return { supabase, organizationId: membership.organization_id };
}

export async function activateDefaultMission(
  _previous: CommandActionState,
): Promise<CommandActionState> {
  void _previous;
  const { supabase, organizationId } = await getOrganizationContext();

  const existing = await getActiveMission(supabase, organizationId);

  if (existing) {
    return {
      ok: true,
      message: `Active mission already set: "${existing.title}".`,
    };
  }

  try {
    const mission = await createMission(supabase, {
      organizationId,
      title: "Autonomous venture discovery and validation",
      description:
        "Continuously discover, evaluate, and validate venture opportunities within bounded autonomy.",
      objectives: [
        {
          key: "maintain_pipeline",
          description: "Keep an opportunity pipeline under active discovery",
        },
      ],
      constraints: {
        discovery_scan_type: "broad_market",
      },
      activate: true,
    });

    revalidatePath("/dashboard");

    return {
      ok: true,
      message: `Mission activated: "${mission.title}".`,
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
  const { supabase, organizationId } = await getOrganizationContext();

  try {
    const result = await runDiscoveryCommandCycle(supabase, organizationId, "manual");

    revalidatePath("/dashboard");

    if (result.status === "completed") {
      return {
        ok: true,
        message: `Command cycle completed. Correlation ${result.correlationId.slice(0, 8)}…`,
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
