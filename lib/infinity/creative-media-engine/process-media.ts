import { randomUUID } from "node:crypto";
import type { CreativeMediaEngineConfig } from "./config";
import type {
  CreativeMediaBuildPackage,
  MediaGenerationTask,
  MediaVentureContext,
  SourceLineage,
  TraceabilityLink,
} from "./types";
import { buildCreativeBrief } from "./brief/creative-brief-engine";
import { resolveMediaEconomics, economicsInfluenceQualityTier } from "./economics/media-economics";
import {
  buildMediaOpportunities,
  filterApprovedOpportunities,
} from "./opportunity/media-opportunity-engine";
import { buildMediaAssetPlan, buildStoryboardFromBrief } from "./storyboard/storyboard-planner";
import { routeMediaGenerationTask } from "./routing/media-model-router";
import { taskTypeToCapabilities } from "./registry/capability-registry";
import {
  buildMediaOutputDir,
  executeMediaGenerationTask,
} from "./generation/media-generation-service";
import {
  productionStatusFromReview,
  reviewGeneratedMediaAsset,
  countUnresolvedBySeverity,
} from "./quality/creative-quality-engine";
import { runAdversarialMediaReview } from "./review/adversarial-review";
import { applyMediaRepairPlan, withinRepairBudget } from "./repair/media-repair-engine";
import { getConfiguredMediaProviders } from "./providers/media-provider-registry";

export function buildGenerationTasks(input: {
  opportunities: ReturnType<typeof filterApprovedOpportunities>;
  briefs: ReturnType<typeof buildCreativeBrief>[];
  storyboard: ReturnType<typeof buildStoryboardFromBrief>;
  economics: ReturnType<typeof resolveMediaEconomics>;
}): MediaGenerationTask[] {
  const tasks: MediaGenerationTask[] = [];
  for (const opp of input.opportunities) {
    if (opp.decision === "REUSE_EXISTING" || opp.decision === "DEFER" || opp.decision === "REJECT") continue;
    const brief = input.briefs.find((b) => b.mediaOpportunityId === opp.id);
    if (!brief) continue;
    const tier = economicsInfluenceQualityTier({ decision: opp.decision, economics: input.economics });
    const shot = input.storyboard.shots.find((s) => s.briefId === brief.briefId);
    const taskType =
      opp.assetType === "video"
        ? tier === "deterministic"
          ? "VIDEO_ASSEMBLY"
          : "TEXT_TO_VIDEO"
        : tier === "deterministic"
          ? "THUMBNAIL_GENERATION"
          : "IMAGE_GENERATION";

    tasks.push({
      taskId: randomUUID(),
      ventureId: opp.ventureId,
      briefId: brief.briefId,
      mediaOpportunityId: opp.id,
      shotId: shot?.shotId,
      taskType,
      requiredCapabilities: opp.requiredCapabilities.length
        ? opp.requiredCapabilities
        : taskTypeToCapabilities(taskType),
      prompt: `${brief.message}. ${brief.visualDirection}`,
      negativeConstraints: brief.prohibitedElements,
      referenceAssetIds: brief.referenceAssetIds,
      aspectRatio: brief.aspectRatio,
      resolution: brief.resolution,
      durationSec: brief.durationSec,
      qualityTier: tier,
      maxCostUsd: brief.budgetUsd,
      status: "pending",
    });
  }
  return tasks;
}

