export const QC_EVIDENCE_STATES = ["PASS", "FAIL", "NOT_VERIFIED", "BLOCKED", "NOT_APPLICABLE"] as const;
export type QCEvidenceState = (typeof QC_EVIDENCE_STATES)[number];

export const QC_EVIDENCE_STATE_CONTRACT = "QCEvidenceState" as const;

export type QcSurfaceEvidence = {
  surface: string;
  state: QCEvidenceState;
  reasons: string[];
};

export function isQcEvidenceState(value: string): value is QCEvidenceState {
  return (QC_EVIDENCE_STATES as readonly string[]).includes(value);
}

export function missingEvidenceIsNotFail(state: QCEvidenceState): boolean {
  return state === "NOT_VERIFIED" || state === "BLOCKED" || state === "NOT_APPLICABLE";
}

export function observedDefectProducesFail(state: QCEvidenceState): boolean {
  return state === "FAIL";
}

export function evidenceStateBlocksRelease(state: QCEvidenceState): boolean {
  return state !== "PASS" && state !== "NOT_APPLICABLE";
}

export function classifyUnobservedSurface(): QCEvidenceState {
  return "NOT_VERIFIED";
}

export function classifyUnavailablePrerequisite(): QCEvidenceState {
  return "BLOCKED";
}

export function aggregateQcLayer(surfaces: QcSurfaceEvidence[]): QCEvidenceState {
  if (surfaces.some((row) => row.state === "FAIL")) return "FAIL";
  if (surfaces.some((row) => row.state === "BLOCKED")) return "BLOCKED";
  if (surfaces.some((row) => row.state === "NOT_VERIFIED")) return "NOT_VERIFIED";
  if (surfaces.length === 0) return "NOT_VERIFIED";
  if (surfaces.every((row) => row.state === "NOT_APPLICABLE")) return "NOT_APPLICABLE";
  if (surfaces.every((row) => row.state === "PASS" || row.state === "NOT_APPLICABLE")) return "PASS";
  return "NOT_VERIFIED";
}

export function notVerifiedDoesNotBecomeFail(state: QCEvidenceState): boolean {
  return state !== "FAIL";
}
