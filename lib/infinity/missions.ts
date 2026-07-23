import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CreateMissionInput, Mission } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function getActiveMission(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<Mission | null> {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load active mission: ${error.message}`);
  }

  return data;
}

export async function createMission(
  supabase: InfinitySupabase,
  input: CreateMissionInput,
): Promise<Mission> {
  const shouldActivate = input.activate ?? true;

  if (shouldActivate) {
    const { error: pauseError } = await supabase
      .from("missions")
      .update({ status: "paused" })
      .eq("organization_id", input.organizationId)
      .eq("status", "active")
      .is("deleted_at", null);

    if (pauseError) {
      throw new Error(`Failed to pause existing mission: ${pauseError.message}`);
    }
  }

  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .insert({
      organization_id: input.organizationId,
      title: input.title,
      description: input.description ?? null,
      objectives: (input.objectives ?? []) as Json,
      constraints: (input.constraints ?? {}) as Json,
      status: shouldActivate ? "active" : "draft",
      activated_at: shouldActivate ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (missionError || !mission) {
    throw new Error(
      `Failed to create mission: ${missionError?.message ?? "unknown error"}`,
    );
  }

  const { error: policyError } = await supabase.from("mission_policies").insert({
    organization_id: input.organizationId,
    mission_id: mission.id,
    policy_category: "discovery",
    policy_key: "autonomous_scan",
    autonomy_level: "bounded_autonomy",
    config: {
      max_experiment_usd: 25,
      allow_stub_scans: true,
    },
  });

  if (policyError) {
    throw new Error(`Failed to create mission policy: ${policyError.message}`);
  }

  return mission;
}
