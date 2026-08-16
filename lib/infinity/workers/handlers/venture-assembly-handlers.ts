import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { requireStringField } from "../input-schema";
import type { WorkerExecutionContextBound, WorkerHandlerResult } from "../types";
import {
  executeVentureAssemblyWorker,
} from "@/lib/infinity/venture-assembly/orchestrator";
import { loadVentureAssemblyById } from "@/lib/infinity/venture-assembly/persistence";
import { evaluateVentureAssemblyGates } from "@/lib/infinity/venture-assembly/gates";
import { VENTURE_ASSEMBLY_MANIFEST_SCHEMA_VERSION } from "@/lib/infinity/venture-assembly/constants";

export async function runVentureAssembleInternalPackage(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const input = context.approvedInput as Record<string, unknown>;
  requireStringField(input, "organization_id");
  const missionId = requireStringField(input, "mission_id");
  const planExecutionId = requireStringField(input, "plan_execution_id");
  const ventureAssemblyId = requireStringField(input, "venture_assembly_id");

  if (input.organization_id !== context.organizationId) {
    throw new Error("Organization isolation violation");
  }

  const result = await executeVentureAssemblyWorker(admin, {
    organizationId: context.organizationId,
    missionId,
    planExecutionId,
    ventureAssemblyId,
    correlationId: context.correlationId,
  });

  return {
    structuredOutput: {
      venture_assembly_id: result.ventureAssemblyId,
      assembly_version: 1,
      readiness_status: result.readinessStatus,
      company_id: result.companyId,
    },
    artifactType: "venture_assembly_package",
    artifactPayload: {
      venture_assembly_id: result.ventureAssemblyId,
      readiness_status: result.readinessStatus,
    },
  };
}

export async function runQaVerifyVentureAssembly(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const input = context.approvedInput as Record<string, unknown>;
  requireStringField(input, "organization_id");
  const missionId = requireStringField(input, "mission_id");
  const ventureAssemblyId = requireStringField(input, "venture_assembly_id");

  if (input.organization_id !== context.organizationId) {
    throw new Error("Organization isolation violation");
  }

  const issues: string[] = [];
  const assembly = await loadVentureAssemblyById(admin, context.organizationId, ventureAssemblyId);
  if (!assembly) {
    issues.push("venture_assembly_not_found");
  } else if (assembly.missionId !== missionId) {
    issues.push("mission_mismatch");
  }

  if (assembly) {
    const gates = await evaluateVentureAssemblyGates(admin, {
      organizationId: context.organizationId,
      missionId,
      planExecutionId: assembly.planExecutionId,
    });
    if (!gates.allowed) {
      issues.push(`gates:${gates.classification}`);
    }

    if (assembly.manifest?.schemaVersion !== VENTURE_ASSEMBLY_MANIFEST_SCHEMA_VERSION) {
      issues.push("manifest_schema_invalid");
    }
    if (!assembly.buildId || !assembly.buildSnapshotId) {
      issues.push("artifact_traceability_missing");
    }
    if (!assembly.identityPackage?.workingName) {
      issues.push("identity_incomplete");
    }
    if (!(assembly.businessModelPackage as Record<string, unknown>)?.revenueModel) {
      issues.push("business_model_incomplete");
    }
    if (assembly.status !== "internally_ready" && assembly.readinessStatus !== "internally_ready") {
      issues.push("not_internally_ready");
    }

    const bm = assembly.businessModelPackage as Record<string, { classification?: string }>;
    for (const key of Object.keys(bm)) {
      const entry = bm[key];
      if (entry && typeof entry === "object" && entry.classification === "approved_fact") {
        const val = (entry as { value?: unknown }).value;
        if (typeof val === "string" && /validated market|proven demand/i.test(val)) {
          issues.push("fabricated_market_claim");
        }
      }
    }

    const { count: deps } = await admin
      .from("venture_assembly_external_dependencies")
      .select("*", { count: "exact", head: true })
      .eq("venture_assembly_id", ventureAssemblyId);
    if ((deps ?? 0) < 1) {
      issues.push("external_dependencies_missing");
    }
  }

  const verdict = issues.length === 0 ? "pass" : "fail";
  return {
    structuredOutput: { verdict, issues, venture_assembly_id: ventureAssemblyId },
    artifactType: "qa_report",
    artifactPayload: { verdict, issues, layer: "venture_assembly" },
  };
}

export async function dispatchVentureAssemblyWorkerHandler(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult | null> {
  if (context.capabilityKey === "venture.assemble_internal_package") {
    return runVentureAssembleInternalPackage(admin, context);
  }
  if (context.capabilityKey === "qa.verify_venture_assembly") {
    return runQaVerifyVentureAssembly(admin, context);
  }
  return null;
}
