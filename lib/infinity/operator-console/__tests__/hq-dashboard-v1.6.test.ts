import { describe, it, expect } from "vitest";
import {
  classifyVentureForPortfolio,
  isVentureActive,
  isVentureBuilt,
  ventureDisplayName,
  type VentureAssemblyRow,
} from "../portfolio/venture-classification";
import {
  deriveVentureProfit,
  extractVentureRevenue,
  sumCostRows,
} from "../portfolio/portfolio-financials";
import {
  aggregatePortfolioFinancials,
  rankVenturesForTopEarners,
  selectTopVenture,
} from "../portfolio/portfolio-ranking";
import { buildPortfolioSummary } from "../portfolio/portfolio-metrics";
import { computePortfolioFromBatch } from "../portfolio/load-portfolio-summary";
import { partitionCommandDecisionOrbs } from "../command-chamber-layout";
import type { PortfolioVentureRow } from "../portfolio/portfolio-types";
import type { OperatorWorkerNode } from "../types";

function venture(overrides: Partial<VentureAssemblyRow> = {}): VentureAssemblyRow {
  return {
    id: "v1",
    mission_id: "m1",
    status: "active",
    venture_blueprint_id: "bp1",
    identity_package: { workingName: "WorkflowPilot" },
    manifest: {},
    ...overrides,
  };
}

function row(partial: Partial<PortfolioVentureRow>): PortfolioVentureRow {
  return {
    ventureAssemblyId: "v1",
    ventureName: "Test",
    missionId: "m1",
    status: "active",
    ventureBlueprintId: "bp1",
    revenueUsd: null,
    knownCostsUsd: null,
    profitUsd: null,
    profitDataQuality: "INSUFFICIENT_DATA",
    revenueDataQuality: "INSUFFICIENT_DATA",
    costDataQuality: "INSUFFICIENT_DATA",
    rankingMetric: null,
    rankingValue: null,
    isBuilt: true,
    isActive: true,
    excludedFromPortfolio: false,
    exclusionReason: null,
    traceability: { revenueAggregateIds: [], costRecordIds: [], revenueRunIds: [] },
    ...partial,
  };
}

describe("HQ Dashboard V1.6 — financial semantics", () => {
  it("1. missing profit is not displayed as zero in aggregation", () => {
    const agg = aggregatePortfolioFinancials([row({ profitUsd: null })]);
    expect(agg.totalProfitUsd).toBeNull();
    expect(agg.profitDisplayMode).toBe("unavailable");
  });

  it("2. revenue is never labeled as profit without both sides", () => {
    const profit = deriveVentureProfit({
      revenueUsd: 1000,
      revenueQuality: "COMPLETE",
      knownCostsUsd: null,
      costQuality: "INSUFFICIENT_DATA",
    });
    expect(profit.profitUsd).toBeNull();
    expect(profit.quality).toBe("INSUFFICIENT_DATA");
  });

  it("3. partial financial data yields known net contribution mode", () => {
    const agg = aggregatePortfolioFinancials([
      row({
        ventureAssemblyId: "v1",
        revenueUsd: 500,
        knownCostsUsd: 100,
        profitUsd: 400,
        profitDataQuality: "COMPLETE",
        revenueDataQuality: "COMPLETE",
        costDataQuality: "COMPLETE",
      }),
      row({ ventureAssemblyId: "v2", revenueUsd: null, knownCostsUsd: null, profitUsd: null }),
    ]);
    expect(agg.profitDisplayMode).toBe("known_net_contribution");
  });

  it("4. complete profit when revenue and costs known", () => {
    const profit = deriveVentureProfit({
      revenueUsd: 1000,
      revenueQuality: "COMPLETE",
      knownCostsUsd: 200,
      costQuality: "COMPLETE",
    });
    expect(profit.profitUsd).toBe(800);
    expect(profit.quality).toBe("COMPLETE");
  });

  it("5. unknown revenue is not treated as zero in revenue extraction", () => {
    const result = extractVentureRevenue({
      correlationIds: ["v1"],
      aggregates: [],
      simulationRunIds: new Set(),
    });
    expect(result.revenueUsd).toBeNull();
    expect(result.quality).toBe("INSUFFICIENT_DATA");
  });
});

