import {
  ALLOWED_LIFECYCLE_TRANSITIONS,
  FORBIDDEN_LIFECYCLE_TRANSITIONS,
  type ArtifactLifecycleState,
} from "./contract";

export function isForbiddenLifecycleTransition(
  from: ArtifactLifecycleState,
  to: ArtifactLifecycleState,
): boolean {
  return FORBIDDEN_LIFECYCLE_TRANSITIONS.some(([left, right]) => left === from && right === to);
}

export function canTransitionArtifactLifecycle(
  from: ArtifactLifecycleState,
  to: ArtifactLifecycleState,
): boolean {
  if (isForbiddenLifecycleTransition(from, to)) return false;
  return ALLOWED_LIFECYCLE_TRANSITIONS[from].includes(to);
}

export function assertArtifactLifecycleTransition(
  from: ArtifactLifecycleState,
  to: ArtifactLifecycleState,
): { ok: true } | { ok: false; reason: string } {
  if (from === "BUILD_COMPLETE" && (to === "RELEASE_READY" || to === "RELEASED")) {
    return { ok: false, reason: "BUILD_COMPLETE_CANNOT_SKIP_QC" };
  }
  if (from === "BUILD_COMPLETE" && to === "QC_PASS") {
    return { ok: false, reason: "BUILD_COMPLETE_IS_NOT_QC_PASS" };
  }
  if (!canTransitionArtifactLifecycle(from, to)) {
    return { ok: false, reason: `FORBIDDEN_TRANSITION:${from}->${to}` };
  }
  return { ok: true };
}

export function isLiveOrCompleteClaim(label: string): boolean {
  return /^(COMPLETE|READY|LIVE|PRODUCTION-QUALITY|PRODUCTION_READY|PUBLICLY_LAUNCHED)$/i.test(label);
}

export function builderMayClaimProductionReady(): false {
  return false;
}
