import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  buildAgentContextSnapshot,
  buildExecutionGraph,
  buildExecutionPlan,
  clearAgentRegistry,
  createInMemoryAgentEventEmitter,
  createStubAgentResult,
  getAgent,
  mergeAgentResults,
  runConsensus,
  runCoordinator,
  runCritique,
  runMultiAgentOrchestration,
  runReflectionStage,
  scheduleExecutionBatches,
  seedSpecialistAgentTemplates,
  validateExecutionGraph,
  ExecutionGraphError,
} from "@/lib/infinity/agents";
import type { AgentDefinition } from "@/lib/infinity/agents";

const context = buildAgentContextSnapshot({
  organizationId: "org-1",
  correlationId: "corr-1",
  missionId: "m-1",
  opportunityId: "opp-1",
  validationRunId: "vr-1",
  executiveDecisionId: "ed-1",
});

function loadAgents(ids: string[]): AgentDefinition[] {
  return ids.map((id) => {
    const agent = getAgent(id);
    if (!agent) throw new Error(`Missing agent ${id}`);
    return agent;
  });
}

describe("agent registry", () => {
  beforeEach(() => {
    clearAgentRegistry();
  });

  it("seeds specialist templates with required metadata", () => {
    seedSpecialistAgentTemplates();
    const research = getAgent("agent.research");
    expect(research?.name).toBe("Research Agent");
    expect(research?.capabilities.length).toBeGreaterThan(0);
    expect(research?.timeoutMs).toBeGreaterThan(0);
  });
});

describe("execution graph", () => {
  beforeEach(() => {
    clearAgentRegistry();
    seedSpecialistAgentTemplates();
  });

  it("builds DAG layers and supports parallel batches", () => {
    const agents = loadAgents([
      "agent.research",
      "agent.risk_analyst",
      "agent.market_analyst",
      "agent.financial_analyst",
    ]);

    const graph = buildExecutionGraph(agents);
    validateExecutionGraph(graph);

    const parallelBatches = scheduleExecutionBatches(graph, "parallel");
    expect(parallelBatches.length).toBeGreaterThan(0);

    const sequentialBatches = scheduleExecutionBatches(graph, "sequential");
    expect(sequentialBatches.every((batch) => batch.length === 1)).toBe(true);
  });

  it("detects dependency cycles", () => {
    const base: AgentDefinition = {
      id: "a",
      name: "A",
      role: "custom",
      capabilities: ["research.synthesize"],
      requiredContext: [],
      supportedTools: [],
      priority: 1,
      timeoutMs: 1,
      costEstimate: { currency: "USD", estimatedUnits: 0, unitLabel: "tokens" },
      executionMode: "sequential",
      dependencies: [],
      status: "registered",
    };

    const a = { ...base, id: "a", dependencies: ["b"] };
    const b = { ...base, id: "b", dependencies: ["a"] };

    expect(() => buildExecutionGraph([a, b])).toThrow(ExecutionGraphError);
  });
});

describe("coordinator", () => {
  beforeEach(() => {
    clearAgentRegistry();
    seedSpecialistAgentTemplates();
  });

  it("runs agents deterministically and emits events", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const plan = buildExecutionPlan({
      organizationId: "org-1",
      correlationId: "corr-1",
      agentIds: ["agent.research", "agent.risk_analyst"],
      mode: "parallel",
      context,
    });

    const result = runCoordinator({
      plan,
      context,
      consensusStrategy: "best_confidence",
    });

    expect(result.results).toHaveLength(2);
    expect(result.events.some((event) => event.eventType === "agent.completed")).toBe(true);
    expect(result.run.status).toBe("completed");
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});

describe("consensus", () => {
  it("supports executive override strategy", () => {
    const consensus = runConsensus({
      strategy: "executive_override",
      results: [],
      executiveDecisionSummary: "Executive approved.",
    });

    expect(consensus.executiveOverrideApplied).toBe(true);
    expect(consensus.binding).toBe(false);
  });
});

describe("aggregation", () => {
  it("merges results and preserves provenance", () => {
    const merged = mergeAgentResults([
      createStubAgentResult({
        agentId: "a",
        agentRole: "research",
        runId: "run-1",
        correlationId: "corr-1",
        capabilityKeys: ["research.synthesize"],
        confidenceScore: 80,
      }),
      createStubAgentResult({
        agentId: "b",
        agentRole: "risk_analyst",
        runId: "run-1",
        correlationId: "corr-1",
        capabilityKeys: ["risk.assess"],
        confidenceScore: 60,
      }),
    ]);

    expect(merged.provenance).toHaveLength(2);
    expect(merged.advisoryOnly).toBe(true);
  });
});

describe("reflection and critique", () => {
  it("runs reflection stage events", () => {
    const results = [
      createStubAgentResult({
        agentId: "a",
        agentRole: "reflection",
        runId: "run-1",
        correlationId: "corr-1",
        capabilityKeys: ["reflection.summarize"],
        confidenceScore: 70,
      }),
    ];

    const reflection = runReflectionStage({
      organizationId: "org-1",
      runId: "run-1",
      correlationId: "corr-1",
      results,
    });

    expect(reflection.events.some((e) => e.eventType === "reflection.completed")).toBe(true);
  });

  it("detects missing evidence in critique", () => {
    const report = runCritique({
      kinds: ["missing_evidence_detection"],
      results: [],
      context: buildAgentContextSnapshot({
        organizationId: "org-1",
        correlationId: "corr-1",
      }),
    });

    expect(report.findings.some((f) => f.kind === "missing_evidence_detection")).toBe(true);
  });
});

describe("multi-agent runtime", () => {
  beforeEach(() => {
    clearAgentRegistry();
    seedSpecialistAgentTemplates();
  });

  it("orchestrates end-to-end without providers", () => {
    const emitter = createInMemoryAgentEventEmitter();

    const result = runMultiAgentOrchestration({
      organizationId: "org-1",
      correlationId: "corr-2",
      agentIds: ["agent.research", "agent.market_analyst"],
      mode: "parallel",
      context,
      consensusStrategy: "majority",
    });

    for (const event of result.events) emitter.emit(event);

    expect(result.consensus.advisoryOnly).toBe(true);
    expect(emitter.list(result.run.id).length).toBeGreaterThan(0);
  });
});
