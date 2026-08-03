import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  assembleReasoningContext,
  assertActionAllowedByExecutive,
  clearReasoningProviderRegistry,
  composePrompts,
  createInMemoryMemoryStore,
  createInMemoryReasoningEventEmitter,
  createMemoryRecord,
  createReasoningSession,
  defaultReasoningConstraints,
  getPromptTemplate,
  listPromptTemplates,
  registerReasoningProvider,
  renderPromptSegment,
  runAdvisoryReasoningRuntime,
  runConstraintInjectionStage,
  runReasoningPipeline,
  selectReasoningProvider,
  ReasoningSafetyError,
} from "@/lib/infinity/reasoning";
import type { ReasoningProvider } from "@/lib/infinity/reasoning";

function stubProvider(id: ReasoningProvider["id"]): ReasoningProvider {
  return {
    id,
    name: `Stub ${id}`,
    version: "0.0.0",
    capabilities: {
      contextWindowTokens: 128_000,
      maxOutputTokens: 8_192,
      supportsTools: true,
      supportsImages: false,
      supportsJsonMode: true,
      supportsFunctionCalling: true,
      supportsStreaming: true,
      supportsReasoningMode: true,
    },
    costMetrics: {
      currency: "USD",
      inputCostPer1kTokens: null,
      outputCostPer1kTokens: null,
    },
    listModels: () => [
      {
        providerId: id,
        modelId: "stub-model",
        displayName: "Stub Model",
        version: "0.0.0",
        contextWindowTokens: 128_000,
        maxOutputTokens: 8_192,
      },
    ],
  };
}

const baseContextInput = {
  organizationId: "org-1",
  correlationId: "corr-1",
  mission: { missionId: "m-1", title: "Mission", objective: "Enterprise value" },
  opportunity: {
    opportunityId: "opp-1",
    name: "Alpha",
    industry: "software",
    category: "saas",
  },
  validation: {
    validationRunId: "vr-1",
    recommendation: "approved_for_planning",
    overallScore: 72,
    overallConfidence: 70,
  },
  executive: {
    executiveDecisionId: "ed-1",
    decision: "approve",
    planningEligible: true,
    priorityScore: 80,
    rationale: ["Executive approved."],
  },
  planner: {
    plannerPlanId: null,
    gateStatus: "eligible" as const,
    notes: ["Awaiting planner record."],
  },
  policy: { policyKeys: ["founding"], autonomyLevel: "bounded" },
  memoryRecords: [],
  build: { buildFactoryEnabled: false as const, notes: ["Build Factory disabled."] },
};

describe("provider registry", () => {
  beforeEach(() => {
    clearReasoningProviderRegistry();
  });

  it("registers and selects providers deterministically", () => {
    registerReasoningProvider(stubProvider("anthropic"));
    const selected = selectReasoningProvider({
      preferredProviderId: "anthropic",
      fallbackProviderIds: [],
    });
    expect(selected?.id).toBe("anthropic");
  });
});

describe("context builders", () => {
  it("assembles structured context without prompts or AI", () => {
    const bundle = assembleReasoningContext(baseContextInput);
    expect(bundle.executive.authoritative).toBe(true);
    expect(bundle.planner.requiresExecutiveDecision).toBe(true);
    expect(bundle.build.buildFactoryEnabled).toBe(false);
  });
});

describe("prompt composition", () => {
  it("composes template segments from catalog keys", () => {
    const template = getPromptTemplate("advisory_boundary");
    expect(template).not.toBeNull();
    const bundle = composePrompts([
      {
        template: template!,
        variables: { organization_id: "org-1" },
      },
    ]);
    expect(bundle.segments).toHaveLength(1);
    expect(renderPromptSegment(bundle.segments[0]!)).toContain("org-1");
    expect(listPromptTemplates().length).toBeGreaterThan(5);
  });
});

describe("memory abstraction", () => {
  it("stores and queries in-memory records", () => {
    const store = createInMemoryMemoryStore();
    const record = createMemoryRecord({
      organizationId: "org-1",
      scope: "opportunity",
      subjectType: "opportunity",
      subjectId: "opp-1",
      label: "note",
      content: "Deterministic note",
    });
    store.put(record);
    expect(store.query({ organizationId: "org-1", scope: "opportunity" })).toHaveLength(1);
  });
});

describe("constraints", () => {
  it("blocks executive-gated actions without authorization", () => {
    expect(() => assertActionAllowedByExecutive("allocate_capital", false)).toThrow(
      ReasoningSafetyError,
    );
    expect(() => assertActionAllowedByExecutive("allocate_capital", true)).not.toThrow();
  });

  it("defaults to advisory-only constraints", () => {
    const constraints = defaultReasoningConstraints();
    expect(constraints.advisoryOnly).toBe(true);
    expect(constraints.executiveAuthoritative).toBe(true);
  });
});

describe("session lifecycle", () => {
  it("creates immutable-style session snapshots", () => {
    const session = createReasoningSession({
      organizationId: "org-1",
      missionId: "m-1",
      opportunityId: "opp-1",
      validationRunId: "vr-1",
      executiveDecisionId: "ed-1",
      plannerPlanId: null,
      correlationId: "corr-1",
    });

    const withConstraints = runConstraintInjectionStage(session);
    expect(withConstraints.constraints.forbiddenWithoutExecutiveAuth.length).toBeGreaterThan(0);
  });
});

describe("reasoning pipeline", () => {
  beforeEach(() => {
    clearReasoningProviderRegistry();
    registerReasoningProvider(stubProvider("openai"));
  });

  it("runs stages without network or LLM execution", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const session = createReasoningSession({
      organizationId: "org-1",
      missionId: "m-1",
      opportunityId: "opp-1",
      validationRunId: "vr-1",
      executiveDecisionId: "ed-1",
      plannerPlanId: null,
      correlationId: "corr-1",
    });

    const result = runReasoningPipeline({ session }, baseContextInput);

    expect(result.session.status).toBe("completed");
    expect(result.session.pipelineStageResults.execution?.status).toBe("completed");
    expect(result.session.advisoryOutputs.some((o) => o.kind === "recommendation")).toBe(true);
    expect(result.events.some((e) => e.eventType === "reasoning.completed")).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});

describe("runtime orchestration", () => {
  beforeEach(() => {
    clearReasoningProviderRegistry();
    registerReasoningProvider(stubProvider("gemini"));
  });

  it("emits canonical reasoning events", () => {
    const emitter = createInMemoryReasoningEventEmitter();
    const result = runAdvisoryReasoningRuntime({
      refs: {
        organizationId: "org-1",
        missionId: "m-1",
        opportunityId: "opp-1",
        validationRunId: "vr-1",
        executiveDecisionId: "ed-1",
        plannerPlanId: null,
        correlationId: "corr-2",
      },
      context: baseContextInput,
      selectionPolicy: { preferredProviderId: "gemini", fallbackProviderIds: [] },
    });

    for (const event of result.events) {
      emitter.emit(event);
    }

    expect(emitter.list(result.session.id).length).toBe(result.events.length);
    expect(result.session.advisoryOutputs.every((output) => output.binding === false)).toBe(true);
  });
});
