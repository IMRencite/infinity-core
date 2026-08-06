import type { BuildJobStatus } from "./build-job";

const ALLOWED: Record<BuildJobStatus, BuildJobStatus[]> = {
  requested: ["gated", "blocked", "cancelled"],
  gated: ["builder_resolved", "blocked", "failed"],
  builder_resolved: ["workspace_ready", "blocked", "failed"],
  workspace_ready: ["initialized", "blocked", "failed"],
  initialized: ["validating", "blocked", "failed"],
  validating: ["generating", "repairing", "failed", "blocked"],
  generating: ["testing", "repairing", "failed", "blocked"],
  repairing: ["validating", "testing", "failed", "blocked"],
  testing: ["review_pending", "repairing", "failed", "blocked"],
  review_pending: ["internally_complete", "failed", "blocked"],
  internally_complete: [],
  blocked: [],
  failed: [],
  cancelled: [],
  rolled_back: [],
};

export function assertBuildJobLifecycleTransition(
  from: BuildJobStatus,
  to: BuildJobStatus,
): void {
  if (!ALLOWED[from]?.includes(to)) {
    throw new Error(`Invalid BuildJob lifecycle transition: ${from} → ${to}`);
  }
}

export function canSkipLifecycleStage(): false {
  return false;
}
