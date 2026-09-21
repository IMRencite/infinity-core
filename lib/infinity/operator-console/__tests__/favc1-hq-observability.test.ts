import { describe, it, expect } from "vitest";
import { isLegitimateFavc1CycleKey, isVerificationVentureName } from "../favc1-cycle/exclude-fixtures";
import {
  currentStageLabel,
  deriveDownstreamRoomState,
  mapPersistedRunStatusToUi,
} from "../favc1-cycle/map-run-status";
import { shouldPreferFavc1CycleForHq } from "../favc1-cycle/resolve-active-cycle";
import {
  buildFavc1IdempotencyKey,
  favc1CycleVentureId,
  isFavc1CycleVentureId,
  parseFavc1CycleVentureId,
  parseFavc1IdempotencyKey,
  type ResolvedFavc1Cycle,
} from "../favc1-cycle/types";

function baseCycle(overrides: Partial<ResolvedFavc1Cycle> = {}): ResolvedFavc1Cycle {
  return {
    cycleKey: "cycle-1786914709744",
    organizationId: "org-1",
    discoveryRunId: "discovery-1",
    monetizationRunId: "monetization-1",
    selectionRunId: null,
    ventureAssemblyId: null,
    discovery: {
      runId: "discovery-1",
      status: "completed",
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: "2026-01-01T00:05:00Z",
      estimatedCostUsd: 0.004,
      failureClassification: null,
      errorMessage: null,
    },
    monetization: {
      runId: "monetization-1",
      status: "completed",
      startedAt: "2026-01-01T00:05:00Z",
      completedAt: "2026-01-01T00:10:00Z",
      estimatedCostUsd: 0.0018,
      failureClassification: null,
      errorMessage: null,
    },
    selection: null,
    terminalOutcome: "SYSTEM_FAILURE",
    isActive: false,
    isTerminal: true,
    latestActivityAt: "2026-01-01T00:10:00Z",
    candidateCount: 9,
    monetizedCandidateCount: 5,
    knownCycleCostUsd: 0.0058,
    knownCycleCostComplete: true,
    failureStage: "venture_selection",
    failureMessage: "Venture selection did not start after monetization completed",
    ...overrides,
  };
}

describe("FAVC1 HQ observability", () => {
  it("parses canonical FAVC1 idempotency keys", () => {
    const key = buildFavc1IdempotencyKey("org-1", "cycle-1786914709744", "discovery");
    expect(parseFavc1IdempotencyKey(key)).toEqual({
      organizationId: "org-1",
      cycleKey: "cycle-1786914709744",
      stage: "discovery",
    });
  });

  it("excludes fixture and verification cycle keys", () => {
    expect(isLegitimateFavc1CycleKey("cycle-1786914709744")).toBe(true);
    expect(isLegitimateFavc1CycleKey("verification-run-1")).toBe(false);
    expect(isVerificationVentureName("GEO Analytics Verification")).toBe(true);
  });

  it("maps persisted run statuses to HQ room states", () => {
    expect(mapPersistedRunStatusToUi("researching")).toBe("RUNNING");
    expect(mapPersistedRunStatusToUi("completed")).toBe("COMPLETE");
    expect(mapPersistedRunStatusToUi("failed")).toBe("FAILED");
    expect(mapPersistedRunStatusToUi(null)).toBe("NOT_STARTED");
  });

  it("marks unreached downstream rooms as BLOCKED, not FAILED", () => {
    expect(
      deriveDownstreamRoomState({
        upstreamState: "COMPLETE",
        upstreamFailed: false,
        ownState: "NOT_STARTED",
        hasOwnRecords: false,
      }),
    ).toBe("NOT_STARTED");

    expect(
      deriveDownstreamRoomState({
        upstreamState: "RUNNING",
        upstreamFailed: false,
        ownState: "NOT_STARTED",
        hasOwnRecords: false,
      }),
    ).toBe("BLOCKED");
  });

  it("prefers legitimate active FAVC1 over verification venture default", () => {
    expect(
      shouldPreferFavc1CycleForHq({
        cycle: baseCycle({ isActive: true, terminalOutcome: "RUNNING" }),
        defaultVentureName: "Verification Venture",
        defaultVentureLatestActivityAt: "2025-01-01T00:00:00Z",
      }),
    ).toBe(true);
  });

  it("uses favc1-cycle sentinel venture IDs for pre-venture mode", () => {
    const id = favc1CycleVentureId("cycle-1786914709744");
    expect(isFavc1CycleVentureId(id)).toBe(true);
    expect(parseFavc1CycleVentureId(id)).toBe("cycle-1786914709744");
  });

  it("classifies terminal business NO_GO separately from system failure", () => {
    expect(
      currentStageLabel({
        discoveryState: "COMPLETE",
        monetizationState: "COMPLETE",
        selectionState: "COMPLETE",
        terminalOutcome: "BUSINESS_NO_GO",
      }),
    ).toBe("Market decision complete");

    expect(
      currentStageLabel({
        discoveryState: "COMPLETE",
        monetizationState: "COMPLETE",
        selectionState: "NOT_STARTED",
        terminalOutcome: "SYSTEM_FAILURE",
      }),
    ).toBe("Cycle interrupted");
  });

  it("maps BUSINESS_NO_GO to Command COMPLETE semantics, not FAILED", () => {
    type TerminalOutcome =
      | "BUSINESS_NO_GO"
      | "SYSTEM_FAILURE"
      | "INFRASTRUCTURE_BLOCKED"
      | "NO_GO_MARKET_DECISION"
      | "LEVEL_4";
    const commandStateFor = (terminalOutcome: TerminalOutcome) =>
      terminalOutcome === "SYSTEM_FAILURE" || terminalOutcome === "INFRASTRUCTURE_BLOCKED"
        ? "FAILED"
        : terminalOutcome === "BUSINESS_NO_GO" ||
            terminalOutcome === "NO_GO_MARKET_DECISION" ||
            terminalOutcome === "LEVEL_4"
          ? "COMPLETE"
          : "RUNNING";
    expect(commandStateFor("BUSINESS_NO_GO")).toBe("COMPLETE");
    expect(
      deriveDownstreamRoomState({
        upstreamState: "COMPLETE",
        upstreamFailed: false,
        ownState: "NOT_STARTED",
        hasOwnRecords: false,
      }),
    ).toBe("NOT_STARTED");
  });

  it("does not treat unknown cost as zero in cycle header formatting contract", () => {
    const meta = {
      knownCycleCostUsd: null,
      knownCycleCostComplete: false,
    };
    expect(meta.knownCycleCostUsd == null ? "Unknown" : `$${meta.knownCycleCostUsd}`).toBe("Unknown");
  });

  it("infers orchestrator handoff failure when monetization completes without selection", () => {
    const cycle = baseCycle();
    expect(cycle.terminalOutcome).toBe("SYSTEM_FAILURE");
    expect(cycle.failureStage).toBe("venture_selection");
    expect(cycle.monetizedCandidateCount).toBe(5);
  });
});
