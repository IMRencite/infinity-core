import { describe, expect, it } from "vitest";
import {
  classifyImprovementRisk,
  evaluateDailyImprovementLineageGate,
  evaluateDailyImprovementRollbackGate,
  evaluateDailyImprovementSafetyGate,
  ownerForSystem,
  REVIEWED_SYSTEMS,
  runDailyImprovementCycle,
} from "../index";

describe("Daily Improvement Engine", () => {
  it("reviews first-class systems without fabricating disabled ones", () => {
    const cycle = runDailyImprovementCycle({
      now: "2026-09-18T06:00:00.000Z",
      date: "2026-09-18",
      trigger: "VERCEL_CRON",
      constraints: {
        outbound_mode: "CANARY",
        organic_execute_publish: false,
        backlink_mode: "DISCOVERY_ONLY",
        mercury_status: "DEGRADED",
        affiliate_engine_active: false,
        communication_last_error: null,
        sales_stage: "ACTIVE_CONVERSATION",
      },
    });
    expect(REVIEWED_SYSTEMS.length).toBeGreaterThanOrEqual(20);
    expect(cycle.report.systems_reviewed).toContain("Sales");
    expect(cycle.report.systems_reviewed).toContain("Organic Growth");
    expect(cycle.run.benchmarks.find((row) => row.system === "Affiliate / Partner Growth")?.current_state).toBe("NOT_IMPLEMENTED");
    expect(cycle.run.benchmarks.find((row) => row.system === "Organic Growth")?.current_state).toMatch(/execute_publish:false/);
    expect(cycle.report.changes_auto_applied).toEqual([]);
    expect(evaluateDailyImprovementSafetyGate({
      candidate: cycle.run.candidates.find((row) => row.risk === "HIGH_RISK") ?? {
        ...cycle.run.candidates[0]!,
        risk: "HIGH_RISK",
        approval_requirement: "FOUNDER",
        gap: "money movement",
      },
      evidence_sufficient: true,
      rollback_exists: true,
      auto_apply: true,
    }).result).toBe("FAIL");
    expect(evaluateDailyImprovementRollbackGate({ applied: false, rollback: null }).result).toBe("PASS");
    expect(evaluateDailyImprovementLineageGate({
      what_changed: "recorded nightly cycle",
      why: "observe and route",
      evidence: ["DailyImprovementRun"],
      approved_by: "ENGINE",
      before: "none",
      after: cycle.run.run_id,
    }).result).toBe("PASS");
    expect(ownerForSystem("Sales")).toBe("Sales");
    expect(ownerForSystem("Communication Runtime")).toBe("Systems Architect / Runtime");
    expect(classifyImprovementRisk({ money_movement: true })).toBe("HIGH_RISK");
    expect(classifyImprovementRisk({ copy_or_reporting: true })).toBe("LOW_RISK");
  });
});
