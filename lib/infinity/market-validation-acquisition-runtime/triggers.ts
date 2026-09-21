import { ACQUISITION_TRIGGERS, type AcquisitionTrigger } from "./constants";
import type { EvidenceGap } from "./types";

export function isAcquisitionTrigger(value: string): value is AcquisitionTrigger {
  return (ACQUISITION_TRIGGERS as readonly string[]).includes(value);
}

export function evaluateAcquisitionTrigger(input: {
  trigger: AcquisitionTrigger;
  gap: EvidenceGap;
}): { accept: boolean; reason: string } {
  if (input.trigger === "EXPERIMENT_WINDOW_EXPIRED" || input.gap.windowExpired) {
    return { accept: false, reason: "Window expired; runtime stops collecting." };
  }
  if (input.trigger === "THRESHOLD_MET" && input.gap.evidenceSufficiency === "SUFFICIENT_FOR_REVIEW") {
    return { accept: false, reason: "Thresholds met; hand to Decision Engine as READY_FOR_VALIDATION_DECISION." };
  }
  return { accept: true, reason: "Collecting experiment still requires evidence." };
}
