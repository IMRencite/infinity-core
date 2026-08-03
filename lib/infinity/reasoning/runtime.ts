import type { AssembleReasoningContextInput } from "./context";
import { runReasoningPipeline } from "./pipeline";
import { createReasoningSession } from "./sessions";
import type { ProviderSelectionPolicy, ReasoningSessionRefs } from "./types";

export type StartAdvisoryReasoningInput = {
  refs: ReasoningSessionRefs;
  context: AssembleReasoningContextInput;
  selectionPolicy?: ProviderSelectionPolicy;
};

export type AdvisoryReasoningRuntimeResult = ReturnType<typeof runReasoningPipeline>;

/** Orchestrates advisory reasoning without provider network I/O. */
export function runAdvisoryReasoningRuntime(
  input: StartAdvisoryReasoningInput,
): AdvisoryReasoningRuntimeResult {
  const session = createReasoningSession(input.refs);

  return runReasoningPipeline(
    {
      session,
      selectionPolicy: input.selectionPolicy,
    },
    input.context,
  );
}
