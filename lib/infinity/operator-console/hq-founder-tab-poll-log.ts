import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type FounderTabHttpPollRow = {
  timestamp: string;
  sequence: number;
  activeCount: number;
  missionId: string | null;
  missionType: string | null;
  phase: string | null;
  lastActivityAt: string | null;
  rooms: Record<string, string | undefined>;
};

const rows: FounderTabHttpPollRow[] = [];
let sequence = 0;
let enabledUntilMs = 0;

function artifactPath(): string {
  return join(process.cwd(), "e2e", "artifacts", "hq-founder-physical-tab-http.json");
}

export function enableFounderTabHttpLog(durationMs = 90_000): void {
  enabledUntilMs = Date.now() + durationMs;
  sequence = 0;
  rows.length = 0;
}

export function recordFounderTabHttpPoll(snapshot: {
  commandActivity?: {
    counts?: { activeMissions?: number };
    nowInspecting?: {
      currentMission?: string | null;
      currentPhase?: string | null;
      lastActivityAt?: string | null;
    };
    systemView?: { missionId?: string | null };
    rooms?: Record<string, { status?: string }>;
  };
}): void {
  if (process.env.NODE_ENV === "production") return;
  if (Date.now() > enabledUntilMs) return;
  sequence += 1;
  const activity = snapshot.commandActivity;
  const rooms: Record<string, string | undefined> = {};
  for (const [room, slice] of Object.entries(activity?.rooms ?? {})) {
    rooms[room] = slice.status;
  }
  const row: FounderTabHttpPollRow = {
    timestamp: new Date().toISOString(),
    sequence,
    activeCount: activity?.counts?.activeMissions ?? 0,
    missionId: activity?.systemView?.missionId ?? null,
    missionType: activity?.nowInspecting?.currentMission ?? null,
    phase: activity?.nowInspecting?.currentPhase ?? activity?.nowInspecting?.currentMission ?? null,
    lastActivityAt: activity?.nowInspecting?.lastActivityAt ?? null,
    rooms,
  };
  rows.push(row);
  try {
    mkdirSync(join(process.cwd(), "e2e", "artifacts"), { recursive: true });
    writeFileSync(artifactPath(), JSON.stringify({ polls: rows }, null, 2));
  } catch {
    // Diagnostic only.
  }
}

export function readFounderTabHttpPolls(): FounderTabHttpPollRow[] {
  return [...rows];
}
