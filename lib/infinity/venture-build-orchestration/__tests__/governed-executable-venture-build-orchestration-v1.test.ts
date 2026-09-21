import { describe, expect, it, beforeEach } from "vitest";
import { deriveRoomPresence } from "@/lib/infinity/operator-console/room-presence";
import { ROOM_DISPLAY_NAMES } from "@/lib/infinity/operator-console/room-naming";
import { evaluateBuildAuthorization } from "../authorization";
import { compileExecutableVenturePlan } from "../compile";
import {
  CANONICAL_FOOTER_COPY,
  CANONICAL_IMR_URL,
  CANONICAL_INFINITY_OS_URL,
  GENERIC_MVP_FORBIDDEN,
  WRITE_BOUNDARY,
} from "../constants";
import {
  compileIdempotentExecutablePlan,
  executeGovernedVentureBuild,
  resetExecutableBuildRuntime,
} from "../execute";
import {
  authorizedBuildCompileInput,
  blockedCompileInput,
  CRE_CANDIDATE_ID,
  validateCreCompileInput,
} from "../fixtures";
import { findRealBuildReadyAutonomousVenture, inspectCanonicalCandidateBuildAuthority } from "../inspect";
import { roomPresenceFromTasks, workerNodesFromTasks } from "../rooms";

