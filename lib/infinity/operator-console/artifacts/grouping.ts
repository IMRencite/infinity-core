import type { HqArtifactDisplayGroup, HqWorkArtifact } from "./types";
import { HQ_ARTIFACT_EXTREME_DISPLAY_LIMIT, HQ_ARTIFACT_MOBILE_DISPLAY_LIMIT } from "./types";

export type HqArtifactLayoutMode = "grid" | "rail";

export function hqArtifactLayoutMode(isNarrowViewport: boolean): HqArtifactLayoutMode {
  return isNarrowViewport ? "rail" : "grid";
}

export function desktopHorizontalScrollRequired(loadedCount: number): boolean {
  return loadedCount > HQ_ARTIFACT_EXTREME_DISPLAY_LIMIT;
}

export function roomArtifactReachability(
  artifacts: HqWorkArtifact[],
  expectedCount: number | null = null,
  isNarrowViewport = false,
) {
  const grouped = groupArtifactsForDisplay(artifacts, Number.POSITIVE_INFINITY, expectedCount);
  const first = artifacts[0];
  const last = artifacts[artifacts.length - 1];
  const layout = hqArtifactLayoutMode(isNarrowViewport);
  return {
    visible: grouped.visible,
    visibleCount: grouped.visible.length,
    loadedCount: grouped.artifactLoaded,
    missingCount: grouped.missingCount,
    fakeCards: 0,
    firstReachable: first ? grouped.visible.some((artifact) => artifact.id === first.id) : true,
    lastReachable: last ? grouped.visible.some((artifact) => artifact.id === last.id) : true,
    layout,
    horizontalScrollRequired: layout === "rail" ? grouped.visible.length > 2 : desktopHorizontalScrollRequired(grouped.artifactLoaded),
  };
}

export function groupArtifactsForDisplay(
  artifacts: HqWorkArtifact[],
  maxVisible: number = Number.POSITIVE_INFINITY,
  expectedCount: number | null = null,
): HqArtifactDisplayGroup {
  const artifactLoaded = artifacts.length;
  const totalCount = artifactLoaded;
  const cap = Number.isFinite(maxVisible) ? Math.max(0, Math.floor(maxVisible)) : artifactLoaded;
  const visible = artifactLoaded <= cap ? artifacts : artifacts.slice(0, cap);
  const artifactOverflow = Math.max(0, artifactLoaded - visible.length);
  const missingCount =
    expectedCount != null && expectedCount > artifactLoaded ? expectedCount - artifactLoaded : 0;

  return {
    visible,
    overflowCount: artifactOverflow,
    totalCount,
    artifactLoaded,
    artifactVisible: visible.length,
    artifactOverflow,
    expectedCount,
    missingCount,
  };
}

export function hqArtifactViewportLimit(isNarrowViewport: boolean): number {
  return isNarrowViewport ? HQ_ARTIFACT_MOBILE_DISPLAY_LIMIT : HQ_ARTIFACT_EXTREME_DISPLAY_LIMIT;
}
