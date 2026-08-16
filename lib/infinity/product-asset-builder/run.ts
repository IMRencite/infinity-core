import { createHash, randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { seedAiModelRegistry } from "@/lib/infinity/multi-brain";
import { CostLimitExceededError, ProductAssetBuilderError } from "./failures";
import { getEngineVersion, getPabLimits, isProductAssetBuilderEnabled } from "./config";
import { executeBuildGraph } from "./execute/build-graph";
import { packageProductionArtifact } from "./artifact/package-artifact";
import { assertBuildPackageReady, createSyntheticBuildPackage } from "./fixtures/synthetic-build-package";
import { runRepairLoop } from "./repair/repair-loop";
import {
  buildPabReport,
  findPabRunByIdempotencyKey,
  insertCostLedgerEntries,
  insertPabRun,
  insertProductionArtifact,
  insertRepairAttempt,
  insertValidationRun,
  insertWorkspace,
  loadBuildPackageFromDb,
  loadCompletedTaskRuns,
  newCorrelationId,
  updatePabRun,
  upsertTaskRun,
} from "./persistence";
import type {
  LoadedBuildPackage,
  ProductAssetBuilderReport,
  RunProductAssetBuilderInput,
} from "./types";
import { VentureSandbox } from "./workspace/sandbox";

export type RunProductAssetBuilderOutput = {
  ok: boolean;
  buildRunId: string;
  report: ProductAssetBuilderReport;
  artifactId: string | null;
  workspaceReference: string;
};

function hashBuildGraph(graph: LoadedBuildPackage["buildGraph"]): string {
  return createHash("sha256").update(JSON.stringify(graph), "utf8").digest("hex");
}

function sumCostLedger(entries: { estimatedCostUsd: number; inputTokens: number; outputTokens: number }[]) {
  return entries.reduce(
    (acc, e) => ({
      cost: acc.cost + e.estimatedCostUsd,
      inputTokens: acc.inputTokens + e.inputTokens,
      outputTokens: acc.outputTokens + e.outputTokens,
    }),
    { cost: 0, inputTokens: 0, outputTokens: 0 },
  );
}

export async function runProductAssetBuilder(
  admin: AdminSupabaseClient | null,
  input: RunProductAssetBuilderInput,
): Promise<RunProductAssetBuilderOutput> {
  if (!isProductAssetBuilderEnabled() && !input.loadedPackage) {
    throw new ProductAssetBuilderError("Product Asset Builder is disabled", "POLICY_BLOCKED");
  }

  const limits = { ...getPabLimits(), ...input.limits };
  const correlationId = input.correlationId ?? newCorrelationId();

  if (admin) {
    const existing = await findPabRunByIdempotencyKey(admin, input.organizationId, input.idempotencyKey);
    if (existing?.status === "ready" && existing.builder_report) {
      const report = existing.builder_report as ProductAssetBuilderReport;
      return {
        ok: true,
        buildRunId: existing.id,
        report,
        artifactId: report.artifactId,
        workspaceReference: existing.workspace_reference ?? "",
      };
    }
  }

  let loaded: LoadedBuildPackage;
  if (input.loadedPackage) {
    loaded = input.loadedPackage;
  } else if (input.buildPackageId && admin) {
    const fromDb = await loadBuildPackageFromDb(admin, input.organizationId, input.buildPackageId);
    if (!fromDb) throw new ProductAssetBuilderError("BuildPackage not found", "NOT_FOUND");
    loaded = fromDb;
  } else {
    loaded = createSyntheticBuildPackage(input.organizationId);
  }

  assertBuildPackageReady(loaded);

  const buildRunId = input.resumeRunId ?? randomUUID();
  const buildPackageKey = loaded.packageId ?? "synthetic";
  const sandbox = new VentureSandbox(input.organizationId, buildPackageKey, buildRunId);
  const buildGraphHash = hashBuildGraph(loaded.buildGraph);
  const simulationOnly = input.simulationOnly ?? loaded.simulationOnly;
  const startedAt = Date.now();

  let dbRunId = buildRunId;
  if (admin && !input.resumeRunId) {
    const row = await insertPabRun(admin, {
      organizationId: input.organizationId,
      correlationId,
      idempotencyKey: input.idempotencyKey,
      simulationOnly,
      companyBuilderPackageId: loaded.packageId,
      companyBuilderBlueprintId: loaded.blueprintId,
      workspaceReference: sandbox.workspaceReference,
      buildGraphHash,
    });
    dbRunId = row.id;
  }

  if (admin) {
    await updatePabRun(admin, input.organizationId, dbRunId, { status: "building" });
  }

  const costLedger: import("./types").CostLedgerEntry[] = [];
  const existingTasks = admin && input.resumeRunId ? await loadCompletedTaskRuns(admin, dbRunId) : new Map();

  if (admin) {
    await seedAiModelRegistry(admin).catch(() => undefined);
  }

  const { taskRuns } = await executeBuildGraph({
    sandbox,
    blueprint: loaded.blueprint,
    graph: loaded.buildGraph,
    existingTaskRuns: existingTasks,
    costLedger,
    admin,
    organizationId: input.organizationId,
    productAssetBuildRunId: dbRunId,
    correlationId,
  });

  if (admin) {
    for (const task of taskRuns) {
      await upsertTaskRun(admin, {
        organizationId: input.organizationId,
        productAssetBuilderRunId: dbRunId,
        task,
      });
    }
  }

  let workspaceRowId: string = randomUUID();
  if (admin) {
    const ws = await insertWorkspace(admin, {
      organizationId: input.organizationId,
      productAssetBuilderRunId: dbRunId,
      workspaceReference: sandbox.workspaceReference,
      ventureId: loaded.blueprint.sourceLineage.opportunityCandidateId ?? buildRunId,
      buildPackageId: loaded.packageId,
      state: { taskCount: taskRuns.length },
    });
    workspaceRowId = ws.id;
  }

  if (admin) {
    await updatePabRun(admin, input.organizationId, dbRunId, { status: "validating" });
  }

  const repairResult = await runRepairLoop({
    sandbox,
    organizationId: input.organizationId,
    buildRunId: dbRunId,
    costLedger,
    induceValidationFailure: input.induceValidationFailure,
  });

  if (admin) {
    for (const v of repairResult.validationRuns) {
      await insertValidationRun(admin, {
        organizationId: input.organizationId,
        productAssetBuilderRunId: dbRunId,
        run: v,
      });
    }
    for (const attempt of repairResult.repairAttempts) {
      await insertRepairAttempt(admin, {
        organizationId: input.organizationId,
        productAssetBuilderRunId: dbRunId,
        attempt,
      });
    }
    await insertCostLedgerEntries(admin, input.organizationId, dbRunId, costLedger);
  }

  const totals = sumCostLedger(costLedger);
  if (totals.cost > limits.maxBuildCostUsd) {
    throw new CostLimitExceededError(`Build cost ${totals.cost} exceeds limit ${limits.maxBuildCostUsd}`);
  }
  if (Date.now() - startedAt > limits.maxElapsedMs) {
    throw new ProductAssetBuilderError("Build elapsed time exceeded", "TIME_LIMIT");
  }

  const artifact = await packageProductionArtifact({
    sandbox,
    blueprint: loaded.blueprint,
    buildPackageId: loaded.packageId,
    buildRunId: dbRunId,
    workspaceId: workspaceRowId,
    validationRuns: repairResult.validationRuns,
    validationPassed: repairResult.validationPassed,
  });

  if (admin) {
    await insertProductionArtifact(admin, input.organizationId, artifact, dbRunId);
  }

  const report = buildPabReport({
    buildRunId: dbRunId,
    workspaceReference: sandbox.workspaceReference,
    simulationOnly,
    taskRuns,
    validationPassed: repairResult.validationPassed,
    repairAttempts: repairResult.repairAttempts,
    artifact,
    cumulativeCostUsd: totals.cost,
    tokenUsage: { inputTokens: totals.inputTokens, outputTokens: totals.outputTokens },
  });

  const finalStatus = repairResult.validationPassed ? "ready" : "failed";
  if (admin) {
    await updatePabRun(admin, input.organizationId, dbRunId, {
      status: finalStatus,
      cumulative_cost_usd: totals.cost,
      token_usage: report.tokenUsage as never,
      builder_report: report as never,
      workspace_reference: sandbox.workspaceReference,
      completed_at: new Date().toISOString(),
      failed_at: finalStatus === "failed" ? new Date().toISOString() : null,
    });
  }

  return {
    ok: repairResult.validationPassed,
    buildRunId: dbRunId,
    report,
    artifactId: artifact.artifactId,
    workspaceReference: sandbox.workspaceReference,
  };
}

export { getEngineVersion };
