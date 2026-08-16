import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { reconstructProductionArtifact } from "./materialize";
import { VERCEL_V1_DEPLOYMENT_MODE } from "./constants";
import {
  evaluateVercelDeploymentReadiness,
  type VercelReadinessEvaluation,
} from "./vercel-deployment-readiness";

export async function persistVercelReadinessEvaluation(
  admin: AdminSupabaseClient,
  organizationId: string,
  productionArtifactId: string,
  evaluation: VercelReadinessEvaluation,
): Promise<void> {
  await admin
    .from("production_artifacts")
    .update({
      deployment_manifest: (evaluation.manifest ?? {}) as Json,
      package_manager: evaluation.manifest?.packageManager ?? null,
      clean_room_install_result: evaluation.cleanRoom?.install
        ? ({
            ok: evaluation.cleanRoom.install.ok,
            durationMs: evaluation.cleanRoom.install.durationMs,
            sanitizedErrors: evaluation.cleanRoom.install.sanitizedErrors,
          } as Json)
        : null,
      clean_room_build_result: evaluation.cleanRoom?.build
        ? ({
            ok: evaluation.cleanRoom.build.ok,
            durationMs: evaluation.cleanRoom.build.durationMs,
            sanitizedErrors: evaluation.cleanRoom.build.sanitizedErrors,
          } as Json)
        : null,
      clean_room_build_duration_ms: evaluation.cleanRoom?.buildDurationMs ?? null,
      framework_detection: (evaluation.cleanRoom?.frameworkDetection ?? null) as Json,
      output_summary: (evaluation.cleanRoom?.outputSummary ?? null) as Json,
      vercel_readiness_status: evaluation.ready ? "ready" : "blocked",
      vercel_readiness_reasons: evaluation.reasons as Json,
      deployment_source_identity: (evaluation.sourceIdentity ?? null) as Json,
      last_readiness_evaluated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("id", productionArtifactId);
}

export async function evaluateAndPersistVercelReadinessForArtifact(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    productionArtifactId: string;
    runCleanRoom?: boolean;
    commitSha?: string | null;
    repositoryFullName?: string | null;
  },
): Promise<VercelReadinessEvaluation> {
  const { record, files } = await reconstructProductionArtifact(
    admin,
    input.organizationId,
    input.productionArtifactId,
  );
  const evaluation = await evaluateVercelDeploymentReadiness({
    record,
    files,
    options: {
      runCleanRoom: input.runCleanRoom,
      commitSha: input.commitSha,
      repositoryFullName: input.repositoryFullName,
      deploymentMode: VERCEL_V1_DEPLOYMENT_MODE,
    },
  });
  await persistVercelReadinessEvaluation(
    admin,
    input.organizationId,
    input.productionArtifactId,
    evaluation,
  );
  return evaluation;
}

export async function inspectVercelDeploymentReadOnly(input: {
  fetchFn: (path: string) => Promise<Response>;
  deploymentId: string;
}): Promise<{
  readyState?: string;
  errorCode?: string;
  errorMessage?: string;
  state?: string;
}> {
  const res = await input.fetchFn(`/v13/deployments/${input.deploymentId}`);
  if (!res.ok) {
    return { state: "not_found" };
  }
  const body = (await res.json()) as {
    readyState?: string;
    errorCode?: string;
    errorMessage?: string;
  };
  return {
    readyState: body.readyState,
    errorCode: body.errorCode,
    errorMessage: body.errorMessage,
    state: body.readyState,
  };
}
