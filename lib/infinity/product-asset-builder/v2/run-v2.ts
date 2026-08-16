import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { classifyTask } from "@/lib/infinity/multi-brain";
import { executeLiveCodingRequest } from "@/lib/infinity/multi-brain/coding/live-coding-client";
import { getBrainProvidersForMode } from "@/lib/infinity/multi-brain/providers/live-providers";
import { createMockBrainProvider } from "@/lib/infinity/multi-brain/providers/mock";
import { executeOrchestration } from "@/lib/infinity/multi-brain/execute";
import { VentureSandbox } from "../workspace/sandbox";
import { insertPabRun, updatePabRun, insertCostLedgerEntries, insertProductionArtifact } from "../persistence";
import { getV2Budget, isPabV2LiveMode, requireLiveExecutionForVerification } from "./config";
import { generateMarketplaceFeatureContracts, generateTraceabilityLinks } from "./contracts/feature-contracts";
import { createMarketplaceBuildPackage } from "./fixtures/marketplace-build-package";
import { buildRepositoryMap } from "./repository/repository-map";
import { routeTaskV2, selectFallbackProvider } from "./routing/router-v2";
import { writeMarketplaceApplication } from "./scaffold/marketplace-app";
import { runAllQualityGates } from "./validation/quality-gates";
import { runProviderPreflight, getConfiguredLiveProviders } from "./providers/preflight";
import type { BuildIntelligenceReport, RunPabV2Input, RunPabV2Output, FeatureContract } from "./types";
import type { CostLedgerEntry } from "../types";

async function executeMultiProviderBuildTask(input: {
  taskType: string;
  prompt: string;
  context: Record<string, unknown>;
  liveMode: boolean;
  providers: ReturnType<typeof getBrainProvidersForMode>;
  organizationId: string;
  idempotencyKey: string;
  costLedger: CostLedgerEntry[];
  report: BuildIntelligenceReport;
  simulatedOutage?: string;
}): Promise<void> {
  const available = input.liveMode
    ? getConfiguredLiveProviders().filter((p) => p !== input.simulatedOutage)
    : ["mock"];
  const characteristics = classifyTask({
    taskType: input.taskType,
    complexity: (input.context.complexity as "high") ?? "high",
    economicImportance: (input.context.economicImportance as number) ?? 0.7,
    implementationRisk: (input.context.implementationRisk as number) ?? 0.6,
    architectureRequired: Boolean(input.context.architectureRequired),
    codingRequired: true,
  });
  const routing = routeTaskV2({
    taskType: input.taskType,
    characteristics,
    availableProviders: available,
    priorFailures: 0,
  });

  if (routing.executionClass !== "FAST") {
    input.report.multiBrain.complexTasksRouted += 1;
  }

  const roles: Array<{ provider: string; model: string; role: string }> = [
    { provider: routing.primary.provider, model: routing.primary.modelId, role: "primary" },
  ];
  if (routing.implementer) {
    roles.push({ provider: routing.implementer.provider, model: routing.implementer.modelId, role: "implementer" });
  }
  if (routing.reviewer) {
    roles.push({ provider: routing.reviewer.provider, model: routing.reviewer.modelId, role: "reviewer" });
  }
  if (routing.architect) {
    roles.push({ provider: routing.architect.provider, model: routing.architect.modelId, role: "architect" });
  }

  const uniqueProviders = new Set(roles.map((r) => r.provider));
  if (uniqueProviders.size >= 2) input.report.multiBrain.multiProviderCollaborations += 1;
  if (routing.reviewer && routing.reviewer.provider !== routing.primary.provider) {
    input.report.multiBrain.independentReviews += 1;
  }

  for (const roleEntry of roles) {
    input.report.multiBrain.routingLog.push({
      task: input.taskType,
      provider: roleEntry.provider,
      model: roleEntry.model,
      role: roleEntry.role,
      strategy: routing.executionClass,
    });
  }

  if (input.liveMode) {
    for (const roleEntry of roles.slice(0, routing.executionClass === "CRITICAL" ? 4 : routing.executionClass === "HIGH_VALUE" ? 3 : 2)) {
      let provider = roleEntry.provider;
      let result = await executeLiveCodingRequest({
        provider,
        modelId: roleEntry.model,
        role: roleEntry.role as "primary",
        taskType: input.taskType,
        systemPrompt: `Role: ${roleEntry.role}. Task: ${input.taskType}. Return JSON.`,
        userPrompt: input.prompt,
        outputMode: roleEntry.role === "reviewer" || roleEntry.role === "architect" ? "review" : "coding",
      });
      if (!result.success && input.simulatedOutage !== provider) {
        const fallback = selectFallbackProvider(available, provider);
        if (fallback) {
          input.report.multiBrain.fallbacks += 1;
          provider = fallback;
          result = await executeLiveCodingRequest({
            provider: fallback,
            modelId: roleEntry.model,
            role: roleEntry.role as "primary",
            taskType: input.taskType,
            systemPrompt: `Fallback provider. Role: ${roleEntry.role}`,
            userPrompt: input.prompt,
            outputMode: "review",
          });
        }
      }
      input.costLedger.push({
        provider,
        modelId: roleEntry.model,
        taskType: `${input.taskType}_${roleEntry.role}`,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        estimatedCostUsd: result.estimatedCostUsd,
      });
      const bucket = input.report.providers[provider] ?? {
        configured: true,
        authentication: "PASS",
        tasks: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      };
      bucket.tasks += 1;
      bucket.inputTokens += result.inputTokens;
      bucket.outputTokens += result.outputTokens;
      bucket.costUsd += result.estimatedCostUsd;
      input.report.providers[provider] = bucket;
      if (result.review?.pointsOfDisagreement?.length) {
        input.report.multiBrain.disagreements += result.review.pointsOfDisagreement.length;
      }
    }
  } else {
    const orchestration = await executeOrchestration({
      organizationId: input.organizationId,
      idempotencyKey: `${input.idempotencyKey}-${input.taskType}`,
      brainInput: {
        taskType: input.taskType,
        prompt: input.prompt,
        context: input.context,
      },
      providers: [createMockBrainProvider()],
    });
    for (const exec of orchestration.executions) {
      input.costLedger.push({
        provider: exec.provider,
        modelId: exec.modelId,
        taskType: input.taskType,
        inputTokens: exec.inputTokens,
        outputTokens: exec.outputTokens,
        estimatedCostUsd: exec.estimatedCostUsd,
      });
    }
  }
}

