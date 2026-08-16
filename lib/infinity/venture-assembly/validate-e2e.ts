import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { registerRuntimeWorkers } from "@/lib/infinity/runtime";
import { schedulePlanStep } from "@/lib/infinity/scheduler";
import { runJobToCompletion } from "@/lib/infinity/build-factory/validate-e2e";
import { runAutonomousPlanExecutionE2EValidation } from "@/lib/infinity/plan-execution/validate-e2e";
import {
  VENTURE_ASSEMBLY_CAPABILITY,
  VENTURE_ASSEMBLY_QA_CAPABILITY,
  VENTURE_ASSEMBLY_INTERNAL_LABEL,
  VENTURE_ASSEMBLY_POLICY_VERSION,
} from "@/lib/infinity/venture-assembly/constants";
import {
  requestVentureAssembly,
} from "@/lib/infinity/venture-assembly/orchestrator";
import { ventureAssemblyIdempotencyKey } from "@/lib/infinity/venture-assembly/idempotency";
import {
  countVentureAssembliesForIdempotencyPrefix,
  loadVentureAssemblyById,
} from "@/lib/infinity/venture-assembly/persistence";
import { evaluateVentureAssemblyGates } from "@/lib/infinity/venture-assembly/gates";
import type { Plan, PlanStep } from "@/lib/infinity/types";

export const VA_E2E_LABEL = "venture_assembly_e2e_v1";

export type VentureAssemblyE2EReport = {
  pass: boolean;
  errors: string[];
  organizationId: string;
  missionId: string;
  planExecutionId: string | null;
  ventureAssemblyId: string | null;
  companyId: string | null;
  readinessStatus: string | null;
  assemblyStatus: string | null;
  qaVerdict: string | null;
  assemblyCountForIdempotency: number;
  externalSideEffects: {
    deployments: number;
    companiesDelta: number;
  };
  phaseTimingsMs: Record<string, number>;
};

async function countCompanies(admin: AdminSupabaseClient, orgId: string): Promise<number> {
  const { count } = await admin
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .is("deleted_at", null);
  return count ?? 0;
}

async function ensurePlanStep(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    planId: string;
    capabilityKey: string;
    constraints: Record<string, unknown>;
    stepOrder: number;
  },
): Promise<PlanStep> {
  const { data: existing } = await admin
    .from("plan_steps")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("plan_id", input.planId)
    .eq("capability_key", input.capabilityKey)
    .maybeSingle();

  if (existing) {
    await admin
      .from("plan_steps")
      .update({ constraints: input.constraints as Json, status: "pending" })
      .eq("id", existing.id);
    return existing as PlanStep;
  }

  const { data: inserted, error } = await admin
    .from("plan_steps")
    .insert({
      organization_id: input.organizationId,
      plan_id: input.planId,
      capability_key: input.capabilityKey,
      title: input.capabilityKey,
      step_order: input.stepOrder,
      status: "pending",
      constraints: input.constraints as Json,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "plan step insert failed");
  }
  return inserted as PlanStep;
}

