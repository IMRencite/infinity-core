import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { registerOpportunity } from "@/lib/infinity/opportunities";
import { createMission } from "@/lib/infinity/missions";
import { insertVentureAssembly } from "@/lib/infinity/venture-assembly/persistence";
import { VENTURE_ASSEMBLY_MANIFEST_SCHEMA_VERSION } from "@/lib/infinity/venture-assembly/constants";
import {
  buildCanonicalVentureAssemblyIdentity,
  persistCanonicalVentureAssemblyIdentity,
} from "@/lib/infinity/venture-assembly/identity";

export type VentureBridgeInput = {
  organizationId: string;
  cycleKey: string;
  ventureName: string;
  opportunityCandidateId: string;
  discoveryRunId: string;
  companyBuilderBlueprintId: string | null;
  candidateSummary?: string | null;
  targetCustomer?: string | null;
  problem?: string | null;
  businessModel?: string | null;
};

export type VentureBridgeResult = {
  missionId: string;
  opportunityId: string;
  planId: string;
  planExecutionId: string;
  executiveDecisionId: string;
  ventureAssemblyId: string;
};

export async function bridgeFirstAutonomousVenture(
  admin: AdminSupabaseClient,
  input: VentureBridgeInput,
): Promise<VentureBridgeResult> {
  const correlationId = randomUUID();
  const idempotencyBase = `first-autonomous-venture-v1:${input.organizationId}:${input.cycleKey}`;

  const { data: scan, error: scanError } = await admin
    .from("opportunity_scans")
    .insert({
      organization_id: input.organizationId,
      status: "completed",
      scan_type: "manual_test",
      objective: "First Autonomous Venture Cycle V1",
      search_scope: { cycle: input.cycleKey, discovery_run_id: input.discoveryRunId },
      constraints: { first_autonomous_venture: true },
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      opportunities_discovered: 1,
      metadata: { source: "first_autonomous_venture_cycle_v1" },
    })
    .select("id")
    .single();
  if (scanError || !scan) throw new Error(scanError?.message ?? "scan insert failed");

  const opportunity = await registerOpportunity(admin, {
    organizationId: input.organizationId,
    scanId: scan.id,
    discoveryDedupKey: `first-autonomous:${input.opportunityCandidateId}`,
    name: input.ventureName,
    summary: input.candidateSummary,
    problem: input.problem,
    targetCustomer: input.targetCustomer,
    businessModel: input.businessModel,
    status: "discovered",
    decision: "approved",
    confidenceScore: 75,
    overallScore: 75,
    metadata: {
      first_autonomous_venture_cycle_v1: true,
      opportunity_candidate_id: input.opportunityCandidateId,
      discovery_run_id: input.discoveryRunId,
    },
    correlationId,
  });

  const mission = await createMission(admin, {
    organizationId: input.organizationId,
    title: `First Autonomous Venture — ${input.ventureName}`,
    description: "Controlled first autonomous venture cycle mission (V1).",
    objectives: [{ kind: "first_autonomous_venture_v1", opportunityCandidateId: input.opportunityCandidateId }],
    constraints: {
      first_autonomous_venture_cycle_v1: true,
      opportunity_candidate_id: input.opportunityCandidateId,
      non_executing_follow_up: false,
    },
    activate: false,
  });

  const { data: cycle, error: cycleError } = await admin
    .from("command_cycles")
    .insert({
      organization_id: input.organizationId,
      mission_id: mission.id,
      status: "completed",
      trigger_source: "system",
      summary: { first_autonomous_venture_cycle_v1: true, venture_name: input.ventureName },
      correlation_id: correlationId,
    })
    .select("id")
    .single();
  if (cycleError || !cycle) throw new Error(cycleError?.message ?? "command cycle insert failed");

  const executiveDecisionId = randomUUID();
  const { data: decision, error: decisionError } = await admin
    .from("command_decisions")
    .insert({
      id: executiveDecisionId,
      organization_id: input.organizationId,
      command_cycle_id: cycle.id,
      mission_id: mission.id,
      decision_type: "first_autonomous_venture_selection",
      outcome: "build_selected_venture",
      reasoning: "First Autonomous Venture Cycle V1 selected a validated opportunity for company build.",
      confidence: 80,
      payload: {
        opportunity_candidate_id: input.opportunityCandidateId,
        discovery_run_id: input.discoveryRunId,
      },
    })
    .select("id")
    .single();
  if (decisionError || !decision) throw new Error(decisionError?.message ?? "command decision insert failed");

  const { data: plan, error: planError } = await admin
    .from("plans")
    .insert({
      organization_id: input.organizationId,
      command_decision_id: decision.id,
      mission_id: mission.id,
      command_cycle_id: cycle.id,
      version: 1,
      status: "active",
      title: `Build ${input.ventureName}`,
      objectives: [{ key: "build_first_autonomous_venture", description: "Execute first autonomous venture cycle" }],
      metadata: {
        first_autonomous_venture_cycle_v1: true,
        company_builder_blueprint_id: input.companyBuilderBlueprintId,
      },
    })
    .select("id")
    .single();
  if (planError || !plan) throw new Error(planError?.message ?? "plan insert failed");

  const planExecutionId = randomUUID();
  const { error: peError } = await admin.from("plan_executions").insert({
    id: planExecutionId,
    organization_id: input.organizationId,
    mission_id: mission.id,
    opportunity_id: opportunity.id,
    executive_decision_id: executiveDecisionId,
    plan_id: plan.id,
    plan_version: 1,
    venture_blueprint_id: null,
    current_phase: "internally_complete",
    status: "internally_complete",
    idempotency_key: `${idempotencyBase}:plan_execution`,
    correlation_id: correlationId,
  });
  if (peError) throw new Error(peError.message);

  const assembly = await insertVentureAssembly(admin, {
    organizationId: input.organizationId,
    missionId: mission.id,
    opportunityId: opportunity.id,
    executiveDecisionId,
    planId: plan.id,
    planVersion: 1,
    planExecutionId,
    ventureBlueprintId: null,
    buildId: null,
    buildJobId: null,
    buildSnapshotId: null,
    idempotencyKey: `${idempotencyBase}:venture_assembly`,
    correlationId,
  });

  const identity = buildCanonicalVentureAssemblyIdentity({
    opportunityCandidateId: input.opportunityCandidateId,
    opportunityId: opportunity.id,
    candidateTitle: input.ventureName,
    origin: "first_autonomous_venture_cycle_v1",
    blueprintId: input.companyBuilderBlueprintId,
  });
  const persisted = persistCanonicalVentureAssemblyIdentity(identity);

  await admin
    .from("venture_assemblies")
    .update({
      identity_package: {
        ...persisted.identityPackage,
        source: identity.origin,
      } as never,
      manifest: {
        schemaVersion: VENTURE_ASSEMBLY_MANIFEST_SCHEMA_VERSION,
        ventureIdentity: {
          workingName: identity.workingName,
          displayName: identity.displayName,
        },
        firstAutonomousVentureCycleV1: true,
        ...persisted.manifestLineage,
      } as never,
    })
    .eq("id", assembly.id)
    .eq("organization_id", input.organizationId);

  return {
    missionId: mission.id,
    opportunityId: opportunity.id,
    planId: plan.id,
    planExecutionId,
    executiveDecisionId,
    ventureAssemblyId: assembly.id,
  };
}