function updateContractStatuses(contracts: FeatureContract[], gates: Awaited<ReturnType<typeof runAllQualityGates>>): void {
  for (const contract of contracts) {
    const gate = gates.gates.find((g) => g.gate === "feature_contract_coverage");
    const missing = (gate?.details.missing as Array<{ featureId: string }> | undefined) ?? [];
    const isMissing = missing.some((m) => m.featureId === contract.featureId);
    contract.status = isMissing ? "FAIL" : gates.passed ? "PASS" : "VALIDATING";
  }
}

export async function runProductAssetBuilderV2(
  admin: AdminSupabaseClient | null,
  input: RunPabV2Input,
): Promise<RunPabV2Output> {
  const started = Date.now();
  const liveMode = input.liveMode ?? isPabV2LiveMode();
  const budget = { ...getV2Budget(), ...input.limits };
  const correlationId = input.correlationId ?? randomUUID();
  const blockedReasons: string[] = [];

  if (requireLiveExecutionForVerification() && getConfiguredLiveProviders().length < 2) {
    return {
      ok: false,
      buildRunId: "",
      artifactStatus: "blocked",
      artifactId: null,
      intelligenceReport: emptyReport(started),
      preflight: await runProviderPreflight({ liveAuthCheck: true }),
      blockedReasons: ["Live verification requires at least 2 configured providers"],
    };
  }

  const preflight = await runProviderPreflight({ liveAuthCheck: liveMode });
  const report = emptyReport(started);
  for (const p of preflight) {
    report.providers[p.provider] = {
      configured: p.configured,
      authentication: p.authentication,
      tasks: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
    };
  }

  const loaded = createMarketplaceBuildPackage(input.organizationId);
  if (loaded.buildPackage.status !== "READY") {
    blockedReasons.push(`BuildPackage not READY: ${loaded.buildPackage.status}`);
  }

  const contracts = generateMarketplaceFeatureContracts(loaded.blueprint);
  const traceLinks = generateTraceabilityLinks(loaded.blueprint, contracts);
  void traceLinks;

  const buildRunId = randomUUID();
  const sandbox = new VentureSandbox(input.organizationId, "pab-v2-marketplace", buildRunId);
  const costLedger: CostLedgerEntry[] = [];

  let dbRunId: string = buildRunId;
  if (admin) {
    const row = await insertPabRun(admin, {
      organizationId: input.organizationId,
      correlationId,
      idempotencyKey: input.idempotencyKey,
      simulationOnly: true,
      workspaceReference: sandbox.workspaceReference,
      buildGraphHash: "pab-v2-marketplace",
    });
    dbRunId = row.id;
    await updatePabRun(admin, input.organizationId, dbRunId, {
      status: "building",
      engine_version: "product_asset_builder_v2",
    });
  }

  await writeMarketplaceApplication(sandbox);

  const providers = getBrainProvidersForMode(liveMode, input.simulatedProviderOutage);
  await executeMultiProviderBuildTask({
    taskType: "marketplace_architecture",
    prompt: "Review creator marketplace architecture: auth, listings, transactions, commission, moderation, subscriptions.",
    context: { complexity: "high", architectureRequired: true, economicImportance: 0.8 },
    liveMode,
    providers,
    organizationId: input.organizationId,
    idempotencyKey: input.idempotencyKey,
    costLedger,
    report,
    simulatedOutage: input.simulatedProviderOutage,
  });

  await executeMultiProviderBuildTask({
    taskType: "adversarial_product_review",
    prompt: "Identify missing journeys, fake placeholders, broken monetization, dead-end UI, missing permissions in creator marketplace MVP.",
    context: { complexity: "high", economicImportance: 0.85, implementationRisk: 0.7 },
    liveMode,
    providers,
    organizationId: input.organizationId,
    idempotencyKey: `${input.idempotencyKey}-review`,
    costLedger,
    report,
    simulatedOutage: input.simulatedProviderOutage,
  });

  const repoMap = await buildRepositoryMap(sandbox, contracts);
  void repoMap;

  let gates = await runAllQualityGates({ sandbox, contracts });
  let repairAttempts = 0;
  while (!gates.passed && repairAttempts < budget.maxRepairAttempts) {
    repairAttempts += 1;
    report.multiBrain.repairs += 1;
    const failed = gates.gates.find((g) => !g.passed);
    if (failed?.gate === "production_build" || failed?.gate === "unit_tests") {
      await executeMultiProviderBuildTask({
        taskType: "build_repair",
        prompt: `Repair validation failure: ${failed.gate}. Details: ${JSON.stringify(failed.details).slice(0, 2000)}`,
        context: { complexity: "medium", codingRequired: true },
        liveMode,
        providers,
        organizationId: input.organizationId,
        idempotencyKey: `${input.idempotencyKey}-repair-${repairAttempts}`,
        costLedger,
        report,
      });
    }
    gates = await runAllQualityGates({ sandbox, contracts });
    const totalCost = costLedger.reduce((s, e) => s + e.estimatedCostUsd, 0);
    if (totalCost > budget.maxAICostUsd) {
      blockedReasons.push(`AI cost limit exceeded: ${totalCost}`);
      break;
    }
  }

  updateContractStatuses(contracts, gates);
  report.featureContracts = {
    total: contracts.length,
    passed: contracts.filter((c) => c.status === "PASS").length,
    failed: contracts.filter((c) => c.status === "FAIL").length,
    blocked: contracts.filter((c) => c.status === "BLOCKED").length,
  };
  for (const g of gates.gates) report.qualityGates[g.gate] = g.passed;

  const totalCost = costLedger.reduce((s, e) => s + e.estimatedCostUsd, 0);
  report.totalAICostUsd = totalCost;
  report.totalDurationMs = Date.now() - started;

  if (totalCost > budget.maxAICostUsd) blockedReasons.push("Build budget exceeded");
  if (Date.now() - started > budget.maxElapsedMs) blockedReasons.push("Build time limit exceeded");
  if (!gates.passed) blockedReasons.push(...gates.gates.filter((g) => !g.passed).map((g) => `Gate failed: ${g.gate}`));

  const artifactStatus = gates.passed && blockedReasons.length === 0 ? "ready" : "blocked";
  const ok = artifactStatus === "ready";

  if (admin) {
    await insertCostLedgerEntries(admin, input.organizationId, dbRunId, costLedger);
    await insertProductionArtifact(admin, input.organizationId, {
      artifactId: randomUUID(),
      ventureId: loaded.blueprint.sourceLineage.opportunityCandidateId ?? dbRunId,
      buildPackageId: loaded.packageId,
      workspaceId: dbRunId,
      buildRunId: dbRunId,
      status: artifactStatus,
      artifactManifest: { engineVersion: "product_asset_builder_v2", workspace: sandbox.workspaceReference },
      sourceManifest: { files: await sandbox.listFiles() },
      technologyManifest: { stack: loaded.blueprint.technicalArchitecture.recommendedStack },
      databaseManifest: { store: "data/store.json" },
      routeManifest: { routes: contracts.flatMap((c) => c.requiredRoutes) },
      monetizationManifest: { commission: true, subscription: true, sandbox: true },
      validationManifest: { gates: gates.gates },
      dependencyManifest: { packageManager: "npm" },
      buildHash: repoMap.map((r) => r.contentHash).join("").slice(0, 64),
      fileCount: repoMap.length,
      totalBytes: 0,
      createdAt: new Date().toISOString(),
    }, dbRunId);
    await updatePabRun(admin, input.organizationId, dbRunId, {
      status: artifactStatus,
      cumulative_cost_usd: totalCost,
      builder_report: report as never,
      completed_at: new Date().toISOString(),
    });
  }

  return {
    ok,
    buildRunId: dbRunId,
    artifactStatus,
    artifactId: null,
    intelligenceReport: report,
    preflight,
    blockedReasons,
  };
}

function emptyReport(started: number): BuildIntelligenceReport {
  return {
    engineVersion: "product_asset_builder_v2",
    providers: {},
    multiBrain: {
      complexTasksRouted: 0,
      multiProviderCollaborations: 0,
      independentReviews: 0,
      disagreements: 0,
      fallbacks: 0,
      repairs: 0,
      routingLog: [],
    },
    featureContracts: { total: 0, passed: 0, failed: 0, blocked: 0 },
    qualityGates: {},
    totalAICostUsd: 0,
    totalDurationMs: Date.now() - started,
  };
}
