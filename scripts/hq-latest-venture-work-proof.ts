import { CRE_VENTURE_ID } from "../lib/infinity/venture-operating-scale/constants";
import { completeCanonicalWork, upsertCanonicalWork } from "../lib/infinity/canonical-work/store";
import { CANONICAL_WORK_EXECUTION_CONTRACT, type CanonicalWorkExecutionContract } from "../lib/infinity/canonical-work/types";
import { HQ_LIVE_PROOF_HEADER } from "../lib/infinity/operator-console/local-hq-proof";

const HQ = process.env.INFINITY_HQ_URL ?? "http://127.0.0.1:3000";
const STAMP = Date.now();
const VENTURE_ID = `work:occupancynpv:live-venture-history:${STAMP}`;
const DIAGNOSTIC_ID = `work:hq:current-resolver-freshness:${STAMP}`;
const VENTURE_TITLE = "OccupancyNPV — Live Venture History Proof";
const DIAGNOSTIC_TITLE = "OccupancyNPV — Live System Diagnostic Proof";

async function liveState() {
  const res = await fetch(`${HQ}/api/operator-console/hq-live-state?ventureId=${encodeURIComponent(CRE_VENTURE_ID)}`, {
    headers: { [HQ_LIVE_PROOF_HEADER]: "1" },
  });
  if (!res.ok) throw new Error(`hq-live-state ${res.status}`);
  return res.json() as Promise<{
    commandActivity?: {
      nowInspecting?: { currentMission?: string | null; status?: string | null };
      latestVentureWork?: { title?: string | null; workId?: string | null; work_id?: string | null };
      latestSystemActivity?: { title?: string | null };
      latestVentureWorkScope?: string | null;
      counts?: { activeMissions?: number };
    };
  }>;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function until(label: string, check: () => Promise<boolean>) {
  for (let i = 0; i < 24; i += 1) {
    if (await check()) return;
    await wait(500);
  }
  throw new Error(`VENTURE_HISTORY_TIMEOUT:${label}`);
}

function record(id: string, title: string, status: "ACTIVE" | "COMPLETED"): CanonicalWorkExecutionContract {
  const now = new Date().toISOString();
  return {
    contract: CANONICAL_WORK_EXECUTION_CONTRACT,
    work_id: id,
    mission_id: `mission:${id}`,
    venture_id: CRE_VENTURE_ID,
    work_type: id.includes("current-resolver-freshness") ? "QC" : "DESIGN",
    title,
    description: title,
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
    latest_output: title,
    artifact_refs: [],
    evidence_refs: [],
    parent_work_id: null,
    traceability_links: [id],
    requires_infinity_worker_execution: false,
    next_expected_transition: status === "ACTIVE" ? "Complete" : "IDLE",
  };
}

async function main() {
  process.env.INFINITY_CANONICAL_WORK_PERSIST = "1";
  upsertCanonicalWork(record(VENTURE_ID, VENTURE_TITLE, "ACTIVE"));
  await until("active", async () => (await liveState()).commandActivity?.nowInspecting?.currentMission === VENTURE_TITLE);
  completeCanonicalWork(VENTURE_ID, "Venture history proof completed");
  await until("venture", async () => {
    const live = await liveState();
    return live.commandActivity?.nowInspecting?.currentMission == null
      && live.commandActivity?.latestVentureWork?.title === VENTURE_TITLE
      && live.commandActivity?.latestSystemActivity?.title === VENTURE_TITLE;
  });
  upsertCanonicalWork(record(DIAGNOSTIC_ID, DIAGNOSTIC_TITLE, "COMPLETED"));
  await until("diagnostic", async () => {
    const live = await liveState();
    return live.commandActivity?.latestVentureWork?.title === VENTURE_TITLE
      && live.commandActivity?.latestSystemActivity?.title === DIAGNOSTIC_TITLE
      && live.commandActivity?.nowInspecting?.currentMission == null
      && (live.commandActivity?.counts?.activeMissions ?? 0) === 0;
  });
  const after = await liveState();
  const unselected = await fetch(`${HQ}/api/operator-console/hq-live-state`, {
    headers: { [HQ_LIVE_PROOF_HEADER]: "1" },
  }).then((res) => res.json()) as Awaited<ReturnType<typeof liveState>>;
  const commandId = after.commandActivity?.latestVentureWork?.workId
    ?? after.commandActivity?.latestVentureWork?.work_id
    ?? null;
  const floorId = unselected.commandActivity?.latestVentureWork?.workId
    ?? unselected.commandActivity?.latestVentureWork?.work_id
    ?? null;
  if (!commandId || commandId !== (after.commandActivity?.latestVentureWork?.workId ?? after.commandActivity?.latestVentureWork?.work_id)) {
    throw new Error("SURFACE_WORK_ID_MISSING");
  }
  console.log(JSON.stringify({
    current: after.commandActivity?.nowInspecting?.currentMission ?? null,
    latestVentureWork: after.commandActivity?.latestVentureWork?.title ?? null,
    latestVentureWorkId: commandId,
    unselectedVentureWorkId: floorId,
    latestSystemActivity: after.commandActivity?.latestSystemActivity?.title ?? null,
    sameWorkId: commandId === floorId,
    result: "PASS",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
