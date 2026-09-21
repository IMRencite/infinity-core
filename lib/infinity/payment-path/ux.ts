import { occupancynpvCustomerSafeCheckoutFailureHtml } from "@/lib/infinity/venture-operating-scale/occupancynpv-live-checkout-health";
import { evaluateRenderedCommercialFailureExperienceGate } from "@/lib/infinity/public-venture-design/rendered-interaction/commercial-failure-experience";

export function occupancynpvErrorUxPass(): "PASS" | "FAIL" {
  return evaluateRenderedCommercialFailureExperienceGate({
    body: occupancynpvCustomerSafeCheckoutFailureHtml(),
    contentType: "text/html",
  }).result;
}
