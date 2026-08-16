import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { PortfolioSummary, PortfolioVentureRow } from "./portfolio-types";
import { buildPortfolioSummary } from "./portfolio-metrics";
import {
  classifyVentureForPortfolio,
  isVentureActive,
  isVentureBuilt,
  ventureDisplayName,
  type VentureAssemblyRow,
} from "./venture-classification";
import {
  deriveVentureProfit,
  extractCostMetricAggregates,
  extractVentureRevenue,
  sumCostRows,
  type MetricAggregateRow,
  type PerformanceRunRow,
} from "./portfolio-financials";

type RawPortfolioBatch = {
  ventures: VentureAssemblyRow[];
  blueprints: Array<{ id: string; simulation_only: boolean }>;
  performanceRuns: PerformanceRunRow[];
  aggregates: MetricAggregateRow[];
  pabRuns: Array<
    Record<string, unknown> & {
      id: string;
      company_builder_blueprint_id?: string | null;
      correlation_id?: string | null;
    }
  >;
  providerCalls: Array<Record<string, unknown> & { id: string; product_asset_builder_run_id: string }>;
  externalActions: Array<
    Record<string, unknown> & { id: string; venture_assembly_id?: string | null; mission_id?: string | null }
  >;
};

export async function loadPortfolioBatch(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<RawPortfolioBatch> {
  const [
    venturesRes,
    blueprintsRes,
    runsRes,
    aggregatesRes,
    pabRunsRes,
    providerCallsRes,
    externalActionsRes,
  ] = await Promise.all([
    admin
      .from("venture_assemblies")
      .select("id, mission_id, status, venture_blueprint_id, identity_package, manifest, idempotency_key")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(100),
    admin
      .from("company_builder_blueprints")
      .select("id, simulation_only")
      .eq("organization_id", organizationId)
      .limit(200),
    admin
      .from("performance_intelligence_runs")
      .select("id, simulation_only, capability_test")
      .eq("organization_id", organizationId)
      .limit(200),
    admin
      .from("performance_metric_aggregates")
      .select("id, venture_id, metric, value, performance_intelligence_run_id")
      .eq("organization_id", organizationId)
      .limit(500),
    admin
      .from("product_asset_builder_runs")
      .select("id, company_builder_blueprint_id, correlation_id, cumulative_cost_usd")
      .eq("organization_id", organizationId)
      .limit(300),
    admin
      .from("product_asset_provider_calls")
      .select("id, product_asset_builder_run_id, estimated_cost_usd")
      .eq("organization_id", organizationId)
      .limit(500),
    admin
      .from("external_actions")
      .select("id, mission_id, venture_assembly_id, estimated_cost, execution_mode")
      .eq("organization_id", organizationId)
      .limit(200),
  ]);

  return {
    ventures: (venturesRes.data ?? []) as VentureAssemblyRow[],
    blueprints: (blueprintsRes.data ?? []) as Array<{ id: string; simulation_only: boolean }>,
    performanceRuns: (runsRes.data ?? []) as PerformanceRunRow[],
    aggregates: (aggregatesRes.data ?? []) as MetricAggregateRow[],
    pabRuns: (pabRunsRes.data ?? []) as RawPortfolioBatch["pabRuns"],
    providerCalls: (providerCallsRes.data ?? []) as RawPortfolioBatch["providerCalls"],
    externalActions: (externalActionsRes.data ?? []) as RawPortfolioBatch["externalActions"],
  };
}

function simulationRunIds(runs: PerformanceRunRow[]): Set<string> {
  return new Set(runs.filter((r) => r.simulation_only || r.capability_test).map((r) => r.id));
}

function pabRunsForVenture(
  pabRuns: RawPortfolioBatch["pabRuns"],
  venture: VentureAssemblyRow,
): RawPortfolioBatch["pabRuns"] {
  const correlationIds = new Set([venture.id, venture.mission_id, venture.venture_blueprint_id].filter(Boolean));
  return pabRuns.filter(
    (run) =>
      (run.company_builder_blueprint_id && run.company_builder_blueprint_id === venture.venture_blueprint_id) ||
      (run.correlation_id && correlationIds.has(run.correlation_id)),
  );
}

function externalActionsForVenture(
  actions: RawPortfolioBatch["externalActions"],
  venture: VentureAssemblyRow,
): RawPortfolioBatch["externalActions"] {
  return actions.filter(
    (row) =>
      row.venture_assembly_id === venture.id ||
      row.mission_id === venture.mission_id,
  );
}

export function computePortfolioFromBatch(batch: RawPortfolioBatch): PortfolioSummary {
  const simRunIds = simulationRunIds(batch.performanceRuns);
  const blueprintSim = new Map(batch.blueprints.map((b) => [b.id, b.simulation_only]));

  const ventures: PortfolioVentureRow[] = batch.ventures.map((venture) => {
    const correlationIds = [venture.id, venture.mission_id].filter(Boolean);
    const blueprintSimulationOnly = venture.venture_blueprint_id
      ? blueprintSim.get(venture.venture_blueprint_id) === true
      : false;

    const correlatedRuns = batch.performanceRuns.filter((run) =>
      batch.aggregates.some(
        (a) => a.performance_intelligence_run_id === run.id && a.venture_id && correlationIds.includes(a.venture_id),
      ),
    );
    const allRunsSimulationOrTest =
      correlatedRuns.length > 0 && correlatedRuns.every((r) => r.simulation_only || r.capability_test);

    const classification = classifyVentureForPortfolio(venture, {
      blueprintSimulationOnly,
      allRunsSimulationOrTest,
    });

    const revenue = extractVentureRevenue({
      correlationIds,
      aggregates: batch.aggregates,
      simulationRunIds: simRunIds,
    });

    const venturePabRuns = pabRunsForVenture(batch.pabRuns, venture);
    const pabRunIds = new Set(venturePabRuns.map((r) => r.id));
    const costRows = [
      ...venturePabRuns.map((row) => ({ id: row.id, row })),
      ...batch.providerCalls
        .filter((call) => pabRunIds.has(call.product_asset_builder_run_id))
        .map((row) => ({ id: row.id, row })),
      ...externalActionsForVenture(batch.externalActions, venture)
        .filter((row) => String(row.execution_mode ?? "").toLowerCase() !== "mock")
        .map((row) => ({ id: row.id, row })),
    ];

    const summedCosts = sumCostRows(costRows);
    const aggregateCosts = extractCostMetricAggregates({
      correlationIds,
      aggregates: batch.aggregates,
      simulationRunIds: simRunIds,
    });

    let knownCostsUsd: number | null = summedCosts.total;
    let costDataQuality = summedCosts.quality;
    const costRecordIds = [...summedCosts.ids];

    if (aggregateCosts.costUsd != null) {
      knownCostsUsd =
        knownCostsUsd != null ? knownCostsUsd + aggregateCosts.costUsd : aggregateCosts.costUsd;
      costRecordIds.push(...aggregateCosts.ids);
      costDataQuality =
        costDataQuality === "INSUFFICIENT_DATA"
          ? aggregateCosts.quality
          : costDataQuality === "COMPLETE" && aggregateCosts.quality === "COMPLETE"
            ? "COMPLETE"
            : "PARTIAL";
    }

    const profit = deriveVentureProfit({
      revenueUsd: revenue.revenueUsd,
      revenueQuality: revenue.quality,
      knownCostsUsd,
      costQuality: costDataQuality,
    });

    return {
      ventureAssemblyId: venture.id,
      ventureName: ventureDisplayName(venture),
      missionId: venture.mission_id,
      status: venture.status,
      ventureBlueprintId: venture.venture_blueprint_id,
      revenueUsd: revenue.revenueUsd,
      knownCostsUsd,
      profitUsd: profit.profitUsd,
      profitDataQuality: profit.quality,
      revenueDataQuality: revenue.quality,
      costDataQuality,
      rankingMetric: null,
      rankingValue: null,
      isBuilt: isVentureBuilt(venture, Boolean(venture.venture_blueprint_id)),
      isActive: isVentureActive(venture.status),
      excludedFromPortfolio: !classification.includeInPortfolio,
      exclusionReason: classification.exclusionReason,
      traceability: {
        ...revenue.trace,
        costRecordIds,
      },
    };
  });

  return buildPortfolioSummary(ventures);
}

export async function loadPortfolioSummary(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<PortfolioSummary> {
  const batch = await loadPortfolioBatch(admin, organizationId);
  return computePortfolioFromBatch(batch);
}

export { parseUsdFromRow } from "./portfolio-financials";
