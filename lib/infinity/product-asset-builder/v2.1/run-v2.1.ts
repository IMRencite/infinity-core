import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { VentureSandbox } from "../workspace/sandbox";
import {
  insertPabRun,
  updatePabRun,
  insertCostLedgerEntries,
  insertProductionArtifact,
  insertValidationRun,
  insertRepairAttempt,
} from "../persistence";
import { writeMarketplaceApplication } from "../v2/scaffold/marketplace-app";
import { runAllQualityGates } from "../v2/validation/quality-gates";
import { generateTraceabilityLinks } from "../v2/contracts/feature-contracts";
import { buildRepositoryMap } from "../v2/repository/repository-map";
import { createMarketplaceBuildPackage } from "../v2/fixtures/marketplace-build-package";
import { getConfiguredLiveProviders, runProviderPreflight } from "../v2/providers/preflight";
import { executeCodingTask } from "./coding/ai-coder";
import {
  createCreatorCollectionsContract,
  createRepairCodingTask,
  decomposeCollectionsFeature,
} from "./coding/task-decomposer";
import { buildRepositoryContext } from "./context/repository-context-engine";
import { WorkspaceMutationEngine } from "./mutation/workspace-mutation-engine";
import { getV21Budget, isPabV21LiveMode, requireLiveCodingVerification } from "./config";
import {
  persistCodeChangeSet,
  persistCodingTask,
  persistFeatureContracts,
  persistProviderCall,
  persistRepositoryMap,
  persistReviewFindings,
  persistTraceabilityLinks,
  persistWorkspaceMutations,
} from "./persistence";
import { routeCodingTask } from "./routing/coding-router";
import { aggregateUsage } from "./telemetry/usage-telemetry";
import type { AiCodingReport, CodingTask, ProviderUsageRecord, ReviewFinding, RunPabV21Input, RunPabV21Output } from "./types";
import type { FeatureContract } from "../v2/types";
import type { CostLedgerEntry } from "../types";

function emptyReport(): AiCodingReport {
  return {
    engineVersion: "product_asset_builder_v2.1",
    codingTasksCreated: 0,
    codingTasksCompleted: 0,
    codeChangeSets: 0,
    filesCreated: 0,
    filesModified: 0,
    filesDeleted: 0,
    mutationsApplied: 0,
    rollbacks: 0,
    repairLoops: 0,
    featureContractsSatisfied: 0,
    providers: {},
    architectProvider: null,
    implementerProvider: null,
    reviewerProvider: null,
    independentReviews: 0,
    disagreements: 0,
    fallbacks: 0,
    repairs: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalCostUsd: 0,
    usageSourceByProvider: {},
    routingLog: [],
    appliedDiffSummary: [],
  };
}