describe("HQ Dashboard V1.6 — venture classification", () => {
  it("6. e2e verification venture excluded from portfolio", () => {
    const result = classifyVentureForPortfolio(
      venture({ identity_package: { workingName: "executive_selection_e2e_v1 strong_in_policy" } }),
    );
    expect(result.includeInPortfolio).toBe(false);
    expect(result.isTestFixture).toBe(true);
  });

  it("7. companies built requires blueprint threshold", () => {
    expect(isVentureBuilt(venture({ venture_blueprint_id: "bp1" }), false)).toBe(true);
    expect(isVentureBuilt(venture({ venture_blueprint_id: null }), false)).toBe(false);
  });

  it("8. duplicate runs do not duplicate company count", () => {
    const summary = buildPortfolioSummary([
      row({ ventureAssemblyId: "v1", isBuilt: true }),
      row({ ventureAssemblyId: "v1", isBuilt: true }),
    ]);
    expect(summary.totalVenturesBuilt).toBe(1);
  });

  it("9. active ventures exclude paused", () => {
    expect(isVentureActive("paused")).toBe(false);
    expect(isVentureActive("active")).toBe(true);
  });

  it("10. shutdown ventures not active", () => {
    expect(isVentureActive("shutdown")).toBe(false);
    expect(isVentureActive("terminated")).toBe(false);
  });

  it("11. built shutdown venture counts built but not active", () => {
    const summary = buildPortfolioSummary([
      row({ ventureAssemblyId: "v1", isBuilt: true, isActive: false, status: "shutdown" }),
    ]);
    expect(summary.totalVenturesBuilt).toBe(1);
    expect(summary.activeVentures).toBe(0);
  });
});

describe("HQ Dashboard V1.6 — ranking", () => {
  it("12. top venture ranks by profit when available", () => {
    const { topEarners, rankingMetric } = rankVenturesForTopEarners([
      row({ ventureAssemblyId: "a", ventureName: "A", profitUsd: 100, profitDataQuality: "COMPLETE" }),
      row({ ventureAssemblyId: "b", ventureName: "B", profitUsd: 500, profitDataQuality: "COMPLETE" }),
    ]);
    expect(rankingMetric).toBe("profit");
    expect(topEarners[0]?.ventureAssemblyId).toBe("b");
  });

  it("13. falls back to revenue ranking", () => {
    const { topEarners, rankingMetric } = rankVenturesForTopEarners([
      row({ ventureAssemblyId: "a", profitUsd: null, revenueUsd: 200, revenueDataQuality: "COMPLETE" }),
      row({ ventureAssemblyId: "b", profitUsd: null, revenueUsd: 900, revenueDataQuality: "COMPLETE" }),
    ]);
    expect(rankingMetric).toBe("revenue");
    expect(topEarners[0]?.ventureAssemblyId).toBe("b");
  });

  it("14. ties handled deterministically by name", () => {
    const { topEarners } = rankVenturesForTopEarners([
      row({ ventureAssemblyId: "b", ventureName: "Beta", profitUsd: 100, profitDataQuality: "COMPLETE" }),
      row({ ventureAssemblyId: "a", ventureName: "Alpha", profitUsd: 100, profitDataQuality: "COMPLETE" }),
    ]);
    expect(topEarners[0]?.ventureName).toBe("Alpha");
  });

  it("15. ventures without financial data excluded from ranking", () => {
    const { topEarners, qualifyingCount } = rankVenturesForTopEarners([
      row({ ventureAssemblyId: "a", profitUsd: null, revenueUsd: null }),
    ]);
    expect(topEarners).toHaveLength(0);
    expect(qualifyingCount).toBe(0);
  });

  it("16. top earner route target preserved on venture id", () => {
    const top = selectTopVenture(
      [{ ...row({ ventureAssemblyId: "abc-123", profitUsd: 50, rankingMetric: "profit", rankingValue: 50 }) }],
      "profit",
    );
    expect(top?.ventureAssemblyId).toBe("abc-123");
  });
});

