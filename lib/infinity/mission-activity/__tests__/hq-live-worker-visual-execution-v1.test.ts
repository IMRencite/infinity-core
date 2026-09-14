import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { deriveRoomPresence } from "@/lib/infinity/operator-console/room-presence";
import { enrichOperatorSnapshot } from "@/lib/infinity/operator-console/enrich-snapshot";
import { reconstructCreDirectResponseSuccessor } from "@/lib/infinity/venture-website-architecture/cre-dr-successor";
import { auditSuccessorAuthorityArtifact } from "@/lib/infinity/venture-website-architecture/answer-authority/successor-audit";
import { PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD } from "@/lib/infinity/venture-website-architecture/constants";
import {
  attachCommandActivity,
  emitMissionActivity,
  hqBrowserReadModel,
  projectCommandActivity,
  resetMissionActivityStore,
  runHqLiveWorkerVisualProofMission,
  HQ_LIVE_WORKER_PROOF_MISSION,
  HQ_LIVE_WORKER_PROOF_MISSION_ID,
} from "../index";
import { hqBrowserReadModel as readModel } from "../hq-live-worker-proving-mission";

describe("HQ live worker visual execution v1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
  });

  it("projects worker role, room, task, status, and timestamps from real mission events", () => {
    emitMissionActivity({
      organizationId: "org_workers",
      ventureId: "ven_workers",
      missionId: "msn_workers",
      missionType: "PROOF",
      engine: "product_asset_builder",
      stepType: "PAGE_GENERATION",
      eventType: "MISSION_STARTED",
      executionClass: "VENTURE_EXECUTION",
    });
    emitMissionActivity({
      organizationId: "org_workers",
      ventureId: "ven_workers",
      missionId: "msn_workers",
      missionType: "PROOF",
      engine: "product_asset_builder",
      stepType: "PAGE_GENERATION",
      eventType: "STEP_STARTED",
      summary: "Expanding the commercial lease NPV authority page.",
      executionClass: "VENTURE_EXECUTION",
    });
    const view = projectCommandActivity({ organizationId: "org_workers", ventureId: "ven_workers" });
    const writer = view.activeWorkers.find((worker) => worker.role === "Writer");
    expect(writer).toMatchObject({
      room: "product_lab",
      task: "Expanding the commercial lease NPV authority page.",
      status: "ACTIVE_WORK",
    });
    expect(writer?.startedAt).toBeTruthy();
    expect(writer?.lastActivityAt).toBeTruthy();
    expect(writer?.provider).toBeNull();
    expect(view.rooms.executive_office.status).toBe("ACTIVE_WORK");
    expect(view.rooms.product_lab.status).toBe("ACTIVE_WORK");
    expect(view.nowInspecting.currentWorker).toBe("Writer");
    expect(view.nowInspecting.currentTask).toBe("Expanding the commercial lease NPV authority page.");
  });

  it("does not activate venture rooms for SYSTEM_DEVELOPMENT", () => {
    emitMissionActivity({
      organizationId: "org_dev",
      ventureId: "ven_dev",
      missionId: "msn_dev",
      missionType: "CURSOR_EDIT",
      engine: "product_asset_builder",
      stepType: "PAGE_GENERATION",
      eventType: "STEP_STARTED",
      executionClass: "SYSTEM_DEVELOPMENT",
    });
    const view = projectCommandActivity({ organizationId: "org_dev", ventureId: "ven_dev" });
    expect(view.counts.activeMissions).toBe(0);
    expect(view.activeWorkers).toHaveLength(0);
    expect(view.rooms.product_lab.status).toBe("EMPTY");
  });

  it("attaches mission workers onto the same HQ snapshot the browser enriches", () => {
    emitMissionActivity({
      organizationId: LIVE_ORG,
      ventureId: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
      missionId: "msn_attach",
      missionType: "PROOF",
      engine: "creative_media",
      stepType: "VISUAL_PLANNING",
      eventType: "STEP_STARTED",
      summary: "Planning cash-flow and NPV visual explanations.",
      executionClass: "VENTURE_EXECUTION",
    });
    const snapshot = hqBrowserReadModel(LIVE_ORG);
    expect(snapshot.currentActivity.active).toBe(true);
    expect(snapshot.currentDepartments).toContain("creative_studio");
    expect(snapshot.currentDepartments).toContain("executive_office");
    const workers = snapshot.workerNodes ?? [];
    expect(workers.some((node) => node.displayRole === "Design Planner" && node.motionActive)).toBe(true);
    const design = workers.filter((node) => node.departmentId === "creative_studio");
    const presence = deriveRoomPresence(design, "RUNNING");
    expect(presence.state).toBe("ACTIVE_WORK");
    expect(presence.agentsPresent).toBeGreaterThan(0);
    expect(presence.allowAmbientMotion).toBe(true);
  });

  it("keeps blocked, waiting, and failed workers visible without glow", () => {
    emitMissionActivity({
      organizationId: "org_fail",
      missionId: "msn_fail_worker",
      missionType: "PROOF",
      engine: "launch_gateway",
      stepType: "CREATE_DEPLOYMENT",
      eventType: "STEP_STARTED",
    });
    emitMissionActivity({
      organizationId: "org_fail",
      missionId: "msn_fail_worker",
      missionType: "PROOF",
      engine: "launch_gateway",
      stepType: "CREATE_DEPLOYMENT",
      eventType: "STEP_FAILED",
    });
    const failed = projectCommandActivity({ organizationId: "org_fail" });
    const failedWorker = failed.activeWorkers.find((worker) => worker.role);
    expect(failedWorker?.status).toBe("FAILED");
    const failedSnap = attachCommandActivity(readModel("org_fail"), failed);
    const failedNode = failedSnap.workerNodes?.find((node) => node.departmentId === "launch_operations");
    expect(failedNode?.motionActive).toBe(false);
    expect(failedNode?.isActive).toBe(false);

    resetMissionActivityStore();
    emitMissionActivity({
      organizationId: "org_block",
      missionId: "msn_block_worker",
      missionType: "PROOF",
      engine: "mission_runtime",
      stepType: "PAGE_GENERATION",
      eventType: "STEP_STARTED",
    });
    emitMissionActivity({
      organizationId: "org_block",
      missionId: "msn_block_worker",
      missionType: "PROOF",
      engine: "mission_runtime",
      stepType: "PAGE_GENERATION",
      eventType: "MISSION_BLOCKED",
      blocker: "FOUNDER_AUTHORIZATION_REQUIRED",
      authorizationRequired: "FOUNDER_AUTHORIZATION_REQUIRED",
    });
    const blocked = projectCommandActivity({ organizationId: "org_block" });
    expect(blocked.nowInspecting.authorizationRequired).toBe("FOUNDER_AUTHORIZATION_REQUIRED");
    const blockedWorker = blocked.activeWorkers.find((worker) => worker.stepType === "PAGE_GENERATION");
    expect(blockedWorker?.status).toBe("READY_BLOCKED");

    resetMissionActivityStore();
    emitMissionActivity({
      organizationId: "org_wait",
      missionId: "msn_wait_worker",
      missionType: "PROOF",
      engine: "product_asset_builder",
      stepType: "PAGE_GENERATION",
      eventType: "STEP_STARTED",
    });
    emitMissionActivity({
      organizationId: "org_wait",
      missionId: "msn_wait_worker",
      missionType: "PROOF",
      engine: "product_asset_builder",
      stepType: "PAGE_GENERATION",
      eventType: "MISSION_WAITING",
    });
    const waiting = projectCommandActivity({ organizationId: "org_wait" });
    const waitingWorker = waiting.activeWorkers.find((worker) => worker.stepType === "PAGE_GENERATION");
    expect(waitingWorker?.status === "WAITING_EXTERNAL" || waitingWorker?.status === "WAITING_INTERNAL").toBe(true);
    const waitingSnap = attachCommandActivity(readModel("org_wait"), waiting);
    expect(waitingSnap.workerNodes?.every((node) => !node.motionActive || node.departmentId === "executive_office") || waitingSnap.workerNodes?.every((node) => !node.motionActive)).toBe(true);
  });

  it("wires ACTIVE_WORK glow/motion classes and suppresses NO AGENTS PRESENT while a worker is active", () => {
    const workerSource = readFileSync(join(process.cwd(), "components/dashboard/operator-console/worker-node.tsx"), "utf8");
    expect(workerSource).toContain("hq-worker-orb--active-work");
    expect(workerSource).toContain("hq-worker-orb--motion");
    expect(workerSource).toContain("hq-worker-orb--static");
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toContain(".hq-worker-orb--active-work");
    expect(css).toContain(".hq-worker-orb--static");
    const room = readFileSync(join(process.cwd(), "components/dashboard/operator-console/department-room.tsx"), "utf8");
    expect(room).toContain("data-hq-now-work");
    expect(room).toContain("data-hq-output-history");
    const rail = readFileSync(join(process.cwd(), "components/dashboard/operator-console/infinity-room/room-presence-track.tsx"), "utf8");
    expect(rail).toContain("presence.activeNodes");
    const poll = readFileSync(join(process.cwd(), "components/dashboard/operator-console/venture-operator-console.tsx"), "utf8");
    expect(poll).toContain("useHqLiveProjection");
    expect(poll).not.toContain("setInterval(refresh, 1000)");
    expect(poll).not.toContain("setInterval(refresh, intervalMs)");
  });

  it("runs a bounded proving mission and captures the browser read model before completion", async () => {
    const captured: Array<{ phase: string; active: number; rooms: string[]; workers: string[]; tasks: string[] }> = [];
    const run = await runHqLiveWorkerVisualProofMission({
      organizationId: LIVE_ORG,
      onSnapshot: (_view, phase, snapshot) => {
        captured.push({
          phase,
          active: snapshot.commandActivity?.counts.activeMissions ?? 0,
          rooms: snapshot.currentDepartments,
          workers: (snapshot.workerNodes ?? []).filter((node) => node.motionActive).map((node) => node.displayRole),
          tasks: (snapshot.workerNodes ?? []).filter((node) => node.motionActive).map((node) => node.displayTask ?? ""),
        });
      },
    });
    expect(run.result.generated.path).toBe("app/hq-live-proof/page.tsx");
    expect(run.successorMutated).toBe(false);
    expect(run.deployed).toBe(false);
    const duringGeneration = captured.find((item) => item.phase === "PAGE_GENERATION:STARTED");
    expect(duringGeneration).toBeTruthy();
    expect(duringGeneration!.active).toBeGreaterThanOrEqual(1);
    expect(duringGeneration!.rooms).toContain("product_lab");
    expect(duringGeneration!.workers).toContain("Writer");
    expect(duringGeneration!.tasks.some((task) => /disposable local HQ proving page/i.test(task))).toBe(true);
    const duringDesign = captured.find((item) => item.phase === "VISUAL_PLANNING:STARTED");
    expect(duringDesign?.rooms).toContain("creative_studio");
    expect(duringDesign?.workers).toContain("Design Planner");
    const duringSystems = captured.find((item) => item.phase === "SITE_ARCHITECTURE:STARTED");
    expect(duringSystems?.rooms).toContain("systems_architect");
    expect(duringSystems?.workers).toContain("Site Architect");
    const duringQc = captured.find((item) => item.phase === "QUALITY_REVIEW:STARTED");
    expect(duringQc?.rooms).toContain("quality_control");
    expect(duringQc?.workers).toContain("Reviewer");
    expect(captured.some((item) => item.rooms.includes("research_department") && item.phase.includes("SOURCE_RESEARCH"))).toBe(false);
    expect(run.capturedBeforeCompletion).toBe(true);
    expect(run.hqReadModelAfter.currentActivity.active).toBe(false);
    expect(run.hqReadModelAfter.workerNodes?.filter((node) => node.motionActive) ?? []).toHaveLength(0);
    expect(run.view.counts.activeMissions).toBe(0);
    expect(run.view.latestCompleted?.missionId).toBe(HQ_LIVE_WORKER_PROOF_MISSION_ID);
    expect(run.view.latestCompleted?.missionType).toBe(HQ_LIVE_WORKER_PROOF_MISSION);
    const refreshed = enrichOperatorSnapshot(hqBrowserReadModel(LIVE_ORG));
    expect(refreshed.commandActivity?.latestCompleted?.missionId).toBe(HQ_LIVE_WORKER_PROOF_MISSION_ID);
    expect(refreshed.currentActivity.active).toBe(false);
  }, 120000);

  it("preserves the CRE successor identity and publishability after HQ changes", async () => {
    const successor = await reconstructCreDirectResponseSuccessor();
    expect(successor.artifactId).toBe("art_b50a3f6ea9bebb9c6f59");
    expect(successor.digest).toBe("67159d68c81c1057e70c415a4dbc165f29d4cbccea64e0db1c8c76378ccb58a8");
    expect(successor.deployed).toBe(false);
    const audit = await auditSuccessorAuthorityArtifact({
      files: successor.files,
      architecture: successor.architecture,
      graph: successor.graph,
      artifactId: successor.artifactId,
      digest: successor.digest,
    });
    expect(audit.newClassification).toBe(PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD);
    expect(audit.hardFailPages).toBe(0);
    expect(audit.homepage.overall).toBe("PASS");
    expect(audit.npv.overall).toBe("PASS");
    expect(audit.hub.overall).toBe("PASS");
    const evidence = inspectRealMarketEvidence({ now: new Date("2026-08-30T05:53:00.000Z") });
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.clock.evidenceStart).toBe("2026-08-29T15:18:52.131Z");
    expect(evidence.clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(evidence.clock.restarted).toBe(false);
  }, 120000);
});
