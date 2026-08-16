import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { redactSecrets } from "@/lib/infinity/research/redaction";
import { assertCreativeMediaEngineExecutable, loadCreativeMediaEngineConfig } from "./config";
import { classifyCreativeMediaFailure, CreativeMediaEngineError } from "./failures";
import { TEST_MEDIA_VENTURES } from "./fixtures/test-media-fixtures";
import { processCreativeMediaForVenture } from "./process-media";
import {
  bootstrapDefaultCapabilityRegistry,
  clearProviderCapabilityRegistryForTests,
} from "./registry/capability-registry";
import { bootstrapMediaProviders } from "./providers/media-provider-registry";
import {
  buildCreativeMediaEngineReport,
  findCreativeMediaRunByIdempotencyKey,
  insertCreativeMediaRun,
  persistCreativeMediaBuildPackage,
  updateCreativeMediaRun,
} from "./persistence";
import type {
  CreativeMediaBuildPackage,
  RunCreativeMediaEngineInput,
  RunCreativeMediaEngineOutput,
  SourceLineage,
} from "./types";

export async function runCreativeMediaEngineCycle(
  admin: AdminSupabaseClient,
  input: RunCreativeMediaEngineInput,
): Promise<RunCreativeMediaEngineOutput> {
  const config = loadCreativeMediaEngineConfig();
  assertCreativeMediaEngineExecutable(config);

  const existing = await findCreativeMediaRunByIdempotencyKey(
    admin,
    input.organizationId,
    input.idempotencyKey,
  );
  if (existing?.status === "completed" && existing.engine_report) {
    return {
      ok: true,
      creativeMediaRunId: existing.id,
      report: existing.engine_report as RunCreativeMediaEngineOutput["report"],
      buildPackages: [],
    };
  }

  clearProviderCapabilityRegistryForTests();
  const simulationOnly = input.simulationOnly ?? config.simulationOnly;
  const liveMode = (input.enableLiveProviders ?? config.enableLiveProviders) && !simulationOnly;
  const adapters = await bootstrapMediaProviders(liveMode);
  bootstrapDefaultCapabilityRegistry(adapters);

  const correlationId = randomUUID();
  const runRow = await insertCreativeMediaRun(admin, {
    organizationId: input.organizationId,
    idempotencyKey: input.idempotencyKey,
    correlationId,
    simulationOnly,
    capabilityTest: input.capabilityTest ?? false,
  });

  try {
    const contexts =
      input.ventureContexts ??
      (input.capabilityTest ? TEST_MEDIA_VENTURES : TEST_MEDIA_VENTURES.slice(0, 1));

    const results = [];
    const buildPackages: CreativeMediaBuildPackage[] = [];

    for (const context of contexts) {
      const lineage: SourceLineage = {
        creativeMediaRunId: runRow.id,
        capabilityTest: input.capabilityTest ?? false,
        inputMode: simulationOnly ? "simulation" : liveMode ? "live" : "simulation",
        organicContentContractId: context.organicContentContractId,
      };

      const result = await processCreativeMediaForVenture({
        context,
        sourceLineage: lineage,
        config,
        organizationId: input.organizationId,
        runId: runRow.id,
        liveMode: !simulationOnly && (input.enableLiveProviders ?? config.enableLiveProviders),
        maxAssets: input.maxAssetsPerRun ?? 1,
      });

      const pkgId = await persistCreativeMediaBuildPackage(admin, {
        organizationId: input.organizationId,
        creativeMediaRunId: runRow.id,
        buildPackage: { ...result.buildPackage, sourceLineage: lineage },
      });

      buildPackages.push({ ...result.buildPackage, sourceLineage: { ...lineage, creativeMediaRunId: runRow.id } });
      results.push(result);
    }

    const report = buildCreativeMediaEngineReport({ results });
    report.totalActualCostUsd = buildPackages.reduce(
      (sum, pkg) => sum + pkg.costRecords.reduce((s, c) => s + (c.actualCostUsd ?? 0), 0),
      0,
    );

    await updateCreativeMediaRun(admin, runRow.id, {
      status: "completed",
      build_packages_created: buildPackages.length,
      engine_report: report as never,
      completed_at: new Date().toISOString(),
    });

    return { ok: true, creativeMediaRunId: runRow.id, report, buildPackages };
  } catch (error) {
    const classification = classifyCreativeMediaFailure(error);
    await updateCreativeMediaRun(admin, runRow.id, {
      status: "failed",
      failure_classification: classification,
      error_message: redactSecrets(error instanceof Error ? error.message : String(error)),
      failed_at: new Date().toISOString(),
    });
    throw error;
  }
}

export async function runCreativeMediaV1Test(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencySuffix = "test",
): Promise<RunCreativeMediaEngineOutput> {
  return runCreativeMediaEngineCycle(admin, {
    organizationId,
    idempotencyKey: `creative-media-v1-${idempotencySuffix}`,
    simulationOnly: true,
    capabilityTest: true,
    ventureContexts: TEST_MEDIA_VENTURES,
  });
}

export { processCreativeMediaForVenture };
