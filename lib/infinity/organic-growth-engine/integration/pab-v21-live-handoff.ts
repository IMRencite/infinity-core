import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { insertCostLedgerEntries, insertPabRun, insertProductionArtifact, updatePabRun } from "@/lib/infinity/product-asset-builder/persistence";
import { VentureSandbox } from "@/lib/infinity/product-asset-builder/workspace/sandbox";
import { runProviderPreflight, getConfiguredLiveProviders } from "@/lib/infinity/product-asset-builder/v2/providers/preflight";
import { executeCodingTask } from "@/lib/infinity/product-asset-builder/v2.1/coding/ai-coder";
import { buildRepositoryContext } from "@/lib/infinity/product-asset-builder/v2.1/context/repository-context-engine";
import { getV21Budget } from "@/lib/infinity/product-asset-builder/v2.1/config";
import { WorkspaceMutationEngine } from "@/lib/infinity/product-asset-builder/v2.1/mutation/workspace-mutation-engine";
import {
  persistCodeChangeSet,
  persistCodingTask,
  persistFeatureContracts,
  persistProviderCall,
  persistTraceabilityLinks,
  persistWorkspaceMutations,
} from "@/lib/infinity/product-asset-builder/v2.1/persistence";
import { aggregateUsage } from "@/lib/infinity/product-asset-builder/v2.1/telemetry/usage-telemetry";
import type { CodingTask, ProviderUsageRecord } from "@/lib/infinity/product-asset-builder/v2.1/types";
import type { FeatureContract } from "@/lib/infinity/product-asset-builder/v2/types";
import type {
  GeneratedOrganicPageArtifact,
  OrganicGrowthBuildPackage,
  PostGenerationGateResult,
  PostGenerationRepairResult,
} from "../types";
import {
  decomposeOrganicPageTasks,
  generateOrganicFeatureContracts,
} from "./pab-handoff";
import { writeOrganicContentWorkspaceScaffold } from "./organic-workspace-scaffold";
import { extractGeneratedOrganicArtifactFromSandbox } from "./extract-organic-artifact";
import { validateGeneratedOrganicArtifact } from "../quality/post-generation-gate";
import { applyPostGenerationRepair } from "../quality/post-generation-repair";

export type OrganicPabV21LiveHandoffInput = {
  admin: AdminSupabaseClient;
  organizationId: string;
  idempotencyKey: string;
  buildPackage: OrganicGrowthBuildPackage;
  organicGrowthRunId: string;
  organicGrowthBuildPackageId: string;
  pageOpportunityId?: string;
  correlationId?: string;
  maxCostUsd?: number;
};

export type OrganicPabV21LiveHandoffResult = {
  ok: boolean;
  pabBuildRunId: string;
  productionArtifactId: string | null;
  pageOpportunityId: string;
  organicContentContractId: string;
  codingTaskId: string;
  providerCallIds: string[];
  codeChangeSetId: string | null;
  workspaceMutationIds: string[];
  implementerProvider: string;
  implementerModel: string;
  reviewerProvider: string | null;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  costReported: boolean;
  usageSource: string;
  generatedArtifact: GeneratedOrganicPageArtifact;
  postGenerationGate: PostGenerationGateResult;
  repairResult: PostGenerationRepairResult | null;
  traceabilityLinks: Array<{ linkType: string; sourceRef: string; targetRef: string }>;
  blockedReasons: string[];
  workspaceReference: string;
};

function buildOrganicLiveTaskPrompt(input: {
  contentContract: import("../types").OrganicContentContract;
  canonicalUrl: string;
  outputPath: string;
}): string[] {
  const contract = input.contentContract;
  return [
    `Create exactly one JSON file at ${input.outputPath} representing the organic page artifact.`,
    `Canonical URL: ${input.canonicalUrl}`,
    `Primary query intent: ${contract.primaryQueryIntent}`,
    `Primary answer intent: ${contract.primaryAnswerIntent}`,
    `Required JSON shape: { canonicalUrl, title, bodyText, sections: [{heading, body}], internalLinks: [{targetUrl, anchor}], schemaTypes: string[], claims: [{statement, sourceUrl?}] }`,
    `Required sections:\n${contract.sections.map((s) => `- ${s.heading}: ${s.purpose}`).join("\n")}`,
    `Questions that must be reflected in bodyText:\n${contract.questionsAnswered.map((q) => `- ${q}`).join("\n")}`,
    `Internal links required:\n${contract.internalLinkRequirements.map((l) => `- ${l}`).join("\n")}`,
    `Evidence requirements (do not fabricate unsupported claims):\n${contract.evidenceRequirements.map((e) => `- ${e}`).join("\n")}`,
    "Do NOT use first-person experience, fake reviews, fake ratings, fake pricing, or fake addresses.",
    "Do NOT fabricate credentials or first-party data.",
  ];
}

