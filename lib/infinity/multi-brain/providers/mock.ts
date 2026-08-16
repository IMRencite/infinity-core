import type { BrainRole } from "../constants";
import type { BrainExecutionOutput, BrainProvider } from "../types";

function estimateCost(inputTokens: number, outputTokens: number, inputRate: number, outputRate: number): number {
  return (inputTokens / 1000) * inputRate + (outputTokens / 1000) * outputRate;
}

export function createMockBrainProvider(): BrainProvider {
  return {
    provider: "mock",
    isConfigured: () => true,
    async execute(input) {
      const started = Date.now();
      const inputTokens = Math.max(100, Math.floor(input.prompt.length / 4));
      const outputTokens = input.role === "critic" ? 400 : input.role === "synthesizer" ? 500 : 300;
      const latencyMs = input.role === "primary" ? 50 : 30;

      const roleContent: Record<BrainRole, string> = {
        primary: `Primary recommendation for ${input.taskType}: implement with structured modules and typed interfaces.`,
        specialist: `Specialist analysis for ${input.taskType}: prefer adapter pattern with sandbox billing configuration.`,
        critic: `Critic review: watch for auth boundary leaks, missing validation, and monetization stub completeness.`,
        reviewer: `Reviewer: outputs align with acceptance criteria pending deterministic verification.`,
        synthesizer: `Synthesized plan for ${input.taskType}: proceed with adapter-based monetization, isolated workspace files, deterministic validation gate.`,
      };

      const structured: Record<string, unknown> = {
        taskType: input.taskType,
        role: input.role,
        recommendation: roleContent[input.role],
        files: input.context?.allowedPaths ?? [],
        confidence: input.role === "critic" ? 0.78 : input.role === "synthesizer" ? 0.91 : 0.85,
      };

      if (input.role === "critic") {
        structured.risks = ["Incomplete schema validation", "Missing route guards"];
        structured.contradictsPrimary = false;
      }

      return {
        provider: "mock",
        modelId: input.modelId,
        role: input.role,
        content: roleContent[input.role],
        structured,
        confidence: structured.confidence as number,
        inputTokens,
        outputTokens,
        estimatedCostUsd: estimateCost(inputTokens, outputTokens, 0.001, 0.002),
        latencyMs: Date.now() - started + latencyMs,
        success: true,
      };
    },
  };
}

export function createFailingMockProvider(failOnRole?: BrainRole): BrainProvider {
  const base = createMockBrainProvider();
  return {
    ...base,
    provider: "mock-fail",
    async execute(input) {
      if (failOnRole && input.role === failOnRole) {
        return {
          provider: "mock-fail",
          modelId: input.modelId,
          role: input.role,
          content: "",
          confidence: 0,
          inputTokens: 0,
          outputTokens: 0,
          estimatedCostUsd: 0,
          latencyMs: 5,
          success: false,
          error: "Simulated provider failure",
        };
      }
      return base.execute(input);
    },
  };
}

export function getConfiguredProviders(): BrainProvider[] {
  return [createMockBrainProvider()];
}

export function resolveProvider(providerName: string, providers: BrainProvider[]): BrainProvider | undefined {
  return providers.find((p) => p.provider === providerName || (providerName === "mock" && p.provider.startsWith("mock")));
}
