import type { BuildGraph, BuildTask, VentureBlueprintDraft } from "@/lib/infinity/company-builder/types";
import { executeOrchestration, persistOrchestrationSession } from "@/lib/infinity/multi-brain";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { CostLedgerEntry, TaskRunRecord } from "../types";
import type { VentureSandbox } from "../workspace/sandbox";
import {
  scaffoldBaseApplication,
  writeAuthStub,
  writeContentAssets,
  writeFeatureComponent,
  writeMonetizationAdapter,
  writeSchemaStub,
  writeTests,
} from "./scaffold";

export function topologicalLayers(graph: BuildGraph): BuildTask[][] {
  const tasks = graph.tasks;
  const completed = new Set<string>();
  const layers: BuildTask[][] = [];

  while (completed.size < tasks.length) {
    const ready = tasks.filter(
      (t) => !completed.has(t.taskId) && t.dependencies.every((d) => completed.has(d)),
    );
    if (ready.length === 0) {
      throw new Error("BuildGraph cycle or missing dependency detected");
    }
    layers.push(ready);
    for (const t of ready) completed.add(t.taskId);
  }
  return layers;
}

export async function executeBuildTask(input: {
  sandbox: VentureSandbox;
  blueprint: VentureBlueprintDraft;
  task: BuildTask;
  costLedger: CostLedgerEntry[];
  admin?: AdminSupabaseClient | null;
  organizationId?: string;
  productAssetBuildRunId?: string;
  correlationId?: string;
}): Promise<{ files: string[]; outputHash: string; taskRecord: TaskRunRecord }> {
  const { sandbox, blueprint, task, costLedger } = input;
  const files: string[] = [];

  const complexity = task.estimatedComplexity;
  const orchestration = await executeOrchestration({
    organizationId: blueprint.sourceLineage.companyBuilderRunId ?? "local",
    idempotencyKey: `pab-task-${task.taskId}-${sandbox.buildRunId}`,
    brainInput: {
      taskType: `build_task_${task.category}`,
      prompt: `Execute build task: ${task.name}. ${task.description}`,
      context: {
        complexity,
        codingRequired: true,
        architectureRequired: task.category === "foundation" || task.category === "monetization",
        economicImportance: task.blocking ? 0.8 : 0.4,
        implementationRisk: complexity === "high" ? 0.7 : 0.4,
        taskId: task.taskId,
        deliverables: task.deliverables,
      },
      constraints: task.verificationCriteria,
    },
    costLimitUsd: 5,
  });

  if (input.admin && input.organizationId && orchestration.disagreements.length > 0) {
    await persistOrchestrationSession(input.admin, {
      organizationId: input.organizationId,
      productAssetBuildRunId: input.productAssetBuildRunId,
      idempotencyKey: `pab-task-${task.taskId}-${sandbox.buildRunId}`,
      correlationId: input.correlationId ?? sandbox.buildRunId,
      result: orchestration,
    }).catch(() => undefined);
  }

  for (const exec of orchestration.executions) {
    costLedger.push({
      provider: exec.provider,
      modelId: exec.modelId,
      taskType: task.taskId,
      inputTokens: exec.inputTokens,
      outputTokens: exec.outputTokens,
      estimatedCostUsd: exec.estimatedCostUsd,
    });
  }

  if (task.taskId === "foundation_schema") {
    files.push(await writeSchemaStub(sandbox, blueprint));
  } else if (task.taskId === "auth_rbac") {
    files.push(...(await writeAuthStub(sandbox)));
  } else if (task.taskId === "analytics_events") {
    files.push("lib/analytics.ts");
  } else if (task.taskId === "monetization_billing") {
    files.push(await writeMonetizationAdapter(sandbox, blueprint));
  } else if (task.taskId === "launch_readiness") {
    files.push(...(await writeContentAssets(sandbox, blueprint)));
    files.push(...(await writeTests(sandbox)));
  } else if (task.category === "core_product") {
    const feature = blueprint.productArchitecture.features.find(
      (f) => `feature_${f.featureName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40)}` === task.taskId,
    );
    if (feature) {
      files.push(await writeFeatureComponent(sandbox, feature.featureName, feature.description));
    }
  }

  const outputHash = await import("node:crypto").then((c) =>
    c.createHash("sha256").update(JSON.stringify({ taskId: task.taskId, files, strategy: orchestration.strategy }), "utf8").digest("hex"),
  );

  return {
    files,
    outputHash,
    taskRecord: {
      taskId: task.taskId,
      taskName: task.name,
      category: task.category,
      status: "completed",
      dependencies: task.dependencies,
      outputHash,
    },
  };
}

export async function executeBuildGraph(input: {
  sandbox: VentureSandbox;
  blueprint: VentureBlueprintDraft;
  graph: BuildGraph;
  existingTaskRuns?: Map<string, TaskRunRecord>;
  costLedger: CostLedgerEntry[];
  admin?: AdminSupabaseClient | null;
  organizationId?: string;
  productAssetBuildRunId?: string;
  correlationId?: string;
}): Promise<{ taskRuns: TaskRunRecord[]; fileOperations: string[] }> {
  const layers = topologicalLayers(input.graph);
  const taskRuns: TaskRunRecord[] = [];
  const fileOperations: string[] = [];
  const completed = input.existingTaskRuns ?? new Map<string, TaskRunRecord>();

  await scaffoldBaseApplication(input.sandbox, input.blueprint);
  fileOperations.push("scaffold:base");

  for (const layer of layers) {
    const parallelizable = layer.filter((t) => t.parallelizable);
    const sequential = layer.filter((t) => !t.parallelizable);

    for (const task of sequential) {
      if (completed.get(task.taskId)?.status === "completed") {
        taskRuns.push(completed.get(task.taskId)!);
        continue;
      }
      const result = await executeBuildTask({
        sandbox: input.sandbox,
        blueprint: input.blueprint,
        task,
        costLedger: input.costLedger,
        admin: input.admin,
        organizationId: input.organizationId,
        productAssetBuildRunId: input.productAssetBuildRunId,
        correlationId: input.correlationId,
      });
      taskRuns.push(result.taskRecord);
      fileOperations.push(...result.files);
    }

    if (parallelizable.length > 0) {
      const results = await Promise.all(
        parallelizable.map(async (task) => {
          if (completed.get(task.taskId)?.status === "completed") {
            return completed.get(task.taskId)!;
          }
          const result = await executeBuildTask({
            sandbox: input.sandbox,
            blueprint: input.blueprint,
            task,
            costLedger: input.costLedger,
          });
          fileOperations.push(...result.files);
          return result.taskRecord;
        }),
      );
      taskRuns.push(...results);
    }
  }

  return { taskRuns, fileOperations };
}
