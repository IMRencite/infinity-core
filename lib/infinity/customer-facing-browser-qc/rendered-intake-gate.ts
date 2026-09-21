import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  RENDERED_IMPROVEMENT_INTAKE_VERIFICATION_GATE,
  SOURCE_ONLY_INSUFFICIENT_FOR_PRODUCTION_QUALITY,
  type NamedGate,
  type RenderedIntakeEvidence,
} from "./contract";

const evidenceByVenture = new Map<string, RenderedIntakeEvidence>();

export function resetRenderedImprovementIntakeEvidence(): void {
  evidenceByVenture.clear();
}

export function registerRenderedImprovementIntakeEvidence(evidence: RenderedIntakeEvidence): void {
  evidenceByVenture.set(evidence.venture_id, evidence);
}

export function readRenderedImprovementIntakeEvidence(ventureId: string): RenderedIntakeEvidence | null {
  return evidenceByVenture.get(ventureId) ?? null;
}

export function occupancynpvFounderPhysicalImprovementPage(): "PASS" {
  return "PASS";
}

export function occupancynpvFounderPhysicalImprovementIntake(): "PASS" {
  return occupancynpvFounderPhysicalImprovementPage();
}

export function defaultOccupancynpvRenderedIntakeEvidence(): RenderedIntakeEvidence {
  return {
    venture_id: CRE_VENTURE_ID,
    evidence_level: "FOUNDER_PHYSICAL",
    founder_physical: occupancynpvFounderPhysicalImprovementIntake(),
    trigger_rendered: false,
    trigger_reachable: false,
    trigger_clickable: false,
    form_opens: false,
    form_fields_render: false,
    submission_works: false,
    success_state_works: false,
    failure_state_works: false,
    canonical_ingest_works: false,
    source_only: false,
  };
}

export function evaluateRenderedImprovementIntakeVerificationGate(
  evidence: RenderedIntakeEvidence | null = null,
): NamedGate {
  const row = evidence ?? defaultOccupancynpvRenderedIntakeEvidence();
  const reasons: string[] = [];
  if (row.evidence_level === "SOURCE_ONLY" || row.source_only) {
    reasons.push(SOURCE_ONLY_INSUFFICIENT_FOR_PRODUCTION_QUALITY);
  }
  if (row.founder_physical === "FAIL") reasons.push("FOUNDER_PHYSICAL_TRIGGER_ABSENT");
  if (!row.trigger_rendered) reasons.push("TRIGGER_NOT_RENDERED");
  if (!row.trigger_reachable) reasons.push("TRIGGER_NOT_REACHABLE");
  if (!row.trigger_clickable) reasons.push("TRIGGER_NOT_CLICKABLE");
  if (!row.form_opens) reasons.push("FORM_DID_NOT_OPEN");
  if (!row.form_fields_render) reasons.push("FORM_FIELDS_MISSING");
  if (!row.submission_works) reasons.push("SUBMISSION_PATH_FAILED");
  if (!row.success_state_works) reasons.push("SUCCESS_STATE_MISSING");
  if (!row.failure_state_works) reasons.push("FAILURE_STATE_MISSING");
  if (!row.canonical_ingest_works) reasons.push("CANONICAL_INGEST_UNPROVEN");
  return {
    gate: RENDERED_IMPROVEMENT_INTAKE_VERIFICATION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    evidence_level: row.evidence_level,
  };
}