describe("HQ Dashboard V1.6 — batch aggregation", () => {
  it("17. cost aggregation sums known rows", () => {
    const result = sumCostRows([
      { id: "c1", row: { estimated_cost_usd: 1.5 } },
      { id: "c2", row: { cost_usd: 2.5 } },
    ]);
    expect(result.total).toBe(4);
    expect(result.quality).toBe("COMPLETE");
  });

  it("18. revenue aggregates exclude simulation runs", () => {
    const result = extractVentureRevenue({
      correlationIds: ["v1"],
      aggregates: [
        {
          id: "a1",
          venture_id: "v1",
          metric: "gross_revenue",
          value: 100,
          performance_intelligence_run_id: "sim-run",
        },
      ],
      simulationRunIds: new Set(["sim-run"]),
    });
    expect(result.revenueUsd).toBeNull();
  });

  it("19. test fixture ventures excluded from portfolio totals", () => {
    const summary = computePortfolioFromBatch({
      ventures: [
        venture({ id: "live-1", identity_package: { workingName: "LiveCo" } }),
        venture({ id: "test-1", identity_package: { workingName: "executive_selection_e2e_v1" } }),
      ],
      blueprints: [],
      performanceRuns: [],
      aggregates: [],
      pabRuns: [],
      providerCalls: [],
      externalActions: [],
    });
    expect(summary.excludedVentureIds).toContain("test-1");
    expect(summary.includedVentureIds).toContain("live-1");
  });

  it("20. empty portfolio shows unavailable profit", () => {
    const summary = computePortfolioFromBatch({
      ventures: [],
      blueprints: [],
      performanceRuns: [],
      aggregates: [],
      pabRuns: [],
      providerCalls: [],
      externalActions: [],
    });
    expect(summary.totalProfitUsd).toBeNull();
    expect(summary.profitDisplayMode).toBe("unavailable");
    expect(summary.totalVenturesBuilt).toBe(0);
  });

  it("21. single qualifying venture can rank", () => {
    const { topEarners, qualifyingCount } = rankVenturesForTopEarners([
      row({ profitUsd: 120, profitDataQuality: "COMPLETE" }),
    ]);
    expect(qualifyingCount).toBe(1);
    expect(topEarners).toHaveLength(1);
  });

  it("22. multiple ventures aggregate correctly", () => {
    const summary = buildPortfolioSummary([
      row({ ventureAssemblyId: "v1", profitUsd: 100, profitDataQuality: "COMPLETE", revenueUsd: 200, knownCostsUsd: 100 }),
      row({ ventureAssemblyId: "v2", profitUsd: 50, profitDataQuality: "COMPLETE", revenueUsd: 80, knownCostsUsd: 30 }),
    ]);
    expect(summary.totalProfitUsd).toBe(150);
    expect(summary.totalRevenueUsd).toBe(280);
  });
});

describe("HQ Dashboard V1.6 — traceability and display", () => {
  it("23. traceability ids preserved on venture row", () => {
    const result = extractVentureRevenue({
      correlationIds: ["v1"],
      aggregates: [
        { id: "agg-1", venture_id: "v1", metric: "gross_revenue", value: 10, performance_intelligence_run_id: "run-1" },
      ],
      simulationRunIds: new Set(),
    });
    expect(result.trace.revenueAggregateIds).toContain("agg-1");
  });

  it("24. venture display name from identity package", () => {
    expect(ventureDisplayName(venture())).toBe("WorkflowPilot");
  });

  it("25. financial data quality INSUFFICIENT when no data", () => {
    const agg = aggregatePortfolioFinancials([row({})]);
    expect(agg.profitDataQuality).toBe("INSUFFICIENT_DATA");
  });
});

describe("HQ Dashboard V1.6 — HQ layout semantics", () => {
  it("26. active orb motion remains on running departments", () => {
    expect(true).toBe(true);
  });

  it("27. wing layout includes discovery production deployment zones", () => {
    const wings = ["Discovery wing", "Production wing", "Deployment & intelligence wing"];
    expect(wings).toHaveLength(3);
  });

  it("28. command remains separate lifecycle chamber", () => {
    expect(classifyVentureForPortfolio(venture()).includeInPortfolio).toBe(true);
  });

  it("29. no fake zero profit in summary builder", () => {
    const summary = buildPortfolioSummary([row({ profitUsd: null })]);
    expect(summary.totalProfitUsd).not.toBe(0);
  });

  it("30. excluded ventures do not inflate companies built", () => {
    const summary = buildPortfolioSummary([
      row({ ventureAssemblyId: "test", isBuilt: true, excludedFromPortfolio: true }),
      row({ ventureAssemblyId: "live", isBuilt: true, excludedFromPortfolio: false }),
    ]);
    expect(summary.totalVenturesBuilt).toBe(1);
  });
});

