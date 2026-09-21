import { verifyLiveCommercialCheckoutSessions } from "../lib/infinity/venture-operating-scale/occupancynpv-live-checkout-health";

async function main() {
  const record = await verifyLiveCommercialCheckoutSessions({ persist: true, createSessions: true });
  console.log(JSON.stringify({
    result: record.result,
    classified: record.classified,
    operatingAction: record.operatingAction,
    secretConfigured: record.secretConfigured,
    keyMode: record.keyMode,
    keyKind: record.keyKind,
    webhookSecretConfigured: record.webhookSecretConfigured,
    account: record.account,
    professional: {
      productExists: record.professional.productExists,
      priceExists: record.professional.priceExists,
      priceActive: record.professional.priceActive,
      amount: record.professional.amount,
      billing: record.professional.billing,
      sessionCreate: record.professional.sessionCreate,
      sessionId: record.professional.sessionId,
      checkoutUrlValid: record.professional.checkoutUrlValid,
      retrievedMode: record.professional.retrievedMode,
      retrievedPriceId: record.professional.retrievedPriceId,
      retrievedSuccessUrl: record.professional.retrievedSuccessUrl,
      retrievedCancelUrl: record.professional.retrievedCancelUrl,
      paymentStatus: record.professional.paymentStatus,
      errorType: record.professional.errorType,
      errorCode: record.professional.errorCode,
      requestId: record.professional.requestId,
    },
    perDeal: {
      productExists: record.perDeal.productExists,
      priceExists: record.perDeal.priceExists,
      priceActive: record.perDeal.priceActive,
      amount: record.perDeal.amount,
      billing: record.perDeal.billing,
      sessionCreate: record.perDeal.sessionCreate,
      sessionId: record.perDeal.sessionId,
      checkoutUrlValid: record.perDeal.checkoutUrlValid,
      retrievedMode: record.perDeal.retrievedMode,
      retrievedPriceId: record.perDeal.retrievedPriceId,
      retrievedSuccessUrl: record.perDeal.retrievedSuccessUrl,
      retrievedCancelUrl: record.perDeal.retrievedCancelUrl,
      paymentStatus: record.perDeal.paymentStatus,
      errorType: record.perDeal.errorType,
      errorCode: record.perDeal.errorCode,
      requestId: record.perDeal.requestId,
    },
    successUrl: record.successUrl,
    cancelUrl: record.cancelUrl,
    realPaymentCompleted: record.realPaymentCompleted,
    sessionCreateHasProviderObjectCost: record.sessionCreateHasProviderObjectCost,
    reasons: record.reasons,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "VERIFY_FAILED");
  process.exit(1);
});
