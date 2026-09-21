import type { ExperimentState } from "./types";

const states = new Map<string, ExperimentState>();
const evidenceStarts = new Map<string, string>();

export function setExperimentRuntimeState(experimentId: string, state: ExperimentState): void {
  states.set(experimentId, state);
}

export function getExperimentRuntimeState(experimentId: string): ExperimentState | null {
  return states.get(experimentId) ?? null;
}

export function setEvidenceCollectionStart(experimentId: string, startedAt: string): void {
  evidenceStarts.set(experimentId, startedAt);
}

export function getEvidenceCollectionStart(experimentId: string): string | null {
  return evidenceStarts.get(experimentId) ?? null;
}

export function resetExperimentRuntimeStates(): void {
  states.clear();
  evidenceStarts.clear();
}

export function experimentAcceptsProductionEvidence(experimentId: string): boolean {
  const state = getExperimentRuntimeState(experimentId);
  return state === "LIVE" || state === "COLLECTING";
}
