import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { runOpportunityScannerCycle } from "@/lib/infinity/opportunity-scanner/run";
import type { RunOpportunityScannerInput, RunOpportunityScannerOutput } from "@/lib/infinity/opportunity-scanner/types";
import type { CycleBudgetGovernor } from "./budget-governor";

export type VentureRadarResult =
  | { ok: true; output: Extract<RunOpportunityScannerOutput, { ok: true }> }
  | {
      ok: false;
      output: Extract<RunOpportunityScannerOutput, { ok: false }>;
      durationMs: number;
    };

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function runFavc1VentureRadar(
  admin: AdminSupabaseClient,
  input: RunOpportunityScannerInput,
  budget: CycleBudgetGovernor,
): Promise<VentureRadarResult> {
  const startedAt = Date.now();
  const timeoutMs = Number(process.env.FAVC1_VENTURE_RADAR_TIMEOUT_MS ?? 420_000);

  console.log("[FAVC1] VENTURE RADAR START", {
    organizationId: input.organizationId,
    idempotencyKey: input.idempotencyKey,
    maxResearchCalls: input.maxResearchCalls ?? null,
    timeoutMs,
  });

  let output: RunOpportunityScannerOutput;
  try {
    output = await withTimeout(
      runOpportunityScannerCycle(admin, input),
      timeoutMs,
      "Venture Radar",
    );
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    console.error("[FAVC1] VENTURE RADAR FAILED", {
      classification: "timeout",
      errorCode: "venture_radar_timeout",
      message,
      durationMs,
    });
    return {
      ok: false,
      durationMs,
      output: {
        ok: false,
        discoveryRunId: "unknown",
        status: "failed",
        failureClassification: "timeout",
        message,
      },
    };
  }

  const durationMs = Date.now() - startedAt;

  if (!output.ok) {
    if (output.discoveryRunId && output.discoveryRunId !== "unknown") {
      const { data: discoveryRow } = await admin
        .from("opportunity_discovery_runs")
        .select("estimated_cost_usd, research_call_count")
        .eq("id", output.discoveryRunId)
        .maybeSingle();
      if (discoveryRow?.estimated_cost_usd != null) {
        budget.record({
          stage: "opportunity_scanner",
          provider: "gemini",
          costUsd: Number(discoveryRow.estimated_cost_usd),
          known: true,
          note: `partial researchCalls=${discoveryRow.research_call_count ?? 0}`,
        });
      }
    }

    console.error("[FAVC1] VENTURE RADAR FAILED", {
      classification: output.failureClassification,
      errorCode: output.failureClassification,
      message: output.message,
      durationMs,
      discoveryRunId: output.discoveryRunId,
    });
    return { ok: false, output, durationMs };
  }

  const cost = output.report.costSummary.estimatedCostUsd;
  budget.record({
    stage: "opportunity_scanner",
    provider: "gemini",
    costUsd: cost,
    known: cost != null,
    note: `researchCalls=${output.report.costSummary.researchCallCount}`,
  });

  console.log("[FAVC1] VENTURE RADAR COMPLETE", {
    candidateCount: output.candidates.length,
    researchCalls: output.report.costSummary.researchCallCount,
    durationMs,
    discoveryRunId: output.discoveryRunId,
  });

  return { ok: true, output };
}
