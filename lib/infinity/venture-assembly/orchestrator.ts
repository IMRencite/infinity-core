import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import {
  VENTURE_ASSEMBLY_POLICY_VERSION,
  VENTURE_ASSEMBLY_EVENTS,
} from "./constants";
import { evaluateVentureAssemblyGates } from "./gates";
import { ventureAssemblyIdempotencyKey } from "./idempotency";
import { emitVentureAssemblyEvent } from "./events";
import {
  findVentureAssemblyByIdempotencyKey,
  insertVentureAssembly,
  loadVentureAssemblyById,
  replaceExternalDependencies,
  updateVentureAssembly,
} from "./persistence";
import { buildAssemblyPackages, loadAssemblySourceContext } from "./packages";
import { materializeProductionArtifact } from "@/lib/infinity/production-artifact/materialize";

export type RequestVentureAssemblyResult =
  | { status: "created" | "reused"; ventureAssemblyId: string }
  | { status: "blocked"; reason: string; classification: string };

export async function requestVentureAssembly(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    planExecutionId: string;
    correlationId?: string | null;
  },
): Promise<RequestVentureAssemblyResult> {
  const gates = await evaluateVentureAssemblyGates(admin, {
    organizationId: input.organizationId,
    missionId: input.missionId,
    planExecutionId: input.planExecutionId,
  });

  if (!gates.allowed) {
    await emitVentureAssemblyEvent(admin, {
      organizationId: input.organizationId,
      eventType: VENTURE_ASSEMBLY_EVENTS.assemblyBlocked,
      message: gates.reason,
      correlationId: input.correlationId,
      missionId: input.missionId,
      planExecutionId: input.planExecutionId,
      payload: { classification: gates.classification },
    });
    return { status: "blocked", reason: gates.reason, classification: gates.classification };
  }

  const pe = gates.planExecution;
  const idempotencyKey = ventureAssemblyIdempotencyKey({
    organizationId: input.organizationId,
    planExecutionId: pe.id,
    planVersion: pe.planVersion,
    buildSnapshotId: gates.buildSnapshotId,
    assemblyPolicyVersion: VENTURE_ASSEMBLY_POLICY_VERSION,
  });

  const existing = await findVentureAssemblyByIdempotencyKey(
    admin,
    input.organizationId,
    idempotencyKey,
  );
  if (existing && existing.status !== "failed") {
    await emitVentureAssemblyEvent(admin, {
      organizationId: input.organizationId,
      eventType: VENTURE_ASSEMBLY_EVENTS.assemblyReused,
      message: "Venture assembly reused",
      correlationId: input.correlationId,
      missionId: input.missionId,
      ventureAssemblyId: existing.id,
      planExecutionId: pe.id,
    });
    return { status: "reused", ventureAssemblyId: existing.id };
  }

  const row = await insertVentureAssembly(admin, {
    organizationId: input.organizationId,
    missionId: input.missionId,
    opportunityId: pe.opportunityId,
    executiveDecisionId: pe.executiveDecisionId,
    planId: pe.planId,
    planVersion: pe.planVersion,
    planExecutionId: pe.id,
    ventureBlueprintId: pe.ventureBlueprintId,
    buildId: pe.buildId,
    buildJobId: pe.buildJobId,
    buildSnapshotId: gates.buildSnapshotId,
    idempotencyKey,
    correlationId: input.correlationId,
  });

  await emitVentureAssemblyEvent(admin, {
    organizationId: input.organizationId,
    eventType: VENTURE_ASSEMBLY_EVENTS.assemblyRequested,
    message: "Venture assembly requested",
    correlationId: input.correlationId,
    missionId: input.missionId,
    ventureAssemblyId: row.id,
    planExecutionId: pe.id,
  });

  return { status: "created", ventureAssemblyId: row.id };
}

