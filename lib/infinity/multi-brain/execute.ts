import { randomUUID } from "node:crypto";
import { DEFAULT_COST_LIMITS } from "./constants";
import { routeTask } from "./route";
import { synthesizeMultiBrainOutputs } from "./synthesize";
import { createMockBrainProvider, getConfiguredProviders, resolveProvider } from "./providers/mock";
import type {
  BrainExecutionInput,
  BrainExecutionOutput,
  BrainProvider,
  OrchestrationSessionResult,
  RoutingDecision,
} from "./types";

export type ExecuteOrchestrationInput = {
  organizationId: string;
  idempotencyKey: string;
  brainInput: BrainExecutionInput;
  providers?: BrainProvider[];
  costLimitUsd?: number;
  correlationId?: string;
};

async function runRole(
  decision: RoutingDecision,
  role: RoutingDecision["roles"][number],
  brainInput: BrainExecutionInput,
  providers: BrainProvider[],
): Promise<BrainExecutionOutput | null> {
  let model = decision.primaryModel;
  if (role === "specialist" && decision.specialistModels[0]) {
    model = decision.specialistModels[0];
  } else if (role === "critic" && decision.criticModel) {
    model = decision.criticModel;
  } else if (role === "reviewer" && decision.reviewerModel) {
    model = decision.reviewerModel;
  } else if (role === "synthesizer" && decision.synthesizerModel) {
    model = decision.synthesizerModel;
  }

  const provider = resolveProvider(model.provider, providers) ?? providers[0];
  if (!provider?.isConfigured()) {
    return {
      provider: model.provider,
      modelId: model.modelId,
      role,
      content: "",
      confidence: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      latencyMs: 0,
      success: false,
      error: `Provider ${model.provider} not configured`,
    };
  }

  return provider.execute({
    modelId: model.modelId,
    role,
    taskType: brainInput.taskType,
    prompt: brainInput.prompt,
    context: brainInput.context,
  });
}

export async function executeOrchestration(input: ExecuteOrchestrationInput): Promise<OrchestrationSessionResult> {
  const providers = input.providers ?? getConfiguredProviders();
  const costLimit = input.costLimitUsd ?? DEFAULT_COST_LIMITS.maxSessionCostUsd;
  const decision = routeTask({
    taskType: input.brainInput.taskType,
    complexity: input.brainInput.context?.complexity as "low" | "medium" | "high" | undefined,
    economicImportance: input.brainInput.context?.economicImportance as number | undefined,
    implementationRisk: input.brainInput.context?.implementationRisk as number | undefined,
    researchRequired: input.brainInput.context?.researchRequired as boolean | undefined,
    codingRequired: input.brainInput.context?.codingRequired as boolean | undefined,
    architectureRequired: input.brainInput.context?.architectureRequired as boolean | undefined,
  });

  const executions: BrainExecutionOutput[] = [];
  let totalCostUsd = 0;

  const primary = await runRole(decision, "primary", input.brainInput, providers);
  if (primary) {
    executions.push(primary);
    totalCostUsd += primary.estimatedCostUsd;
  }

  if (totalCostUsd > costLimit) {
    return buildResult(decision, executions, null, totalCostUsd, "cost_blocked");
  }

  const parallelRoles = decision.roles.filter((r) => r !== "primary" && r !== "synthesizer");
  const parallelResults = await Promise.all(
    parallelRoles.map((role) => runRole(decision, role, input.brainInput, providers)),
  );
  for (const result of parallelResults) {
    if (result) {
      executions.push(result);
      totalCostUsd += result.estimatedCostUsd;
    }
  }

  if (totalCostUsd > costLimit) {
    return buildResult(decision, executions, null, totalCostUsd, "cost_blocked");
  }

  let synthesis = null;
  if (decision.roles.includes("synthesizer")) {
    const synthesizerOutput = await runRole(decision, "synthesizer", input.brainInput, providers);
    if (synthesizerOutput) {
      executions.push(synthesizerOutput);
      totalCostUsd += synthesizerOutput.estimatedCostUsd;
    }

    synthesis = synthesizeMultiBrainOutputs({
      taskType: input.brainInput.taskType,
      primary: primary ?? synthesizerOutput!,
      specialists: executions.filter((e) => e.role === "specialist"),
      critics: executions.filter((e) => e.role === "critic"),
      reviewers: executions.filter((e) => e.role === "reviewer"),
      constraints: input.brainInput.constraints ?? [],
      taskCharacteristics: {
        taskType: input.brainInput.taskType,
        complexity: (input.brainInput.context?.complexity as "low" | "medium" | "high" | "critical") ?? "medium",
        uncertainty: 0.5,
        economicImportance: (input.brainInput.context?.economicImportance as number) ?? 0.5,
        implementationRisk: (input.brainInput.context?.implementationRisk as number) ?? 0.4,
        reversibility: 0.7,
        researchRequired: Boolean(input.brainInput.context?.researchRequired),
        codingRequired: Boolean(input.brainInput.context?.codingRequired ?? true),
        architectureRequired: Boolean(input.brainInput.context?.architectureRequired),
        expectedTokenCost: 8000,
        expectedExternalCost: 0,
      },
    });
  }

  const anyFailed = executions.some((e) => !e.success);
  return buildResult(
    decision,
    executions,
    synthesis,
    totalCostUsd,
    anyFailed && !primary?.success ? "failed" : "completed",
  );
}

function buildResult(
  decision: RoutingDecision,
  executions: BrainExecutionOutput[],
  synthesis: OrchestrationSessionResult["synthesis"],
  totalCostUsd: number,
  status: OrchestrationSessionResult["status"],
): OrchestrationSessionResult {
  return {
    sessionId: randomUUID(),
    strategy: decision.strategy,
    taskCharacteristics: {
      taskType: executions[0]?.role ?? "unknown",
      complexity: "medium",
      uncertainty: 0.5,
      economicImportance: 0.5,
      implementationRisk: 0.4,
      reversibility: 0.7,
      researchRequired: false,
      codingRequired: true,
      architectureRequired: false,
      expectedTokenCost: 8000,
      expectedExternalCost: 0,
    },
    executions,
    synthesis,
    disagreements: synthesis?.disagreements ?? [],
    totalCostUsd,
    status,
  };
}

export { createMockBrainProvider };
