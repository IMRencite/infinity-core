import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { redactSecrets } from "@/lib/infinity/research/redaction";
import { assembleBuildPackage, assembleVentureBlueprint } from "./blueprint/assemble";
import { assertCompanyBuilderExecutable, loadCompanyBuilderConfig } from "./config";
import { CompanyBuilderError, classifyCompanyBuilderFailure } from "./failures";
import {
  buildComplexityTestSimulationHandoff,
  loadPreparedBuildHandoffs,
  loadSimulationHandoffs,
} from "./load/load-handoffs";
import {
  buildCompanyBuilderReport,
  findCompanyBuilderRunByIdempotencyKey,
  insertCompanyBuilderRun,
  markCompanyBuilderRunFailed,
  markHandoffConsumed,
  persistBuildPackage,
  persistVentureBlueprint,
  updateCompanyBuilderRun,
} from "./persistence";
import type {
  BuildPackageDraft,
  LoadedVentureSelectionHandoff,
  RunCompanyBuilderInput,
  RunCompanyBuilderOutput,
  SourceLineage,
  VentureBlueprintDraft,
} from "./types";

function buildSourceLineage(handoff: LoadedVentureSelectionHandoff, runId?: string): SourceLineage {
  return {
    discoveryRunId: handoff.discoveryRunId,
    opportunityCandidateId: handoff.opportunityCandidateId,
    monetizationRunId: handoff.monetizationRunId,
    ventureSelectionRunId: handoff.ventureSelectionRunId,
    candidateSelectionEvaluationId: handoff.candidateSelectionEvaluationId,
    ventureSelectionHandoffId: handoff.id,
    companyBuilderRunId: runId,
  };
}

async function processHandoff(input: {
  handoff: LoadedVentureSelectionHandoff;
  simulationOnly: boolean;
  useComplexityTest?: boolean;
  companyBuilderRunId: string;
}): Promise<VentureBlueprintDraft> {
  return assembleVentureBlueprint({
    handoff: input.handoff,
    simulationOnly: input.simulationOnly,
    sourceLineage: buildSourceLineage(input.handoff, input.companyBuilderRunId),
    useComplexMarketplaceCapabilityTest: input.useComplexityTest,
  });
}