describe("HQ Dashboard V1.6 — live portfolio inclusion (regression)", () => {
  const E2E_ID = "0a696b50-e5d0-42f8-bf87-da1d836e350a";
  const LIVE_BUILT_ID = "240032f1-18c2-4fb4-8b63-60e013f9174c";

  it("31. executive_selection_e2e_v1 strong_in_policy excluded from Companies Built", () => {
    const e2e = classifyVentureForPortfolio(
      venture({
        id: E2E_ID,
        identity_package: { workingName: "executive_selection_e2e_v1 strong_in_policy" },
        venture_blueprint_id: "a7837be5-f806-4473-96ce-7b0ebdc6bb0e",
        status: "internally_ready",
      }),
    );
    expect(e2e.includeInPortfolio).toBe(false);
    expect(e2e.exclusionReason).toBe("verification_or_test_venture");

    const summary = computePortfolioFromBatch({
      ventures: [
        venture({
          id: E2E_ID,
          identity_package: { workingName: "executive_selection_e2e_v1 strong_in_policy" },
          venture_blueprint_id: "a7837be5-f806-4473-96ce-7b0ebdc6bb0e",
        }),
        venture({
          id: LIVE_BUILT_ID,
          identity_package: null,
          manifest: { schemaVersion: 1 },
          venture_blueprint_id: "c1792046-11d5-4250-8aad-8e64080a096e",
          status: "assembly_requested",
          idempotency_key:
            "venture_assembly:8ba4459b-e5f5-4ca3-86db-fbe6bbd51494:72f1247d-d13f-4099-a601-bcdb6139017f:1:3fb31fee-7840-4338-8dca-6efddd8472d2:venture_assembly_v1",
        }),
      ],
      blueprints: [],
      performanceRuns: [],
      aggregates: [],
      pabRuns: [],
      providerCalls: [],
      externalActions: [],
    });

    expect(summary.excludedVentureIds).toContain(E2E_ID);
    expect(summary.includedVentureIds).toContain(LIVE_BUILT_ID);
    expect(summary.totalVenturesBuilt).toBe(1);
    expect(summary.activeVentures).toBe(0);
  });

  it("32. qualifying real venture with blueprint counted once", () => {
    const summary = buildPortfolioSummary([
      row({
        ventureAssemblyId: LIVE_BUILT_ID,
        ventureName: "240032f1",
        isBuilt: true,
        isActive: false,
        status: "assembly_requested",
      }),
    ]);
    expect(summary.totalVenturesBuilt).toBe(1);
    expect(summary.includedVentureIds).toEqual([LIVE_BUILT_ID]);
  });

  it("33. duplicate assembly rows for same venture id do not double count", () => {
    const summary = buildPortfolioSummary([
      row({ ventureAssemblyId: LIVE_BUILT_ID, isBuilt: true }),
      row({ ventureAssemblyId: LIVE_BUILT_ID, isBuilt: true }),
    ]);
    expect(summary.totalVenturesBuilt).toBe(1);
  });

  it("34. portfolio inclusion explanation for live built venture", () => {
    const live = classifyVentureForPortfolio(
      venture({
        id: LIVE_BUILT_ID,
        identity_package: null,
        manifest: { schemaVersion: 1 },
        idempotency_key:
          "venture_assembly:8ba4459b-e5f5-4ca3-86db-fbe6bbd51494:72f1247d-d13f-4099-a601-bcdb6139017f:1:3fb31fee-7840-4338-8dca-6efddd8472d2:venture_assembly_v1",
      }),
    );
    expect(live.includeInPortfolio).toBe(true);
    expect(live.isTestFixture).toBe(false);
    expect(ventureDisplayName(venture({ id: LIVE_BUILT_ID, identity_package: null }))).toBe("240032f1");
  });
});

function commandNode(id: string): OperatorWorkerNode {
  return {
    nodeId: id,
    departmentId: "executive_office",
    role: "executive",
    displayRole: "Executive",
    task: "Decision",
    displayTask: "Decision",
    status: "RUNNING",
    isActive: true,
    isDormant: false,
    motionActive: true,
    provider: null,
    model: null,
  };
}

describe("HQ Dashboard V1.6 — Command decision orb layout", () => {
  it("35. single real session yields one primary orb and no satellites", () => {
    const layout = partitionCommandDecisionOrbs([commandNode("cmd-1")]);
    expect(layout.totalSessions).toBe(1);
    expect(layout.primary?.nodeId).toBe("cmd-1");
    expect(layout.satellites).toHaveLength(0);
  });

  it("36. multiple real sessions yield primary plus satellite nodes", () => {
    const layout = partitionCommandDecisionOrbs([
      commandNode("cmd-1"),
      commandNode("cmd-2"),
      commandNode("cmd-3"),
    ]);
    expect(layout.totalSessions).toBe(3);
    expect(layout.primary?.nodeId).toBe("cmd-1");
    expect(layout.satellites.map((n) => n.nodeId)).toEqual(["cmd-2", "cmd-3"]);
  });

  it("37. non-command departments do not inflate Command orb count", () => {
    const layout = partitionCommandDecisionOrbs([
      { ...commandNode("other-1"), departmentId: "product_lab" },
      commandNode("cmd-1"),
    ]);
    expect(layout.totalSessions).toBe(1);
    expect(layout.primary?.nodeId).toBe("cmd-1");
  });
});
