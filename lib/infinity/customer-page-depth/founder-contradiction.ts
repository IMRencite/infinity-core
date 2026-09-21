import { evaluateFounderPhysicalContradiction } from "@/lib/infinity/universal-venture-system-qc/recurrence";
import {
  FOUNDER_RENDERED_COMMERCIAL_CONTRADICTION_GATE,
  FOUNDER_RENDERED_UX_CONTRADICTION_GATE,
  type NamedDepthGate,
} from "./types";

const UX_MISS = /HIDDEN_PRIMARY|WEAK_BUTTON_HIERARCHY|CONFUSING_ACTION_PRIORITY|RESULT_CONTINUATION_EASY_TO_MISS|WEAK_PRIMARY|CORE_ACTION_VISUALLY_TERTIARY/i;

export function evaluateFounderRenderedCommercialContradictionGate(input: {
  gate: string;
  automation_result: "PASS" | "FAIL";
  founder_observes_failure: boolean;
  miss_reason: string;
}): NamedDepthGate & {
  automation_historical: "PASS" | "FAIL";
  automation_is_current_truth: boolean;
  miss_reason: string;
} {
  const contradiction = evaluateFounderPhysicalContradiction({
    automation_result: input.automation_result,
    founder_observes_failure: input.founder_observes_failure,
  });
  return {
    gate: FOUNDER_RENDERED_COMMERCIAL_CONTRADICTION_GATE,
    result: contradiction.current,
    reasons: input.founder_observes_failure
      ? [`FOUNDER_PHYSICAL_OVERRIDES_AUTOMATION:${input.gate}`, input.miss_reason]
      : [],
    automation_historical: contradiction.automation_historical,
    automation_is_current_truth: contradiction.automation_is_current_truth,
    miss_reason: input.miss_reason,
  };
}

export function evaluateFounderRenderedUXContradictionGate(input: {
  gate: string;
  automation_result: "PASS" | "FAIL";
  founder_observes_failure: boolean;
  miss_reason: string;
}): NamedDepthGate & {
  automation_historical: "PASS" | "FAIL";
  automation_is_current_truth: boolean;
  miss_reason: string;
  reopened_gates: string[];
} {
  const contradiction = evaluateFounderPhysicalContradiction({
    automation_result: input.automation_result,
    founder_observes_failure: input.founder_observes_failure,
  });
  const ux = UX_MISS.test(input.miss_reason) || input.founder_observes_failure;
  return {
    gate: FOUNDER_RENDERED_UX_CONTRADICTION_GATE,
    result: contradiction.current,
    reasons: input.founder_observes_failure
      ? [`FOUNDER_PHYSICAL_OVERRIDES_AUTOMATION:${input.gate}`, input.miss_reason]
      : [],
    automation_historical: contradiction.automation_historical,
    automation_is_current_truth: contradiction.automation_is_current_truth,
    miss_reason: input.miss_reason,
    reopened_gates: ux && input.founder_observes_failure
      ? [
          "PrimaryActionDiscoverabilityGate",
          "AppActionHierarchyGate",
          "InteractiveControlVisualHierarchyGate",
          "CustomerWorkflowDeadEndGate",
          "RenderedVisualQualityGate",
          input.gate,
        ]
      : [],
  };
}
