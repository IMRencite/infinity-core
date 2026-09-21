import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { executeOccupancynpvPaymentReactivation } from "../lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation";

loadServerEnvFromLocalFile();

executeOccupancynpvPaymentReactivation({ deploy: false, persistEvidence: false }).then((result) => {
  console.log(JSON.stringify({
    nextState: result.nextState,
    stopReason: result.stopReason,
    activated: result.activated,
    identity: result.identity,
    offers: result.offers,
    webhookPass: result.webhook.pass,
    fulfillment: result.fulfillment.result,
    paymentGate: result.paymentReport.PaymentReadinessGate,
    founder: result.paymentReport.FounderReauthorization,
    checkoutSafety: result.checkoutSafety,
    fulfillmentReady: result.composed.fulfillmentReady,
    remaining: result.commercialization.remaining,
  }, null, 2));
  if (result.stopReason) process.exit(1);
}).catch((error) => {
  console.log("dry_run_failed:", error instanceof Error ? error.message : "UNKNOWN");
  process.exit(1);
});
