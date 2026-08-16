import { isLiveProviderTestMode } from "@/lib/infinity/launch-gateway/provider-config";

export type RepositoryNameResolution = {
  repoName: string;
  appliedTestPrefix: boolean;
};

/**
 * Production repository names must match the approved target exactly unless
 * explicit live test mode applies the test prefix once.
 */
export function resolveApprovedRepositoryName(approvedTarget: string): RepositoryNameResolution {
  const trimmed = approvedTarget.trim();
  if (!trimmed) {
    throw new Error("repository_target_missing");
  }

  if (isLiveProviderTestMode()) {
    if (trimmed.startsWith("infinity-test-")) {
      return { repoName: trimmed.slice(0, 100), appliedTestPrefix: true };
    }
    const prefixed = `infinity-test-${trimmed}`.slice(0, 100);
    return { repoName: prefixed, appliedTestPrefix: true };
  }

  if (trimmed.startsWith("infinity-test-")) {
    throw new Error("test_prefix_not_allowed_outside_test_mode");
  }

  return { repoName: trimmed.slice(0, 100), appliedTestPrefix: false };
}

export function assertRepositoryNameMatchesApproval(input: {
  approvedTarget: string;
  resolvedName: string;
}): void {
  const { repoName } = resolveApprovedRepositoryName(input.approvedTarget);
  if (repoName !== input.resolvedName) {
    throw new Error("repository_name_mutated_after_approval");
  }
}
