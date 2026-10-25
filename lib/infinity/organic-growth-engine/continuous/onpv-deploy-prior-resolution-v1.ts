/**
 * Prior-deployment selection for ONPV provider deploy.
 * Backlog publications must not override durable authoritative deployment resume.
 */

export function resolveOnpvPriorDeploymentIdForProviderDeploy(input: {
  forceFreshProviderPost?: boolean;
  priorDeploymentId?: string | null;
}): string | null {
  if (input.forceFreshProviderPost === true) return null;
  const prior = input.priorDeploymentId?.trim();
  return prior?.startsWith("dpl_") ? prior : null;
}

/** b622538 production bug: backlog presence nulls prior even when force-fresh is false. */
export function legacyB622538OnpvPriorDeploymentIdForProviderDeploy(input: {
  forceFreshProviderPost?: boolean;
  priorDeploymentId?: string | null;
  backlogPublicationCount?: number;
}): string | null {
  const discardPrior =
    input.forceFreshProviderPost === true || (input.backlogPublicationCount ?? 0) > 0;
  if (discardPrior) return null;
  const prior = input.priorDeploymentId?.trim();
  return prior?.startsWith("dpl_") ? prior : null;
}
