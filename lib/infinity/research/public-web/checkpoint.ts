import type { PublicWebResearchCheckpoint } from "./types";

const checkpoints = new Map<string, PublicWebResearchCheckpoint>();

export function researchCheckpointKey(missionId: string, stage: PublicWebResearchCheckpoint["stage"]): string {
  return `${missionId}:${stage}`;
}

export function saveResearchCheckpoint(checkpoint: PublicWebResearchCheckpoint): void {
  checkpoints.set(researchCheckpointKey(checkpoint.missionId, checkpoint.stage), checkpoint);
}

export function loadResearchCheckpoint(
  missionId: string,
  stage: PublicWebResearchCheckpoint["stage"],
): PublicWebResearchCheckpoint | null {
  return checkpoints.get(researchCheckpointKey(missionId, stage)) ?? null;
}

export function resetPublicWebResearchCheckpoints(): void {
  checkpoints.clear();
}

export function listResearchCheckpoints(missionId: string): PublicWebResearchCheckpoint[] {
  return [...checkpoints.values()].filter((item) => item.missionId === missionId);
}
