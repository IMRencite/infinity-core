import { CRE_VENTURE_ID } from "../lib/infinity/venture-operating-scale/constants";
import { completeCanonicalWork, upsertCanonicalWork } from "../lib/infinity/canonical-work/store";
import { CANONICAL_WORK_EXECUTION_CONTRACT, type CanonicalWorkExecutionContract } from "../lib/infinity/canonical-work/types";
import { HQ_LIVE_PROOF_HEADER } from "../lib/infinity/operator-console/local-hq-proof";

const HQ = process.env.INFINITY_HQ_URL ?? "http://127.0.0.1:3000";
const FIRST = `work:hq:live-floor-wiring-proof:${Date.now()}`;
const SECOND = `${FIRST}:second`;

async function liveState(): Promise<{
  commandActivity?: {
    nowInspecting?: { currentWorkId?: string | null; currentMission?: string | null; currentTask?: string | null; status?: string | null };
    counts?: { activeMissions?: number };
    rooms?: Record<string, { status?: string }>;
    activeWorkers?: Array<{ stepId?: string | null }>;
  };
}> {
  const res = await fetch(`${HQ}/api/operator-console/hq-live-state`, {
    headers: { [HQ_LIVE_PROOF_HEADER]: "1" },
  });
  if (!res.ok) throw new Error(`hq-live-state ${res.status}`);
  return res.json() as Promise<{ commandActivity?: never }>;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function until(label: string, check: () => Promise<boolean>, attempts = 20) {
  for (let i = 0; i < attempts; i += 1) {
    if (await check()) return;
    await wait(500);
  }
  throw new Error(`LIVE_FLOOR_TIMEOUT:${label}`);
}

function work(id: string, title: string, status: "ACTIVE" | "COMPLETED", task: string, rooms: string[]) {
  const now = new Date().toISOString();
  return {
    contract: CANONICAL_WORK_EXECUTION_CONTRACT,
    work_id: id,
    mission_id: `mission:${id}`,
    venture_id: CRE_VENTURE_ID,
    work_type: "QC" as const,
    title,
    description: task,
    stage: "QC",
    status,
    assigned_rooms: rooms as CanonicalWorkExecutionContract["assigned_rooms"],
    assigned_workers: ["Design Core", "Validation Station", "Deployment Depot"],
    source: "EXTERNAL_IMPLEMENTATION_AGENT" as const,
    started_at: now,
    updated_at: now,
    completed_at: status === "COMPLETED" ? now : null,
    blocked_reason: null,
    authorization_state: null,
    progress: status,
    latest_output: task,
    artifact_refs: [],
    evidence_refs: [],
    parent_work_id: null,
    traceability_links: [id],
    requires_infinity_worker_execution: false,
    next_expected_transition: status === "ACTIVE" ? "Update task" : "IDLE",
  };
}

async function main() {
  process.env.INFINITY_CANONICAL_WORK_PERSIST = "1";
  const before = await liveState();
  upsertCanonicalWork(work(FIRST, "OccupancyNPV — Brand Identity + Favicon Repair", "ACTIVE", "Start brand repair", ["creative_studio", "quality_control", "launch_operations"]));
  await until("start", async () => {
    const live = await liveState();
    return live.commandActivity?.nowInspecting?.currentWorkId === FIRST
      && live.commandActivity?.nowInspecting?.currentMission === "OccupancyNPV — Brand Identity + Favicon Repair"
      && live.commandActivity?.rooms?.creative_studio?.status === "ACTIVE_WORK"
      && (live.commandActivity?.activeWorkers?.some((row) => row.stepId === FIRST) ?? false);
  });
  upsertCanonicalWork(work(FIRST, "OccupancyNPV — Brand Identity + Favicon Repair", "ACTIVE", "Favicon derived from compact O", ["creative_studio", "quality_control", "launch_operations"]));
  await until("task", async () => (await liveState()).commandActivity?.nowInspecting?.currentTask?.includes("Favicon") === true);
  completeCanonicalWork(FIRST, "Brand repair complete");
  await until("complete", async () => {
    const live = await liveState();
    return live.commandActivity?.nowInspecting?.currentWorkId !== FIRST
      && (live.commandActivity?.counts?.activeMissions ?? 0) === 0;
  });
  upsertCanonicalWork(work(SECOND, "OccupancyNPV — App Action Hierarchy Repair", "ACTIVE", "Second mission", ["product_lab", "quality_control"]));
  await until("second", async () => (await liveState()).commandActivity?.nowInspecting?.currentWorkId === SECOND);
  completeCanonicalWork(SECOND, "Second mission complete");
  await until("second-complete", async () => (await liveState()).commandActivity?.nowInspecting?.currentWorkId !== SECOND);
  const after = await liveState();
  console.log(JSON.stringify({
    beforeMission: before.commandActivity?.nowInspecting?.currentMission ?? null,
    afterMission: after.commandActivity?.nowInspecting?.currentMission ?? null,
    first: FIRST,
    second: SECOND,
    result: "PASS",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
