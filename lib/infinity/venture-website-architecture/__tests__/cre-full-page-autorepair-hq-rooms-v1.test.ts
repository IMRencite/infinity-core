import { describe, expect, it } from "vitest";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { roomForStep } from "@/lib/infinity/mission-activity/rooms";
import { workerRoleForStep } from "@/lib/infinity/mission-activity/worker-roles";
import {
  CRE_FULL_PAGE_AUTOREPAIR_MISSION,
  CRE_FULL_PAGE_AUTOREPAIR_STEPS,
} from "../answer-authority/full-page-autorepair-mission";

describe("CRE full-page autorepair HQ rooms", () => {
  it("routes this work to Command, Creation Lab, Systems Architect, Validation Station, and Signal Intelligence", () => {
    expect(CRE_FULL_PAGE_AUTOREPAIR_MISSION).toBe("CRE_FULL_PAGE_RENDER_VALIDATE_REPAIR_V1");
    expect(CRE_FULL_PAGE_AUTOREPAIR_STEPS[0]).toBe("ORCHESTRATE_FULL_PAGE_AUTOREPAIR");
    expect(roomForStep("ORCHESTRATE_FULL_PAGE_AUTOREPAIR", "mission_runtime")).toBe("executive_office");
    expect(roomForStep("PAGE_COMPOSE", "venture_build_orchestration")).toBe("product_lab");
    expect(roomForStep("DESIGN_SYSTEM_REPAIR", "venture_systems_architecture")).toBe("systems_architect");
    expect(roomForStep("PAGE_RENDER", "market_validation")).toBe("quality_control");
    expect(roomForStep("PAGE_VALIDATE", "market_validation")).toBe("quality_control");
    expect(roomForStep("PAGE_REPAIR_LOOP", "market_validation")).toBe("quality_control");
    expect(roomForStep("REPEATED_FAILURE_PROMOTION", "venture_systems_architecture")).toBe("systems_architect");
    expect(roomForStep("PRESERVE_EXPERIMENT_OBSERVER", "performance_intelligence")).toBe("intelligence_center");
    expect(workerRoleForStep("ORCHESTRATE_FULL_PAGE_AUTOREPAIR", "mission_runtime")).toBe("Command");
    expect(workerRoleForStep("PAGE_COMPOSE", "venture_build_orchestration")).toBe("Writer");
    expect(workerRoleForStep("PAGE_VALIDATE", "market_validation")).toBe("Reviewer");
    const contract = instrumentedRuntimeRegistry().contracts.CreFullPageAutorepairRuntime;
    expect(contract.usesCanonicalMissionWrapper).toBe(true);
    expect(contract.stepToRoom.PAGE_VALIDATE).toBe("quality_control");
    expect(contract.stepToRoom.PAGE_COMPOSE).toBe("product_lab");
    expect(Object.values(contract.stepToRoom)).not.toContain("launch_operations");
    expect(Object.values(contract.stepToRoom)).not.toContain("growth_department");
  });

  it("does not send this milestone to Deployment Depot or Growth Nexus", () => {
    expect(roomForStep("CREATE_DEPLOYMENT", "launch_gateway")).toBe("launch_operations");
    expect(roomForStep("PROVIDER_SEND", "organic_growth")).toBe("growth_department");
    expect(CRE_FULL_PAGE_AUTOREPAIR_STEPS).not.toContain("CREATE_DEPLOYMENT");
    expect(CRE_FULL_PAGE_AUTOREPAIR_STEPS).not.toContain("PROVIDER_SEND");
    expect(CRE_FULL_PAGE_AUTOREPAIR_STEPS).not.toContain("OUTREACH_PREPARATION");
  });
});
