import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { executeOccupancynpvPaymentReactivation } from "../lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation";

loadServerEnvFromLocalFile();

async function main() {
  const result = await executeOccupancynpvPaymentReactivation({
    deploy: true,
    persistEvidence: true,
    pollAttempts: 50,
    pollDelayMs: 8000,
  });
  console.log("next_state:", result.nextState);
  console.log("stop_reason:", result.stopReason ?? "NONE");
  console.log("safe_error:", result.safeError ?? "NONE");
  console.log("activated:", result.activated ? "YES" : "NO");
  console.log("deployed:", result.deployed ? "YES" : "NO");
  console.log("deployment_id:", result.deploymentId ?? "NONE");
  console.log("activated_at:", result.activatedAt ?? "NONE");
  console.log("identity_pass:", result.identity.pass ? "PASS" : "FAIL");
  console.log("account:", result.identity.accountId);
  console.log("mode:", result.identity.mode);
  console.log("charges:", result.identity.chargesEnabled ? "YES" : "NO");
  console.log("payouts:", result.identity.payoutsEnabled ? "YES" : "NO");
  console.log("offers_pass:", result.offers.professional.pass ? "PASS" : "FAIL");
  console.log("webhook_pass:", result.webhook.pass ? "PASS" : "FAIL");
  console.log("fulfillment:", result.fulfillment.result);
  console.log("payment_gate:", result.paymentReport.PaymentReadinessGate);
  console.log("artifact_id:", result.composed.artifactId);
  console.log("digest:", result.composed.digest);
  console.log("routes:", result.routes.summary);
  console.log("checkout_get_status:", result.checkoutGet.status);
  console.log("unknown_post_status:", result.unknownPost.status);
  console.log("remaining:", result.commercialization.remaining.join(","));
  console.log("cleared:", result.commercialization.cleared.join(","));
  console.log("products_created:", result.writes.productsCreated);
  console.log("prices_created:", result.writes.pricesCreated);
  console.log("webhook_mutations:", result.writes.webhookMutations);
  console.log("checkout_sessions:", result.writes.checkoutSessionsManuallyCreated);
  console.log("public_launch:", result.writes.publicLaunch);
  if (!result.activated) process.exit(1);
}

main().catch((error) => {
  console.log("reactivation_failed:", error instanceof Error ? error.message : "UNKNOWN");
  process.exit(1);
});
