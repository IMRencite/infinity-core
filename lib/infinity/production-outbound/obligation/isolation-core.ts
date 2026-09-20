import type { NamedOutboundLoopGate } from "../closed-loop";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export type BlogOsIsolationSnapshot = {
  captured_at: string;
  active_ventures: number;
  ventures_with_blogs: number;
  blogs_due: number;
  blogs_live_verified: number;
  blogs_in_repair: number;
  obligation_states: string[];
  remediation_ids: string[];
  execute_publish: boolean;
  publishing_hold: string | null;
  content_hashes: string[];
  digest: string;
};

export function evaluateBlogOsSnapshotParity(before: BlogOsIsolationSnapshot, after: BlogOsIsolationSnapshot): NamedOutboundLoopGate {
  if (before.digest !== after.digest) {
    return named("BlogOSSnapshotParityPreservationGate", "FAIL", ["COMMUNICATION_CAUSED_BLOG_OS_DRIFT"]);
  }
  return named("BlogOSSnapshotParityPreservationGate", "PASS", ["SNAPSHOT_UNCHANGED"]);
}

export function evaluateCrossSystemRuntimeIsolation(input: {
  communication_wrote_blog_os: boolean;
  communication_changed_execute_publish: boolean;
  communication_changed_organic_runtime: boolean;
}): NamedOutboundLoopGate {
  if (input.communication_wrote_blog_os || input.communication_changed_execute_publish || input.communication_changed_organic_runtime) {
    return named("CrossSystemRuntimeIsolationGate", "FAIL", ["COMMUNICATION_TOUCHED_ORGANIC"]);
  }
  return named("CrossSystemRuntimeIsolationGate", "PASS", ["ISOLATED"]);
}

export function evaluateCommunicationOrganicStateMutation(before: BlogOsIsolationSnapshot, after: BlogOsIsolationSnapshot): NamedOutboundLoopGate {
  if (before.execute_publish !== after.execute_publish || before.publishing_hold !== after.publishing_hold) {
    return named("CommunicationOrganicStateMutationGate", "FAIL", ["ORGANIC_MUTATED"]);
  }
  return named("CommunicationOrganicStateMutationGate", "PASS", ["NO_ORGANIC_MUTATION"]);
}

export function evaluateHqPublicProjectionParity(input: {
  hq_digest: string;
  public_digest: string;
}): NamedOutboundLoopGate {
  if (input.hq_digest !== input.public_digest) {
    return named("HQPublicProjectionParityGate", "FAIL", ["PROJECTION_DRIFT"]);
  }
  return named("HQPublicProjectionParityGate", "PASS", ["HQ_PUBLIC_PARITY"]);
}

export function sanitizedPublicCommunicationProjection(input: {
  mode: string;
  open_obligations: number;
  clean_live_turns: string;
  always_on: string;
  stop: string;
}): Record<string, string | number> {
  return {
    mode: input.mode,
    open_obligations: input.open_obligations,
    clean_live_turns: input.clean_live_turns,
    always_on: input.always_on,
    stop: input.stop,
    communication_runtime: input.open_obligations > 0 ? "ACTIVE" : "DEGRADED",
    business_loop: input.always_on === "NOT_PROVEN" ? "DEGRADED" : "HEALTHY",
  };
}
