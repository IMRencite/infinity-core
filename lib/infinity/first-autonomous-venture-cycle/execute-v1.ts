import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { runMonetizationEngineCycle } from "@/lib/infinity/monetization-engine/run";
import { runVentureSelectionCycle } from "@/lib/infinity/venture-selection/run";
import { runCompanyBuilderCycle } from "@/lib/infinity/company-builder/run";
import { runOrganicGrowthEngineCycle } from "@/lib/infinity/organic-growth-engine/run";
import { runOrganicPabV21LiveHandoff } from "@/lib/infinity/organic-growth-engine/integration/pab-v21-live-handoff";
import { runPerformanceIntelligenceCycle } from "@/lib/infinity/performance-intelligence-engine/run";
import type { VenturePerformanceContext } from "@/lib/infinity/performance-intelligence-engine/types";
import type { VentureModelType } from "@/lib/infinity/performance-intelligence-engine/constants";
import { CycleBudgetGovernor } from "./budget-governor";
import { deriveFavc1SelectionStopReason } from "./selection-stop-reason";
import {
  classifyFavc1Outcome,
  mapScannerFailureToCycleLevel,
  scannerFailureMessage,
  type Favc1CycleLevel,
  type Favc1OutcomeKind,
} from "./result-semantics";
import { runFavc1VentureRadar } from "./run-venture-radar";
import { bridgeFirstAutonomousVenture } from "./venture-bridge";
import {
  formatDatabaseProbeFailure,
  thrownDatabaseFailureLevel,
  thrownDatabaseFailureMessage,
  waitForScannerDatabaseReady,
} from "./database-ready";
import {
  assessSelectionPoolAdequacy,
  buildFavc1SelectionHandoff,
  validateFavc1SelectionHandoff,
} from "./pipeline-handoff";
import { runBoundedFavc1ValidationLoop } from "./bounded-validation/run";
import { ensurePreparedHandoffForEvaluation } from "./bounded-validation/handoff";
import type { CandidateEvaluationDraft } from "@/lib/infinity/venture-selection/types";

export type FirstAutonomousVentureCycleInput = {
  organizationId: string;
  cycleKey?: string;
};

export type FirstAutonomousVentureCycleResult = {
  ok: boolean;
  level: Favc1CycleLevel;
  outcome: Favc1OutcomeKind;
  closedLoopProven: boolean;
  stopReason: string | null;
  ventureAssemblyId: string | null;
  ventureName: string | null;
  lineage: Record<string, string | null>;
  budget: CycleBudgetGovernor["ledger"];
};

function idempotency(orgId: string, cycleKey: string, stage: string) {
  return `first-autonomous-venture-v1:${orgId}:${cycleKey}:${stage}`;
}

function toVentureModelType(model: string | undefined | null): VentureModelType {
  const normalized = (model ?? "").toLowerCase();
  if (normalized.includes("subscription") || normalized.includes("saas")) return "subscription";
  if (normalized.includes("marketplace")) return "marketplace";
  if (normalized.includes("lead") || normalized.includes("freemium")) return "lead_gen";
  if (normalized.includes("content") || normalized.includes("media")) return "content_media";
  return "generic";
}

