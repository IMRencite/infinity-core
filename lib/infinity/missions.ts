import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  buildFoundingMissionInput,
  buildDiscoverOpportunitiesMissionInput,
  DISCOVER_OPPORTUNITIES_DISCOVERY_POLICY,
  FOUNDING_DISCOVERY_POLICY,
  FOUNDING_MISSION_KEY,
  isDiscoverOpportunitiesMission,
  isFoundingMission,
  missionNeedsFoundingSync,
} from "./mission-defaults";
import type { CreateMissionInput, Mission } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export type EnsureFoundingMissionResult = {
  mission: Mission;
  action: "created" | "updated" | "unchanged";
};

export type EnsureDiscoverOpportunitiesMissionResult = {
  mission: Mission;
  action: "created" | "updated" | "unchanged";
};

async function findDiscoverOpportunitiesMission(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<Mission | null> {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load missions: ${error.message}`);
  }

  return data?.find((mission) => isDiscoverOpportunitiesMission(mission)) ?? null;
}

async function syncDiscoverOpportunitiesMissionPolicies(
  supabase: InfinitySupabase,
  organizationId: string,
  missionId: string,
) {
  const { data: existingPolicy, error: loadError } = await supabase
    .from("mission_policies")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("policy_category", DISCOVER_OPPORTUNITIES_DISCOVERY_POLICY.policy_category)
    .eq("policy_key", DISCOVER_OPPORTUNITIES_DISCOVERY_POLICY.policy_key)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to load discover opportunities policy: ${loadError.message}`);
  }

  if (existingPolicy) {
    const { error: updateError } = await supabase
      .from("mission_policies")
      .update({
        autonomy_level: DISCOVER_OPPORTUNITIES_DISCOVERY_POLICY.autonomy_level,
        config: DISCOVER_OPPORTUNITIES_DISCOVERY_POLICY.config as unknown as Json,
        is_active: true,
      })
      .eq("id", existingPolicy.id)
      .eq("organization_id", organizationId);

    if (updateError) {
      throw new Error(
        `Failed to update discover opportunities policy: ${updateError.message}`,
      );
    }

    return;
  }

  const { error: insertError } = await supabase.from("mission_policies").insert({
    organization_id: organizationId,
    mission_id: missionId,
    policy_category: DISCOVER_OPPORTUNITIES_DISCOVERY_POLICY.policy_category,
    policy_key: DISCOVER_OPPORTUNITIES_DISCOVERY_POLICY.policy_key,
    autonomy_level: DISCOVER_OPPORTUNITIES_DISCOVERY_POLICY.autonomy_level,
    config: DISCOVER_OPPORTUNITIES_DISCOVERY_POLICY.config as unknown as Json,
  });

  if (insertError) {
    throw new Error(
      `Failed to create discover opportunities policy: ${insertError.message}`,
    );
  }
}

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

async function syncFoundingMissionPolicies(
  supabase: InfinitySupabase,
  organizationId: string,
  missionId: string,
) {
  const { data: existingPolicy, error: loadError } = await supabase
    .from("mission_policies")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("policy_category", FOUNDING_DISCOVERY_POLICY.policy_category)
    .eq("policy_key", FOUNDING_DISCOVERY_POLICY.policy_key)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to load mission policy: ${loadError.message}`);
  }

  if (existingPolicy) {
    const { error: updateError } = await supabase
      .from("mission_policies")
      .update({
        autonomy_level: FOUNDING_DISCOVERY_POLICY.autonomy_level,
        config: FOUNDING_DISCOVERY_POLICY.config as unknown as Json,
        is_active: true,
      })
      .eq("id", existingPolicy.id)
      .eq("organization_id", organizationId);

    if (updateError) {
      throw new Error(`Failed to update mission policy: ${updateError.message}`);
    }

    return;
  }

  const { error: insertError } = await supabase.from("mission_policies").insert({
    organization_id: organizationId,
    mission_id: missionId,
    policy_category: FOUNDING_DISCOVERY_POLICY.policy_category,
    policy_key: FOUNDING_DISCOVERY_POLICY.policy_key,
    autonomy_level: FOUNDING_DISCOVERY_POLICY.autonomy_level,
    config: FOUNDING_DISCOVERY_POLICY.config as unknown as Json,
  });

  if (insertError) {
    throw new Error(`Failed to create mission policy: ${insertError.message}`);
  }
}

async function updateFoundingMissionInPlace(
  supabase: InfinitySupabase,
  organizationId: string,
  missionId: string,
): Promise<Mission> {
  const input = buildFoundingMissionInput(organizationId);

  const { data: mission, error } = await supabase
    .from("missions")
    .update({
      title: input.title,
      description: input.description ?? null,
      objectives: (input.objectives ?? []) as Json,
      constraints: (input.constraints ?? {}) as Json,
    })
    .eq("id", missionId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .select("*")
    .single();

  if (error || !mission) {
    throw new Error(
      `Failed to update founding mission: ${error?.message ?? "unknown error"}`,
    );
  }

  await syncFoundingMissionPolicies(supabase, organizationId, mission.id);

  return mission;
}

export async function ensureFoundingMission(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<EnsureFoundingMissionResult> {
  const active = await getActiveMission(supabase, organizationId);

  if (active) {
    if (!isFoundingMission(active)) {
      return { mission: active, action: "unchanged" };
    }

    if (!missionNeedsFoundingSync(active)) {
      await syncFoundingMissionPolicies(supabase, organizationId, active.id);
      return { mission: active, action: "unchanged" };
    }

    const mission = await updateFoundingMissionInPlace(
      supabase,
      organizationId,
      active.id,
    );

    return { mission, action: "updated" };
  }

  const mission = await createMission(supabase, buildFoundingMissionInput(organizationId));

  return { mission, action: "created" };
}

export async function ensureDiscoverOpportunitiesMission(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<EnsureDiscoverOpportunitiesMissionResult> {
  const existing = await findDiscoverOpportunitiesMission(supabase, organizationId);

  if (existing) {
    await syncDiscoverOpportunitiesMissionPolicies(
      supabase,
      organizationId,
      existing.id,
    );
    return { mission: existing, action: "unchanged" };
  }

  const mission = await createMission(
    supabase,
    buildDiscoverOpportunitiesMissionInput(organizationId),
  );

  await syncDiscoverOpportunitiesMissionPolicies(
    supabase,
    organizationId,
    mission.id,
  );

  return { mission, action: "created" };
}

export async function syncFoundingMissionContent(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<{ mission: Mission | null; action: "updated" | "unchanged" }> {
  const active = await getActiveMission(supabase, organizationId);

  if (!active || !isFoundingMission(active)) {
    return { mission: active, action: "unchanged" };
  }

  if (!missionNeedsFoundingSync(active)) {
    await syncFoundingMissionPolicies(supabase, organizationId, active.id);
    return { mission: active, action: "unchanged" };
  }

  const mission = await updateFoundingMissionInPlace(
    supabase,
    organizationId,
    active.id,
  );

  return { mission, action: "updated" };
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

  const constraints = input.constraints ?? {};
  if (
    typeof constraints === "object" &&
    constraints !== null &&
    !Array.isArray(constraints) &&
    "founding_mission_key" in constraints &&
    String((constraints as Record<string, Json>).founding_mission_key) ===
      FOUNDING_MISSION_KEY
  ) {
    await syncFoundingMissionPolicies(supabase, input.organizationId, mission.id);
  }

  return mission;
}
