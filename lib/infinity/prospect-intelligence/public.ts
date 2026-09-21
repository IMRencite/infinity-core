import type { ProspectCycleSnapshot } from "./types";

export function projectPublicProspectIntelligence(snapshot: ProspectCycleSnapshot) {
  return {
    department: "PROSPECT_INTELLIGENCE" as const,
    status: snapshot.activity,
    activity: snapshot.generic_activity,
    agentCount: snapshot.activity === "ACTIVE" ? 2 : snapshot.activity === "MONITORING" ? 1 : 0,
    workflowStage: snapshot.workflow_stage,
    recentOutput: snapshot.activity === "IDLE" ? "No active processing batch." : snapshot.generic_activity,
  };
}

export function publicProspectActivityCopy(status: "IDLE" | "MONITORING" | "ACTIVE"): string {
  if (status === "ACTIVE") return "Discovering commercial entities";
  if (status === "MONITORING") return "Refreshing market intelligence";
  return "Maintaining commercial entity coverage";
}
