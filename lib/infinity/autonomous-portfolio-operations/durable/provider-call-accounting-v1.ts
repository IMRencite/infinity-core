import { listDeploymentIdsForJob } from "./venture-async-deploy-reconciliation-v1";

export const PROVIDER_CALL_ACCOUNTING_CONTRACT_V1 =
  "provider_post_count_slice = provider creates in current worker slice; provider_post_count_job_lifetime = distinct deployment ids in durable telemetry for job_id; provider_post_count_logical_asset_lifetime = distinct deployment ids across jobs sharing asset_identity (future)." as const;

export const ACTIVE_EXTERNAL_OPERATION_MUST_BE_CONTINUED_NOT_DUPLICATED =
  "ACTIVE_EXTERNAL_OPERATION_MUST_BE_CONTINUED_NOT_DUPLICATED" as const;

export function countDistinctProviderDeploymentsFromTelemetry(
  rows: Array<{ deployment_id: string }>,
): number {
  const seen = new Set<string>();
  for (const row of rows) {
    const id = row.deployment_id?.trim();
    if (id?.startsWith("dpl_")) seen.add(id);
  }
  return seen.size;
}

export async function resolveProviderPostAccountingForJob(input: {
  job_id: string;
  slice_provider_post_count: number;
  pending_deployment_id?: string | null;
}): Promise<{
  provider_post_count_slice: number;
  provider_post_count_job_lifetime: number;
}> {
  const telemetry = await listDeploymentIdsForJob(input.job_id);
  const rows = [...telemetry.map((t) => ({ deployment_id: t.deployment_id }))];
  const pending = input.pending_deployment_id?.trim();
  if (pending?.startsWith("dpl_") && !rows.some((r) => r.deployment_id === pending)) {
    rows.push({ deployment_id: pending });
  }
  return {
    provider_post_count_slice: input.slice_provider_post_count,
    provider_post_count_job_lifetime: countDistinctProviderDeploymentsFromTelemetry(rows),
  };
}

export function providerCallSafetyReportingQc(input: {
  reported_lifetime: number;
  telemetry_distinct_count: number;
}): "PASS" | "FAIL" {
  return input.reported_lifetime === input.telemetry_distinct_count ? "PASS" : "FAIL";
}
