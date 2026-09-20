import type { NamedOutboundLoopGate } from "../closed-loop";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateCommunicationSourceReproducibilityGate(input: {
  production_source_tracked: boolean;
  git_commit_sha: string | null;
  release_content_hash: string | null;
  content_hash_reproducible: boolean;
  build_graph_reproducible: boolean;
  dirty: boolean;
}): NamedOutboundLoopGate {
  const pass = input.production_source_tracked
    && Boolean(input.git_commit_sha)
    && Boolean(input.release_content_hash)
    && input.content_hash_reproducible
    && input.build_graph_reproducible
    && !input.dirty;
  return named("CommunicationSourceReproducibilityGate", pass ? "PASS" : "FAIL", [
    input.production_source_tracked ? "TRACKED" : "UNTRACKED",
    input.git_commit_sha ?? "NO_GIT_SHA",
    input.release_content_hash ?? "NO_CONTENT_HASH",
    input.dirty ? "DIRTY" : "CLEAN",
  ]);
}
