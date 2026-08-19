import type { CanonicalCodingTask, CodingAgentProvider, CodingRouterDecision, CodingRouterSignals, EpistemicCost } from "./types";
import { cursorCostCanAutoAuthorize } from "./treasury";

function nativeCanHandle(task: CanonicalCodingTask, native: CodingAgentProvider): boolean {
  return task.requiredCapabilities.every((cap) => native.supports(cap)) || native.supports("IMPLEMENT_FEATURE");
}

export function collectRouterSignals(input: {
  task: CanonicalCodingTask;
  cursorAvailable: boolean;
  nativeAvailable: boolean;
  cursorCostAuthorized: boolean;
}): CodingRouterSignals {
  return {
    complexity: input.task.estimatedComplexity,
    repositorySize: input.task.repository.sizeClass,
    filesAffected: input.task.filesAffectedEstimate,
    terminalNeed: input.task.terminalNeeded,
    repositoryExplorationNeed: input.task.repositoryExplorationNeeded,
    debuggingDepth: input.task.debuggingDepth,
    expectedDurationMs: input.task.expectedDurationMs,
    testRequirements: input.task.requiredTests.length,
    historicalSuccess: null,
    cost: input.task.estimatedCost,
    latencyMs: null,
    asyncExecutionValue: input.task.asyncPreferred,
    cursorAvailable: input.cursorAvailable,
    nativeAvailable: input.nativeAvailable,
    cursorCostAuthorized: input.cursorCostAuthorized,
  };
}

export function cursorTechnicallyPreferred(signals: CodingRouterSignals): boolean {
  const large =
    signals.repositorySize === "large" &&
    signals.filesAffected >= 8 &&
    (signals.repositoryExplorationNeed || signals.terminalNeed || signals.debuggingDepth === "deep");
  return large && signals.complexity !== "low";
}

export function routeCodingAgent(input: {
  task: CanonicalCodingTask;
  native: CodingAgentProvider;
  cursor: CodingAgentProvider;
  cursorCostAuthorized?: boolean;
}): CodingRouterDecision {
  const cursorAvailable = input.cursor.availability() === "AVAILABLE";
  const nativeAvailable = input.native.availability() === "AVAILABLE";
  const costOk = input.cursorCostAuthorized ?? (cursorCostCanAutoAuthorize(input.task.estimatedCost) && cursorAvailable);
  const signals = collectRouterSignals({
    task: input.task,
    cursorAvailable,
    nativeAvailable,
    cursorCostAuthorized: costOk,
  });
  const preferCursor = cursorTechnicallyPreferred(signals);
  const independentReview = input.task.estimatedComplexity === "critical" || input.task.securityLevel === "sensitive";

  if (!nativeAvailable && !cursorAvailable) {
    return { outcome: "BLOCK", providerId: null, executionMode: null, rationale: ["No coding provider available"], independentReview };
  }

  if (preferCursor && cursorAvailable && costOk) {
    if (input.task.estimatedComplexity === "critical" && nativeAvailable) {
      return {
        outcome: "MULTI_AGENT",
        providerId: "cursor",
        executionMode: "CURSOR_CLOUD_AGENT",
        rationale: ["Large/complex work; Native bootstrap + Cursor implementation is compatible"],
        independentReview,
      };
    }
    return {
      outcome: "CURSOR",
      providerId: cursorAvailable ? input.cursor.id : "mock_cursor",
      executionMode: "CURSOR_CLI",
      rationale: ["Large repository / multi-file / deep exploration favors Cursor when configured and authorized"],
      independentReview,
    };
  }

  if (preferCursor && cursorAvailable && !costOk) {
    if (nativeAvailable && nativeCanHandle(input.task, input.native)) {
      return {
        outcome: "INFINITY_NATIVE",
        providerId: "infinity_native",
        executionMode: "NATIVE",
        rationale: ["Cursor preferred but cost denied; Native Coder is economically valid fallback"],
        independentReview,
      };
    }
    return {
      outcome: "DEFER",
      providerId: null,
      executionMode: null,
      rationale: ["Cursor cost denied and Native fallback not economically valid"],
      independentReview,
    };
  }

  if (preferCursor && !cursorAvailable) {
    if (nativeAvailable && nativeCanHandle(input.task, input.native)) {
      return {
        outcome: "INFINITY_NATIVE",
        providerId: "infinity_native",
        executionMode: "NATIVE",
        rationale: ["Cursor unavailable/NOT_CONFIGURED; Native Coder remains able to build"],
        independentReview,
      };
    }
    return { outcome: "BLOCK", providerId: null, executionMode: null, rationale: ["Cursor unavailable and Native cannot handle task"], independentReview };
  }

  return {
    outcome: "INFINITY_NATIVE",
    providerId: "infinity_native",
    executionMode: "NATIVE",
    rationale: ["Small isolated utility prefers Infinity Native Coder"],
    independentReview,
  };
}

export function unknownCost(cost: EpistemicCost): boolean {
  return cost.actuality === "UNKNOWN" || cost.value == null;
}
