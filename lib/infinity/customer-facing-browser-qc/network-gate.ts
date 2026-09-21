import { CUSTOMER_FACING_NETWORK_QC_GATE, type NamedGate, type NetworkObservation } from "./contract";

export function evaluateCustomerFacingNetworkQCGate(requests: readonly NetworkObservation[]): NamedGate & {
  failed_required: NetworkObservation[];
} {
  const failed_required = requests.filter((request) => {
    if (!request.required) return false;
    if (!request.ok) return true;
    if (request.status != null && request.status >= 500) return true;
    return false;
  });
  return {
    gate: CUSTOMER_FACING_NETWORK_QC_GATE,
    result: failed_required.length === 0 ? "PASS" : "FAIL",
    reasons: failed_required.map((request) => `REQUIRED_REQUEST_FAILED:${request.name}:${request.failure ?? request.status ?? "NETWORK_FAILURE"}`),
    failed_required,
  };
}
