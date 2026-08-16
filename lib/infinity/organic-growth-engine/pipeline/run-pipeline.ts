import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { runOrganicPabHandoff } from "../integration/pab-handoff";
import { applyPostGenerationRepair } from "../quality/post-generation-repair";
import { summarizePostGenerationGate } from "../quality/post-generation-gate";
import type {
  OrganicGrowthBuildPackage,
  OrganicPipelineRunResult,
  PostGenerationRepairResult,
} from "../types";

export function executeOrganicPipelineForPackage(input: {
  buildPackage: OrganicGrowthBuildPackage;
  organicGrowthRunId: string;
  organicGrowthBuildPackageId: string;
  inputMode: OrganicPipelineRunResult["inputMode"];
  maxPages?: number;
  repairBudget?: number;
}): OrganicPipelineRunResult {
  const buildRunId = randomUUID();
  const handoff = runOrganicPabHandoff({
    buildPackage: input.buildPackage,
    buildRunId,
    maxPages: input.maxPages ?? 2,
  });

  const registryUrls = new Set(input.buildPackage.canonicalUrlRegistry.entries.map((e) => e.url));
  const repairResults: PostGenerationRepairResult[] = [];

  for (const gateResult of handoff.postGenerationResults) {
    const artifact = handoff.generatedArtifacts.find(
      (a) => a.pageOpportunityId === gateResult.pageOpportunityId,
    );
    const contract = input.buildPackage.organicContentContracts.find(
      (c) => c.pageOpportunityId === gateResult.pageOpportunityId,
    );
    const urlEntry = input.buildPackage.canonicalUrlRegistry.entries.find(
      (e) => e.pageOpportunityId === gateResult.pageOpportunityId,
    );
    if (!artifact || !contract || !urlEntry) continue;

    if (gateResult.outcome === "PASS") {
      repairResults.push({
        pageOpportunityId: gateResult.pageOpportunityId,
        initialOutcome: "PASS",
        finalOutcome: "PASS",
        repairsAttempted: 0,
        actions: [],
        artifact,
      });
      continue;
    }

    repairResults.push(
      applyPostGenerationRepair({
        artifact,
        contentContract: contract,
        canonicalUrl: urlEntry.url,
        schemaTypes: artifact.schemaTypes,
        registryUrls,
        gateResult,
        repairBudget: input.repairBudget,
      }),
    );
  }

  handoff.repairResults = repairResults;

  const finalOutcomes = repairResults.map((r) => r.finalOutcome);
  const summary = {
    pass: finalOutcomes.filter((o) => o === "PASS").length,
    repair: finalOutcomes.filter((o) => o === "REPAIR").length,
    blocked: finalOutcomes.filter((o) => o === "BLOCK_ARTIFACT").length,
  };

  handoff.traceabilityLinks.push({
    linkType: "organic_run_to_build_package",
    sourceRef: input.organicGrowthRunId,
    targetRef: input.organicGrowthBuildPackageId,
  });
  for (const task of handoff.codingTasks) {
    handoff.traceabilityLinks.push({
      linkType: "page_opportunity_to_coding_task",
      sourceRef: task.pageOpportunityId,
      targetRef: task.taskId,
    });
  }

  return {
    organicGrowthRunId: input.organicGrowthRunId,
    organicGrowthBuildPackageId: input.organicGrowthBuildPackageId,
    ventureId: input.buildPackage.ventureId,
    sourceLineage: input.buildPackage.sourceLineage,
    pabHandoff: handoff,
    repairResults,
    postGenerationSummary: summary,
    inputMode: input.inputMode,
  };
}

export async function findLatestReadyBuildPackageId(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("company_builder_packages")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("status", "READY")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function runOrganicGrowthPipelineCycle(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    idempotencyKey: string;
    companyBuilderBuildPackageIds?: string[];
    simulationOnly?: boolean;
    capabilityTest?: boolean;
    inputMode?: OrganicPipelineRunResult["inputMode"];
  },
  runEngine: (
    admin: AdminSupabaseClient,
    engineInput: import("../types").RunOrganicGrowthEngineInput,
  ) => Promise<import("../types").RunOrganicGrowthEngineOutput>,
): Promise<{ engine: import("../types").RunOrganicGrowthEngineOutput; pipelines: OrganicPipelineRunResult[] }> {
  const engineOutput = await runEngine(admin, {
    organizationId: input.organizationId,
    idempotencyKey: input.idempotencyKey,
    companyBuilderBuildPackageIds: input.companyBuilderBuildPackageIds,
    simulationOnly: input.simulationOnly ?? true,
    capabilityTest: input.capabilityTest ?? false,
    enableGroundedResearch: false,
  });

  const pipelines: OrganicPipelineRunResult[] = [];
  for (const pkg of engineOutput.buildPackages) {
    const pkgId =
      pkg.sourceLineage.companyBuilderBuildPackageId ??
      engineOutput.organicGrowthRunId;
    pipelines.push(
      executeOrganicPipelineForPackage({
        buildPackage: pkg,
        organicGrowthRunId: engineOutput.organicGrowthRunId,
        organicGrowthBuildPackageId: pkgId,
        inputMode: input.inputMode ?? (input.simulationOnly ? "SIMULATION" : "LIVE"),
      }),
    );
  }

  return { engine: engineOutput, pipelines };
}

export { summarizePostGenerationGate };