describe("GOVERNED EXECUTABLE VENTURE BUILD ORCHESTRATION V1", () => {
  beforeEach(() => {
    resetExecutableBuildRuntime();
  });

  it("authorizes BUILD only when decision is BUILD and buildReady is true", () => {
    const authorized = evaluateBuildAuthorization(authorizedBuildCompileInput());
    expect(authorized.result).toBe("AUTHORIZED_BUILD");
    expect(authorized.buildReady).toBe(true);

    const validate = evaluateBuildAuthorization(validateCreCompileInput());
    expect(validate.result).toBe("VALIDATION_REQUIRED");
    expect(validate.buildReady).toBe(false);

    const force = evaluateBuildAuthorization(validateCreCompileInput({ buildReady: true }));
    expect(force.result).toBe("VALIDATION_REQUIRED");
    expect(force.blocker).toMatch(/VALIDATE/);

    const blocked = evaluateBuildAuthorization(blockedCompileInput());
    expect(blocked.result).toBe("EVIDENCE_BLOCKED");
  });

  it("does not compile build missions or artifacts for VALIDATE", async () => {
    const { plan, buildPackage } = compileExecutableVenturePlan(validateCreCompileInput());
    expect(plan.kind).toBe("VALIDATION_WORK");
    expect(plan.tasks.some((task) => task.phase === "PRODUCT_BUILD")).toBe(false);
    expect(buildPackage).toBeNull();
    const result = await executeGovernedVentureBuild({ compile: validateCreCompileInput() });
    expect(result.artifact).toBeNull();
    expect(result.handoff).toBeNull();
    expect(result.authorization.result).toBe("VALIDATION_REQUIRED");
    expect(result.writeBoundary.missionWrites).toBe(0);
  });

  it("does not compile a build mission when evidence is missing", async () => {
    const { plan } = compileExecutableVenturePlan(blockedCompileInput());
    expect(plan.kind).toBe("BLOCKED");
    expect(plan.tasks).toEqual([]);
    const result = await executeGovernedVentureBuild({ compile: blockedCompileInput() });
    expect(result.artifact).toBeNull();
    expect(result.authorization.blocker).toBeTruthy();
  });

  it("compiles an idempotent executable plan for an authorized BUILD fixture", () => {
    const first = compileIdempotentExecutablePlan(authorizedBuildCompileInput());
    const second = compileIdempotentExecutablePlan(authorizedBuildCompileInput());
    expect(first.plan.planId).toBe(second.plan.planId);
    expect(first.plan.tasks.map((task) => task.taskId)).toEqual(second.plan.tasks.map((task) => task.taskId));
    expect(first.buildPackage?.packageId).toBe(second.buildPackage?.packageId);
  });

  it("orders tasks by dependencies and routes by capability, not provider", () => {
    const { plan } = compileExecutableVenturePlan(authorizedBuildCompileInput());
    expect(plan.phases.map((item) => item.phase)).toEqual([
      "VENTURE_DEFINITION",
      "PRODUCT_SPECIFICATION",
      "SYSTEMS_CONFIGURATION",
      "MONETIZATION_CONFIGURATION",
      "CONTENT_ASSET_BUILD",
      "PRODUCT_BUILD",
      "QUALITY_VALIDATION",
      "PRODUCTION_ARTIFACT",
      "DEPLOYMENT_PREPARATION",
    ]);
    const byId = new Map(plan.tasks.map((task) => [task.taskId, task]));
    for (const task of plan.tasks) {
      for (const dep of task.dependencies) {
        expect(byId.has(dep)).toBe(true);
      }
    }
    const spec = plan.tasks.find((task) => task.phase === "PRODUCT_SPECIFICATION")!;
    const build = plan.tasks.find((task) => task.phase === "PRODUCT_BUILD")!;
    const qa = plan.tasks.find((task) => task.phase === "QUALITY_VALIDATION")!;
    const handoff = plan.tasks.find((task) => task.phase === "PRODUCTION_ARTIFACT")!;
    expect(build.dependencies).toContain(spec.taskId);
    expect(qa.dependencies).toContain(build.taskId);
    expect(handoff.dependencies).toContain(qa.taskId);
    expect(build.requiredCapability).toBe("coding");
    expect(build.capabilityRoute.requiredCapabilityKey).toBe("website.generate_pages");
    expect(plan.tasks.some((task) => task.expectedArtifact === "page_depth_plan")).toBe(true);
    expect(build.dependencies).toContain(plan.tasks.find((task) => task.expectedArtifact === "page_depth_plan")!.taskId);
    expect(build.capabilityRoute.providerNeutral).toBe(true);
    expect(plan.capabilityRoutes.some((route) => /openai|gemini|vercel|stripe/i.test(route.capability))).toBe(false);
  });

  it("derives product, systems, and monetization requirements from evidence, not generic MVP", () => {
    const { plan, buildPackage } = compileExecutableVenturePlan(authorizedBuildCompileInput());
    expect(plan.productRequirements.targetCustomer).toMatch(/CRE brokers/i);
    expect(plan.productRequirements.problem).toMatch(/spreadsheet/i);
    expect(plan.productRequirements.corePromise).toMatch(/NPV|lease/i);
    expect(plan.productRequirements.mvpScope.join(" ")).toMatch(/lease|NPV/i);
    for (const forbidden of GENERIC_MVP_FORBIDDEN) {
      expect(plan.productRequirements.mvpScope.map((item) => item.toLowerCase())).not.toContain(forbidden);
    }
    expect(plan.systemsRequirements.items.length).toBeGreaterThan(0);
    expect(plan.systemsRequirements.items.every((item) => item.ventureSpecific)).toBe(true);
    expect(plan.monetizationRequirements.model).toMatch(/saas|subscription/i);
    expect(plan.monetizationRequirements.paymentsNeeded).toBe(true);
    expect(plan.monetizationRequirements.livePaymentActivation).toBe(false);
    expect(buildPackage?.publicWebsite.footerAttribution.required).toBe(true);
    expect(buildPackage?.publicWebsite.footerAttribution.copy).toBe(CANONICAL_FOOTER_COPY);
  });

  it("executes an authorized internal build to a validated artifact and production handoff", async () => {
    const result = await executeGovernedVentureBuild({ compile: authorizedBuildCompileInput() });
    expect(result.authorization.result).toBe("AUTHORIZED_BUILD");
    expect(result.plan.status).toBe("BUILT");
    expect(result.buildPackage).toBeTruthy();
    expect(result.missions.length).toBeGreaterThan(0);
    expect(result.artifact?.realProductArtifact).toBe(true);
    expect(result.artifact?.files.length).toBeGreaterThanOrEqual(8);
    expect(result.artifact?.files.some((file) => file.path === "app/page.tsx")).toBe(true);
    expect(result.artifact?.files.some((file) => file.path === "lib/domain.ts")).toBe(true);
    const footer = result.artifact?.files.find((file) => file.path === "components/venture-footer.tsx")?.content ?? "";
    expect(footer).toContain(CANONICAL_FOOTER_COPY);
    expect(footer).toContain(CANONICAL_INFINITY_OS_URL);
    expect(footer).toContain(CANONICAL_IMR_URL);
    expect(footer).not.toMatch(/nofollow/i);
    expect(result.validation?.passed).toBe(true);
    expect(result.validation?.footer).toBe("PASS");
    expect(result.validation?.secretSafety).toBe("PASS");
    expect(result.validation?.tests).toBe("PASS");
    expect(result.validation?.build).toBe("PASS");
    expect(result.validation?.artifactContract).toBe("PASS");
    expect(result.handoff?.schemaVersion).toBe("production_artifact_handoff_v1");
    expect(result.handoff?.traceability.ventureId).toBe(result.plan.ventureId);
    expect(result.handoff?.deploymentAuthority).toBe("NONE");
    expect(result.publiclyDeployed).toBe(false);
    expect(result.deploymentReadiness?.readyForDeploymentExecution).not.toBe(true);
    expect(result.externalActions).toEqual({
      deployments: 0,
      domains: 0,
      dns: 0,
      payments: 0,
      treasuryMovement: 0,
      adSpend: 0,
    });
    expect(result.writeBoundary).toMatchObject(WRITE_BOUNDARY);
    expect(result.plan.traceability.candidateId).toBe("candidate-evbo-authorized-v1");
    expect(result.plan.traceability.planId).toBe(result.plan.planId);
    expect(result.plan.traceability.artifactId).toBe(result.artifact?.artifactId);
    expect(result.plan.traceability.handoffId).toBe(result.handoff?.handoffId);
    expect(result.plan.planVersion).toBe(1);
    expect(result.buildPackage?.packageVersion).toBe(1);
    expect(result.artifact?.artifactVersion).toBe(1);
  });

  it("repairs a failed footer validation within the bounded policy", async () => {
    const result = await executeGovernedVentureBuild({
      compile: authorizedBuildCompileInput({ ventureId: "venture-evbo-repair-v1" }),
      omitFooterFirstPass: true,
    });
    expect(result.repairs.length).toBeGreaterThan(0);
    expect(result.repairs.length).toBeLessThanOrEqual(2);
    expect(result.validation?.passed).toBe(true);
    expect(result.validation?.footer).toBe("PASS");
    expect(result.plan.status).toBe("BUILT");
    expect(result.artifact?.artifactVersion).toBeGreaterThan(1);
  });

  it("reuses an active run instead of starting a concurrent duplicate", async () => {
    const compile = authorizedBuildCompileInput({ ventureId: "venture-evbo-concurrent-v1" });
    const first = compileIdempotentExecutablePlan(compile);
    const concurrent = await executeGovernedVentureBuild({
      compile: { ...compile, alreadyBuilding: true },
    });
    expect(concurrent.authorization.result).toBe("ALREADY_BUILDING");
    expect(concurrent.artifact).toBeNull();
    expect(first.plan.planId).toBeTruthy();
  });

  it("drives HQ room presence from real task state without fake ACTIVE_WORK", () => {
    const { plan } = compileExecutableVenturePlan(authorizedBuildCompileInput());
    const running = plan.tasks.map((task) =>
      task.phase === "PRODUCT_BUILD" ? { ...task, status: "RUNNING" as const } : task,
    );
    const presence = roomPresenceFromTasks(running);
    const creation = presence.find((item) => item.roomId === "product_lab");
    expect(creation?.state).toBe("ACTIVE_WORK");
    expect(ROOM_DISPLAY_NAMES.product_lab.displayName).toBe("Creation Lab");
    expect(ROOM_DISPLAY_NAMES.quality_control.displayName).toBe("Validation Station");
    const nodes = workerNodesFromTasks(running.filter((task) => task.phase === "PRODUCT_BUILD"));
    const model = deriveRoomPresence(nodes, "RUNNING");
    expect(model.state).toBe("ACTIVE_WORK");
    expect(model.activeNodes[0]?.task).toMatch(/Product \/ Asset Builder|coding/i);
  });

  it("inspects the real CRE candidate as VALIDATE and does not force-build it", async () => {
    const fixture = compileExecutableVenturePlan(validateCreCompileInput());
    expect(fixture.plan.candidateId).toBe(CRE_CANDIDATE_ID);
    expect(fixture.plan.buildAuthorization.result).toBe("VALIDATION_REQUIRED");
    const live = await inspectCanonicalCandidateBuildAuthority(CRE_CANDIDATE_ID);
    if (!live) return;
    expect(live.id).toBe(CRE_CANDIDATE_ID);
    expect(live.authorization.result).not.toBe("AUTHORIZED_BUILD");
    expect(live.buildReady).toBe(false);
  }, 30_000);

  it("does not invent a real BUILD-ready autonomous venture", async () => {
    const found = await findRealBuildReadyAutonomousVenture();
    if (found) {
      expect(found.authorization.result).toBe("AUTHORIZED_BUILD");
      expect(found.origin).not.toBe("FOUNDER_IDEA");
    } else {
      expect(found).toBeNull();
    }
  }, 60_000);
});
