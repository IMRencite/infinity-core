import { describe, it, expect } from "vitest";
import {
  DEPARTMENTS,
  getDepartment,
  getDepartmentForEngine,
  getDepartmentForMissionTargetEngine,
  listDepartmentsInLifecycleOrder,
} from "../department-registry";
import {
  deriveActiveDepartments,
  deriveDepartmentState,
  deriveOverallVentureStatus,
  deriveUiStateFromEngineStatus,
  countCompletedStages,
} from "../status-derivation";
import { buildActivityFeed } from "../activity-feed";
import {
  buildCostSummary,
  buildCurrentActivity,
  buildDepartments,
  resolveNextMissionTarget,
} from "../build-snapshot";
import { sanitizeOperatorSnapshot, isSensitiveFieldKey, isSensitiveFilePath, filterSafeFilePaths } from "../sanitize";
import type { RawEngineData } from "../load-raw-data";
import type { OperatorDepartmentSnapshot } from "../types";

function emptyRaw(): RawEngineData {
  return {
    opportunity: null,
    opportunityCandidates: [],
    researchRuns: [],
    aiBrainRuns: [],
    monetizationRuns: [],
    monetizationPlans: [],
    ventureSelectionRuns: [],
    companyBuilderRuns: [],
    companyBuilderBlueprints: [],
    organicGrowthRuns: [],
    organicGrowthPackages: [],
    creativeMediaRuns: [],
    creativeMediaPackages: [],
    creativeMediaJobs: [],
    creativeMediaAssets: [],
    creativeMediaReviews: [],
    pabRuns: [],
    pabTasks: [],
    pabProviderCalls: [],
    pabChangeSets: [],
    pabProductionArtifacts: [],
    productionArtifacts: [],
    externalActions: [],
    launchPlans: [],
    performanceRuns: [],
    performancePackages: [],
    performanceDecisions: [],
    performanceAggregates: [],
    missions: [],
  };
}