export async function runCompanyBuilderCycle(
  admin: AdminSupabaseClient,
  input: RunCompanyBuilderInput,
): Promise<RunCompanyBuilderOutput> {
  const config = loadCompanyBuilderConfig();
  assertCompanyBuilderExecutable(config);

  const existing = await findCompanyBuilderRunByIdempotencyKey(
    admin,
    input.organizationId,
    input.idempotencyKey,
  );
  if (existing?.status === "completed" && existing.builder_report) {
    return {
      ok: true,
      companyBuilderRunId: existing.id,
      report: existing.builder_report as never,
      blueprints: [],
      buildPackages: [],
    };
  }

  const correlationId = randomUUID();
  let handoffs = await loadPreparedBuildHandoffs(admin, input.organizationId, input.handoffIds);
  let simulationOnly = false;
  let inputMode: "handoff" | "simulation" = "handoff";

  if (handoffs.length === 0) {
    if (!config.allowSimulationMode) {
      throw new CompanyBuilderError(
        "No BUILD-qualified handoffs available and simulation mode is disabled.",
        "input_error",
      );
    }

    simulationOnly = true;
    inputMode = "simulation";

    const candidateIds =
      input.simulationInputs?.map((item) => item.opportunityCandidateId).filter(Boolean) ?? [];

    if (candidateIds.length > 0) {
      handoffs = await loadSimulationHandoffs(admin, input.organizationId, candidateIds);
    }

    if (input.includeComplexityCapabilityTest) {
      handoffs.push(buildComplexityTestSimulationHandoff(input.organizationId));
    }

    if (handoffs.length === 0) {
      throw new CompanyBuilderError(
        "No BUILD handoffs and no simulation candidates provided.",
        "input_error",
      );
    }
  }

  handoffs = handoffs.slice(0, config.maxHandoffsPerRun);

  const runRow = await insertCompanyBuilderRun(admin, {
    organizationId: input.organizationId,
    correlationId,
    idempotencyKey: input.idempotencyKey,
    simulationOnly,
    inputMode,
    sourceLineage: {
      handoffIds: handoffs.map((h) => h.id).filter(Boolean),
      candidateIds: handoffs.map((h) => h.opportunityCandidateId).filter(Boolean),
      simulationOnly,
    },
  });

  await updateCompanyBuilderRun(admin, input.organizationId, runRow.id, { status: "architecting" });

  const blueprints: VentureBlueprintDraft[] = [];
  const buildPackages: BuildPackageDraft[] = [];
  let handoffsConsumed = 0;

  try {
    for (const handoff of handoffs) {
      const isComplexityTest = handoff.opportunityCandidateId == null && handoff.validationState === "simulation_capability_test";
      const blueprint = await processHandoff({
        handoff,
        simulationOnly: simulationOnly || handoff.simulationOnly,
        useComplexityTest: isComplexityTest,
        companyBuilderRunId: runRow.id,
      });

      if (isComplexityTest) {
        blueprint.sourceLineage.capabilityTest = true;
        blueprint.sourceLineage.inputMode = "simulation";
      }

      const blueprintId = await persistVentureBlueprint(admin, {
        organizationId: input.organizationId,
        companyBuilderRunId: runRow.id,
        handoffId: handoff.id,
        candidateId: handoff.opportunityCandidateId,
        blueprint,
      });

      blueprint.sourceLineage.ventureBlueprintId = blueprintId;
      const buildPackage = assembleBuildPackage(blueprint, blueprintId);
      await persistBuildPackage(admin, {
        organizationId: input.organizationId,
        companyBuilderRunId: runRow.id,
        ventureBlueprintId: blueprintId,
        buildPackage,
      });

      blueprints.push(blueprint);
      buildPackages.push(buildPackage);

      if (!simulationOnly && handoff.id && handoff.handoffStatus === "prepared") {
        await markHandoffConsumed(admin, input.organizationId, handoff.id);
        handoffsConsumed += 1;
      }
    }

    await updateCompanyBuilderRun(admin, input.organizationId, runRow.id, { status: "packaging" });

    const report = buildCompanyBuilderReport({
      simulationOnly,
      handoffsConsumed,
      blueprints,
      buildPackages,
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    });

    const redactedReport = JSON.parse(redactSecrets(JSON.stringify(report))) as typeof report;

    await updateCompanyBuilderRun(admin, input.organizationId, runRow.id, {
      status: "completed",
      simulation_only: simulationOnly,
      blueprints_created: blueprints.length,
      build_packages_created: buildPackages.length,
      ready_packages: report.readyPackages,
      blocked_packages: report.blockedPackages,
      builder_report: redactedReport as never,
      completed_at: new Date().toISOString(),
    });

    return {
      ok: true,
      companyBuilderRunId: runRow.id,
      report: redactedReport,
      blueprints,
      buildPackages,
    };
  } catch (error) {
    const classified = classifyCompanyBuilderFailure(error);
    await markCompanyBuilderRunFailed(admin, input.organizationId, runRow.id, classified);
    return {
      ok: false,
      companyBuilderRunId: runRow.id,
      status: "failed",
      failureClassification: classified.classification,
      message: classified.message,
    };
  }
}

export async function runCompanyBuilderV1Test(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<RunCompanyBuilderOutput> {
  const suffix = process.env.COMPANY_BUILDER_TEST_IDEMPOTENCY_SUFFIX?.trim() || `v1-${Date.now()}`;

  const simulationCandidateIds = (
    process.env.COMPANY_BUILDER_SIMULATION_CANDIDATE_IDS ??
    "7a1b16b2-4140-40a2-b60c-3716301c9c01,cb84fb14-23e4-4281-b41f-da29ad001077,903b7768-6baf-4927-adce-de905be8a87b"
  )
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return runCompanyBuilderCycle(admin, {
    organizationId,
    idempotencyKey: `company-builder-v1-test:${organizationId}:${suffix}`,
    simulationInputs: simulationCandidateIds.map((opportunityCandidateId) => ({ opportunityCandidateId })),
    includeComplexityCapabilityTest: true,
    runPurpose: "company_builder_verification",
  });
}
