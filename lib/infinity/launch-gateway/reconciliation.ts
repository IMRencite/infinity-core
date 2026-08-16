export type ReconciliationState =
  | "in_sync"
  | "missing_external"
  | "missing_internal"
  | "drifted"
  | "verification_failed"
  | "unknown";

export function reconcileExpectedVsProvider(input: {
  localExists: boolean;
  providerExists: boolean;
  identifiersMatch: boolean;
  verificationPassed: boolean;
}): ReconciliationState {
  const { localExists, providerExists, identifiersMatch, verificationPassed } = input;
  if (!localExists && providerExists) return "missing_internal";
  if (localExists && !providerExists) return "missing_external";
  if (!identifiersMatch) return "drifted";
  if (!verificationPassed) return "verification_failed";
  if (localExists && providerExists) return "in_sync";
  return "unknown";
}