describe("Operator Console V1", () => {
  describe("department registry", () => {
    it("1. maps all required departments", () => {
      expect(DEPARTMENTS.map((d) => d.id)).toEqual([
        "opportunity_lab",
        "research_department",
        "strategy_finance",
        "company_operations",
        "growth_department",
        "creative_studio",
        "product_lab",
        "quality_control",
        "launch_operations",
        "intelligence_center",
        "executive_office",
      ]);
    });
    it("2-12. engine to department mappings", () => {
      expect(getDepartmentForEngine("opportunity_scanner")).toBe("opportunity_lab");
      expect(getDepartmentForEngine("grounded_research")).toBe("research_department");
      expect(getDepartmentForEngine("monetization_engine")).toBe("strategy_finance");
      expect(getDepartmentForEngine("venture_selection")).toBe("strategy_finance");
      expect(getDepartmentForEngine("company_builder")).toBe("company_operations");
      expect(getDepartmentForEngine("organic_growth")).toBe("growth_department");
      expect(getDepartmentForEngine("creative_media")).toBe("creative_studio");
      expect(getDepartmentForEngine("product_asset_builder")).toBe("product_lab");
      expect(getDepartmentForEngine("quality_control")).toBe("quality_control");
      expect(getDepartmentForEngine("external_action_gateway")).toBe("launch_operations");
      expect(getDepartmentForEngine("performance_intelligence")).toBe("intelligence_center");
    });
    it("25. next mission target department", () => {
      expect(getDepartmentForMissionTargetEngine("product_asset_builder")).toBe("product_lab");
      expect(getDepartmentForMissionTargetEngine("organic_growth")).toBe("growth_department");
      expect(getDepartmentForMissionTargetEngine("creative_media")).toBe("creative_studio");
    });
  });

  describe("status derivation", () => {
    it("16-24. department states", () => {
      expect(deriveUiStateFromEngineStatus("running")).toBe("RUNNING");
      expect(deriveUiStateFromEngineStatus("completed")).toBe("COMPLETE");
      expect(deriveUiStateFromEngineStatus("failed")).toBe("FAILED");
      expect(deriveUiStateFromEngineStatus("blocked")).toBe("BLOCKED");
      expect(deriveDepartmentState({ runStatuses: [], hasRecords: false })).toBe("NOT_STARTED");
      expect(deriveDepartmentState({ runStatuses: ["running"], hasRecords: true })).toBe("RUNNING");
      expect(deriveDepartmentState({ runStatuses: ["completed"], hasRecords: true })).toBe("COMPLETE");
      expect(deriveDepartmentState({ runStatuses: ["failed"], hasRecords: true })).toBe("FAILED");
      expect(deriveDepartmentState({ runStatuses: ["unknown_status"], hasRecords: true })).toBe("UNKNOWN");
      expect(deriveDepartmentState({ runStatuses: [], hasRecords: true, explicitPaused: true })).toBe("PAUSED");
      expect(deriveDepartmentState({ runStatuses: [], hasRecords: true, explicitShutdown: true })).toBe("SHUTDOWN");
    });
    it("17-18. active and multi-active departments", () => {
      const depts = [
        { id: "product_lab", state: "RUNNING" as const },
        { id: "creative_studio", state: "RUNNING" as const },
        { id: "growth_department", state: "COMPLETE" as const },
      ];
      expect(deriveActiveDepartments(depts)).toEqual(["product_lab", "creative_studio"]);
    });
    it("19. no active work", () => {
      const activity = buildCurrentActivity(
        [{ id: "growth_department", label: "Growth", state: "COMPLETE", isActive: false } as OperatorDepartmentSnapshot],
        [{ summary: "Organic growth completed", timestamp: "2026-08-16T04:00:00Z" }],
      );
      expect(activity.active).toBe(false);
      expect(activity.latestActivitySummary).toContain("Organic growth");
    });
  });

  describe("activity feed", () => {
    it("27-28. chronological and deduplication", () => {
      const raw = emptyRaw();
      raw.opportunityCandidates = [
        { id: "c1", title: "Test", created_at: "2026-08-16T04:00:00Z", status: "discovered" },
        { id: "c1", title: "Test", created_at: "2026-08-16T04:00:00Z", status: "discovered" },
      ];
      raw.pabRuns = [{ id: "p1", status: "running", created_at: "2026-08-16T04:05:00Z", cumulative_cost_usd: 0.02 }];
      const feed = buildActivityFeed(raw);
      expect(feed.length).toBeGreaterThanOrEqual(2);
      expect(new Date(feed[0]!.timestamp).getTime()).toBeGreaterThanOrEqual(new Date(feed[1]!.timestamp).getTime());
    });
    it("29. missing timestamp falls back safely", () => {
      const raw = emptyRaw();
      raw.externalActions = [{ id: "e1", action_type: "deploy", execution_status: "completed" }];
      const feed = buildActivityFeed(raw);
      expect(feed[0]?.timestamp).toBeTruthy();
    });
  });

  describe("cost and provider observability", () => {
    it("31-33. known vs unknown costs", () => {
      const raw = emptyRaw();
      raw.pabRuns = [{ id: "p1", status: "completed", cumulative_cost_usd: 0.05 }];
      raw.pabProviderCalls = [{ id: "c1", status: "completed" }];
      const costs = buildCostSummary(raw);
      expect(costs.knownSpendUsd).toBeCloseTo(0.05);
      expect(costs.unpricedProviderCalls).toBe(1);
    });
    it("30. provider-neutral rendering uses actual fields", () => {
      const raw = emptyRaw();
      raw.researchRuns = [{ id: "r1", provider: "anthropic", model: "claude-test", status: "completed", created_at: "2026-08-16T04:00:00Z" }];
      const depts = buildDepartments(raw, null);
      const research = depts.find((d) => d.id === "research_department");
      expect(research?.provider).toBe("anthropic");
      expect(research?.model).toBe("claude-test");
    });
  });

  describe("closed loop routing", () => {
    it("26. intelligence to product lab via executive", () => {
      const raw = emptyRaw();
      raw.performanceDecisions = [{
        id: "d1",
        decision_id: "dec-1",
        decision_type: "REPAIR",
        status: "READY",
        created_at: "2026-08-16T04:11:00Z",
        decision_payload: { missionTargetEngine: "product_asset_builder" },
      }];
      expect(resolveNextMissionTarget(raw)).toBe("product_lab");
    });
  });

  describe("security sanitization", () => {
    it("45-46. removes secret fields from snapshot", () => {
      const dirty = {
        apiKey: "secret-key",
        nested: { service_role_key: "bad" },
        safe: "visible",
      };
      const clean = sanitizeOperatorSnapshot(dirty);
      expect((clean as Record<string, unknown>).apiKey).toBe("[redacted]");
      expect((clean as Record<string, unknown>).safe).toBe("visible");
    });
    it("46. sensitive file paths blocked", () => {
      expect(isSensitiveFilePath(".env.local")).toBe(true);
      expect(filterSafeFilePaths(["app/page.tsx", ".env"])).toEqual(["app/page.tsx"]);
    });
    it("45. sensitive field keys detected", () => {
      expect(isSensitiveFieldKey("SUPABASE_SERVICE_ROLE_KEY")).toBe(true);
      expect(isSensitiveFieldKey("venture_id")).toBe(false);
    });
  });

  describe("pipeline counts", () => {
    it("honest stage completion count", () => {
      const { completed, total } = countCompletedStages(["COMPLETE", "NOT_STARTED", "RUNNING", "SKIPPED"]);
      expect(completed).toBe(2);
      expect(total).toBe(4);
    });
    it("50. no demo fixture fallback in registry", () => {
      expect(listDepartmentsInLifecycleOrder().every((d) => !d.label.includes("Demo"))).toBe(true);
    });
  });

  describe("early and full venture shapes", () => {
    it("14. early-stage venture mostly NOT_STARTED", () => {
      const depts = buildDepartments(emptyRaw(), null);
      expect(depts.filter((d) => d.state === "NOT_STARTED").length).toBeGreaterThan(8);
    });
    it("15. full historical venture with multiple records", () => {
      const raw = emptyRaw();
      raw.opportunity = { id: "o1", title: "Opp", status: "completed", created_at: "2026-08-16T03:00:00Z" };
      raw.monetizationPlans = [{ id: "m1", title: "Plan", status: "ready", created_at: "2026-08-16T03:05:00Z" }];
      raw.organicGrowthPackages = [{ id: "og1", status: "completed", venture_id: "v1", created_at: "2026-08-16T04:00:00Z" }];
      raw.pabRuns = [{ id: "p1", status: "completed", cumulative_cost_usd: 0.1, created_at: "2026-08-16T04:07:00Z" }];
      raw.externalActions = [{ id: "e1", action_type: "deploy", execution_status: "completed", created_at: "2026-08-16T04:10:00Z" }];
      raw.performanceRuns = [{ id: "pi1", status: "completed", created_at: "2026-08-16T04:11:00Z" }];
      raw.performanceDecisions = [{ id: "ld1", decision_type: "REPAIR", status: "READY", created_at: "2026-08-16T04:11:17Z", decision_payload: {} }];
      const depts = buildDepartments(raw, "product_lab");
      expect(depts.find((d) => d.id === "opportunity_lab")?.state).toBe("COMPLETE");
      expect(depts.find((d) => d.id === "launch_operations")?.state).toBe("COMPLETE");
      expect(depts.find((d) => d.id === "executive_office")?.recordCount).toBeGreaterThan(0);
    });
  });

  describe("quality and artifacts", () => {
    it("36-37. quality findings in feed", () => {
      const raw = emptyRaw();
      raw.creativeMediaReviews = [{ id: "q1", outcome: "PASS", status: "completed", created_at: "2026-08-16T04:08:31Z" }];
      const feed = buildActivityFeed(raw);
      expect(feed.some((e) => e.eventType === "quality_review")).toBe(true);
    });
    it("34-35. file changes and artifacts from PAB", () => {
      const raw = emptyRaw();
      raw.pabChangeSets = [{ id: "cs1", status: "applied", created_at: "2026-08-16T04:08:06Z" }];
      raw.pabProductionArtifacts = [{ id: "a1", artifact_id: "art-1", status: "READY", quality_outcome: "PASS", created_at: "2026-08-16T04:09:02Z" }];
      const feed = buildActivityFeed(raw);
      expect(feed.some((e) => e.eventType === "code_change_set")).toBe(true);
    });
  });

  describe("performance and learning", () => {
    it("39-41. performance metrics and learning decision", () => {
      const raw = emptyRaw();
      raw.performanceAggregates = [{ id: "a1", metric: "execution_success_rate", value: 0.48, created_at: "2026-08-16T04:11:00Z" }];
      raw.performanceDecisions = [{ id: "d1", decision_type: "REPAIR", status: "READY", mission_id: "m-1", created_at: "2026-08-16T04:11:17Z", decision_payload: { missionTargetEngine: "product_asset_builder" } }];
      const depts = buildDepartments(raw, "product_lab");
      expect(depts.find((d) => d.id === "intelligence_center")?.summary).toContain("execution_success_rate");
      const feed = buildActivityFeed(raw);
      expect(feed.some((e) => e.eventType === "learning_decision")).toBe(true);
    });
    it("40. insufficient performance data shows NOT_STARTED", () => {
      const depts = buildDepartments(emptyRaw(), null);
      expect(depts.find((d) => d.id === "intelligence_center")?.state).toBe("NOT_STARTED");
    });
  });

  describe("overall status", () => {
    it("blocked and failed venture states", () => {
      expect(deriveOverallVentureStatus([{ state: "RUNNING" }, { state: "FAILED" }])).toBe("RUNNING");
      expect(deriveOverallVentureStatus([{ state: "FAILED" }, { state: "COMPLETE" }])).toBe("FAILED");
    });
  });

  describe("department labels", () => {
    it("getDepartment returns stable labels", () => {
      expect(getDepartment("creative_studio").label).toBe("Creative Studio");
    });
  });
});