export async function runVentureAssemblyE2EValidation(
  admin: AdminSupabaseClient,
): Promise<VentureAssemblyE2EReport> {
  registerRuntimeWorkers();
  const errors: string[] = [];
  const phaseTimingsMs: Record<string, number> = {};
  const t0 = performance.now();

  const externalBefore = {
    deployments: 0,
    companies: 0,
  };

  let t = performance.now();
  const ape = await runAutonomousPlanExecutionE2EValidation(admin, {
    skipDuplicateProof: true,
    skipRepairProof: true,
    skipExternalStepProof: true,
  });
  phaseTimingsMs.plan_execution_prerequisite = Math.round(performance.now() - t);

  if (!ape.pass || !ape.planExecutionId || !ape.planId) {
    return {
      pass: false,
      errors: [...ape.errors, "plan execution prerequisite failed"],
      organizationId: ape.organizationId,
      missionId: ape.missionId,
      planExecutionId: ape.planExecutionId,
      ventureAssemblyId: null,
      companyId: null,
      readinessStatus: null,
      assemblyStatus: null,
      qaVerdict: null,
      assemblyCountForIdempotency: 0,
      externalSideEffects: { deployments: 0, companiesDelta: 0 },
      phaseTimingsMs,
    };
  }

  const orgId = ape.organizationId;
  const { data: peRow } = await admin
    .from("plan_executions")
    .select("opportunity_id")
    .eq("id", ape.planExecutionId)
    .single();
  const opportunityId = peRow?.opportunity_id ?? "";

  externalBefore.companies = await countCompanies(admin, orgId);

  t = performance.now();
  const requested = await requestVentureAssembly(admin, {
    organizationId: orgId,
    missionId: ape.missionId,
    planExecutionId: ape.planExecutionId,
    correlationId: ape.correlationId,
  });
  if (requested.status === "blocked") {
    errors.push(requested.reason);
  }
  const ventureAssemblyId =
    requested.status !== "blocked" ? requested.ventureAssemblyId : null;

  if (ventureAssemblyId) {
    const { data: mission } = await admin.from("missions").select("*").eq("id", ape.missionId).single();
    const { data: plan } = await admin.from("plans").select("*").eq("id", ape.planId).single();
    const { data: cycle } = await admin
      .from("command_cycles")
      .select("*")
      .eq("id", plan!.command_cycle_id)
      .single();

    const assembleConstraints = {
      organization_id: orgId,
      mission_id: ape.missionId,
      plan_execution_id: ape.planExecutionId,
      venture_assembly_id: ventureAssemblyId,
      opportunity_id: opportunityId,
    };
    const assembleStep = await ensurePlanStep(admin, {
      organizationId: orgId,
      planId: ape.planId,
      capabilityKey: VENTURE_ASSEMBLY_CAPABILITY,
      constraints: assembleConstraints,
      stepOrder: 950,
    });

    const assembleJob = await schedulePlanStep(
      admin,
      orgId,
      cycle!,
      mission!,
      plan as Plan,
      assembleStep,
    );
    const assembleExec = await runJobToCompletion(
      admin,
      assembleJob.id,
      orgId,
      VENTURE_ASSEMBLY_CAPABILITY,
    );
    if (assembleExec.status !== "completed") {
      errors.push("venture.assemble_internal_package did not complete");
    }

    const qaConstraints = {
      organization_id: orgId,
      mission_id: ape.missionId,
      venture_assembly_id: ventureAssemblyId,
      opportunity_id: opportunityId,
    };
    const qaStep = await ensurePlanStep(admin, {
      organizationId: orgId,
      planId: ape.planId,
      capabilityKey: VENTURE_ASSEMBLY_QA_CAPABILITY,
      constraints: qaConstraints,
      stepOrder: 951,
    });
    const qaJob = await schedulePlanStep(admin, orgId, cycle!, mission!, plan as Plan, qaStep);
    const qaExec = await runJobToCompletion(admin, qaJob.id, orgId, VENTURE_ASSEMBLY_QA_CAPABILITY);
    if (qaExec.status !== "completed") {
      errors.push("qa.verify_venture_assembly did not complete");
    } else {
      const qaOut = qaExec.output as Record<string, unknown>;
      if (qaOut.verdict !== "pass") {
        errors.push(`assembly QA failed: ${JSON.stringify(qaOut.issues ?? [])}`);
      }
    }

    const replayRequest = await requestVentureAssembly(admin, {
      organizationId: orgId,
      missionId: ape.missionId,
      planExecutionId: ape.planExecutionId,
    });
    if (replayRequest.status !== "reused") {
      errors.push(`expected assembly reuse, got ${replayRequest.status}`);
    }
  }
  phaseTimingsMs.assembly_and_qa = Math.round(performance.now() - t);

  const assembly = ventureAssemblyId
    ? await loadVentureAssemblyById(admin, orgId, ventureAssemblyId)
    : null;

  const gates = await evaluateVentureAssemblyGates(admin, {
    organizationId: orgId,
    missionId: ape.missionId,
    planExecutionId: ape.planExecutionId,
  });

  let assemblyCount = 0;
  if (gates.allowed) {
    const key = ventureAssemblyIdempotencyKey({
      organizationId: orgId,
      planExecutionId: ape.planExecutionId,
      planVersion: gates.planExecution.planVersion,
      buildSnapshotId: gates.buildSnapshotId,
      assemblyPolicyVersion: VENTURE_ASSEMBLY_POLICY_VERSION,
    });
    assemblyCount = await countVentureAssembliesForIdempotencyPrefix(admin, orgId, key);
    if (assemblyCount !== 1) {
      errors.push(`expected 1 assembly for idempotency key, got ${assemblyCount}`);
    }
  }

  const externalAfter = {
    deployments: 0,
    companies: await countCompanies(admin, orgId),
  };

  if (assembly) {
    if (assembly.status !== "internally_ready") {
      errors.push(`expected internally_ready assembly status, got ${assembly.status}`);
    }
    if (assembly.readinessStatus !== "internally_ready") {
      errors.push(`expected readiness internally_ready, got ${assembly.readinessStatus}`);
    }
    if (!assembly.identityPackage?.workingName) {
      errors.push("identity package missing");
    }
    if (!assembly.businessModelPackage?.revenueModel) {
      errors.push("business model package missing");
    }
    if (!assembly.digitalPropertyPackage?.properties) {
      errors.push("digital property package missing");
    }
  }

  phaseTimingsMs.total_elapsed = Math.round(performance.now() - t0);

  const { data: qaWr } = ventureAssemblyId
    ? await admin
        .from("worker_results")
        .select("structured_output")
        .eq("organization_id", orgId)
        .eq("mission_id", ape.missionId)
        .eq("capability_key", VENTURE_ASSEMBLY_QA_CAPABILITY)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  return {
    pass: errors.length === 0,
    errors,
    organizationId: orgId,
    missionId: ape.missionId,
    planExecutionId: ape.planExecutionId,
    ventureAssemblyId,
    companyId: assembly?.companyId ?? null,
    readinessStatus: assembly?.readinessStatus ?? null,
    assemblyStatus: assembly?.status ?? null,
    qaVerdict:
      (qaWr?.structured_output as Record<string, unknown> | null)?.verdict?.toString() ?? null,
    assemblyCountForIdempotency: assemblyCount,
    externalSideEffects: {
      deployments: externalAfter.deployments - externalBefore.deployments,
      companiesDelta: externalAfter.companies - externalBefore.companies,
    },
    phaseTimingsMs,
    ...(errors.length === 0 ? {} : { notice: VENTURE_ASSEMBLY_INTERNAL_LABEL }),
  };
}
