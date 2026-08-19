import { formatDetailQueryParam, parseDetailQueryParam } from "@/lib/infinity/operator-console/details/build-entity-detail";

/** Authoritative HQ detail session. Open intent is distinct from "an artifact exists in the URL/snapshot". */
export type HqDetailSession = {
  selectedArtifactId: string | null;
  requestedArtifactId: string | null;
  requestGeneration: number;
  dismissedQuery: string | null;
};

export function createHqDetailSession(initialSelected: string | null = null): HqDetailSession {
  return {
    selectedArtifactId: initialSelected,
    requestedArtifactId: initialSelected,
    requestGeneration: 0,
    dismissedQuery: null,
  };
}

export function detailQueriesEquivalent(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const parsedA = parseDetailQueryParam(a);
  const parsedB = parseDetailQueryParam(b);
  return Boolean(parsedA && parsedB && parsedA.kind === parsedB.kind && parsedA.id === parsedB.id);
}

export function applyHqDetailOpen(session: HqDetailSession, artifactId: string): HqDetailSession {
  return {
    selectedArtifactId: artifactId,
    requestedArtifactId: artifactId,
    requestGeneration: session.requestGeneration + 1,
    dismissedQuery: null,
  };
}

export function applyHqDetailClose(session: HqDetailSession, currentQuery: string | null): HqDetailSession {
  const dismissed =
    currentQuery ?? (session.selectedArtifactId ? formatDetailQueryParam(session.selectedArtifactId) : null);
  return {
    selectedArtifactId: null,
    requestedArtifactId: null,
    requestGeneration: session.requestGeneration + 1,
    dismissedQuery: dismissed,
  };
}

export function settleHqDetailUrl(session: HqDetailSession, detailQueryParam: string | null): HqDetailSession {
  if (!detailQueryParam) return session;
  if (!session.dismissedQuery) return session;
  if (detailQueriesEquivalent(session.dismissedQuery, detailQueryParam)) return session;
  return { ...session, dismissedQuery: null };
}

/** Stale searchParams after close must not reopen. A new deep-link query (different id) may open. */
export function isDismissedStaleUrl(session: HqDetailSession, detailQueryParam: string | null): boolean {
  if (!detailQueryParam || !session.dismissedQuery) return false;
  return detailQueriesEquivalent(session.dismissedQuery, detailQueryParam);
}

export function artifactIdFromDetailQuery(detailQueryParam: string | null): string | null {
  const parsed = parseDetailQueryParam(detailQueryParam);
  if (!parsed || parsed.kind !== "artifact" || !parsed.id) return null;
  return parsed.id;
}

/**
 * URL → open only on actual open intent:
 * - not a dismissed stale query
 * - not already the selected/requested id (polling / same snapshot must not re-open)
 * Deep-link first paint: selected is null or differs → returns the id to open.
 * Deep-link with selected already set but load still needed is handled by the caller via `hasLoadedModel`.
 */
export function shouldOpenFromUrl(
  session: HqDetailSession,
  detailQueryParam: string | null,
  hasLoadedModel: boolean,
): string | null {
  if (!detailQueryParam) return null;
  if (isDismissedStaleUrl(session, detailQueryParam)) return null;
  const artifactId = artifactIdFromDetailQuery(detailQueryParam);
  if (!artifactId) return null;
  // Local open/switch wins until router.replace catches up. Do not reopen the previous URL id.
  if (
    session.requestedArtifactId &&
    session.selectedArtifactId === session.requestedArtifactId &&
    artifactId !== session.requestedArtifactId
  ) {
    return null;
  }
  if (session.selectedArtifactId === artifactId && session.requestedArtifactId === artifactId && hasLoadedModel) {
    return null;
  }
  if (session.selectedArtifactId === artifactId && !hasLoadedModel) return artifactId;
  if (session.selectedArtifactId !== artifactId) return artifactId;
  return null;
}

export function shouldCommitDetailResponse(input: {
  activeGeneration: number;
  responseGeneration: number;
  selectedArtifactId: string | null;
  requestedArtifactId: string | null;
  responseArtifactId: string;
}): boolean {
  if (input.responseGeneration !== input.activeGeneration) return false;
  if (!input.selectedArtifactId || !input.requestedArtifactId) return false;
  return (
    input.responseArtifactId === input.selectedArtifactId && input.responseArtifactId === input.requestedArtifactId
  );
}

export function shouldRestoreSelectionFromSnapshot(selectedArtifactId: string | null): boolean {
  return selectedArtifactId != null;
}
