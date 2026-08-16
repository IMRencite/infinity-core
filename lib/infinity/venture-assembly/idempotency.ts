export function ventureAssemblyIdempotencyKey(input: {
  organizationId: string;
  planExecutionId: string;
  planVersion: number;
  buildSnapshotId: string;
  assemblyPolicyVersion: string;
}): string {
  return [
    "venture_assembly",
    input.organizationId,
    input.planExecutionId,
    String(input.planVersion),
    input.buildSnapshotId,
    input.assemblyPolicyVersion,
  ].join(":");
}
