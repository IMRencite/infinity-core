export const PAYMENT_PATH_REVERIFY_TRIGGERS = [
  "deployment",
  "provider_configuration_mutation",
  "offer_activation",
  "payment_incident_recovery",
  "daily_venture_operating_cycle",
  "public_launch_readiness",
] as const;

export type PaymentPathReverifyTrigger = (typeof PAYMENT_PATH_REVERIFY_TRIGGERS)[number];

export function shouldReverifyPaymentPath(trigger: string): boolean {
  return (PAYMENT_PATH_REVERIFY_TRIGGERS as readonly string[]).includes(trigger);
}

export function relevantPaymentPathChangeInvalidatesVerification(change: {
  credential?: boolean;
  permission?: boolean;
  product?: boolean;
  price?: boolean;
  webhook?: boolean;
  accountBinding?: boolean;
  checkoutRoute?: boolean;
  returnUrl?: boolean;
  offerBinding?: boolean;
}): boolean {
  return Object.values(change).some(Boolean);
}

export const DAILY_PAYMENT_PATH_VERIFICATION_REQUIRED = true;