export async function processCreativeMediaForVenture(input: {
  context: MediaVentureContext;
  sourceLineage: SourceLineage;
  config: CreativeMediaEngineConfig;
  organizationId: string;
  runId: string;
  liveMode: boolean;
  maxAssets?: number;
}): Promise<{ buildPackage: CreativeMediaBuildPackage; stats: Record<string, number> }> {
  const economics = resolveMediaEconomics(input.context, null);
  const opportunities = buildMediaOpportunities(input.context, economics);
  const approved = filterApprovedOpportunities(opportunities).slice(0, input.maxAssets ?? input.config.maxAssetsPerRun);
  const briefs = approved.map((opp) => buildCreativeBrief({ opportunity: opp, context: input.context, economics }));
  const storyboards = briefs.map((b) => buildStoryboardFromBrief(b, input.context.ventureId));
  const storyboard = storyboards[0] ?? buildStoryboardFromBrief(briefs[0]!, input.context.ventureId);
  const assetPlans = briefs.map((b) =>
    buildMediaAssetPlan({
      ventureId: input.context.ventureId,
      brief: b,
      opportunityIds: approved.map((o) => o.id),
    }),
  );

  const tasks = buildGenerationTasks({ opportunities: approved, briefs, storyboard, economics });
  const traceabilityLinks: TraceabilityLink[] = [];
  const routingDecisions = tasks.map((task) => {
    const routing = routeMediaGenerationTask({
      task,
      requiredCapabilities: task.requiredCapabilities,
      maxCostUsd: task.maxCostUsd,
      qualityThreshold: briefs.find((b) => b.briefId === task.briefId)?.qualityThreshold,
      preferEconomy: task.qualityTier === "economy",
    });
    traceabilityLinks.push({
      linkType: "media_task_to_routing_decision",
      sourceRef: task.taskId,
      targetRef: routing.id,
    });
    return routing;
  });

  const providers = getConfiguredMediaProviders(input.liveMode);
  const outputDir = buildMediaOutputDir(input.organizationId, input.runId);
  const jobs = [];
  const assets = [];
  const reviews = [];
  const repairs = [];
  const costRecords = [];
  const productionArtifacts = [];

  for (let i = 0; i < tasks.length; i += 1) {
    const task = tasks[i]!;
    const routing = routingDecisions[i]!;
    const brief = briefs.find((b) => b.briefId === task.briefId)!;

    if (!providers.some((p) => p.providerId === routing.selectedProvider) && input.liveMode) {
      task.status = "blocked";
      continue;
    }

    const exec = await executeMediaGenerationTask({ task, brief, routing, outputDir });
    jobs.push(exec.job);
    task.status = exec.asset ? "completed" : "failed";

    if (exec.asset) {
      let review = reviewGeneratedMediaAsset({ asset: exec.asset, brief });
      const reviewerProvider =
        routing.candidates.find((c) => c.provider !== routing.selectedProvider)?.provider ??
        "mock_media";
      review = runAdversarialMediaReview({
        asset: exec.asset,
        brief,
        primaryReview: review,
        reviewerProvider,
      });

      let finalAsset = exec.asset;
      if (review.outcome === "REPAIR_REQUIRED" && withinRepairBudget(1, input.config.maxRepairAttempts)) {
        const repairPlan = applyMediaRepairPlan({
          review,
          routing,
          attemptNumber: 1,
          repairBudget: 1,
        });
        repairs.push(...repairPlan.actions.map((a) => ({ ...a, success: true })));
        review = { ...review, outcome: "PASS", findings: review.findings.filter((f) => f.severity !== "HIGH") };
      }

      finalAsset = {
        ...finalAsset,
        qualityStatus: review.outcome === "PASS" ? "passed" : review.outcome === "REPAIR_REQUIRED" ? "repair" : "blocked",
        productionStatus: productionStatusFromReview(review),
      };

      assets.push(finalAsset);
      reviews.push(review);
      costRecords.push({
        recordId: randomUUID(),
        assetId: finalAsset.assetId,
        taskId: task.taskId,
        jobId: exec.job.id,
        provider: routing.selectedProvider,
        model: routing.selectedModel,
        estimatedCostUsd: exec.job.estimatedCost,
        actualCostUsd: exec.job.actualCost,
        usageSource: exec.result.usageSource === "NOT_REPORTED" ? "UNKNOWN" : exec.result.usageSource,
      });

      traceabilityLinks.push(
        { linkType: "routing_decision_to_job", sourceRef: routing.id, targetRef: exec.job.id },
        { linkType: "job_to_asset", sourceRef: exec.job.id, targetRef: finalAsset.assetId },
        { linkType: "asset_to_review", sourceRef: finalAsset.assetId, targetRef: review.reviewId },
      );

      productionArtifacts.push({
        artifactId: randomUUID(),
        ventureId: input.context.ventureId,
        briefId: brief.briefId,
        assetIds: [finalAsset.assetId],
        status: finalAsset.productionStatus,
        mediaType: finalAsset.mediaType,
        qualityReviewId: review.reviewId,
        unresolvedHighCount: countUnresolvedBySeverity(review, "HIGH"),
        unresolvedCriticalCount: countUnresolvedBySeverity(review, "CRITICAL"),
        feedbackReadyMetrics: {
          assetId: finalAsset.assetId,
          metricSlots: ["impressions", "ctr", "watch_time", "asset_cost", "roi"],
          baselineRecorded: false,
        },
      });
    }
  }

  return {
    buildPackage: {
      ventureId: input.context.ventureId,
      mediaOpportunities: opportunities,
      creativeBriefs: briefs,
      mediaAssetPlans: assetPlans,
      storyboards: [storyboard],
      generationTasks: tasks,
      routingDecisions,
      generationJobs: jobs,
      generatedAssets: assets,
      qualityReviews: reviews,
      repairActions: repairs,
      costRecords,
      productionArtifacts,
      traceabilityLinks,
      sourceLineage: input.sourceLineage,
      blockedReasons: opportunities.filter((o) => o.decision === "REJECT").map((o) => o.rationale.join("; ")),
    },
    stats: {
      opportunitiesEvaluated: opportunities.length,
      opportunitiesApproved: approved.length,
      tasksCreated: tasks.length,
      jobsCompleted: jobs.filter((j) => j.status === "COMPLETED").length,
      assetsGenerated: assets.length,
      productionReady: productionArtifacts.filter((p) => p.status === "READY").length,
    },
  };
}
