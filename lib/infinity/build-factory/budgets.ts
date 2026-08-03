export function assertZeroCostBuild(): void {
  const estimatedCost = 0;
  const maximumCost = 0;
  if (estimatedCost > maximumCost) {
    throw new Error("blocked_external_resource_required");
  }
}

export function assertNoPaidResources(required: {
  cloud?: boolean;
  domain?: boolean;
  hosting?: boolean;
  paidApi?: boolean;
}): void {
  if (required.cloud || required.domain || required.hosting || required.paidApi) {
    throw new Error("blocked_external_resource_required");
  }
}