export async function executeVentureAssemblyWorker(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    planExecutionId: string;
    ventureAssemblyId: string;
    correlationId?: string | null;
  },
): Promise<{ ventureAssemblyId: string; readinessStatus: string; companyId: string | null }> {
  const assembly = await loadVentureAssemblyById(
    admin,
    input.organizationId,
    input.ventureAssemblyId,
  );
  if (!assembly) {
    throw new Error("Venture assembly not found");
  }
  if (assembly.immutableAt) {
    return {
      ventureAssemblyId: assembly.id,
      readinessStatus: assembly.readinessStatus ?? "internally_ready",
      companyId: assembly.companyId,
    };
  }

  await updateVentureAssembly(admin, input.organizationId, assembly.id, {
    status: "assembling",
  });

  await emitVentureAssemblyEvent(admin, {
    organizationId: input.organizationId,
    eventType: VENTURE_ASSEMBLY_EVENTS.assemblyStarted,
    message: "Venture assembly started",
    correlationId: input.correlationId,
    missionId: input.missionId,
    ventureAssemblyId: assembly.id,
    planExecutionId: input.planExecutionId,
  });

  const ctx = await loadAssemblySourceContext(admin, {
    organizationId: input.organizationId,
    missionId: input.missionId,
    planExecutionId: input.planExecutionId,
  });
  if (!ctx) {
    await updateVentureAssembly(admin, input.organizationId, assembly.id, {
      status: "failed",
      blocking_reason: "assembly_source_context_missing",
    });
    throw new Error("Assembly source context missing");
  }

  const packages = buildAssemblyPackages(ctx);

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      organization_id: input.organizationId,
      name: String(packages.identityPackage.workingName),
      status: "draft",
      legal_status: "unformed",
    })
    .select("id")
    .single();

  if (companyError || !company) {
    await updateVentureAssembly(admin, input.organizationId, assembly.id, {
      status: "failed",
      blocking_reason: companyError?.message ?? "company_create_failed",
    });
    throw new Error(companyError?.message ?? "Failed to create venture company record");
  }

  const finalStatus =
    packages.readinessEvaluation.readinessStatus === "internally_ready"
      ? "internally_ready"
      : packages.readinessEvaluation.readinessStatus === "blocked"
        ? "blocked"
        : "needs_review";

  let productionArtifactId: string | null = null;
  let resolvedStatus = finalStatus;
  let blockingReason: string | null = null;

  if (
    finalStatus === "internally_ready" &&
    assembly.buildId &&
    assembly.buildSnapshotId
  ) {
    try {
      const artifact = await materializeProductionArtifact(admin, {
        organizationId: input.organizationId,
        missionId: input.missionId,
        buildId: assembly.buildId,
        buildSnapshotId: assembly.buildSnapshotId,
        buildJobId: assembly.buildJobId,
        ventureAssemblyId: assembly.id,
        ventureAssemblyVersion: assembly.assemblyVersion,
      });
      productionArtifactId = artifact.artifactId;
    } catch (error) {
      resolvedStatus = "needs_review";
      blockingReason =
        error instanceof Error ? error.message : "production_artifact_materialize_failed";
    }
  } else if (finalStatus === "internally_ready") {
    resolvedStatus = "needs_review";
    blockingReason = "production_artifact_build_context_missing";
  }

  await replaceExternalDependencies(
    admin,
    input.organizationId,
    assembly.id,
    packages.externalDependencies,
  );

  await emitVentureAssemblyEvent(admin, {
    organizationId: input.organizationId,
    eventType: VENTURE_ASSEMBLY_EVENTS.dependenciesIdentified,
    message: "External dependencies identified",
    correlationId: input.correlationId,
    missionId: input.missionId,
    ventureAssemblyId: assembly.id,
  });

  const updated = await updateVentureAssembly(admin, input.organizationId, assembly.id, {
    company_id: company.id,
    manifest: packages.manifest as Json,
    identity_package: packages.identityPackage as Json,
    business_model_package: packages.businessModelPackage as Json,
    brand_package: packages.brandPackage as Json,
    digital_property_package: packages.digitalPropertyPackage as Json,
    monetization_package: packages.monetizationPackage as Json,
    marketing_package: packages.marketingPackage as Json,
    operations_package: packages.operationsPackage as Json,
    legal_compliance_package: packages.legalCompliancePackage as Json,
    readiness_evaluation: packages.readinessEvaluation as Json,
    readiness_status: resolvedStatus === "internally_ready" ? "internally_ready" : packages.readinessEvaluation.readinessStatus,
    status: resolvedStatus,
    production_artifact_id: productionArtifactId,
    launch_stage: resolvedStatus === "internally_ready" ? "internally_ready" : null,
    blocking_reason: blockingReason,
    immutable_at: resolvedStatus === "internally_ready" ? new Date().toISOString() : null,
  });

  if (resolvedStatus === "internally_ready") {
    await emitVentureAssemblyEvent(admin, {
      organizationId: input.organizationId,
      eventType: VENTURE_ASSEMBLY_EVENTS.internallyReady,
      message: "Venture internally ready — not launched",
      correlationId: input.correlationId,
      missionId: input.missionId,
      ventureAssemblyId: assembly.id,
    });
  }

  return {
    ventureAssemblyId: updated.id,
    readinessStatus: updated.readinessStatus ?? finalStatus,
    companyId: company.id,
  };
}
