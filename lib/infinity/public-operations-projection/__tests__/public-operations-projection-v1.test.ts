import { beforeEach, describe, expect, it } from "vitest";
import { DELETE, GET, PATCH, POST, PUT } from "@/app/api/public/operations/route";
import {
  MALICIOUS_PRIVATE_FIXTURE,
  PUBLIC_OPERATIONS_PROJECTION,
  PUBLIC_OPERATIONS_SURFACE,
  constructPublicOperationsProjection,
  emptyUnavailableProjection,
  evaluatePublicAgentActivityTruthGate,
  evaluatePublicCustomerDataGate,
  evaluatePublicFinancialDisclosureGate,
  evaluatePublicInfrastructureDataGate,
  evaluatePublicMissionDetailGate,
  evaluatePublicProjectionCanonicalTruthGate,
  evaluatePublicProjectionFailureSanitizationGate,
  evaluatePublicProjectionFieldAllowlistGate,
  evaluatePublicProjectionGateBundle,
  evaluatePublicProjectionNoSensitiveDataGate,
  evaluatePublicProjectionReadOnlyGate,
  evaluatePublicProjectionUnknownNotZeroGate,
  evaluatePublicProviderDataGate,
  evaluatePublicVentureVisibilityGate,
  idleTruthObservation,
  maliciousPrivateObservation,
  projectPublicOperations,
  publicOperationsPreviewModel,
  resetPublicProjectionCache,
  resolvePublicVentureVisibility,
  stringifyPublicProjection,
  type InternalPublicObservation,
  type PublicOperationsProjection,
} from "..";

const FORBIDDEN = [
  MALICIOUS_PRIVATE_FIXTURE.customer_email,
  MALICIOUS_PRIVATE_FIXTURE.customer_phone,
  MALICIOUS_PRIVATE_FIXTURE.reply_content,
  MALICIOUS_PRIVATE_FIXTURE.stripe_customer,
  MALICIOUS_PRIVATE_FIXTURE.stripe_account,
  MALICIOUS_PRIVATE_FIXTURE.api_token,
  MALICIOUS_PRIVATE_FIXTURE.bearer,
  MALICIOUS_PRIVATE_FIXTURE.provider_error,
  MALICIOUS_PRIVATE_FIXTURE.internal_url,
  MALICIOUS_PRIVATE_FIXTURE.filesystem_path,
  MALICIOUS_PRIVATE_FIXTURE.pid,
  MALICIOUS_PRIVATE_FIXTURE.build_id,
  MALICIOUS_PRIVATE_FIXTURE.commit_hash,
  "john@example.com",
  "$50",
  "localhost:3000",
  "C:\\Users\\",
  "spend authority",
  "Verified Cash",
  "commandActivity",
  "financialTruth",
  "EXISTING_GROWTH_CAMPAIGN_CONTINUES_WITHOUT_NEW_MISSION",
  "OccupancyNPV First Outbound Validation Campaign",
];

function projected(observation: InternalPublicObservation = maliciousPrivateObservation()) {
  return projectPublicOperations({ observation, useCache: false });
}

function assertNoForbidden(projection: PublicOperationsProjection) {
  const text = stringifyPublicProjection(projection);
  for (const needle of FORBIDDEN) {
    expect(text.includes(needle), `leaked ${needle}`).toBe(false);
  }
}

