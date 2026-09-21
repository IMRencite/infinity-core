import { loadEnvLocal } from "../lib/infinity/market-validation-experiment/live";
import { HQ_LIVE_PROOF_HEADER } from "../lib/infinity/operator-console/local-hq-proof";
import { readPersistedMissionActivity } from "../lib/infinity/mission-activity/persist-disk";

loadEnvLocal();

const endpoint =
  "http://localhost:3000/api/operator-console/favc1-cycle?cycleKey=cycle-1786949554348&ventureId=favc1-cycle%3Acycle-1786949554348";

const res = await fetch(endpoint, {
  headers: { [HQ_LIVE_PROOF_HEADER]: "1" },
  cache: "no-store",
});
const json = (await res.json()) as {
  snapshot?: {
    commandActivity?: Record<string, unknown>;
    currentActivity?: Record<string, unknown>;
    favc1Cycle?: Record<string, unknown>;
  };
  error?: string;
};

const activity = json.snapshot?.commandActivity as
  | {
      counts?: { activeMissions?: number };
      nowInspecting?: Record<string, unknown>;
      systemView?: Record<string, unknown>;
      latestCompleted?: Record<string, unknown>;
      rooms?: Record<string, { status?: string; summary?: string | null }>;
      activeWorkers?: unknown[];
      recentEvents?: Array<{ missionId?: string; missionType?: string; eventType?: string; observedAt?: string }>;
    }
  | undefined;

const disk = readPersistedMissionActivity();
const byMission = new Map<string, typeof disk>();
for (const event of disk) {
  const list = byMission.get(event.missionId) ?? [];
  list.push(event);
  byMission.set(event.missionId, list);
}
const inventory = [...byMission.entries()].map(([missionId, events]) => {
  const last = events[events.length - 1];
  return {
    missionId,
    missionType: last?.missionType,
    lastEvent: last?.eventType,
    lastAt: last?.observedAt,
    startedAt: events.find((event) => event.eventType === "MISSION_STARTED")?.startedAt ?? events[0]?.observedAt,
    ventureId: last?.ventureId,
    candidateId: last?.candidateId,
    source: last?.source,
    executionClass: last?.executionClass,
  };
});
inventory.sort((a, b) => (a.lastAt ?? "").localeCompare(b.lastAt ?? ""));

process.stdout.write(
  `${JSON.stringify(
    {
      httpStatus: res.status,
      cacheControl: res.headers.get("cache-control"),
      error: json.error ?? null,
      favc1Cycle: json.snapshot?.favc1Cycle ?? null,
      currentActivity: json.snapshot?.currentActivity ?? null,
      counts: activity?.counts ?? null,
      nowInspecting: activity?.nowInspecting ?? null,
      systemView: activity?.systemView ?? null,
      latestCompleted: activity?.latestCompleted ?? null,
      rooms: activity?.rooms ?? null,
      activeWorkers: activity?.activeWorkers ?? null,
      recentEventTail: (activity?.recentEvents ?? []).slice(-8),
      diskEventCount: disk.length,
      diskMissions: inventory,
    },
    null,
    2,
  )}\n`,
);
