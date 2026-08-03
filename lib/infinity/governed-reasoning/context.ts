import { createHash } from "node:crypto";
import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { GOVERNED_REASONING_PROMPT_VERSION } from "./constants";

export type ContextManifest = {
  includedRecordIds: string[];
  evidenceReferenceIds: string[];
  prohibitedActions: string[];
  unknowns: string[];
  organizationId: string;
  missionId: string | null;
  opportunityId: string | null;
  validationRunId: string | null;
  executiveDecisionId: string | null;
};

export type BoundedReasoningContext = {
  manifest: ContextManifest;
  contextHash: string;
  promptVersion: typeof GOVERNED_REASONING_PROMPT_VERSION;
  userPayload: Record<string, unknown>;
};

type InfinitySupabase = SupabaseClient<Database>;

export function hashContextManifest(manifest: ContextManifest): string {
  return createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
}

export async function buildBoundedReasoningContext(
  supabase: InfinitySupabase,
  input: {
    organizationId: string;
    missionId: string;
    opportunityId: string;
    validationRunId?: string | null;
    executiveDecisionId?: string | null;
  },
): Promise<BoundedReasoningContext> {
  const { organizationId, missionId, opportunityId } = input;

  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("id, title, description, objectives, constraints, status")
    .eq("id", missionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (missionError || !mission) {
    throw new Error("Mission not found for organization.");
  }

  const { data: opportunity, error: opportunityError } = await supabase
    .from("opportunities")
    .select("id, name, summary, industry, category, problem, status")
    .eq("id", opportunityId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (opportunityError || !opportunity) {
    throw new Error("Opportunity not found for organization.");
  }

  const { data: validationRun } = await supabase
    .from("validation_runs")
    .select("id, recommendation, overall_score, overall_confidence, summary")
    .eq("organization_id", organizationId)
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: evaluation } = await supabase
    .from("opportunity_evaluations")
    .select("id, recommendation, overall_score, reasoning")
    .eq("organization_id", organizationId)
    .eq("opportunity_id", opportunityId)
    .order("evaluated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: executiveDecision } = await supabase
    .from("executive_decisions")
    .select("id, decision, planning_eligible, rationale")
    .eq("organization_id", organizationId)
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const evidenceReferenceIds: string[] = [];
  const includedRecordIds = [
    `mission:${mission.id}`,
    `opportunity:${opportunity.id}`,
  ];

  if (validationRun) {
    includedRecordIds.push(`validation_run:${validationRun.id}`);
    evidenceReferenceIds.push(`validation_run:${validationRun.id}`);
  }

  if (evaluation) {
    includedRecordIds.push(`evaluation:${evaluation.id}`);
    evidenceReferenceIds.push(`evaluation:${evaluation.id}`);
  }

  if (executiveDecision) {
    includedRecordIds.push(`executive_decision:${executiveDecision.id}`);
    evidenceReferenceIds.push(`executive_decision:${executiveDecision.id}`);
  }

  const manifest: ContextManifest = {
    organizationId,
    missionId: mission.id,
    opportunityId: opportunity.id,
    validationRunId: validationRun?.id ?? input.validationRunId ?? null,
    executiveDecisionId: executiveDecision?.id ?? input.executiveDecisionId ?? null,
    includedRecordIds,
    evidenceReferenceIds,
    prohibitedActions: [
      "spend_money",
      "reserve_resources",
      "approve_planning",
      "create_venture",
      "create_asset",
      "deploy_website",
      "publish_content",
      "invoke_tools",
      "external_research",
    ],
    unknowns: [],
  };

  const userPayload = {
    mission: {
      id: mission.id,
      title: mission.title,
      objective: mission.objectives,
      constraints: mission.constraints,
    },
    opportunity: {
      id: opportunity.id,
      name: opportunity.name,
      summary: opportunity.summary,
      industry: opportunity.industry,
      category: opportunity.category,
      problem: opportunity.problem,
    },
    validation: validationRun ?? null,
    evaluation: evaluation ?? null,
    executive: executiveDecision ?? null,
    evidenceReferenceIds,
    prohibitedActions: manifest.prohibitedActions,
  };

  return {
    manifest,
    contextHash: hashContextManifest(manifest),
    promptVersion: GOVERNED_REASONING_PROMPT_VERSION,
    userPayload,
  };
}

export function manifestToJson(manifest: ContextManifest): Json {
  return manifest as unknown as Json;
}
