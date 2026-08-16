import type { RepairAttemptRecord } from "../types";
import type { VentureSandbox } from "../workspace/sandbox";
import { executeOrchestration } from "@/lib/infinity/multi-brain";
import { applyRepairForFailure, classifyValidationFailure, runAllValidators } from "../validate/run-validators";
import { getPabLimits } from "../config";
import type { CostLedgerEntry } from "../types";

export async function runRepairLoop(input: {
  sandbox: VentureSandbox;
  organizationId: string;
  buildRunId: string;
  costLedger: CostLedgerEntry[];
  induceValidationFailure?: boolean;
  maxAttempts?: number;
}): Promise<{
  validationPassed: boolean;
  repairAttempts: RepairAttemptRecord[];
  validationRuns: Awaited<ReturnType<typeof runAllValidators>>["runs"];
}> {
  const limits = getPabLimits();
  const maxAttempts = input.maxAttempts ?? limits.maxRepairAttemptsPerTask;
  const repairAttempts: RepairAttemptRecord[] = [];
  let validation = await runAllValidators(input.sandbox);

  if (input.induceValidationFailure && validation.passed) {
    await input.sandbox.patchTextFile("app/page.tsx", (c) =>
      `${c}\nconst __PAB_BROKEN__: never = undefined as unknown as string;\n`,
    );
    validation = await runAllValidators(input.sandbox);
  }

  let attempt = 0;
  let repairCost = 0;

  while (!validation.passed && attempt < maxAttempts) {
    attempt += 1;
    const classification = await classifyValidationFailure(validation.runs);

    const orchestration = await executeOrchestration({
      organizationId: input.organizationId,
      idempotencyKey: `pab-repair-${input.buildRunId}-${attempt}`,
      brainInput: {
        taskType: "build_repair",
        prompt: `Repair validation failure: ${classification}`,
        context: {
          complexity: "medium",
          codingRequired: true,
          implementationRisk: 0.6,
        },
        constraints: ["Stay within workspace", "No secrets"],
      },
      costLimitUsd: limits.maxRepairCostUsd - repairCost,
    });

    for (const exec of orchestration.executions) {
      input.costLedger.push({
        provider: exec.provider,
        modelId: exec.modelId,
        taskType: `repair_${attempt}`,
        inputTokens: exec.inputTokens,
        outputTokens: exec.outputTokens,
        estimatedCostUsd: exec.estimatedCostUsd,
      });
      repairCost += exec.estimatedCostUsd;
    }

    const repair = await applyRepairForFailure(input.sandbox, classification);

    validation = await runAllValidators(input.sandbox);
    const success = validation.passed;

    repairAttempts.push({
      attemptNumber: attempt,
      failureClassification: classification,
      repairAction: { ...repair.action, orchestrationStrategy: orchestration.strategy },
      success,
    });

    if (repairCost >= limits.maxRepairCostUsd) break;
  }

  return {
    validationPassed: validation.passed,
    repairAttempts,
    validationRuns: validation.runs,
  };
}
