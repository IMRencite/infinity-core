import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createMission } from "@/lib/infinity/missions";
import type { LearningDecision } from "../types";
import { mapDecisionToMissionTarget } from "../learning/learning-decision-engine";

type InfinitySupabase = SupabaseClient<Database>;

export type MissionHandoffResult = {
  decisionId: string;
  missionId: string | null;
  targetEngine: string | null;
  executed: boolean;
  handoffMode: "draft" | "active" | "skipped";
};

export async function handoffLearningDecisionToMission(input: {
  supabase: InfinitySupabase;
  organizationId: string;
  decision: LearningDecision;
  executeMissions: boolean;
  enableHandoff: boolean;
}): Promise<MissionHandoffResult> {
  if (!input.enableHandoff || input.decision.status !== "READY") {
    return {
      decisionId: input.decision.decisionId,
      missionId: null,
      targetEngine: mapDecisionToMissionTarget(input.decision),
      executed: false,
      handoffMode: "skipped",
    };
  }

  const targetEngine = mapDecisionToMissionTarget(input.decision);
  const title = `[Performance] ${input.decision.decisionType} — ${input.decision.ventureId}`;
  const description = [
    `Learning decision ${input.decision.decisionId}`,
    `Target engine: ${targetEngine ?? "general"}`,
    ...input.decision.economicAnalysis,
  ].join("\n");

  const mission = await createMission(input.supabase, {
    organizationId: input.organizationId,
    title,
    description,
    objectives: [
      {
        kind: "performance_optimization",
        decisionType: input.decision.decisionType,
        ventureId: input.decision.ventureId,
        targetEngine,
        decisionId: input.decision.decisionId,
        opportunityId: input.decision.opportunityId,
      },
    ],
    constraints: {
      performanceIntelligenceHandoff: true,
      nonExecutingVerification: !input.executeMissions,
      targetEngine,
      learningDecisionId: input.decision.decisionId,
    },
    activate: input.executeMissions,
  });

  return {
    decisionId: input.decision.decisionId,
    missionId: mission.id,
    targetEngine,
    executed: input.executeMissions,
    handoffMode: input.executeMissions ? "active" : "draft",
  };
}

export async function handoffLearningDecisions(input: {
  supabase: InfinitySupabase;
  organizationId: string;
  decisions: LearningDecision[];
  executeMissions: boolean;
  enableHandoff: boolean;
}): Promise<MissionHandoffResult[]> {
  const results: MissionHandoffResult[] = [];
  for (const decision of input.decisions) {
    results.push(
      await handoffLearningDecisionToMission({
        supabase: input.supabase,
        organizationId: input.organizationId,
        decision,
        executeMissions: input.executeMissions,
        enableHandoff: input.enableHandoff,
      }),
    );
  }
  return results;
}
