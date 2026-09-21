import { describe, expect, it } from "vitest";
import { createInfinityNativeCoder, createCursorCodingAgentProvider, createMockCursorCodingAgentProvider } from "../providers/factory";
import { routeCodingAgent } from "../router";
import { createCodingTask, knownCost, unknownCost } from "../task";
import { executeCodingAgentPipeline } from "../execute";
import { CodingAgentStore } from "../store";
import { evaluateCommand, evaluatePathMutation, envAccessPermittedByDefault } from "../policy";
import { authorizeCursorUsage, cursorCostCanAutoAuthorize } from "../treasury";
import { decideRepair } from "../repair";
import { createGovernedStore, ORG_A } from "@/lib/infinity/treasury/__tests__/fixtures";

const native = createInfinityNativeCoder();
const liveCursor = createCursorCodingAgentProvider();
const mockCursor = createMockCursorCodingAgentProvider();
const forcedCursor = createCursorCodingAgentProvider({ forceConfigured: true });

function simpleTask() {
  return createCodingTask({
    organizationId: ORG_A,
    objective: "Add a tiny isolated utility",
    filesAffectedEstimate: 2,
    estimatedComplexity: "low",
    repository: { root: "/tmp/v", sizeClass: "small", fileCount: 3 },
  });
}

function largeTask(org = ORG_A) {
  return createCodingTask({
    organizationId: org,
    objective: "Large multi-file refactor with iterative tests",
    filesAffectedEstimate: 22,
    estimatedComplexity: "high",
    repository: { root: "/tmp/big", sizeClass: "large", fileCount: 400 },
    terminalNeeded: true,
    repositoryExplorationNeeded: true,
    debuggingDepth: "deep",
    estimatedCost: knownCost(0.4),
  });
}

describe("coding-agent-provider", () => {
  it("exposes Native and Cursor providers with capability subsets", () => {
    expect(native.availability()).toBe("AVAILABLE");
    expect(native.supports("IMPLEMENT_FEATURE")).toBe(true);
    expect(liveCursor.availability()).toBe("NOT_CONFIGURED");
    expect(mockCursor.configuredModes()).toEqual(["CURSOR_CLI", "CURSOR_CLOUD_AGENT"]);
    expect(mockCursor.supports("LARGE_REPOSITORY_EXECUTION")).toBe(true);
  });
});

describe("coding-agent-router", () => {
  it("prefers Native Coder for a small isolated utility", () => {
    const decision = routeCodingAgent({ task: simpleTask(), native, cursor: mockCursor });
    expect(decision.outcome).toBe("INFINITY_NATIVE");
    expect(decision.providerId).toBe("infinity_native");
  });

  it("may select Cursor for a large iterative refactor when configured", () => {
    const decision = routeCodingAgent({
      task: largeTask(),
      native,
      cursor: mockCursor,
      cursorCostAuthorized: true,
    });
    expect(["CURSOR", "MULTI_AGENT"]).toContain(decision.outcome);
    expect(decision.providerId).not.toBe("infinity_native");
  });
});

describe("coding-agent-native-fallback", () => {
  it("routes to Native when Cursor is NOT_CONFIGURED", () => {
    const decision = routeCodingAgent({ task: largeTask(), native, cursor: liveCursor, cursorCostAuthorized: true });
    expect(decision.outcome).toBe("INFINITY_NATIVE");
    expect(decision.providerId).toBe("infinity_native");
  });
});

describe("coding-agent-cost-policy", () => {
  it("does not auto-authorize unknown Cursor cost", () => {
    expect(cursorCostCanAutoAuthorize(unknownCost())).toBe(false);
    const { store } = createGovernedStore({ autonomy: true });
    const gate = authorizeCursorUsage(store, { ...largeTask(), estimatedCost: unknownCost() }, unknownCost());
    expect(gate.authorized).toBe(false);
    expect(gate.reasonCodes).toContain("UNKNOWN_COST");
  });

  it("does not execute live Cursor when Treasury denies cost and falls back to Native", async () => {
    const { store: treasury } = createGovernedStore();
    const store = new CodingAgentStore();
    const { run } = await executeCodingAgentPipeline({
      store,
      task: largeTask(),
      native,
      cursor: forcedCursor,
      treasury,
    });
    expect(run.provider).toBe("infinity_native");
    expect(run.routerOutcome).toBe("INFINITY_NATIVE");
    expect(run.failureCode).not.toBe("COST_DENIED");
  });
});

describe("coding-agent-workspace-security", () => {
  it("blocks .env.local mutations by default", async () => {
    expect(evaluatePathMutation(".env.local", largeTask()).allowed).toBe(false);
    expect(envAccessPermittedByDefault(".env.local")).toBe(false);
    const store = new CodingAgentStore();
    const { run, artifact } = await executeCodingAgentPipeline({
      store,
      task: largeTask(),
      native,
      cursor: mockCursor,
      simulation: "forbidden_path",
    });
    expect(run.failureCode).toBe("WORKSPACE_VIOLATION");
    expect(run.infinityAccepted).toBe(false);
    expect(artifact).toBeNull();
  });
});

describe("coding-agent-command-policy", () => {
  it("blocks production deploy and DNS mutation commands", async () => {
    expect(evaluateCommand("vercel deploy --prod").allowed).toBe(false);
    const store = new CodingAgentStore();
    const { run } = await executeCodingAgentPipeline({
      store,
      task: largeTask(),
      native,
      cursor: mockCursor,
      simulation: "external_action",
    });
    expect(run.failureCode).toBe("COMMAND_POLICY_VIOLATION");
    expect(run.externalActionRequirements[0]?.requiresEag).toBe(true);
  });
});

describe("coding-agent-qa", () => {
  it("treats Cursor COMPLETED as distinct from Infinity acceptance", async () => {
    const store = new CodingAgentStore();
    const { run, artifact } = await executeCodingAgentPipeline({
      store,
      task: largeTask(),
      native,
      cursor: mockCursor,
      simulation: "compile_failure",
    });
    expect(run.providerStatus).toBe("COMPLETED");
    expect(run.infinityAccepted).toBe(false);
    expect(run.failureCode).toBe("QA_FAILED");
    expect(run.qa?.passed).toBe(false);
    expect(artifact).toBeNull();
    expect(decideRepair(run)).toBe("NATIVE_REPAIR");
  });
});

describe("coding-agent-normalization", () => {
  it("successful mock Cursor produces CodeChangeSet, mutations, BuildGate, ProductionArtifact", async () => {
    const store = new CodingAgentStore();
    const { run, artifact } = await executeCodingAgentPipeline({
      store,
      task: largeTask(),
      native,
      cursor: mockCursor,
      simulation: "success",
    });
    expect(run.providerStatus).toBe("COMPLETED");
    expect(run.infinityAccepted).toBe(true);
    expect(run.changeSet).toBeTruthy();
    expect(run.mutations.length).toBeGreaterThan(0);
    expect(run.buildGatePassed).toBe(true);
    expect(artifact?.accepted).toBe(true);
    expect(artifact?.publiclyDeployed).toBe(false);
    expect(store.telemetry[0]?.finalAcceptance).toBe(true);
  });
});
