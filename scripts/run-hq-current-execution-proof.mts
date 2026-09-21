import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { persistFailedFinalRepairSuccessorMissionHistory } from "../lib/infinity/mission-activity/persist-failed-cre-final-repair-mission";
import {
  HQ_CURRENT_EXECUTION_PROOF_MISSION,
  HQ_CURRENT_EXECUTION_PROOF_MISSION_ID,
  runHqCurrentExecutionProof,
} from "../lib/infinity/mission-activity/hq-current-execution-proof";
import { HQ_LIVE_PROOF_HEADER } from "../lib/infinity/operator-console/local-hq-proof";

function loadEnvLocal(): void {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep);
    if (process.env[key] == null) process.env[key] = trimmed.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvLocal();

const cycleKey = "cycle-1786949554348";
const ventureId = `favc1-cycle:${cycleKey}`;
const endpoint = `http://localhost:3000/api/operator-console/favc1-cycle?cycleKey=${cycleKey}&ventureId=${encodeURIComponent(ventureId)}`;

type Poll = {
  status: number;
  activeCount: number | null;
  command: string | null;
  systemsArchitect: string | null;
  creationLab: string | null;
  validationStation: string | null;
  deploymentDepot: string | null;
  mission: string | null;
  missionId: string | null;
  latestCompleted: string | null;
  inspectionCycle: string | null;
  inspectionHeadline: string | null;
  currentExecution: string | null;
};

async function pollHq(): Promise<Poll> {
  const res = await fetch(endpoint, {
    headers: { [HQ_LIVE_PROOF_HEADER]: "1" },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    snapshot?: {
      favc1Cycle?: { cycleKey?: string; terminalDisplay?: { headline?: string } };
      inspectionContext?: { cycleKey?: string | null; terminalHeadline?: string | null };
      currentExecution?: { currentMission?: string | null };
      latestCompletedExecution?: { missionId?: string | null };
      commandActivity?: {
        counts?: { activeMissions?: number };
        rooms?: Record<string, { status?: string }>;
        nowInspecting?: { currentMission?: string | null };
        systemView?: { missionId?: string | null };
        latestCompleted?: { missionId?: string | null };
      };
    };
  };
  const activity = json.snapshot?.commandActivity;
  return {
    status: res.status,
    activeCount: activity?.counts?.activeMissions ?? null,
    command: activity?.rooms?.executive_office?.status ?? null,
    systemsArchitect: activity?.rooms?.systems_architect?.status ?? null,
    creationLab: activity?.rooms?.product_lab?.status ?? null,
    validationStation: activity?.rooms?.quality_control?.status ?? null,
    deploymentDepot: activity?.rooms?.launch_operations?.status ?? null,
    mission: activity?.nowInspecting?.currentMission ?? json.snapshot?.currentExecution?.currentMission ?? null,
    missionId: activity?.systemView?.missionId ?? null,
    latestCompleted: activity?.latestCompleted?.missionId ?? json.snapshot?.latestCompletedExecution?.missionId ?? null,
    inspectionCycle: json.snapshot?.inspectionContext?.cycleKey ?? json.snapshot?.favc1Cycle?.cycleKey ?? null,
    inspectionHeadline: json.snapshot?.inspectionContext?.terminalHeadline ?? json.snapshot?.favc1Cycle?.terminalDisplay?.headline ?? null,
    currentExecution: json.snapshot?.currentExecution?.currentMission ?? activity?.nowInspecting?.currentMission ?? null,
  };
}

const failedHistory = await persistFailedFinalRepairSuccessorMissionHistory();
const before = await pollHq();
const mission = runHqCurrentExecutionProof({ phaseMs: 6000 });
const polls: Poll[] = [];
await new Promise((resolve) => setTimeout(resolve, 800));
polls.push(await pollHq());
await new Promise((resolve) => setTimeout(resolve, 2500));
polls.push(await pollHq());
await new Promise((resolve) => setTimeout(resolve, 2500));
polls.push(await pollHq());
const finished = await mission;
await new Promise((resolve) => setTimeout(resolve, 1500));
const completion = await pollHq();

process.stdout.write(
  `${JSON.stringify(
    {
      endpoint,
      mission: HQ_CURRENT_EXECUTION_PROOF_MISSION,
      missionId: HQ_CURRENT_EXECUTION_PROOF_MISSION_ID,
      failedHistory,
      before,
      livePolls: polls,
      finished,
      completion,
      providerWrites: 0,
      deployments: 0,
    },
    null,
    2,
  )}\n`,
);
