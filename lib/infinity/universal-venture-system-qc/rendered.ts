import { evaluateCustomerFacingInteractionQCGate } from "@/lib/infinity/customer-facing-browser-qc/interaction-gate";
import type { InteractionObservation } from "@/lib/infinity/customer-facing-browser-qc/contract";
import {
  CUSTOMER_FORM_QC_GATE,
  EXPECTED_RENDERED_CAPABILITY_GATE,
  RENDERED_ACTION_INVENTORY_CONTRACT,
  type NamedSystemGate,
} from "./contract";

export type RenderedAction = {
  name: string;
  kind: "button" | "link" | "form" | "submit" | "tab" | "dialog" | "menu" | "dropdown" | "cta";
  required: boolean;
  capability_id?: string;
  rendered: boolean;
  visible: boolean;
  enabled: boolean;
  href?: string | null;
};

export type RenderedActionInventory = {
  contract: typeof RENDERED_ACTION_INVENTORY_CONTRACT;
  venture_id: string;
  actions: RenderedAction[];
};

export type ExpectedCapability = {
  capability_id: string;
  required: boolean;
  rendered_trigger_required: boolean;
};

export function buildRenderedActionInventory(input: {
  venture_id: string;
  actions: readonly RenderedAction[];
}): RenderedActionInventory {
  return {
    contract: RENDERED_ACTION_INVENTORY_CONTRACT,
    venture_id: input.venture_id,
    actions: [...input.actions],
  };
}

export function evaluateExpectedRenderedCapabilityGate(input: {
  capabilities: readonly ExpectedCapability[];
  inventory: RenderedActionInventory;
}): NamedSystemGate {
  const reasons: string[] = [];
  for (const capability of input.capabilities) {
    if (!capability.required) continue;
    const matches = input.inventory.actions.filter((action) => action.capability_id === capability.capability_id);
    if (matches.length === 0) {
      reasons.push(`CAPABILITY_TRIGGER_ABSENT:${capability.capability_id}`);
      continue;
    }
    if (capability.rendered_trigger_required && !matches.some((action) => action.rendered && action.visible)) {
      reasons.push(`CAPABILITY_NOT_RENDERED:${capability.capability_id}`);
    }
  }
  return {
    gate: EXPECTED_RENDERED_CAPABILITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateRenderedActionInteraction(actions: readonly RenderedAction[], observations: readonly InteractionObservation[]) {
  const missingRequired = actions.filter((action) => action.required && (!action.rendered || !action.visible));
  const interaction = evaluateCustomerFacingInteractionQCGate(observations);
  return {
    missing_required: missingRequired,
    interaction,
    result: missingRequired.length === 0 && interaction.result === "PASS" ? "PASS" as const : "FAIL" as const,
  };
}

export type CustomerFormEvidence = {
  name: string;
  rendered: boolean;
  labels: boolean;
  required_fields: boolean;
  validation: boolean;
  submit: boolean;
  success: boolean;
  error: boolean;
  duplicate_submit_handled: boolean;
  mobile: boolean;
  accessibility: boolean;
};

export function evaluateCustomerFormQCGate(forms: readonly CustomerFormEvidence[]): NamedSystemGate {
  const reasons: string[] = [];
  for (const form of forms) {
    if (!form.rendered) reasons.push(`FORM_NOT_RENDERED:${form.name}`);
    if (!form.labels) reasons.push(`FORM_LABELS_MISSING:${form.name}`);
    if (!form.required_fields) reasons.push(`FORM_REQUIRED_FIELDS_MISSING:${form.name}`);
    if (!form.validation) reasons.push(`FORM_VALIDATION_MISSING:${form.name}`);
    if (!form.submit) reasons.push(`FORM_SUBMIT_FAILED:${form.name}`);
    if (!form.success) reasons.push(`FORM_SUCCESS_STATE_MISSING:${form.name}`);
    if (!form.error) reasons.push(`FORM_ERROR_STATE_MISSING:${form.name}`);
    if (!form.duplicate_submit_handled) reasons.push(`FORM_DUPLICATE_SUBMIT_UNHANDLED:${form.name}`);
    if (!form.mobile) reasons.push(`FORM_MOBILE_FAILED:${form.name}`);
    if (!form.accessibility) reasons.push(`FORM_ACCESSIBILITY_FAILED:${form.name}`);
  }
  return {
    gate: CUSTOMER_FORM_QC_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}
