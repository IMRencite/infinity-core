import type { Favc1CycleTerminalOutcome } from "./types";

export type Favc1TerminalContext = {
  terminalOutcome: Favc1CycleTerminalOutcome;
  selectionStopReasonPath?: string | null;
  validationOutcome?: string | null;
  failureMessage?: string | null;
  stopReason?: string | null;
};

export type Favc1TerminalDisplay = {
  headline: string;
  decision: string;
  systemDetail: string;
};

export function buildFavc1TerminalDisplay(input: Favc1TerminalContext): Favc1TerminalDisplay {
  const path = input.selectionStopReasonPath ?? null;
  const validationOutcome = input.validationOutcome ?? null;

  if (input.terminalOutcome === "LEVEL_4") {
    return {
      headline: "Autonomous Venture Cycle Complete",
      decision: "Infinity completed the full autonomous venture loop successfully.",
      systemDetail: "LEVEL_4",
    };
  }

  if (input.terminalOutcome === "SYSTEM_FAILURE") {
    return {
      headline: "Mission Interrupted — System Failure",
      decision: humanizeFailure(input.failureMessage ?? input.stopReason ?? "A technical failure stopped the cycle."),
      systemDetail: "SYSTEM_FAILURE",
    };
  }

  if (input.terminalOutcome === "INFRASTRUCTURE_BLOCKED") {
    return {
      headline: "Mission Blocked — Infrastructure Unavailable",
      decision: humanizeFailure(
        input.failureMessage ?? input.stopReason ?? "A required infrastructure dependency was unavailable.",
      ),
      systemDetail: "INFRASTRUCTURE_BLOCKED",
    };
  }

  if (path === "validation_required" || validationOutcome === "VALIDATE") {
    return {
      headline: "Mission Completed — Candidate Still Requires Validation",
      decision:
        "Infinity completed the bounded validation round, but the evidence was not strong enough to move the candidate to BUILD.",
      systemDetail: `BUSINESS_NO_GO / validation_required / validationOutcome=${validationOutcome ?? "VALIDATE"}`,
    };
  }

  if (path === "safety_constraints") {
    return {
      headline: "Mission Completed — Candidate Blocked By Safety Constraints",
      decision: "Infinity stopped the candidate because it exceeded one or more first-cycle safety limits.",
      systemDetail: "BUSINESS_NO_GO / safety_constraints",
    };
  }

  if (
    input.terminalOutcome === "BUSINESS_NO_GO" ||
    input.terminalOutcome === "NO_GO_MARKET_DECISION"
  ) {
    return {
      headline: "Mission Completed — No Candidate Passed the Build Decision",
      decision: "Infinity evaluated the current opportunity set and found no candidate strong enough to build in this cycle.",
      systemDetail: input.stopReason ?? "BUSINESS_NO_GO",
    };
  }

  return {
    headline: "Autonomous Venture Cycle",
    decision: input.stopReason ?? "Cycle status recorded.",
    systemDetail: input.terminalOutcome,
  };
}

function humanizeFailure(message: string): string {
  return message.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}
