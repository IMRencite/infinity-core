export function externalActionIdempotencyKey(input: {
  organizationId: string;
  ventureAssemblyId: string;
  assemblyVersion: number;
  launchPlanVersion: number;
  actionType: string;
  target: string;
  payloadHash: string;
}): string {
  return [
    "external_action",
    input.organizationId,
    input.ventureAssemblyId,
    String(input.assemblyVersion),
    String(input.launchPlanVersion),
    input.actionType,
    input.target,
    input.payloadHash,
  ].join(":");
}

export function launchPlanIdempotencyKey(input: {
  organizationId: string;
  ventureAssemblyId: string;
  assemblyVersion: number;
}): string {
  return [
    "launch_plan",
    input.organizationId,
    input.ventureAssemblyId,
    String(input.assemblyVersion),
  ].join(":");
}

export function stablePayloadHash(payload: Record<string, unknown>): string {
  const sorted = JSON.stringify(payload, Object.keys(payload).sort());
  let h = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    h = (h * 31 + sorted.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}
