import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { V1_WORKER_CAPABILITY_KEYS } from "./constants";
import { getWorkerCapabilityContract } from "./capability";
import type { WorkerCapabilityDiagnosticsRow } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function loadWorkerCapabilityDiagnostics(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 12,
): Promise<WorkerCapabilityDiagnosticsRow[]> {
  const { data: jobs } = await supabase
    .from("engine_jobs")
    .select("id, status, capability_key, resolved_version")
    .eq("organization_id", organizationId)
    .in("capability_key", [...V1_WORKER_CAPABILITY_KEYS])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!jobs?.length) {
    return [];
  }

  const jobIds = jobs.map((j) => j.id);

  const [{ data: runs }, { data: results }] = await Promise.all([
    supabase
      .from("worker_runs")
      .select("id, engine_job_id, status, duration_ms, attempt_number")
      .eq("organization_id", organizationId)
      .in("engine_job_id", jobIds),
    supabase
      .from("worker_results")
      .select(
        "id, engine_job_id, status, review_status, capability_key, capability_version, attempt_number, error",
      )
      .eq("organization_id", organizationId)
      .in("engine_job_id", jobIds),
  ]);

  type WorkerRunRow = NonNullable<typeof runs>[number];
  type WorkerResultRow = NonNullable<typeof results>[number];

  const runByJob = new Map<string, WorkerRunRow>();
  for (const run of runs ?? []) {
    if (!runByJob.has(run.engine_job_id)) {
      runByJob.set(run.engine_job_id, run);
    }
  }

  const resultByJob = new Map<string, WorkerResultRow>();
  for (const result of results ?? []) {
    if (!resultByJob.has(result.engine_job_id)) {
      resultByJob.set(result.engine_job_id, result);
    }
  }

  const { data: artifacts } = await supabase
    .from("worker_artifacts")
    .select("worker_result_id, artifact_type")
    .eq("organization_id", organizationId)
    .in(
      "worker_result_id",
      (results ?? []).map((r) => r.id),
    );

  const artifactByResult = new Map<string, string>();
  for (const art of artifacts ?? []) {
    if (!artifactByResult.has(art.worker_result_id)) {
      artifactByResult.set(art.worker_result_id, art.artifact_type);
    }
  }

  return jobs.map((job) => {
    const run = runByJob.get(job.id);
    const result = resultByJob.get(job.id);
    const contract = getWorkerCapabilityContract(job.capability_key);

    let errorClassification: string | null = null;
    if (result?.error && typeof result.error === "object" && !Array.isArray(result.error)) {
      const cls = (result.error as Record<string, unknown>).classification;
      errorClassification = typeof cls === "string" ? cls : null;
    }

    return {
      capabilityKey: job.capability_key,
      capabilityVersion: job.resolved_version ?? "1.0.0",
      workerType: contract?.workerType ?? job.capability_key.split(".")[0] ?? "worker",
      engineJobId: job.id,
      engineJobStatus: job.status,
      workerRunId: run?.id ?? null,
      workerRunStatus: run?.status ?? null,
      workerResultId: result?.id ?? null,
      resultStatus: result?.status ?? null,
      attemptNumber: result?.attempt_number ?? run?.attempt_number ?? null,
      durationMs: run?.duration_ms ?? null,
      reviewStatus: result?.review_status ?? null,
      artifactType: result ? (artifactByResult.get(result.id) ?? null) : null,
      blockingReason: result?.status === "blocked" ? errorClassification : null,
      errorClassification,
    };
  });
}