async function waitForDatabaseReady(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<void> {
  const result = await waitForScannerDatabaseReady(admin, organizationId);
  if (!result.ready) {
    const failure = new Error(formatDatabaseProbeFailure(result));
    (failure as Error & { code?: string }).code = result.lastErrorCode ?? undefined;
    throw failure;
  }
}

export async function executeFirstAutonomousVentureCycleV1(
  admin: AdminSupabaseClient,
  input: FirstAutonomousVentureCycleInput,
): Promise<FirstAutonomousVentureCycleResult> {
  const cycleKey = input.cycleKey ?? new Date().toISOString().replace(/[:.]/g, "-");
  const orgId = input.organizationId;
  const budget = new CycleBudgetGovernor();
  const lineage: Record<string, string | null> = { cycleKey, organizationId: orgId };

  const finish = (
    level: Favc1CycleLevel,
    stopReason: string | null,
    partial: Partial<Pick<FirstAutonomousVentureCycleResult, "ventureAssemblyId" | "ventureName" | "lineage">> = {},
  ): FirstAutonomousVentureCycleResult => {
    const result: FirstAutonomousVentureCycleResult = {
      ok: false,
      level,
      outcome: classifyFavc1Outcome({ ok: false, level, closedLoopProven: false }),
      closedLoopProven: false,
      stopReason,
      ventureAssemblyId: partial.ventureAssemblyId ?? null,
      ventureName: partial.ventureName ?? null,
      lineage: { ...lineage, ...(partial.lineage ?? {}) },
      budget: budget.ledger,
    };
    return result;
  };

  try {
    await waitForDatabaseReady(admin, orgId);
    budget.assertRoom("opportunity_scanner");
    process.env.OPPORTUNITY_SCANNER_ENABLED = "true";
    process.env.RESEARCH_ENABLED = "true";

    const radar = await runFavc1VentureRadar(
      admin,
      {
        organizationId: orgId,
        idempotencyKey: idempotency(orgId, cycleKey, "discovery"),
        runPurpose: "first_autonomous_venture_v1",
        searchScope: {
          geography: "United States",
          focus:
            "digital-first low-regulatory software utilities, workflow tools, calculators, generators, assessments, and niche B2B micro-SaaS with clear monetization and organic acquisition potential",
        },
        maxResearchCalls: Number(process.env.FAVC1_MAX_RESEARCH_CALLS ?? 6),
      },
      budget,
    );

    if (!radar.ok) {
      const level = mapScannerFailureToCycleLevel(radar.output.failureClassification);
      lineage.discoveryRunId = radar.output.discoveryRunId ?? null;
      lineage.scannerFailureClassification = radar.output.failureClassification;
      return finish(level, scannerFailureMessage(radar.output), { lineage });
    }

    const scanner = radar.output;
    lineage.discoveryRunId = scanner.discoveryRunId;
    const candidateIds = (scanner.candidates ?? []).map((c) => c.id);
    if (candidateIds.length === 0) {
      return finish("NO_GO_MARKET_DECISION", "No opportunity candidates persisted after discovery", {
        lineage,
      });
    }
    lineage.candidateCount = String(candidateIds.length);

    budget.assertRoom("monetization");
    process.env.MONETIZATION_ENGINE_ENABLED = "true";
    const monetization = await runMonetizationEngineCycle(admin, {
      organizationId: orgId,
      idempotencyKey: idempotency(orgId, cycleKey, "monetization"),
      opportunityCandidateIds: candidateIds,
      runPurpose: "first_autonomous_venture_v1",
    });
    if (!monetization.ok) {
      return finish("LEVEL_0_SYSTEM_FAILURE", monetization.message ?? "Monetization failed", { lineage });
    }
    lineage.monetizationRunId = monetization.monetizationRunId;

    const monetizationCost = monetization.report.costSummary.estimatedCostUsd;
    const monetizationCostKnown =
      (monetization.report.costSummary as { costKnown?: boolean }).costKnown ??
      monetizationCost != null;
    budget.record({
      stage: "monetization",
      provider: "gemini",
      costUsd: monetizationCost,
      known: monetizationCostKnown,
      note: `analyzed=${monetization.handoff.monetizedCandidateIds.length} researchCalls=${monetization.report.costSummary.researchCallCount ?? 0}`,
    });

    const pipelineHandoff = buildFavc1SelectionHandoff({
      discoveryRunId: scanner.discoveryRunId,
      discoveredCandidateIds: candidateIds,
      monetizationRunId: monetization.monetizationRunId,
      monetizationHandoff: monetization.handoff,
    });
    lineage.selectionCandidateCount = String(pipelineHandoff.selectionCandidateIds.length);
    lineage.selectionPoolAdequacy = assessSelectionPoolAdequacy(
      pipelineHandoff.selectionCandidateIds.length,
    );
    lineage.monetizationExcludedCount = String(pipelineHandoff.excludedCandidates.length);

    console.log("[FAVC1] monetization selection handoff", {
      discovered: pipelineHandoff.discoveredCandidateIds.length,
      monetized: pipelineHandoff.monetizedCandidateIds.length,
      selection: pipelineHandoff.selectionCandidateIds.length,
      excluded: pipelineHandoff.excludedCandidates.length,
      selectionPoolAdequacy: lineage.selectionPoolAdequacy,
    });

    try {
      validateFavc1SelectionHandoff(pipelineHandoff);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid FAVC1 pipeline handoff";
      return finish("LEVEL_0_SYSTEM_FAILURE", message, { lineage });
    }

    budget.assertRoom("venture_selection");
    process.env.VENTURE_SELECTION_ENABLED = "true";
    process.env.VENTURE_SELECTION_RUN_ADVERSARIAL = "true";
    const selection = await runVentureSelectionCycle(admin, {
      organizationId: orgId,
      idempotencyKey: idempotency(orgId, cycleKey, "venture_selection"),
      opportunityCandidateIds: pipelineHandoff.selectionCandidateIds,
      discoveryRunId: scanner.discoveryRunId,
      monetizationRunId: monetization.monetizationRunId,
      maxCandidates: pipelineHandoff.selectionCandidateIds.length,
      runPurpose: "first_autonomous_venture_v1",
    });
    if (!selection.ok) {
      return finish("LEVEL_0_SYSTEM_FAILURE", selection.message ?? "Venture selection failed", { lineage });
    }
    lineage.ventureSelectionRunId = selection.ventureSelectionRunId;

    const selectionCost = selection.report.costSummary.estimatedCostUsd;
    budget.record({
      stage: "venture_selection",
      provider: "openai",
      costUsd: selectionCost,
      known: selection.report.costSummary.costKnown ?? selectionCost != null,
      note: `adversarialReviews=${selection.report.costSummary.adversarialReviewCount} tokens=${selection.report.costSummary.tokenUsage.totalTokens}`,
    });

    let winner: CandidateEvaluationDraft | null = null;
    const buildEvaluations = selection.evaluations.filter((e) => e.decision === "BUILD");
    if (buildEvaluations.length > 0) {
      winner = [...buildEvaluations].sort(
        (a, b) =>
          (b.portfolioAdjustedScore ?? b.selectionScore) - (a.portfolioAdjustedScore ?? a.selectionScore),
      )[0]!;
    } else {
      budget.assertRoom("bounded_validation");
      const validation = await runBoundedFavc1ValidationLoop(admin, {
        organizationId: orgId,
        cycleKey,
        discoveryRunId: scanner.discoveryRunId,
        monetizationRunId: monetization.monetizationRunId,
        ventureSelectionRunId: selection.ventureSelectionRunId,
        evaluations: selection.evaluations,
        budget,
      });

      lineage.validationRunId = validation.validationRunId;
      lineage.selectedValidationCandidateId = validation.selectedCandidate?.candidateId ?? null;
      lineage.postValidationEvaluationId = validation.postValidationEvaluationId;
      lineage.validationOutcome = validation.outcome;
      lineage.validationLineage = JSON.stringify(validation.lineage);

      budget.record({
        stage: "bounded_validation",
        provider: validation.providerCalls > 0 ? "gemini" : "internal",
        costUsd: validation.costUsd,
        known: validation.costKnown,
        note: `providerCalls=${validation.providerCalls} synthesisSteps=${validation.synthesisStepCount} acquisitionSteps=${validation.acquisitionStepCount} outcome=${validation.outcome} acquisition=${validation.acquisitionDecision ?? "n/a"}`,
      });

      if (validation.technicalFailure) {
        return finish("LEVEL_0_SYSTEM_FAILURE", validation.terminalMessage, { lineage });
      }

      if (validation.promotedToBuild && validation.postValidationEvaluation) {
        winner = validation.postValidationEvaluation;
        lineage.validationPromotedToBuild = "true";
      } else {
        const stopReason = deriveFavc1SelectionStopReason(selection.evaluations);
        lineage.selectionStopReasonPath =
          validation.outcome === "VALIDATE" ? "validation_required" : stopReason.structured.path;
        lineage.selectionStopReasonStructured = JSON.stringify({
          ...stopReason.structured,
          path: validation.outcome === "VALIDATE" ? "validation_required" : stopReason.structured.path,
          validationOutcome: validation.outcome,
        });
        const terminalMessage =
          validation.outcome === "VALIDATE"
            ? "Candidate still requires validation after bounded autonomous validation."
            : stopReason.message;
        return finish("NO_GO_MARKET_DECISION", terminalMessage, {
          lineage,
        });
      }
    }

    const handoffId = await ensurePreparedHandoffForEvaluation(admin, {
      organizationId: orgId,
      ventureSelectionRunId: selection.ventureSelectionRunId,
      evaluation: winner,
      totalCandidates: selection.evaluations.length,
    });

    lineage.opportunityCandidateId = winner.candidate.candidateId;
    lineage.handoffId = handoffId;
    const ventureName =
      winner.candidate.title?.trim() ||
      winner.candidate.summary?.slice(0, 80) ||
      `Venture ${winner.candidate.candidateId.slice(0, 8)}`;

    console.log("\n=============================================");
    console.log("INFINITY FIRST AUTONOMOUS VENTURE CREATED");
    console.log(`Venture Name: ${ventureName}`);
    console.log(`Venture ID: pending-bridge`);
    console.log("HQ URL: (assigned after venture assembly bridge)");
    console.log("=============================================\n");

    process.env.COMPANY_BUILDER_ENABLED = "true";
    const companyBuilder = await runCompanyBuilderCycle(admin, {
      organizationId: orgId,
      idempotencyKey: idempotency(orgId, cycleKey, "company_builder"),
      handoffIds: [handoffId],
      runPurpose: "first_autonomous_venture_v1",
    });
    if (!companyBuilder.ok) {
      return finish("LEVEL_0_SYSTEM_FAILURE", companyBuilder.message, {
        ventureName,
        lineage,
      });
    }
    if (!companyBuilder.buildPackages.length) {
      return finish("LEVEL_0_SYSTEM_FAILURE", "Company Builder produced no build packages", {
        ventureName,
        lineage,
      });
    }

    const blueprintDraft = companyBuilder.blueprints[0]!;
    const blueprintId = blueprintDraft.sourceLineage.ventureBlueprintId ?? null;

    const { data: pkgRow } = await admin
      .from("company_builder_packages")
      .select("id, company_builder_blueprint_id")
      .eq("organization_id", orgId)
      .eq("company_builder_run_id", companyBuilder.companyBuilderRunId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    lineage.companyBuilderRunId = companyBuilder.companyBuilderRunId;
    lineage.companyBuilderBuildPackageId = pkgRow?.id ?? null;
    lineage.companyBuilderBlueprintId = pkgRow?.company_builder_blueprint_id ?? blueprintId;

    const bridge = await bridgeFirstAutonomousVenture(admin, {
      organizationId: orgId,
      cycleKey,
      ventureName,
      opportunityCandidateId: winner.candidate.candidateId,
      discoveryRunId: scanner.discoveryRunId,
      companyBuilderBlueprintId: pkgRow?.company_builder_blueprint_id ?? blueprintId,
      candidateSummary: winner.candidate.summary,
      targetCustomer: winner.candidate.targetCustomer,
      problem: winner.candidate.problem,
      businessModel: winner.candidate.monetization?.recommendation.recommendedPrimaryModel ?? null,
    });

    lineage.ventureAssemblyId = bridge.ventureAssemblyId;
    lineage.missionId = bridge.missionId;
    lineage.opportunityId = bridge.opportunityId;

    console.log("\n=============================================");
    console.log("INFINITY FIRST AUTONOMOUS VENTURE CREATED");
    console.log(`Venture Name: ${ventureName}`);
    console.log(`Venture ID: ${bridge.ventureAssemblyId}`);
    console.log(`HQ URL: http://localhost:3000/dashboard/ventures/${bridge.ventureAssemblyId}`);
    console.log("=============================================\n");

    budget.assertRoom("organic_growth");
    process.env.ORGANIC_GROWTH_ENGINE_ENABLED = "true";
    const organic = await runOrganicGrowthEngineCycle(admin, {
      organizationId: orgId,
      idempotencyKey: idempotency(orgId, cycleKey, "organic_growth"),
      companyBuilderBuildPackageIds: pkgRow?.id ? [pkgRow.id] : undefined,
      companyBuilderBlueprintIds: (pkgRow?.company_builder_blueprint_id ?? blueprintId)
        ? [pkgRow?.company_builder_blueprint_id ?? blueprintId!]
        : undefined,
      simulationOnly: true,
      enableGroundedResearch: false,
    });
    if (!organic.ok || organic.buildPackages.length === 0) {
      return {
        ok: true,
        level: "LEVEL_1",
        outcome: classifyFavc1Outcome({ ok: true, level: "LEVEL_1", closedLoopProven: false }),
        closedLoopProven: false,
        stopReason: organic.ok ? "Organic growth produced no packages" : "Organic growth failed",
        ventureName,
        ventureAssemblyId: bridge.ventureAssemblyId,
        lineage,
        budget: budget.ledger,
      };
    }
    lineage.organicGrowthRunId = organic.organicGrowthRunId;

    const organicPkg = organic.buildPackages[0]!;
    const { data: persistedOrganicPkg } = await admin
      .from("organic_growth_build_packages")
      .select("id")
      .eq("organic_growth_run_id", organic.organicGrowthRunId)
      .limit(1)
      .maybeSingle();

    let productionArtifactId: string | null = null;
    let launchState: "PRODUCTION_READY_NOT_PUBLIC" | "FAILED" = "PRODUCTION_READY_NOT_PUBLIC";

    if (budget.budgetExceeded) {
      lineage.creationLab = "skipped_budget";
    } else {
      budget.assertRoom("creation_lab_pab", 2);
      process.env.AI_PROVIDER_ALLOW_LIVE_EXECUTION = "true";
      process.env.PAB_V21_LIVE_MODE = "true";

      const remainingBudget = Math.max(0.25, budget.hardCapUsd - budget.knownTotalUsdValue - 0.5);
      try {
        const pab = await runOrganicPabV21LiveHandoff({
          admin,
          organizationId: orgId,
          idempotencyKey: idempotency(orgId, cycleKey, "pab_v21"),
          buildPackage: organicPkg,
          organicGrowthRunId: organic.organicGrowthRunId,
          organicGrowthBuildPackageId: persistedOrganicPkg?.id ?? randomUUID(),
          maxCostUsd: Math.min(remainingBudget, 3),
        });

        budget.record({
          stage: "creation_lab_pab",
          provider: pab.implementerProvider,
          costUsd: pab.costReported ? pab.totalCostUsd : null,
          known: pab.costReported,
          note: pab.implementerModel,
        });

        lineage.pabBuildRunId = pab.pabBuildRunId;
        lineage.productionArtifactId = pab.productionArtifactId;
        productionArtifactId = pab.productionArtifactId;
        if (!pab.ok || !pab.productionArtifactId) {
          launchState = "FAILED";
        }
      } catch (error) {
        launchState = "FAILED";
        lineage.pabError = error instanceof Error ? error.message : String(error);
      }
    }

    if (productionArtifactId) {
      await admin
        .from("venture_assemblies")
        .update({
          production_artifact_id: productionArtifactId,
          status: "internally_ready",
          readiness_status: "internally_ready",
        })
        .eq("id", bridge.ventureAssemblyId)
        .eq("organization_id", orgId);
    }

    budget.assertRoom("performance_intelligence");
    const perfContext: VenturePerformanceContext = {
      ventureId: bridge.ventureAssemblyId,
      ventureModelType: toVentureModelType(
        winner.candidate.monetization?.recommendation.recommendedPrimaryModel,
      ),
      ventureTitle: ventureName,
      expectedConversionRate: 0.02,
      expectedCac: winner.candidate.monetization?.primaryPlan?.estimatedCAC ?? undefined,
      expectedRevenue: winner.candidate.monetization?.primaryPlan?.estimatedGrossRevenueYear1 ?? undefined,
      expectationProvenance: `monetization_run:${monetization.monetizationRunId}`,
    };

    const performance = await runPerformanceIntelligenceCycle(admin, {
      organizationId: orgId,
      idempotencyKey: idempotency(orgId, cycleKey, "performance_intelligence"),
      simulationOnly: false,
      capabilityTest: false,
      ventureContexts: [perfContext],
      enableMissionHandoff: true,
      executeMissions: false,
    });

    if (!performance.ok) {
      return {
        ok: true,
        level: "LEVEL_2",
        outcome: classifyFavc1Outcome({ ok: true, level: "LEVEL_2", closedLoopProven: false }),
        closedLoopProven: false,
        stopReason: "Performance Intelligence failed",
        ventureName,
        ventureAssemblyId: bridge.ventureAssemblyId,
        lineage,
        budget: budget.ledger,
      };
    }

    lineage.performanceIntelligenceRunId = performance.performanceIntelligenceRunId;
    const pkg = performance.buildPackages[0];
    const learningDecision = pkg?.learningDecisions.find((d) => d.status === "READY") ?? pkg?.learningDecisions[0];
    if (learningDecision) {
      lineage.learningDecisionId = learningDecision.decisionId;
      lineage.nextMissionId = learningDecision.missionId ?? null;
    }

    const level: Favc1CycleLevel =
      learningDecision?.missionId && productionArtifactId ? "LEVEL_4" : productionArtifactId ? "LEVEL_2" : "LEVEL_1";
    const closedLoopProven = Boolean(learningDecision?.missionId);

    return {
      ok: true,
      level,
      outcome: classifyFavc1Outcome({ ok: true, level, closedLoopProven }),
      closedLoopProven,
      stopReason: null,
      ventureAssemblyId: bridge.ventureAssemblyId,
      ventureName,
      lineage: {
        ...lineage,
        launchState,
      },
      budget: budget.ledger,
    };
  } catch (error) {
    const message = thrownDatabaseFailureMessage(error);
    const level = thrownDatabaseFailureLevel(error);
    return finish(level, message, { lineage });
  }
}
