import { CRE_VENTURE_ID } from "../lib/infinity/venture-operating-scale/constants";
import { completeCanonicalWork, upsertCanonicalWork } from "../lib/infinity/canonical-work/store";
import { CANONICAL_WORK_EXECUTION_CONTRACT, type CanonicalWorkExecutionContract } from "../lib/infinity/canonical-work/types";
import { HQ_LIVE_PROOF_HEADER } from "../lib/infinity/operator-console/local-hq-proof";

const HQ = process.env.INFINITY_HQ_URL ?? "http://127.0.0.1:3000";
const WORK_ID = `work:hq:current-resolver-freshness:${Date.now()}`;
const TITLE = "OccupancyNPV — Current Work Resolver Freshness Proof";

async function liveState() {
  const res = await fetch(`${HQ}/api/operator-console/hq-live-state`, {
    headers: { [HQ_LIVE_PROOF_HEADER]: "1" },
  });
  if (!res.ok) throw new Error(`hq-live-state ${res.status}`);
  return res.json() as Promise<{
    commandActivity?: {
      nowInspecting?: { currentWorkId?: string | null; currentMission?: string | null; status?: string | null };
      latestCompleted?: { missionType?: string | null; missionId?: string | null };
      counts?: { activeMissions?: number };
    };
  }>;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function until(label: string, check: () => Promise<boolean>) {
  for (let i = 0; i < 20; i += 1) {
    if (await check()) return;
    await wait(500);
  }
  throw new Error(`FRESHNESS_TIMEOUT:${label}`);
}

function record(status: "ACTIVE" | "COMPLETED", task: string): CanonicalWorkExecutionContract {
  const now = new Date().toISOString();
  return {
    contract: CANONICAL_WORK_EXECUTION_CONTRACT,
    work_id: WORK_ID,
    mission_id: `mission:${WORK_ID}`,
    venture_id: CRE_VENTURE_ID,
    work_type: "QC",
    title: TITLE,
    description: task,
    stage: "QC",
    status,
    assigned_rooms: ["quality_control"],
    assigned_workers: ["Validation Station"],
    source: "EXTERNAL_IMPLEMENTATION_AGENT",
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
    traceability_links: [WORK_ID],
    requires_infinity_worker_execution: false,
    next_expected_transition: status === "ACTIVE" ? "Complete freshness proof" : "IDLE",
  };
}

async function main() {
  process.env.INFINITY_CANONICAL_WORK_PERSIST = "1";
  upsertCanonicalWork(record("ACTIVE", "Prove newest ACTIVE replaces parked hero"));
  await until("start", async () => (await liveState()).commandActivity?.nowInspecting?.currentWorkId === WORK_ID);
  completeCanonicalWork(WORK_ID, "Freshness proof completed");
  await until("complete", async () => {
    const live = await liveState();
    const inspecting = live.commandActivity?.nowInspecting;
    return inspecting?.currentWorkId == null
      && inspecting?.currentMission == null
      && inspecting?.status !== "ACTIVE_WORK"
      && (live.commandActivity?.counts?.activeMissions ?? 0) === 0
      && live.commandActivity?.latestCompleted?.missionType === TITLE;
  });
  const after = await liveState();
  console.log(JSON.stringify({
    workId: WORK_ID,
    afterMission: after.commandActivity?.nowInspecting?.currentMission ?? null,
    afterStatus: after.commandActivity?.nowInspecting?.status ?? null,
    latestCompleted: after.commandActivity?.latestCompleted?.missionType ?? null,
    result: "PASS",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
