import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { redactSecrets } from "@/lib/infinity/research/redaction";
import { assertPerformanceIntelligenceExecutable, loadPerformanceIntelligenceConfig } from "./config";
import { classifyPerformanceIntelligenceFailure } from "./failures";
import { TEST_VENTURE_CONTEXTS } from "./fixtures/test-venture-contexts";
import { processVenturePerformance } from "./process-venture";
import {
  buildPerformanceIntelligenceReport,
  findPerformanceIntelligenceRunByIdempotencyKey,
  insertPerformanceIntelligenceRun,
  persistPerformanceIntelligenceBuildPackage,
  updatePerformanceIntelligenceRun,
} from "./persistence";
import type {
  PerformanceIntelligenceBuildPackage,
  RunPerformanceIntelligenceInput,
  RunPerformanceIntelligenceOutput,
  SourceLineage,
} from "./types";

function createServiceSupabase(admin: AdminSupabaseClient) {
  return admin as ReturnType<typeof createClient<Database>>;
}

export async function runPerformanceIntelligenceCycle(
  admin: AdminSupabaseClient,
  input: RunPerformanceIntelligenceInput,
): Promise<RunPerformanceIntelligenceOutput> {
  const config = loadPerformanceIntelligenceConfig();
  assertPerformanceIntelligenceExecutable(config);

  const existing = await findPerformanceIntelligenceRunByIdempotencyKey(
    admin,
    input.organizationId,
    input.idempotencyKey,
  );
  if (existing?.status === "completed" && existing.engine_report) {
    return {
      ok: true,
      performanceIntelligenceRunId: existing.id,
      report: existing.engine_report as RunPerformanceIntelligenceOutput["report"],
      buildPackages: [],
    };
  }

  const simulationOnly = input.simulationOnly ?? config.simulationOnly;
  const liveMode = !simulationOnly;
  const correlationId = randomUUID();

  const runRow = await insertPerformanceIntelligenceRun(admin, {
    organizationId: input.organizationId,
    idempotencyKey: input.idempotencyKey,
    correlationId,
    simulationOnly,
    capabilityTest: input.capabilityTest ?? false,
  });

  const supabase = createServiceSupabase(admin);
  const effectiveConfig = {
    ...config,
    simulationOnly,
    enableMissionHandoff: input.enableMissionHandoff ?? config.enableMissionHandoff,
    executeMissions: input.executeMissions ?? config.executeMissions,
  };

  try {
    const contexts =
      input.ventureContexts ??
      (input.capabilityTest ? TEST_VENTURE_CONTEXTS : TEST_VENTURE_CONTEXTS.slice(0, 1));

    const results = [];
    const buildPackages: PerformanceIntelligenceBuildPackage[] = [];

    for (const context of contexts) {
      const lineage: SourceLineage = {
        performanceIntelligenceRunId: runRow.id,
        capabilityTest: input.capabilityTest ?? false,
        inputMode: simulationOnly ? "simulation" : "internal",
      };

      const result = await processVenturePerformance({
        admin,
        supabase,
        context,
        config: effectiveConfig,
        organizationId: input.organizationId,
        sourceLineage: lineage,
        liveMode,
      });

      await persistPerformanceIntelligenceBuildPackage(admin, {
        organizationId: input.organizationId,
        performanceIntelligenceRunId: runRow.id,
        buildPackage: { ...result.buildPackage, sourceLineage: lineage },
      });

      buildPackages.push(result.buildPackage);
      results.push(result);
    }

    const report = buildPerformanceIntelligenceReport({ results });

    await updatePerformanceIntelligenceRun(admin, runRow.id, {
      status: "completed",
      build_packages_created: buildPackages.length,
      engine_report: report as never,
      completed_at: new Date().toISOString(),
    });

    return { ok: true, performanceIntelligenceRunId: runRow.id, report, buildPackages };
  } catch (error) {
    await updatePerformanceIntelligenceRun(admin, runRow.id, {
      status: "failed",
      failure_classification: classifyPerformanceIntelligenceFailure(error),
      error_message: redactSecrets(error instanceof Error ? error.message : String(error)),
      failed_at: new Date().toISOString(),
    });
    throw error;
  }
}

export { processVenturePerformance };