export async function runOrganicPabV21LiveHandoff(
  input: OrganicPabV21LiveHandoffInput,
): Promise<OrganicPabV21LiveHandoffResult> {
  const blockedReasons: string[] = [];
  const usageRecords: ProviderUsageRecord[] = [];
  const budget = getV21Budget();
  const maxCostUsd = input.maxCostUsd ?? Math.min(budget.maxAICostUsd, 0.75);

  const providers = getConfiguredLiveProviders();
  if (providers.length === 0) {
    throw new Error("Live PAB V2.1 handoff requires at least one configured AI provider");
  }

  await runProviderPreflight({ liveAuthCheck: true });

  const pageOpportunityId =
    input.pageOpportunityId ??
    input.buildPackage.approvedPageOpportunities[0]?.pageOpportunityId;
  if (!pageOpportunityId) {
    throw new Error("No approved page opportunity available for live PAB handoff");
  }

  const contentContract = input.buildPackage.organicContentContracts.find(
    (c) => c.pageOpportunityId === pageOpportunityId,
  );
  const urlEntry = input.buildPackage.canonicalUrlRegistry.entries.find(
    (e) => e.pageOpportunityId === pageOpportunityId,
  );
  if (!contentContract || !urlEntry) {
    throw new Error(`Missing content contract or canonical URL for page ${pageOpportunityId}`);
  }

  const contracts = generateOrganicFeatureContracts(input.buildPackage);
  const featureContract = contracts.find((c) => c.featureId === `organic-page-${pageOpportunityId}`);
  if (!featureContract) {
    throw new Error(`Feature contract not found for page ${pageOpportunityId}`);
  }

  const buildRunId = randomUUID();
  const sandbox = new VentureSandbox(
    input.organizationId,
    `organic-${input.buildPackage.ventureId.slice(0, 8)}`,
    buildRunId,
  );
  await writeOrganicContentWorkspaceScaffold(sandbox);

  const pabRun = await insertPabRun(input.admin, {
    organizationId: input.organizationId,
    correlationId: input.correlationId ?? randomUUID(),
    idempotencyKey: input.idempotencyKey,
    simulationOnly: false,
    companyBuilderPackageId: input.buildPackage.sourceLineage.companyBuilderBuildPackageId ?? null,
    companyBuilderBlueprintId: input.buildPackage.sourceLineage.ventureBlueprintId ?? null,
    workspaceReference: sandbox.workspaceReference,
    buildGraphHash: `organic-pab-v21-${pageOpportunityId}`,
  });

  await updatePabRun(input.admin, input.organizationId, pabRun.id, {
    status: "building",
    engine_version: "product_asset_builder_v2.1",
  });

  const outputPath = `content/organic/${pageOpportunityId}.json`;
  const taskTemplates = decomposeOrganicPageTasks({
    ventureId: input.buildPackage.ventureId,
    buildRunId: pabRun.id,
    contract: featureContract,
    contentContract,
    canonicalUrl: urlEntry.url,
  });

  const liveRequirements = buildOrganicLiveTaskPrompt({
    contentContract,
    canonicalUrl: urlEntry.url,
    outputPath,
  });

  const taskTemplate = taskTemplates[0]!;
  const repositoryContext = await buildRepositoryContext({
    sandbox,
    featureContracts: [featureContract],
    taskHints: [taskTemplate.taskType, taskTemplate.objective, outputPath],
    relevantFiles: ["content/organic/README.md"],
    priorFailures: [],
    reviewerFindings: [],
  });

  const codingTask: CodingTask = {
    ...taskTemplate,
    id: randomUUID(),
    buildRunId: pabRun.id,
    ventureId: input.buildPackage.ventureId,
    requirements: [...taskTemplate.requirements, ...liveRequirements],
    allowedPaths: ["content/organic"],
    maxFilesChanged: 2,
    maxCostUsd,
    retryLimit: 1,
    status: "running",
    repositoryContext,
  };

  const traceabilityLinks: OrganicPabV21LiveHandoffResult["traceabilityLinks"] = [
    {
      linkType: "organic_growth_run_to_pab_run",
      sourceRef: input.organicGrowthRunId,
      targetRef: pabRun.id,
    },
    {
      linkType: "organic_build_package_to_pab_run",
      sourceRef: input.organicGrowthBuildPackageId,
      targetRef: pabRun.id,
    },
    {
      linkType: "organic_content_contract_to_feature_contract",
      sourceRef: pageOpportunityId,
      targetRef: featureContract.featureId,
    },
    {
      linkType: "page_opportunity_to_coding_task",
      sourceRef: pageOpportunityId,
      targetRef: codingTask.id,
    },
  ];

  if (input.buildPackage.sourceLineage.opportunityCandidateId) {
    traceabilityLinks.push({
      linkType: "opportunity_candidate_to_organic_page",
      sourceRef: input.buildPackage.sourceLineage.opportunityCandidateId,
      targetRef: pageOpportunityId,
    });
  }

  await persistFeatureContracts(input.admin, input.organizationId, pabRun.id, [featureContract]);
  await persistTraceabilityLinks(input.admin, input.organizationId, pabRun.id, traceabilityLinks);
  await persistCodingTask(input.admin, input.organizationId, pabRun.id, codingTask);

  const codingResult = await executeCodingTask({
    task: codingTask,
    liveMode: true,
  });

  usageRecords.push(codingResult.usage);
  if (codingResult.reviewUsage) usageRecords.push(codingResult.reviewUsage);

  await persistProviderCall(input.admin, input.organizationId, pabRun.id, codingResult.usage);
  if (codingResult.reviewUsage) {
    await persistProviderCall(input.admin, input.organizationId, pabRun.id, codingResult.reviewUsage);
  }

  let codeChangeSetId: string | null = null;
  let workspaceMutationIds: string[] = [];
  let generatedArtifact: GeneratedOrganicPageArtifact | null = null;

  if (!codingResult.changeSet) {
    codingTask.status = "failed";
    await persistCodingTask(input.admin, input.organizationId, pabRun.id, codingTask);
    blockedReasons.push(codingResult.usage.error ?? "PAB V2.1 coding task produced no change set");
  } else {
    codeChangeSetId = randomUUID();
    const engine = new WorkspaceMutationEngine(sandbox, codeChangeSetId);
    const applyResult = await engine.applyChangeSet(codingResult.changeSet, {
      codingTaskId: codingTask.id,
      featureContractIds: codingTask.featureContractIds,
      allowedPaths: codingTask.allowedPaths,
      maxChanges: codingTask.maxFilesChanged,
    });

    if (applyResult.applied.length === 0) {
      codingTask.status = "failed";
      blockedReasons.push(
        applyResult.rejected.map((r) => r.reason).join("; ") || "Workspace mutations rejected",
      );
    } else {
      await persistCodeChangeSet(
        input.admin,
        input.organizationId,
        pabRun.id,
        codeChangeSetId,
        codingResult.changeSet,
        true,
      );
      await persistWorkspaceMutations(input.admin, input.organizationId, pabRun.id, applyResult.applied);
      workspaceMutationIds = applyResult.applied.map((m) => m.id);

      codingTask.status = "completed";
      try {
        generatedArtifact = await extractGeneratedOrganicArtifactFromSandbox({
          sandbox,
          buildPackage: input.buildPackage,
          pageOpportunityId,
          canonicalUrl: urlEntry.url,
          contentContract,
        });
      } catch (extractErr) {
        blockedReasons.push(
          extractErr instanceof Error ? extractErr.message : String(extractErr),
        );
      }
    }

    await persistCodingTask(input.admin, input.organizationId, pabRun.id, codingTask);
  }

  const agg = aggregateUsage(usageRecords);
  if (agg.totalCostUsd > maxCostUsd) {
    blockedReasons.push("Organic PAB live handoff cost ceiling exceeded");
  }

  let postGenerationGate: PostGenerationGateResult = {
    pageOpportunityId,
    outcome: "BLOCK_ARTIFACT",
    failures: ["No generated artifact available for post-generation validation"],
  };
  let repairResult: PostGenerationRepairResult | null = null;

  if (generatedArtifact) {
    const registryUrls = new Set(input.buildPackage.canonicalUrlRegistry.entries.map((e) => e.url));
    postGenerationGate = validateGeneratedOrganicArtifact({
      artifact: generatedArtifact,
      contentContract,
      canonicalUrl: urlEntry.url,
      schemaTypes: generatedArtifact.schemaTypes,
      registryUrls,
    });

    if (postGenerationGate.outcome !== "PASS") {
      repairResult = applyPostGenerationRepair({
        artifact: generatedArtifact,
        contentContract,
        canonicalUrl: urlEntry.url,
        schemaTypes: generatedArtifact.schemaTypes,
        registryUrls,
        gateResult: postGenerationGate,
        repairBudget: 1,
      });
      postGenerationGate = {
        pageOpportunityId,
        outcome: repairResult.finalOutcome,
        failures: repairResult.revalidationFailures ?? postGenerationGate.failures,
      };
      if (repairResult.finalOutcome === "PASS") {
        generatedArtifact = repairResult.artifact;
      }
    }
  }

  const artifactStatus =
    blockedReasons.length === 0 && postGenerationGate.outcome === "PASS" ? "ready" : "blocked";
  if (postGenerationGate.outcome === "BLOCK_ARTIFACT") {
    blockedReasons.push(...postGenerationGate.failures);
  }

  let productionArtifactId: string | null = null;
  const artifact = await insertProductionArtifact(
    input.admin,
    input.organizationId,
    {
      artifactId: randomUUID(),
      ventureId: input.buildPackage.ventureId,
      buildPackageId: input.organicGrowthBuildPackageId,
      workspaceId: pabRun.id,
      buildRunId: pabRun.id,
      status: artifactStatus,
      artifactManifest: {
        engineVersion: "organic_growth_pab_v21_handoff",
        organicGrowthRunId: input.organicGrowthRunId,
        pageOpportunityId,
        organicContentContractId: pageOpportunityId,
        postGenerationOutcome: postGenerationGate.outcome,
      },
      sourceManifest: { files: await sandbox.listFiles() },
      technologyManifest: { stack: ["organic-content-json"] },
      databaseManifest: {},
      routeManifest: { routes: featureContract.requiredRoutes },
      monetizationManifest: { organicHandoff: true },
      validationManifest: { postGenerationGate },
      dependencyManifest: {},
      buildHash: codeChangeSetId ?? "none",
      fileCount: (await sandbox.listFiles()).length,
      totalBytes: 0,
      createdAt: new Date().toISOString(),
    },
    pabRun.id,
  );
  productionArtifactId = artifact.id;

  await insertCostLedgerEntries(
    input.admin,
    input.organizationId,
    pabRun.id,
    usageRecords.map((u) => ({
      provider: u.provider,
      modelId: u.modelId,
      taskType: u.taskType,
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      estimatedCostUsd: u.estimatedCostUsd,
    })),
  );

  await updatePabRun(input.admin, input.organizationId, pabRun.id, {
    status: artifactStatus,
    cumulative_cost_usd: agg.totalCostUsd,
    completed_at: new Date().toISOString(),
    builder_report: {
      organicHandoff: true,
      implementerProvider: codingResult.implementerProvider,
      reviewerProvider: codingResult.reviewerProvider,
      mutationsApplied: workspaceMutationIds.length,
      postGenerationOutcome: postGenerationGate.outcome,
    } as never,
  });

  const { data: providerCalls } = await input.admin
    .from("product_asset_provider_calls")
    .select("id")
    .eq("product_asset_builder_run_id", pabRun.id)
    .eq("coding_task_id", codingTask.id);

  const { data: persistedMutations } = await input.admin
    .from("product_asset_workspace_mutations")
    .select("id")
    .eq("product_asset_builder_run_id", pabRun.id);

  return {
    ok: blockedReasons.length === 0 && codingResult.usage.success && Boolean(codeChangeSetId),
    pabBuildRunId: pabRun.id,
    productionArtifactId,
    pageOpportunityId,
    organicContentContractId: pageOpportunityId,
    codingTaskId: codingTask.id,
    providerCallIds: (providerCalls ?? []).map((r) => r.id),
    codeChangeSetId,
    workspaceMutationIds: (persistedMutations ?? []).map((r) => r.id),
    implementerProvider: codingResult.implementerProvider,
    implementerModel: codingResult.usage.modelId,
    reviewerProvider: codingResult.reviewerProvider,
    inputTokens: agg.totalInputTokens,
    outputTokens: agg.totalOutputTokens,
    totalCostUsd: agg.totalCostUsd,
    costReported: agg.totalCostUsd > 0 || agg.totalTokens > 0,
    usageSource: codingResult.usage.usageSource,
    generatedArtifact: generatedArtifact ?? {
      pageOpportunityId,
      canonicalUrl: urlEntry.url,
      title: contentContract.primaryQueryIntent,
      bodyText: "",
      sections: [],
      internalLinks: [],
      schemaTypes: ["WebPage"],
      claims: [],
    },
    postGenerationGate,
    repairResult,
    traceabilityLinks,
    blockedReasons,
    workspaceReference: sandbox.workspaceReference,
  };
}

export { extractGeneratedOrganicArtifactFromSandbox };
