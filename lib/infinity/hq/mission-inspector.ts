import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { redactSecrets } from "./formatters";
import type { MissionInspectorData } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

function sanitizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase().includes("api_key") || key.toLowerCase().includes("secret")) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "string") {
      out[key] = redactSecrets(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function loadMissionInspector(
  supabase: InfinitySupabase,
  organizationId: string,
  missionId: string,
): Promise<MissionInspectorData | null> {
  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", missionId)
    .is("deleted_at", null)
    .maybeSingle();

  if (missionError || !mission) {
    return null;
  }

  const { data: runtime } = await supabase
    .from("mission_runtime_instances")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const runtimeId = runtime?.id ?? null;

  const [
    { data: transitions },
    { data: checkpoints },
    { data: validationRuns },
    { data: reasoningSessions },
    { data: executiveDecisions },
    { data: allocationProposals },
    { data: engineJobs },
    { data: workerRuns },
    { data: events },
  ] = await Promise.all([
    runtimeId
      ? supabase
          .from("mission_runtime_transitions")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("runtime_instance_id", runtimeId)
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] }),
    runtimeId
      ? supabase
          .from("mission_runtime_checkpoints")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("runtime_instance_id", runtimeId)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
    supabase
      .from("validation_runs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("reasoning_sessions")
      .select(
        "id, status, recommendation, confidence, latency_ms, estimated_cost, usage, mode, model, provider, created_at, opportunity_id, validation_run_id, executive_decision_id",
      )
      .eq("organization_id", organizationId)
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("executive_decisions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("allocation_proposals")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("engine_jobs")
      .select(
        "id, status, capability_key, attempt_count, max_attempts, created_at, last_error, runtime_instance_id",
      )
      .eq("organization_id", organizationId)
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("worker_runs")
      .select("id, status, duration_ms, error, engine_job_id, created_at")
      .eq("organization_id", organizationId)
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("engine_events")
      .select("id, event_type, severity, message, created_at, payload")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const opportunityIds = new Set<string>();
  for (const row of validationRuns ?? []) {
    opportunityIds.add(row.opportunity_id);
  }
  for (const row of executiveDecisions ?? []) {
    opportunityIds.add(row.opportunity_id);
  }
  for (const row of reasoningSessions ?? []) {
    if (row.opportunity_id) {
      opportunityIds.add(row.opportunity_id);
    }
  }

  const oppIdList = [...opportunityIds];
  const [{ data: opportunities }, { data: blueprint }] = await Promise.all([
    oppIdList.length
      ? supabase
          .from("opportunities")
          .select("*")
          .eq("organization_id", organizationId)
          .in("id", oppIdList)
      : Promise.resolve({ data: [] }),
    oppIdList.length
      ? supabase
          .from("venture_blueprints")
          .select("*")
          .eq("organization_id", organizationId)
          .in("opportunity_id", oppIdList)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const filteredEvents = (events ?? []).filter((event) => {
    if (typeof event.payload !== "object" || event.payload === null || Array.isArray(event.payload)) {
      return event.message.includes(missionId);
    }
    const payload = event.payload as Record<string, unknown>;
    return payload.mission_id === missionId || payload.missionId === missionId;
  });

  const blueprintForMission =
    blueprint && oppIdList.includes(blueprint.opportunity_id) ? blueprint : null;

  return {
    mission: sanitizeRecord(mission as unknown as Record<string, unknown>),
    runtime: runtime ? sanitizeRecord(runtime as unknown as Record<string, unknown>) : null,
    transitions: (transitions ?? []).map((t) => sanitizeRecord(t as unknown as Record<string, unknown>)),
    checkpoints: (checkpoints ?? []).map((c) => sanitizeRecord(c as unknown as Record<string, unknown>)),
    opportunities: (opportunities ?? []).map((o) => sanitizeRecord(o as unknown as Record<string, unknown>)),
    validationRuns: (validationRuns ?? []).map((v) =>
      sanitizeRecord(v as unknown as Record<string, unknown>),
    ),
    reasoningSessions: (reasoningSessions ?? []).map((s) =>
      sanitizeRecord(s as unknown as Record<string, unknown>),
    ),
    executiveDecisions: (executiveDecisions ?? []).map((d) =>
      sanitizeRecord(d as unknown as Record<string, unknown>),
    ),
    allocationProposals: (allocationProposals ?? []).map((a) =>
      sanitizeRecord(a as unknown as Record<string, unknown>),
    ),
    engineJobs: (engineJobs ?? []).map((j) => sanitizeRecord(j as unknown as Record<string, unknown>)),
    workerRuns: (workerRuns ?? []).map((w) => sanitizeRecord(w as unknown as Record<string, unknown>)),
    blueprint: blueprintForMission
      ? sanitizeRecord(blueprintForMission as unknown as Record<string, unknown>)
      : null,
    events: filteredEvents.map((e) => sanitizeRecord(e as unknown as Record<string, unknown>)),
  };
}