async function executeTaskBatch(input: {
  tasks: CodingTask[];
  sandbox: VentureSandbox;
  liveMode: boolean;
  simulatedOutage?: string;
  report: AiCodingReport;
  usageRecords: ProviderUsageRecord[];
  allFindings: ReviewFinding[];
  admin: AdminSupabaseClient | null;
  organizationId: string;
  buildRunId: string;
  contracts: FeatureContract[];
}): Promise<void> {
  for (const taskTemplate of input.tasks) {
    const context = await buildRepositoryContext({
      sandbox: input.sandbox,
      featureContracts: input.contracts.filter((c) => taskTemplate.featureContractIds.includes(c.featureId)),
      taskHints: [taskTemplate.taskType, taskTemplate.objective, ...taskTemplate.relevantFiles],
      relevantFiles: taskTemplate.relevantFiles,
      priorFailures: [],
      reviewerFindings: input.allFindings.filter((f) => !f.resolved).map((f) => `[${f.severity}] ${f.description}`),
    });

    const task: CodingTask = {
      ...taskTemplate,
      buildRunId: input.buildRunId,
      status: "running",
      repositoryContext: context,
    };

    input.report.codingTasksCreated += 1;
    if (input.admin) await persistCodingTask(input.admin, input.organizationId, input.buildRunId, task);

    const result = await executeCodingTask({
      task,
      liveMode: input.liveMode,
      simulatedOutage: input.simulatedOutage,
    });

    input.usageRecords.push(result.usage);
    if (result.reviewUsage) input.usageRecords.push(result.reviewUsage);
    input.report.routingLog.push({
      task: task.taskType,
      provider: result.implementerProvider,
      model: result.usage.modelId,
      role: "implementer",
    });
    if (result.reviewerProvider) {
      input.report.routingLog.push({
        task: `${task.taskType}_review`,
        provider: result.reviewerProvider,
        model: result.routing.reviewer?.modelId ?? "",
        role: "reviewer",
      });
    }
    if (result.independentReview) input.report.independentReviews += 1;
    if (!input.report.implementerProvider) input.report.implementerProvider = result.implementerProvider;
    if (result.reviewerProvider) input.report.reviewerProvider = result.reviewerProvider;
    input.allFindings.push(...result.reviewFindings);

    if (input.admin) {
      await persistProviderCall(input.admin, input.organizationId, input.buildRunId, result.usage);
      if (result.reviewUsage) await persistProviderCall(input.admin, input.organizationId, input.buildRunId, result.reviewUsage);
    }

    if (!result.changeSet) {
      task.status = "failed";
      if (input.admin) await persistCodingTask(input.admin, input.organizationId, input.buildRunId, task);
      continue;
    }

    input.report.codeChangeSets += 1;
    const changeSetId = randomUUID();
    const engine = new WorkspaceMutationEngine(input.sandbox, changeSetId);
    const applyResult = await engine.applyChangeSet(result.changeSet, {
      codingTaskId: task.id,
      featureContractIds: task.featureContractIds,
      allowedPaths: task.allowedPaths,
      maxChanges: task.maxFilesChanged,
    });

    if (applyResult.rejected.length > 0 && applyResult.applied.length === 0) {
      task.status = "failed";
      if (input.admin) await persistCodingTask(input.admin, input.organizationId, input.buildRunId, task);
      continue;
    }

    for (const m of applyResult.applied) {
      input.report.mutationsApplied += 1;
      if (m.operation === "create") input.report.filesCreated += 1;
      else if (m.operation === "delete") input.report.filesDeleted += 1;
      else input.report.filesModified += 1;
      input.report.appliedDiffSummary.push({
        path: m.relativePath,
        operation: m.operation,
        provider: m.provider,
      });
    }

    if (input.admin) {
      await persistCodeChangeSet(input.admin, input.organizationId, input.buildRunId, changeSetId, result.changeSet, true);
      await persistWorkspaceMutations(input.admin, input.organizationId, input.buildRunId, applyResult.applied);
      if (result.reviewFindings.length) {
        await persistReviewFindings(input.admin, input.organizationId, input.buildRunId, result.reviewFindings);
      }
    }

    task.status = "completed";
    input.report.codingTasksCompleted += 1;
    if (input.admin) await persistCodingTask(input.admin, input.organizationId, input.buildRunId, task);
  }
}

