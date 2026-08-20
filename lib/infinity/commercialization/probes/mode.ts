export const COMMERCIAL_PROVIDER_VERIFICATION_MODE = "READ_ONLY" as const;
export type CommercialProviderVerificationMode = typeof COMMERCIAL_PROVIDER_VERIFICATION_MODE;

export const READ_ONLY_MUTATION_BLOCKED = "READ_ONLY_MUTATION_BLOCKED" as const;

export class ReadOnlyMutationBlockedError extends Error {
  readonly code = READ_ONLY_MUTATION_BLOCKED;
  constructor(capability: string) {
    super(`${READ_ONLY_MUTATION_BLOCKED}:${capability}`);
    this.name = "ReadOnlyMutationBlockedError";
  }
}

export function assertReadOnlyAllowsMutation(mode: CommercialProviderVerificationMode | string, capability: string): never {
  if (mode === COMMERCIAL_PROVIDER_VERIFICATION_MODE) {
    throw new ReadOnlyMutationBlockedError(capability);
  }
  throw new ReadOnlyMutationBlockedError(capability);
}
