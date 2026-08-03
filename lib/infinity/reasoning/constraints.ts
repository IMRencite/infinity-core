import {
  ADVISORY_OUTPUT_KINDS,
  EXECUTIVE_GATED_ACTIONS,
} from "./constants";
import type {
  AdvisoryOutputKind,
  ExecutiveGatedAction,
  ReasoningConstraintSet,
  ReasoningSession,
} from "./types";

export class ReasoningSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReasoningSafetyError";
  }
}

export function defaultReasoningConstraints(
  partial?: Partial<Pick<ReasoningConstraintSet, "maxToolCalls" | "notes">>,
): ReasoningConstraintSet {
  return {
    advisoryOnly: true,
    executiveAuthoritative: true,
    forbiddenWithoutExecutiveAuth: [...EXECUTIVE_GATED_ACTIONS],
    allowedAdvisoryOutputs: [...ADVISORY_OUTPUT_KINDS],
    maxToolCalls: partial?.maxToolCalls ?? 0,
    notes: partial?.notes ?? [
      "Executive decisions override all AI reasoning output.",
      "AI output is advisory until explicitly authorized by Executive workflows.",
    ],
  };
}

export function injectConstraints(session: ReasoningSession): ReasoningSession {
  return {
    ...session,
    constraints: defaultReasoningConstraints({
      maxToolCalls: session.constraints.maxToolCalls,
      notes: session.constraints.notes,
    }),
    updatedAt: new Date().toISOString(),
  };
}

export function assertAdvisoryOnlyOutput(output: { binding: boolean }): void {
  if (output.binding) {
    throw new ReasoningSafetyError(
      "AI reasoning output cannot be binding without Executive authorization.",
    );
  }
}

export function assertActionAllowedByExecutive(
  action: ExecutiveGatedAction,
  executiveAuthorized: boolean,
): void {
  if (!executiveAuthorized) {
    throw new ReasoningSafetyError(
      `Action "${action}" requires explicit Executive authorization.`,
    );
  }
}

export function isAdvisoryOutputKind(value: string): value is AdvisoryOutputKind {
  return (ADVISORY_OUTPUT_KINDS as readonly string[]).includes(value);
}
