import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import {
  evaluateOccupancynpvFulfillmentReadiness,
  evaluateOccupancynpvOfferConsistency,
  evaluateOccupancynpvPaymentReadinessReport,
  occupancynpvClearedCommercializationBlockers,
  occupancynpvCommercializationBlockers,
  occupancynpvHistoricalActivationAuthorization,
  occupancynpvHistoricalActivationStatus,
} from "../lib/infinity/venture-operating-scale/occupancynpv-fulfillment";
import {
  occupancynpvProductionPersistenceState,
  occupancynpvProductProductionVerificationState,
} from "../lib/infinity/occupancynpv-product/policy";

loadServerEnvFromLocalFile();
const fulfillment = evaluateOccupancynpvFulfillmentReadiness();
const payment = evaluateOccupancynpvPaymentReadinessReport();
const consistency = evaluateOccupancynpvOfferConsistency();
console.log("persistence", occupancynpvProductionPersistenceState().status);
console.log("verification", occupancynpvProductProductionVerificationState().status);
console.log("fulfillment", fulfillment.result, fulfillment.reasons.join(",") || "NONE");
console.log("offer_consistency", consistency.result);
console.log("payment_gate", payment.PaymentReadinessGate);
console.log("payment_fulfillment", payment.Fulfillment);
console.log("cleared", occupancynpvClearedCommercializationBlockers().join(","));
console.log("remaining", occupancynpvCommercializationBlockers().join(","));
console.log("historical_status", occupancynpvHistoricalActivationStatus());
console.log("historical_auth", occupancynpvHistoricalActivationAuthorization());
