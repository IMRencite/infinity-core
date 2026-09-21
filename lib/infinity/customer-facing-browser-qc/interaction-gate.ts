import { CUSTOMER_FACING_INTERACTION_QC_GATE, type InteractionObservation, type NamedGate } from "./contract";

export function evaluateCustomerFacingInteractionQCGate(controls: readonly InteractionObservation[]): NamedGate {
  const reasons: string[] = [];
  for (const control of controls) {
    if (!control.rendered) reasons.push(`NOT_RENDERED:${control.name}`);
    if (!control.visible) reasons.push(`NOT_VISIBLE:${control.name}`);
    if (!control.enabled) reasons.push(`NOT_ENABLED:${control.name}`);
    if (!control.clickable) reasons.push(`NOT_CLICKABLE:${control.name}`);
    if (control.uncaught_exception) reasons.push(`UNCAUGHT_EXCEPTION:${control.name}`);
    if (!control.action_ok) reasons.push(`ACTION_FAILED:${control.name}`);
    if (!control.result_state_ok) reasons.push(`RESULT_STATE_MISSING:${control.name}`);
  }
  return {
    gate: CUSTOMER_FACING_INTERACTION_QC_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}
