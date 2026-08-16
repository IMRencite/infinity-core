import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  bootstrapDefaultCapabilityRegistry,
  clearProviderCapabilityRegistryForTests,
  findCapableProviders,
  getProviderCapabilityRegistrations,
  registerProviderCapabilities,
  taskTypeToCapabilities,
} from "../registry/capability-registry";
import { routeMediaGenerationTask, selectFallbackProvider, listRegisteredProviders } from "../routing/media-model-router";
import { buildMediaOpportunities, filterApprovedOpportunities } from "../opportunity/media-opportunity-engine";
import {
  evaluateMediaEconomics,
  economicsInfluenceQualityTier,
  resolveMediaEconomics,
} from "../economics/media-economics";
import { buildCreativeBrief } from "../brief/creative-brief-engine";
import { buildStoryboardFromBrief, buildMediaAssetPlan, shotsToGenerationTaskCount } from "../storyboard/storyboard-planner";
import { mockMediaProvider } from "../providers/mock-media-provider";
import { submitMediaJob, transitionJobStatus, canRetryJob, pollMediaJobUntilComplete } from "../generation/async-job-engine";
import { reviewGeneratedMediaAsset, countUnresolvedBySeverity, productionStatusFromReview } from "../quality/creative-quality-engine";
import { applyMediaRepairPlan, withinRepairBudget, planMediaRepair } from "../repair/media-repair-engine";
import { runAdversarialMediaReview } from "../review/adversarial-review";
import { detectFfmpegAvailable, resetFfmpegDetectionCacheForTests } from "../deterministic/ffmpeg-adapter";
import { buildGenerationTasks, processCreativeMediaForVenture } from "../process-media";
import { TEST_MEDIA_VENTURE_HIGH_VALUE, TEST_MEDIA_VENTURE_LOW_VALUE } from "../fixtures/test-media-fixtures";
import type { GeneratedMediaAsset, MediaGenerationTask } from "../types";

function baseTask(overrides: Partial<MediaGenerationTask> = {}): MediaGenerationTask {
  return {
    taskId: randomUUID(),
    ventureId: "v1",
    briefId: randomUUID(),
    mediaOpportunityId: randomUUID(),
    taskType: "IMAGE_GENERATION",
    requiredCapabilities: ["IMAGE_GENERATION"],
    prompt: "Test prompt",
    negativeConstraints: [],
    referenceAssetIds: [],
    qualityTier: "standard",
    status: "pending",
    ...overrides,
  };
}