describe("Public Operations Projection V1", () => {
  beforeEach(() => {
    resetPublicProjectionCache();
    expect(process.env.INFINITY_CANONICAL_WORK_PERSIST).not.toBe("1");
    expect(process.env.INFINITY_AUTONOMOUS_LOOP_PERSIST).not.toBe("1");
  });

  it("1. public API returns typed projection", async () => {
    const projection = projected();
    expect(projection.contract).toBe(PUBLIC_OPERATIONS_PROJECTION);
    const response = await GET();
    const body = (await response.json()) as PublicOperationsProjection;
    expect(body.contract).toBe(PUBLIC_OPERATIONS_PROJECTION);
    expect(response.status).toBe(200);
  });

  it("2. raw HQ object never returned", () => {
    const projection = projected();
    expect("commandActivity" in projection).toBe(false);
    expect("financialTruth" in projection).toBe(false);
    expect("autonomousOperating" in projection).toBe(false);
    expect(projection.contract).toBe(PUBLIC_OPERATIONS_PROJECTION);
  });

  it("3-9. customer, financial, and Stripe private identifiers removed", () => {
    const projection = projected();
    assertNoForbidden(projection);
    expect(evaluatePublicCustomerDataGate(projection).result).toBe("PASS");
    expect(evaluatePublicFinancialDisclosureGate(projection).result).toBe("PASS");
  });

  it("10. private mission detail removed", () => {
    const projection = projected();
    expect(stringifyPublicProjection(projection)).not.toContain("First Outbound Validation");
    expect(evaluatePublicMissionDetailGate(projection).result).toBe("PASS");
  });

  it("11-12. private and HIDDEN ventures absent", () => {
    const projection = projected();
    const names = projection.public_ventures.map((row) => row.public_name);
    expect(names).not.toContain("Horizon");
    expect(names).not.toContain("AskReview");
    expect(resolvePublicVentureVisibility({ private_venture_id: "venture:secret-project", private_name: "Horizon" })).toBe("HIDDEN");
  });

  it("13. PUBLIC_NAME_ONLY gets only permitted fields", () => {
    const projection = projectPublicOperations({
      observation: maliciousPrivateObservation(),
      visibilityOverrides: { "venture:secret-project": "PUBLIC_NAME_ONLY" },
      useCache: false,
    });
    const row = projection.public_ventures.find((item) => item.public_name === "Horizon");
    expect(row).toEqual({ public_name: "Horizon", status_label: "Operating" });
    expect(row).not.toHaveProperty("category");
    expect(row).not.toHaveProperty("sanitized_description");
    expect(row).not.toHaveProperty("approved_stats");
  });

  it("14. PUBLIC_SUMMARY gets safe summary", () => {
    const projection = projectPublicOperations({
      observation: maliciousPrivateObservation(),
      visibilityOverrides: { "venture:secret-project": "PUBLIC_SUMMARY" },
      useCache: false,
    });
    const row = projection.public_ventures.find((item) => item.public_name === "Horizon");
    expect(row?.category).toBe("Public venture");
    expect(row?.sanitized_description).toBe("Approved public venture summary");
    expect(row).not.toHaveProperty("approved_stats");
  });

  it("15. PUBLIC_STATS gets only approved stats", () => {
    const projection = projected();
    const occupancy = projection.public_ventures.find((row) => row.public_name === "OccupancyNPV");
    expect(occupancy?.public_url).toBe("https://occupancynpv.com");
    expect(occupancy?.approved_stats).toEqual({ live: true });
    expect(occupancy).not.toHaveProperty("revenue");
    expect(occupancy).not.toHaveProperty("spend_authority");
  });

  it("16. AskReview remains hidden", () => {
    const projection = projectPublicOperations({
      observation: maliciousPrivateObservation(),
      visibilityOverrides: { "candidate:f1336945-3350-4d08-921e-4dcb5bc77b8e": "PUBLIC_STATS" },
      useCache: false,
    });
    expect(projection.public_ventures.some((row) => /askreview/i.test(row.public_name))).toBe(false);
    expect(evaluatePublicVentureVisibilityGate({
      projection,
      hiddenNames: ["AskReview"],
      askReviewExposed: false,
      defaultVisibility: "HIDDEN",
    }).result).toBe("PASS");
  });

  it("17-24. provider, infra, PID, path, commit, and BUILD_ID removed", () => {
    const projection = projected();
    assertNoForbidden(projection);
    expect(evaluatePublicProviderDataGate(projection).result).toBe("PASS");
    expect(evaluatePublicInfrastructureDataGate(projection).result).toBe("PASS");
    expect(evaluatePublicProjectionNoSensitiveDataGate(projection).result).toBe("PASS");
  });

  it("25. public endpoint cannot mutate", async () => {
    const denied = await Promise.all([POST(), PUT(), PATCH(), DELETE()]);
    expect(denied.every((row) => row.status === 405)).toBe(true);
    expect(evaluatePublicProjectionReadOnlyGate({
      allowedMethods: [...PUBLIC_OPERATIONS_SURFACE.methods],
      mutationCapable: PUBLIC_OPERATIONS_SURFACE.mutationCapable,
      createMission: PUBLIC_OPERATIONS_SURFACE.createMission,
      triggerTick: PUBLIC_OPERATIONS_SURFACE.triggerTick,
      sendOutreach: PUBLIC_OPERATIONS_SURFACE.sendOutreach,
      deploy: PUBLIC_OPERATIONS_SURFACE.deploy,
      mutateFinance: PUBLIC_OPERATIONS_SURFACE.mutateFinance,
      mutateProvider: PUBLIC_OPERATIONS_SURFACE.mutateProvider,
    }).result).toBe("PASS");
  });

  it("26. counters derive from canonical truth", () => {
    const observation = idleTruthObservation();
    const projection = constructPublicOperationsProjection(observation);
    expect(projection.ventures_started_count).toBe(3);
    expect(projection.ventures_operating_count).toBe(1);
    expect(projection.missions_completed_count).toBe(4);
    expect(projection.deployments_completed_count).toBe(1);
    expect(projection.public_assets_created_count).toBe(1);
    expect(projection.research_cycles_completed_count).toBe(1);
    expect(evaluatePublicProjectionCanonicalTruthGate({
      started: 3,
      operating: 1,
      completed: 4,
      projectedStarted: projection.ventures_started_count,
      projectedOperating: projection.ventures_operating_count,
      projectedCompleted: projection.missions_completed_count,
    }).result).toBe("PASS");
  });

  it("27. unknown count not silently zero", () => {
    const observation = idleTruthObservation();
    observation.loop = { ...observation.loop!, autonomous_enabled_at: null };
    observation.work = observation.work.filter((row) => row.work_id !== "work:infinity:autonomous-daily-operating-loop-v1");
    const projection = constructPublicOperationsProjection(observation);
    expect(projection.autonomous_operating_hours).toBe("UNKNOWN");
    expect(projection.autonomous_operating_hours).not.toBe(0);
    expect(evaluatePublicProjectionUnknownNotZeroGate({ unknownProven: true, renderedZero: projection.autonomous_operating_hours === 0 }).result).toBe("PASS");
  });

  it("28. public active-agent count respects real active state", () => {
    const idle = projected();
    expect(idle.active_public_agents).toBe(0);
    expect(idle.idle_public_agents).toBe(3);
    const activeObservation = idleTruthObservation();
    activeObservation.loop = { ...activeObservation.loop!, portfolio_state: "MISSION_ACTIVE", last_outcome: "EXECUTE_ACTION" };
    const active = constructPublicOperationsProjection(activeObservation);
    expect(active.active_public_agents).toBe(3);
    expect(evaluatePublicAgentActivityTruthGate({
      loopActive: true,
      activeCount: active.active_public_agents,
      historyUsedAsCurrent: false,
    }).result).toBe("PASS");
  });

  it("29. history does not become current activity", () => {
    const projection = projected();
    expect(projection.missions_completed_count).toBeGreaterThan(0);
    expect(projection.public_activity_summary).not.toBe("ACTIVE");
    expect(projection.active_public_agents).toBe(0);
    expect(evaluatePublicAgentActivityTruthGate({
      loopActive: false,
      activeCount: projection.active_public_agents,
      historyUsedAsCurrent: false,
    }).result).toBe("PASS");
  });

  it("30. failure state returns sanitized public response", () => {
    const projection = projectPublicOperations({ forceUnavailable: true, now: "2026-09-15T01:00:00.000Z" });
    expect(projection.system_status).toBe("TEMPORARILY_UNAVAILABLE");
    expect(projection.public_activity_summary).toBe("UPDATING");
    assertNoForbidden(projection);
    expect(stringifyPublicProjection(projection)).not.toMatch(/stack|ENOENT|ECONNREFUSED/i);
    expect(evaluatePublicProjectionFailureSanitizationGate(projection).result).toBe("PASS");
  });

  it("31. projection survives missing optional sources", () => {
    const projection = constructPublicOperationsProjection({
      now: "2026-09-15T01:00:00.000Z",
      ventures: [],
      work: [],
      loop: null,
    });
    expect(projection.contract).toBe(PUBLIC_OPERATIONS_PROJECTION);
    expect(projection.ventures_started_count).toBe(0);
    expect(projection.autonomous_operating_hours).toBe("UNKNOWN");
    expect(projection.public_ventures).toEqual([]);
    expect(evaluatePublicProjectionFieldAllowlistGate(projection).result).toBe("PASS");
  });

  it("32. tests do not mutate production state", () => {
    const before = process.env.INFINITY_CANONICAL_WORK_PERSIST;
    projected();
    expect(process.env.INFINITY_CANONICAL_WORK_PERSIST).toBe(before);
    expect(process.env.INFINITY_AUTONOMOUS_LOOP_PERSIST).not.toBe("1");
    expect(PUBLIC_OPERATIONS_SURFACE.mutationCapable).toBe(false);
  });

  it("does not publish internal runaway pause when growth continuation is the public activity", () => {
    const observation = idleTruthObservation();
    observation.loop = { ...observation.loop!, portfolio_state: "PAUSED", last_outcome: "CONTINUE_EXISTING_ACTION" };
    const projection = constructPublicOperationsProjection(observation);
    expect(projection.autonomous_mode).toBe("ENABLED");
    expect(projection.public_activity_summary).toBe("MONITORING");
    expect(stringifyPublicProjection(projection)).not.toContain("PAUSED");
  });

  it("maps CONTINUE_EXISTING_ACTION to monitoring without private rationale", () => {
    const projection = projected();
    expect(projection.public_activity_summary).toBe("MONITORING");
    expect(projection.public_activity_reason).toBe("Monitoring an active growth experiment");
    expect(stringifyPublicProjection(projection)).not.toContain("EXISTING_GROWTH");
    expect(stringifyPublicProjection(projection)).not.toContain("IDLE_NO_ACTION");
  });

  it("preview model uses only public fields", () => {
    const preview = publicOperationsPreviewModel(projected());
    expect(preview.title).toBe("Infinity OS");
    expect(preview.system_status).toBe("System Operational");
    expect(JSON.stringify(preview)).not.toContain("@");
    expect(JSON.stringify(preview)).not.toContain("AskReview");
  });

  it("evaluates the public gate bundle", () => {
    const projection = projected();
    const gates = evaluatePublicProjectionGateBundle({
      projection,
      started: 3,
      operating: 1,
      completed: 4,
      loopActive: false,
    });
    expect(gates.every((row) => row.result === "PASS")).toBe(true);
  });

  it("empty unavailable projection stays allowlisted", () => {
    const projection = emptyUnavailableProjection("2026-09-15T01:00:00.000Z");
    expect(evaluatePublicProjectionFieldAllowlistGate(projection).result).toBe("PASS");
    expect(evaluatePublicProjectionFailureSanitizationGate(projection).result).toBe("PASS");
  });
});
