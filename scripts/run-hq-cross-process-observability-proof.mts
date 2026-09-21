import { loadEnvLocal } from "../lib/infinity/market-validation-experiment/live";
import { persistFailedFinalRepairSuccessorMissionHistory } from "../lib/infinity/mission-activity/persist-failed-cre-final-repair-mission";
import { runHqCrossProcessObservabilityProof } from "../lib/infinity/mission-activity/hq-cross-process-observability-proof";
import { HQ_LIVE_PROOF_HEADER } from "../lib/infinity/operator-console/local-hq-proof";

loadEnvLocal();

const cycleKey = "cycle-1786949554348";
const ventureId = `favc1-cycle:${cycleKey}`;
const endpoint = `http://localhost:3000/api/operator-console/favc1-cycle?cycleKey=${cycleKey}&ventureId=${encodeURIComponent(ventureId)}`;

type Poll = {
  status: number;
  cacheControl: string | null;
  activeCount: number | null;
  command: string | null;
  deploymentDepot: string | null;
  validationStation: string | null;
  worker: string | null;
  workerTask: string | null;
  mission: string | null;
  missionId: string | null;
  step: string | null;
  lastActivityAt: string | null;
  latestCompleted: string | null;
  failedMissionVisible: boolean;
  retryProhibitedVisible: boolean;
};

async function pollHq(): Promise<Poll> {
  const res = await fetch(endpoint, {
    headers: { [HQ_LIVE_PROOF_HEADER]: "1" },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    snapshot?: {
      commandActivity?: {
        counts?: { activeMissions?: number };
        rooms?: Record<string, { status?: string }>;
        nowInspecting?: { currentMission?: string | null; currentStep?: string | null; currentTask?: string | null; lastActivityAt?: string | null };
        systemView?: { missionId?: string | null };
        latestCompleted?: { missionId?: string | null; summary?: string | null };
        activeWorkers?: Array<{ role?: string; task?: string; status?: string }>;
        recentEvents?: Array<{ missionId?: string; blocker?: string | null; technicalDetail?: string | null; eventType?: string }>;
      };
    };
    error?: string;
  };
  const activity = json.snapshot?.commandActivity;
  const recent = activity?.recentEvents ?? [];
  const activeWorker = activity?.activeWorkers?.find((worker) => worker.status === "ACTIVE_WORK") ?? activity?.activeWorkers?.[0];
  return {
    status: res.status,
    cacheControl: res.headers.get("cache-control"),
    activeCount: activity?.counts?.activeMissions ?? null,
    command: activity?.rooms?.executive_office?.status ?? null,
    deploymentDepot: activity?.rooms?.launch_operations?.status ?? null,
    validationStation: activity?.rooms?.quality_control?.status ?? null,
    worker: activeWorker?.role ?? null,
    workerTask: activeWorker?.task ?? activity?.nowInspecting?.currentTask ?? null,
    mission: activity?.nowInspecting?.currentMission ?? null,
    missionId: activity?.systemView?.missionId ?? activity?.latestCompleted?.missionId ?? null,
    step: activity?.nowInspecting?.currentStep ?? null,
    lastActivityAt: activity?.nowInspecting?.lastActivityAt ?? null,
    latestCompleted: activity?.latestCompleted?.missionId ?? null,
    failedMissionVisible: recent.some((event) => event.missionId === "msn_cre_final_repair_successor_deploy_v1"),
    retryProhibitedVisible: recent.some((event) => event.blocker === "RETRY_NOT_AUTHORIZED"),
  };
}

const failedHistory = await persistFailedFinalRepairSuccessorMissionHistory();
const mission = runHqCrossProcessObservabilityProof({ phaseMs: 10000 });
const polls: Poll[] = [];
await new Promise((resolve) => setTimeout(resolve, 1200));
polls.push(await pollHq());
await new Promise((resolve) => setTimeout(resolve, 2500));
polls.push(await pollHq());
await new Promise((resolve) => setTimeout(resolve, 2500));
polls.push(await pollHq());
const finished = await mission;
await new Promise((resolve) => setTimeout(resolve, 1500));
const completion = await pollHq();
const refresh = await pollHq();

process.stdout.write(
  `${JSON.stringify(
    {
      endpoint,
      pollingIntervalMs: 3000,
      failedHistory,
      finished,
      livePolls: polls,
      completion,
      refresh,
      providerWrites: 0,
      deployments: 0,
    },
    null,
    2,
  )}\n`,
);
