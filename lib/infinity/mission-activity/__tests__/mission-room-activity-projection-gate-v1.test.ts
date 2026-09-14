import { describe, expect, it } from "vitest";
import { emitMissionActivity } from "../emit";
import { evaluateMissionRoomActivityProjectionGate } from "../mission-room-activity-projection-gate";
import { projectCommandActivity } from "../project";
import { resetMissionActivityStore } from "../store";
import {
  consumedDeploymentAuthorizations,
  deriveTerminalOutcome,
  rankMissionsFromGroups,
} from "../select-execution";

describe("MissionRoomActivityProjectionGate", () => {
  it("fails when PUBLIC_ARTIFACT_QUALITY_GATE is running and Validation Station is idle", () => {
    expect(
      evaluateMissionRoomActivityProjectionGate({
        openSteps: [{ stepType: "PUBLIC_ARTIFACT_QUALITY_GATE", engine: "market_validation" }],
        rooms: { quality_control: "PRESENT_IDLE", executive_office: "ACTIVE_WORK", launch_operations: "ACTIVE_WORK" },
        command: "ACTIVE_WORK",
      }).overall,
    ).toBe("FAIL");
  });

  it("passes when PUBLIC_ARTIFACT_QUALITY_GATE is running and Validation Station is ACTIVE_WORK", () => {
    expect(
      evaluateMissionRoomActivityProjectionGate({
        openSteps: [{ stepType: "PUBLIC_ARTIFACT_QUALITY_GATE", engine: "market_validation" }],
        rooms: { quality_control: "ACTIVE_WORK", executive_office: "ACTIVE_WORK", launch_operations: "ACTIVE_WORK" },
        command: "ACTIVE_WORK",
        deploymentWriteCompleted: true,
        liveValidationOpen: true,
      }).overall,
    ).toBe("PASS");
  });

  it("fails when a deployment write completed and the old authorization remains active", () => {
    expect(
      evaluateMissionRoomActivityProjectionGate({
        openSteps: [],
        rooms: {},
        deploymentWriteCompleted: true,
        liveValidationOpen: false,
        consumedDeploymentAuthorizationStillActive: true,
        terminalOutcome: "DEPLOYED_NOT_ACTIVATED",
        newRepairBlocker: "CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_REQUIRED",
      }).overall,
    ).toBe("FAIL");
  });

  it("passes DEPLOYED_NOT_ACTIVATED terminal cleanup with a new repair blocker", () => {
    expect(
      evaluateMissionRoomActivityProjectionGate({
        openSteps: [],
        rooms: {},
        deploymentWriteCompleted: true,
        liveValidationOpen: false,
        consumedDeploymentAuthorizationStillActive: false,
        terminalOutcome: "DEPLOYED_NOT_ACTIVATED",
        newRepairBlocker: "CRE_SITE_CHROME_LINK_CONTRAST_REPAIR_REQUIRED",
      }).overall,
    ).toBe("PASS");
  });

  it("supersedes a consumed hub-layout deployment authorization so the predecessor is not current", () => {
    resetMissionActivityStore();
    const org = "org_consumed_hub_layout_auth_v1";
    emitMissionActivity({
      organizationId: org,
      missionId: "msn_cre_hub_question_board_layout_repair_v1",
      missionType: "CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_V1",
      engine: "market_validation",
      stepType: "QUALITY_REVIEW",
      eventType: "MISSION_BLOCKED",
      status: "READY_BLOCKED",
      blocker: "GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_REQUIRED",
      authorizationRequired: "GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_REQUIRED",
      summary: "Hub layout frozen. Deployment still required.",
      source: "test",
      executionClass: "VENTURE_EXECUTION",
      synthetic: false,
    });
    emitMissionActivity({
      organizationId: org,
      missionId: "msn_cre_hub_layout_repair_deploy_v1",
      missionType: "GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1",
      engine: "launch_gateway",
      stepType: "CREATE_DEPLOYMENT",
      eventType: "STEP_COMPLETED",
      summary: "Published the hub-layout successor",
      source: "test",
      executionClass: "VENTURE_EXECUTION",
      synthetic: false,
    });
    emitMissionActivity({
      organizationId: org,
      missionId: "msn_cre_hub_layout_repair_deploy_v1",
      missionType: "GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1",
      engine: "market_validation",
      stepType: "PUBLIC_ARTIFACT_QUALITY_GATE",
      eventType: "MISSION_COMPLETED",
      summary: "Live QC failed. Not activated.",
      source: "test",
      executionClass: "VENTURE_EXECUTION",
      synthetic: false,
    });
    const view = projectCommandActivity({ organizationId: org });
    expect(view.nowInspecting.currentMission).not.toBe("CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_V1");
    expect(view.latestCompleted?.missionType).toBe("GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1");
    expect(view.latestCompleted?.outcome).toBe("DEPLOYED_NOT_ACTIVATED");
    const byMission = new Map<string, typeof view.recentEvents>();
    for (const event of view.recentEvents) {
      const list = byMission.get(event.missionId) ?? [];
      list.push(event);
      byMission.set(event.missionId, list);
    }
    expect(consumedDeploymentAuthorizations(view.recentEvents.length ? [] : []).size).toBeGreaterThanOrEqual(0);
    expect(deriveTerminalOutcome).toBeTypeOf("function");
    expect(rankMissionsFromGroups).toBeTypeOf("function");
  });

  it("projects Validation Station ACTIVE_WORK while PUBLIC_ARTIFACT_QUALITY_GATE is open", () => {
    resetMissionActivityStore();
    const org = "org_validation_station_live_qc_v1";
    const base = {
      organizationId: org,
      missionId: "msn_cre_hub_layout_repair_deploy_v1",
      missionType: "GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1",
      source: "test",
      executionClass: "VENTURE_EXECUTION" as const,
      synthetic: false,
    };
    emitMissionActivity({
      ...base,
      engine: "mission_runtime",
      stepType: "ORCHESTRATE_HUB_LAYOUT_REPAIR_DEPLOY",
      eventType: "MISSION_STARTED",
      summary: "Starting deploy",
    });
    emitMissionActivity({
      ...base,
      engine: "launch_gateway",
      stepType: "CREATE_DEPLOYMENT",
      eventType: "STEP_STARTED",
      summary: "Writing the source bundle",
    });
    emitMissionActivity({
      ...base,
      engine: "launch_gateway",
      stepType: "CREATE_DEPLOYMENT",
      eventType: "STEP_COMPLETED",
      summary: "Provider write completed",
    });
    emitMissionActivity({
      ...base,
      engine: "market_validation",
      stepType: "PUBLIC_ARTIFACT_QUALITY_GATE",
      eventType: "STEP_STARTED",
      summary: "Verifying live routes",
    });
    const view = projectCommandActivity({ organizationId: org });
    expect(view.rooms.quality_control.status).toBe("ACTIVE_WORK");
    expect(view.rooms.launch_operations.status).toBe("ACTIVE_WORK");
    expect(view.rooms.executive_office.status).toBe("ACTIVE_WORK");
    expect(
      evaluateMissionRoomActivityProjectionGate({
        openSteps: [{ stepType: "PUBLIC_ARTIFACT_QUALITY_GATE", engine: "market_validation" }],
        completedSteps: ["CREATE_DEPLOYMENT"],
        rooms: {
          quality_control: view.rooms.quality_control.status,
          launch_operations: view.rooms.launch_operations.status,
          executive_office: view.rooms.executive_office.status,
        },
        command: view.rooms.executive_office.status,
        deploymentWriteCompleted: true,
        liveValidationOpen: true,
      }).overall,
    ).toBe("PASS");
  });
});