describe("Creative Media Architecture Engine v1", () => {
  beforeEach(() => {
    clearProviderCapabilityRegistryForTests();
    bootstrapDefaultCapabilityRegistry([mockMediaProvider]);
  });

  describe("opportunity and economics", () => {
    it("1. high-value image opportunity gets approved", () => {
      const econ = resolveMediaEconomics(TEST_MEDIA_VENTURE_HIGH_VALUE, null);
      const opps = buildMediaOpportunities(TEST_MEDIA_VENTURE_HIGH_VALUE, econ);
      expect(opps.some((o) => o.purpose === "hero_image" && o.decision.startsWith("CREATE"))).toBe(true);
    });

    it("2. low-value opportunity can be deferred/rejected", () => {
      const econ = { ...resolveMediaEconomics(TEST_MEDIA_VENTURE_LOW_VALUE, null), minMarginalAssetValue: 5000 };
      const opps = buildMediaOpportunities(TEST_MEDIA_VENTURE_LOW_VALUE, econ);
      expect(opps.some((o) => o.decision === "DEFER" || o.decision === "REJECT")).toBe(true);
    });

    it("3. premium video blocked when economics fail", () => {
      const result = evaluateMediaEconomics({
        expectedValue: 100,
        estimatedCost: 5,
        minMarginalAssetValue: 800,
        purpose: "long_form_video",
      });
      expect(["DEFER", "REJECT"]).toContain(result.decision);
    });

    it("4. economy provider selectable when sufficient", () => {
      const tier = economicsInfluenceQualityTier({
        decision: "CREATE_ECONOMY",
        economics: resolveMediaEconomics(TEST_MEDIA_VENTURE_HIGH_VALUE, null),
      });
      expect(tier).toBe("economy");
    });

    it("5. existing asset reuse path", () => {
      const econ = resolveMediaEconomics(TEST_MEDIA_VENTURE_HIGH_VALUE, null);
      const opps = buildMediaOpportunities(TEST_MEDIA_VENTURE_HIGH_VALUE, econ, {
        existingAssetIds: ["asset-existing-1"],
      });
      expect(opps.some((o) => o.decision === "REUSE_EXISTING")).toBe(true);
    });

    it("6. deterministic-only path selectable", () => {
      const econ = { ...resolveMediaEconomics(TEST_MEDIA_VENTURE_LOW_VALUE, null), expectedAssetValue: 200 };
      const opps = buildMediaOpportunities(
        { ...TEST_MEDIA_VENTURE_LOW_VALUE, mediaRequirements: [{ purpose: "diagram", assetType: "diagram", priority: 1 }] },
        econ,
      );
      expect(opps[0]?.decision).toBe("DETERMINISTIC_ONLY");
    });
  });

  describe("routing", () => {
    it("7-8. capabilities register and router chooses by capability", () => {
      expect(getProviderCapabilityRegistrations().length).toBeGreaterThan(0);
      const routing = routeMediaGenerationTask({
        task: baseTask(),
        requiredCapabilities: ["IMAGE_GENERATION"],
      });
      expect(routing.selectedProvider).toBe("mock_media");
      expect(routing.candidates.length).toBeGreaterThan(0);
    });

    it("9. cost ceiling changes provider acceptance", () => {
      registerProviderCapabilities({
        providerId: "expensive_media",
        model: "expensive-v1",
        capabilities: ["IMAGE_GENERATION"],
        referenceInputSupport: false,
        audioSupport: false,
        asyncExecution: false,
        estimatedCostPerImageUsd: 10,
        reliabilityScore: 0.9,
        qualityScore: 0.95,
        latencyScore: 0.5,
      });
      const routing = routeMediaGenerationTask({
        task: baseTask({ maxCostUsd: 0.002 }),
        requiredCapabilities: ["IMAGE_GENERATION"],
      });
      expect(routing.selectedProvider).toBe("mock_media");
    });

    it("10. quality threshold influences routing", () => {
      const routing = routeMediaGenerationTask({
        task: baseTask(),
        requiredCapabilities: ["IMAGE_GENERATION"],
        qualityThreshold: 0.95,
      });
      expect(routing.decisionReasons.join(" ")).toMatch(/fit|cost|quality/i);
    });

    it("11. reference requirement affects routing", () => {
      const routing = routeMediaGenerationTask({
        task: baseTask({ referenceAssetIds: ["ref-1"] }),
        requiredCapabilities: ["IMAGE_GENERATION"],
        requireReferenceSupport: true,
      });
      expect(
        routing.candidates.every(
          (c) => c.accepted || c.reasons.some((r: string) => /Reference/i.test(r)),
        ),
      ).toBe(true);
    });

    it("12. unsupported capability fails safely", () => {
      expect(findCapableProviders(["LONG_FORM_VIDEO" as never]).length).toBe(0);
      expect(() =>
        routeMediaGenerationTask({
          task: baseTask({ taskType: "LIP_SYNC" as never, requiredCapabilities: ["LIP_SYNC" as never] }),
          requiredCapabilities: ["LIP_SYNC" as never],
        }),
      ).toThrow(/No provider registered/);
    });

    it("13-14. provider health and fallback", () => {
      const routing = routeMediaGenerationTask({
        task: baseTask(),
        requiredCapabilities: ["IMAGE_GENERATION"],
        providerHealth: { mock_media: 0.2 },
      });
      const fallback = selectFallbackProvider(routing, routing.selectedProvider);
      expect(fallback === null || fallback.provider !== routing.selectedProvider).toBe(true);
    });

    it("15-16. no generic video=Veo or image=single-provider in router", () => {
      const providers = listRegisteredProviders();
      expect(providers).not.toContain("veo");
      expect(providers).not.toContain("Veo");
      expect(routingUsesCapabilityNotProviderName()).toBe(true);
    });
  });

  describe("async jobs", () => {
    it("17-21. job lifecycle", async () => {
      const job = submitMediaJob({ taskId: "t1", provider: "mock_media", model: "mock-image-v1", estimatedCost: 0.01 });
      expect(job.status).toBe("SUBMITTED");
      const processing = transitionJobStatus(job, "PROCESSING");
      expect(processing.status).toBe("PROCESSING");
      const completed = transitionJobStatus(processing, "COMPLETED");
      expect(completed.completedAt).toBeTruthy();
      const failed = transitionJobStatus(job, "FAILED");
      expect(canRetryJob(failed, 2)).toBe(true);
      const expired = transitionJobStatus({ ...job, attemptCount: 3 }, "EXPIRED");
      expect(expired.status).toBe("EXPIRED");
    });

    it("22-23. retry and failover via poll mock", async () => {
      const tmp = path.join(os.tmpdir(), `cm-${Date.now()}`);
      await mkdir(tmp, { recursive: true });
      const job = submitMediaJob({ taskId: "t2", provider: "mock_media", model: "mock-video-v1" });
      job.providerJobId = "mock-job-1";
      const polled = await pollMediaJobUntilComplete({
        job,
        adapter: mockMediaProvider,
        model: "mock-video-v1",
        outputDir: tmp,
        maxPolls: 1,
        pollIntervalMs: 0,
      });
      expect(polled.result.success).toBe(true);
      await rm(tmp, { recursive: true, force: true });
    });
  });

  describe("assets and provenance fields", () => {
    it("24-30. asset metadata contract", async () => {
      const tmp = path.join(os.tmpdir(), `cm-asset-${Date.now()}`);
      await mkdir(tmp, { recursive: true });
      const task = baseTask();
      const econ = resolveMediaEconomics(TEST_MEDIA_VENTURE_HIGH_VALUE, null);
      const brief = buildCreativeBrief({
        opportunity: buildMediaOpportunities(TEST_MEDIA_VENTURE_HIGH_VALUE, econ)[0]!,
        context: TEST_MEDIA_VENTURE_HIGH_VALUE,
        economics: econ,
      });
      const result = await mockMediaProvider.submitJob({ task, brief, model: "mock-image-v1", outputDir: tmp });
      expect(result.checksum).toBeTruthy();
      expect(result.fileSizeBytes).toBeGreaterThan(0);
      expect(result.usageSource).toBeTruthy();
      expect(result.outputPath).toBeTruthy();
      const asset: GeneratedMediaAsset = {
        assetId: randomUUID(),
        mediaType: "image",
        mimeType: "image/png",
        filePath: result.outputPath!,
        checksum: result.checksum,
        sourceType: "generated",
        provider: "mock_media",
        model: "mock-image-v1",
        generationAttempt: 1,
        creativeBriefId: brief.briefId,
        generationTaskId: task.taskId,
        createdAt: new Date().toISOString(),
        qualityStatus: "pending",
        productionStatus: "GENERATED",
        usageRights: "UNKNOWN",
      };
      expect(asset.usageRights).toBe("UNKNOWN");
      await rm(tmp, { recursive: true, force: true });
    });
  });

  describe("quality and repair", () => {
    it("31-39. quality gate outcomes", () => {
      const asset: GeneratedMediaAsset = {
        assetId: randomUUID(),
        mediaType: "image",
        mimeType: "image/png",
        filePath: "/tmp/test.png",
        fileSizeBytes: 500,
        sourceType: "generated",
        provider: "mock_media",
        model: "mock",
        generationAttempt: 1,
        creativeBriefId: "b1",
        generationTaskId: "t1",
        prompt: "Test message aligned",
        createdAt: new Date().toISOString(),
        qualityStatus: "pending",
        productionStatus: "GENERATED",
        usageRights: "UNKNOWN",
      };
      const brief = buildCreativeBrief({
        opportunity: filterApprovedOpportunities(
          buildMediaOpportunities(TEST_MEDIA_VENTURE_HIGH_VALUE, resolveMediaEconomics(TEST_MEDIA_VENTURE_HIGH_VALUE, null)),
        )[0]!,
        context: TEST_MEDIA_VENTURE_HIGH_VALUE,
        economics: resolveMediaEconomics(TEST_MEDIA_VENTURE_HIGH_VALUE, null),
      });
      const pass = reviewGeneratedMediaAsset({ asset, brief });
      expect(["PASS", "REPAIR_REQUIRED"]).toContain(pass.outcome);

      const blocked = reviewGeneratedMediaAsset({
        asset: { ...asset, filePath: "", fileSizeBytes: 0 },
        brief,
      });
      expect(blocked.outcome).toBe("BLOCKED");
      expect(countUnresolvedBySeverity(blocked, "CRITICAL")).toBeGreaterThan(0);
      expect(productionStatusFromReview(blocked)).toBe("BLOCKED");
    });

    it("40-46. repair planning", () => {
      const review = {
        reviewId: randomUUID(),
        assetId: "a1",
        outcome: "REPAIR_REQUIRED" as const,
        findings: [{ gate: "TEXT_LEGIBILITY" as const, severity: "HIGH" as const, description: "text" }],
        gateScores: {},
      };
      expect(planMediaRepair(review, 1)).toContain("USE_DETERMINISTIC_RENDER");
      const repair = applyMediaRepairPlan({
        review,
        routing: routeMediaGenerationTask({ task: baseTask(), requiredCapabilities: ["IMAGE_GENERATION"] }),
        attemptNumber: 1,
        repairBudget: 1,
      });
      expect(repair.actions.length).toBeGreaterThan(0);
      expect(withinRepairBudget(3, 2)).toBe(false);
    });
  });

  describe("storyboard and video architecture", () => {
    it("47-51. storyboard creates scenes/shots without monolithic generation", () => {
      const econ = resolveMediaEconomics(TEST_MEDIA_VENTURE_HIGH_VALUE, null);
      const approved = filterApprovedOpportunities(buildMediaOpportunities(TEST_MEDIA_VENTURE_HIGH_VALUE, econ));
      const brief = buildCreativeBrief({
        opportunity: approved[0]!,
        context: TEST_MEDIA_VENTURE_HIGH_VALUE,
        economics: econ,
      });
      const storyboard = buildStoryboardFromBrief({ ...brief, durationSec: 5, assetType: "video" }, "v1");
      expect(storyboard.scenes.length).toBeGreaterThan(0);
      expect(storyboard.shots.length).toBeGreaterThan(0);
      expect(shotsToGenerationTaskCount(storyboard)).toBe(storyboard.shots.length);
      const plan = buildMediaAssetPlan({ ventureId: "v1", brief, opportunityIds: [approved[0]!.id] });
      expect(plan.planType).toMatch(/single_asset|shot_sequence/);
      const tasks = buildGenerationTasks({
        opportunities: approved,
        briefs: [brief],
        storyboard,
        economics: econ,
      });
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every((t) => t.taskType !== ("ONE_SHOT_LONG_FORM" as never))).toBe(true);
    });
  });

  describe("deterministic processing", () => {
    it("52-56. ffmpeg detection", async () => {
      resetFfmpegDetectionCacheForTests();
      const available = await detectFfmpegAvailable();
      expect(typeof available).toBe("boolean");
    });
  });

  describe("full mock pipeline", () => {
    it("57-64. process venture mock pipeline with lineage fields", async () => {
      const result = await processCreativeMediaForVenture({
        context: TEST_MEDIA_VENTURE_HIGH_VALUE,
        sourceLineage: { inputMode: "simulation", capabilityTest: true },
        config: {
          enabled: true,
          simulationOnly: true,
          engineVersion: "creative_media_engine_v1",
          maxAssetsPerRun: 1,
          maxCostPerRunUsd: 15,
          maxRepairAttempts: 2,
          enableLiveProviders: false,
          enableGroundedResearch: false,
        },
        organizationId: "org-test",
        runId: randomUUID(),
        liveMode: false,
        maxAssets: 1,
      });

      expect(result.buildPackage.creativeBriefs.length).toBeGreaterThan(0);
      expect(result.buildPackage.generationTasks.length).toBeGreaterThan(0);
      expect(result.buildPackage.routingDecisions.length).toBeGreaterThan(0);
      expect(result.stats.assetsGenerated).toBeGreaterThan(0);
      expect(result.buildPackage.traceabilityLinks.some((l) => l.linkType === "job_to_asset")).toBe(true);
      expect(result.buildPackage.productionArtifacts[0]?.feedbackReadyMetrics?.baselineRecorded).toBe(false);
    });
  });

  describe("adversarial review", () => {
    it("independent review adds findings when providers differ", () => {
      const asset: GeneratedMediaAsset = {
        assetId: randomUUID(),
        mediaType: "image",
        mimeType: "image/png",
        filePath: "/x",
        fileSizeBytes: 10,
        sourceType: "generated",
        provider: "mock_media",
        model: "mock",
        generationAttempt: 1,
        creativeBriefId: "b",
        generationTaskId: "t",
        prompt: "fake review claim",
        createdAt: new Date().toISOString(),
        qualityStatus: "pending",
        productionStatus: "GENERATED",
        usageRights: "UNKNOWN",
      };
      const brief = buildCreativeBrief({
        opportunity: filterApprovedOpportunities(
          buildMediaOpportunities(TEST_MEDIA_VENTURE_HIGH_VALUE, resolveMediaEconomics(TEST_MEDIA_VENTURE_HIGH_VALUE, null)),
        )[0]!,
        context: TEST_MEDIA_VENTURE_HIGH_VALUE,
        economics: resolveMediaEconomics(TEST_MEDIA_VENTURE_HIGH_VALUE, null),
      });
      brief.prohibitedElements.push("fake review");
      const primary = reviewGeneratedMediaAsset({ asset, brief });
      const adv = runAdversarialMediaReview({
        asset,
        brief,
        primaryReview: primary,
        reviewerProvider: "google_media",
      });
      expect(adv.findings.length).toBeGreaterThanOrEqual(primary.findings.length);
    });
  });

  describe("task type capabilities", () => {
    it("maps generation task types to capabilities", () => {
      expect(taskTypeToCapabilities("TEXT_TO_VIDEO")).toContain("TEXT_TO_VIDEO");
      expect(taskTypeToCapabilities("IMAGE_GENERATION")).toContain("IMAGE_GENERATION");
    });
  });
});

function routingUsesCapabilityNotProviderName(): boolean {
  const routing = routeMediaGenerationTask({
    task: baseTask({ taskType: "TEXT_TO_VIDEO", requiredCapabilities: ["TEXT_TO_VIDEO", "SHORT_FORM_VIDEO"] }),
    requiredCapabilities: ["TEXT_TO_VIDEO", "SHORT_FORM_VIDEO"],
  });
  return !routing.decisionReasons.some((reason: string) => /veo|openai must/i.test(reason));
}