export async function runProductAssetBuilderV21(
  admin: AdminSupabaseClient | null,
  input: RunPabV21Input,
): Promise<RunPabV21Output> {
  const started = Date.now();
  const liveMode = input.liveMode ?? isPabV21LiveMode();
  const budget = getV21Budget();
  const report = emptyReport();
  const blockedReasons: string[] = [];
  const usageRecords: ProviderUsageRecord[] = [];
  const allFindings: ReviewFinding[] = [];
  const costLedger: CostLedgerEntry[] = [];

  if (requireLiveCodingVerification() && getConfiguredLiveProviders().length < 2) {
    return {
      ok: false,
      buildRunId: "",
      artifactStatus: "blocked",
      artifactId: null,
      aiCodingReport: report,
      blockedReasons: ["Live coding verification requires at least 2 configured providers"],
      workspaceReference: "",
    };
  }

  await runProviderPreflight({ liveAuthCheck: liveMode });

  const buildRunId = randomUUID();
  const ventureId = input.organizationId;
  const sandbox = new VentureSandbox(input.organizationId, "pab-v21-collections", buildRunId);

  let dbRunId: string = buildRunId;
  if (admin) {
    const row = await insertPabRun(admin, {
      organizationId: input.organizationId,
      correlationId: input.correlationId ?? randomUUID(),
      idempotencyKey: input.idempotencyKey,
      simulationOnly: true,
      workspaceReference: sandbox.workspaceReference,
      buildGraphHash: "pab-v21-collections",
    });
    dbRunId = row.id;
    await updatePabRun(admin, input.organizationId, dbRunId, {
      status: "building",
      engine_version: "product_asset_builder_v2.1",
    });
  }

  await writeMarketplaceApplication(sandbox);

  const collectionsContract = createCreatorCollectionsContract();
  const contracts: FeatureContract[] = [collectionsContract];
  const taskTemplates = decomposeCollectionsFeature({ ventureId, contract: collectionsContract });
  const loaded = createMarketplaceBuildPackage(input.organizationId);
  const traceLinks = generateTraceabilityLinks(loaded.blueprint, contracts);
  traceLinks.push({
    linkType: "feature_to_coding_task",
    sourceRef: collectionsContract.featureId,
    targetRef: "creator_collections_tasks",
  });

  if (admin) {
    await persistFeatureContracts(admin, input.organizationId, dbRunId, contracts);
    await persistTraceabilityLinks(admin, input.organizationId, dbRunId, traceLinks);
  }

  const tasks: CodingTask[] = taskTemplates.map((t) => ({
    ...t,
    buildRunId: dbRunId,
    status: "pending",
    repositoryContext: {} as CodingTask["repositoryContext"],
  }));

  if (!input.skipCollectionsFeature) {
    await executeTaskBatch({
      tasks,
      sandbox,
      liveMode,
      simulatedOutage: input.simulatedProviderOutage,
      report,
      usageRecords,
      allFindings,
      admin,
      organizationId: input.organizationId,
      buildRunId: dbRunId,
      contracts,
    });
  }

  const criticalFindings = allFindings.filter(
    (f) => !f.resolved && (f.severity === "CRITICAL" || f.severity === "HIGH"),
  );

  let repairAttempts = 0;
  let gates = await runAllQualityGates({ sandbox, contracts: [collectionsContract] });

  while ((!gates.passed || criticalFindings.length > 0) && repairAttempts < budget.maxRepairAttempts) {
    repairAttempts += 1;
    report.repairLoops += 1;
    report.repairs += 1;

    const failed = gates.gates.find((g) => !g.passed);
    const repairTemplate = createRepairCodingTask({
      ventureId,
      featureContractIds: [collectionsContract.featureId],
      repairContext: {
        failedGate: failed?.gate ?? "review_findings",
        failureOutput: failed ? JSON.stringify(failed.details).slice(0, 2000) : criticalFindings.map((f) => f.description).join("; "),
        affectedFiles: report.appliedDiffSummary.map((d) => d.path),
        attemptNumber: repairAttempts,
      },
    });

    const repairTask: CodingTask = {
      ...repairTemplate,
      id: randomUUID(),
      buildRunId: dbRunId,
      status: "pending",
      repositoryContext: await buildRepositoryContext({
        sandbox,
        featureContracts: contracts,
        taskHints: ["repair", repairTemplate.taskType],
        priorFailures: [repairTemplate.objective],
      }),
    };

    await executeTaskBatch({
      tasks: [repairTask],
      sandbox,
      liveMode,
      report,
      usageRecords,
      allFindings,
      admin,
      organizationId: input.organizationId,
      buildRunId: dbRunId,
      contracts,
    });

    if (admin) {
      await insertRepairAttempt(admin, {
        organizationId: input.organizationId,
        productAssetBuilderRunId: dbRunId,
        attempt: {
          attemptNumber: repairAttempts,
          failureClassification: failed?.gate ?? "REVIEW_FINDING",
          repairAction: { taskType: repairTask.taskType },
          success: false,
        },
      });
    }

    gates = await runAllQualityGates({ sandbox, contracts: [collectionsContract], skipInstall: repairAttempts > 1 });
    criticalFindings.splice(0, criticalFindings.length, ...allFindings.filter(
      (f) => !f.resolved && (f.severity === "CRITICAL" || f.severity === "HIGH"),
    ));

    const agg = aggregateUsage(usageRecords);
    if (agg.totalCostUsd > budget.maxAICostUsd) {
      blockedReasons.push("AI cost budget exceeded");
      break;
    }
  }

  if (admin) {
    for (const g of gates.gates) {
      await insertValidationRun(admin, {
        organizationId: input.organizationId,
        productAssetBuilderRunId: dbRunId,
        run: { validatorName: g.gate, status: g.passed ? "pass" : "fail", details: g.details },
      });
    }
  }

  collectionsContract.status = gates.passed && criticalFindings.length === 0 ? "PASS" : gates.passed ? "REVIEWING" : "FAIL";
  report.featureContractsSatisfied = collectionsContract.status === "PASS" ? 1 : 0;

  const repoMap = await buildRepositoryMap(sandbox, contracts);
  if (admin) await persistRepositoryMap(admin, input.organizationId, dbRunId, repoMap);

  const agg = aggregateUsage(usageRecords);
  report.providers = agg.byProvider;
  report.totalInputTokens = agg.totalInputTokens;
  report.totalOutputTokens = agg.totalOutputTokens;
  report.totalTokens = agg.totalTokens;
  report.totalCostUsd = agg.totalCostUsd;
  report.usageSourceByProvider = agg.usageSourceByProvider;

  for (const u of usageRecords) {
    costLedger.push({
      provider: u.provider,
      modelId: u.modelId,
      taskType: u.taskType,
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      estimatedCostUsd: u.estimatedCostUsd,
    });
  }

  if (!gates.passed) blockedReasons.push(...gates.gates.filter((g) => !g.passed).map((g) => `Gate failed: ${g.gate}`));
  if (criticalFindings.length > 0) blockedReasons.push(`${criticalFindings.length} unresolved CRITICAL/HIGH review findings`);
  if (report.mutationsApplied === 0 && !input.skipCollectionsFeature) {
    blockedReasons.push("No AI mutations were applied to workspace");
  }
  if (report.independentReviews === 0 && liveMode && getConfiguredLiveProviders().length >= 2) {
    blockedReasons.push("Independent AI review not demonstrated");
  }
  if (Date.now() - started > budget.maxElapsedMs) blockedReasons.push("Build time limit exceeded");

  const artifactStatus = blockedReasons.length === 0 && gates.passed ? "ready" : "blocked";
  let artifactId: string | null = null;

  if (admin) {
    await insertCostLedgerEntries(admin, input.organizationId, dbRunId, costLedger);
    const artifact = await insertProductionArtifact(admin, input.organizationId, {
      artifactId: randomUUID(),
      ventureId,
      buildPackageId: dbRunId,
      workspaceId: dbRunId,
      buildRunId: dbRunId,
      status: artifactStatus,
      artifactManifest: {
        engineVersion: "product_asset_builder_v2.1",
        aiMutationsApplied: report.mutationsApplied,
        appliedDiffSummary: report.appliedDiffSummary,
      },
      sourceManifest: { files: await sandbox.listFiles() },
      technologyManifest: { stack: ["next", "typescript", "vitest"] },
      databaseManifest: { store: "data/store.json", collections: true },
      routeManifest: { routes: collectionsContract.requiredRoutes },
      monetizationManifest: { sandbox: true },
      validationManifest: { gates: gates.gates },
      dependencyManifest: { packageManager: "npm" },
      buildHash: repoMap.map((r) => r.contentHash).join("").slice(0, 64),
      fileCount: repoMap.length,
      totalBytes: 0,
      createdAt: new Date().toISOString(),
    }, dbRunId);
    artifactId = artifact.id;
    await updatePabRun(admin, input.organizationId, dbRunId, {
      status: artifactStatus,
      cumulative_cost_usd: agg.totalCostUsd,
      builder_report: report as never,
      completed_at: new Date().toISOString(),
    });
  }

  return {
    ok: artifactStatus === "ready",
    buildRunId: dbRunId,
    artifactStatus,
    artifactId,
    aiCodingReport: report,
    blockedReasons,
    workspaceReference: sandbox.workspaceReference,
  };
}

export { routeCodingTask, getConfiguredLiveProviders };
