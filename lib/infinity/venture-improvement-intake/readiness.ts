import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import {
  defaultOccupancynpvRenderedIntakeEvidence,
  evaluateRenderedImprovementIntakeVerificationGate,
  readRenderedImprovementIntakeEvidence,
} from "@/lib/infinity/customer-facing-browser-qc/rendered-intake-gate";
import type { NamedGate } from "./types";
import { UNIVERSAL_VENTURE_IMPROVEMENT_INTAKE_REQUIREMENT, VENTURE_IMPROVEMENT_INTAKE_READINESS_GATE } from "./types";
import type { UniversalVentureImprovementIntakeRequirement } from "./types";

export type IntakeExemptionReason = "INTERNAL_ONLY_INFRASTRUCTURE" | "PRODUCTION_PAUSED" | "NOT_CUSTOMER_FACING";

type Presence = {
  functional: boolean;
  exemption: IntakeExemptionReason | null;
  customer_facing: boolean;
};

const registry = new Map<string, Presence>();

function seedDefaults(): void {
  registry.set(CRE_VENTURE_ID, { functional: true, exemption: null, customer_facing: true });
  registry.set(ASKREVIEW_VENTURE_ID, {
    functional: false,
    exemption: "PRODUCTION_PAUSED",
    customer_facing: false,
  });
}

seedDefaults();

export function resetVentureImprovementIntakeRegistry(): void {
  registry.clear();
  seedDefaults();
}

export function registerVentureImprovementIntake(input: {
  venture_id: string;
  functional: boolean;
  customer_facing?: boolean;
  exemption?: IntakeExemptionReason | null;
}): void {
  registry.set(input.venture_id, {
    functional: input.functional,
    customer_facing: input.customer_facing ?? true,
    exemption: input.exemption ?? null,
  });
}

export function universalVentureImprovementIntakeRequirement(): UniversalVentureImprovementIntakeRequirement {
  return {
    requirement: UNIVERSAL_VENTURE_IMPROVEMENT_INTAKE_REQUIREMENT,
    required_for_customer_facing: true,
    surfaces: [
      "global_cta",
      "form_or_dialog",
      "server_intake",
      "canonical_feedback",
      "hq_projection",
      "rendered_trigger",
      "clickable_interaction",
      "working_submission",
      "served_browser_evidence",
    ],
    default_cta: "Suggest an Improvement",
    visual_sameness_forbidden: true,
    forced_popup_forbidden: true,
    source_only_insufficient: true,
  };
}

export function evaluateVentureImprovementIntakeReadinessGate(input: {
  venture_id: string;
  customer_facing?: boolean;
  exemption?: IntakeExemptionReason | null;
}): NamedGate {
  const registered = registry.get(input.venture_id);
  const customerFacing = input.customer_facing ?? registered?.customer_facing ?? true;
  const exemption = input.exemption ?? registered?.exemption ?? null;
  if (exemption) {
    return {
      gate: VENTURE_IMPROVEMENT_INTAKE_READINESS_GATE,
      result: "PASS",
      reasons: [`EXEMPT:${exemption}`],
    };
  }
  if (!customerFacing) {
    return {
      gate: VENTURE_IMPROVEMENT_INTAKE_READINESS_GATE,
      result: "PASS",
      reasons: ["NOT_CUSTOMER_FACING"],
    };
  }
  if (!registered?.functional) {
    return {
      gate: VENTURE_IMPROVEMENT_INTAKE_READINESS_GATE,
      result: "FAIL",
      reasons: ["MISSING_FUNCTIONAL_IMPROVEMENT_INTAKE"],
    };
  }
  const renderedEvidence = readRenderedImprovementIntakeEvidence(input.venture_id)
    ?? (input.venture_id === CRE_VENTURE_ID
      ? defaultOccupancynpvRenderedIntakeEvidence()
      : {
        venture_id: input.venture_id,
        evidence_level: "SOURCE_ONLY" as const,
        source_only: true,
        trigger_rendered: false,
        trigger_reachable: false,
        trigger_clickable: false,
        form_opens: false,
        form_fields_render: false,
        submission_works: false,
        success_state_works: false,
        failure_state_works: false,
        canonical_ingest_works: false,
      });
  const rendered = evaluateRenderedImprovementIntakeVerificationGate(renderedEvidence);
  if (rendered.result !== "PASS") {
    return {
      gate: VENTURE_IMPROVEMENT_INTAKE_READINESS_GATE,
      result: "FAIL",
      reasons: ["RENDERED_IMPROVEMENT_INTAKE_REQUIRED", ...rendered.reasons],
    };
  }
  return {
    gate: VENTURE_IMPROVEMENT_INTAKE_READINESS_GATE,
    result: "PASS",
    reasons: ["INTAKE_PRESENT", "RENDERED_INTAKE_VERIFIED"],
  };
}
