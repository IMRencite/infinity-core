export const PAYMENT_CONFIGURATION_IS_NOT_PAYMENT_READINESS =
  "PAYMENT CONFIGURATION IS NOT PAYMENT READINESS." as const;
export const LIVE_PAYMENT_EXECUTION_MUST_BE_VERIFIED =
  "LIVE PAYMENT EXECUTION CAPABILITY MUST BE VERIFIED BEFORE ACTIVATION AND LAUNCH." as const;
export const LAUNCHED_PAID_VENTURE_MUST_CONTINUOUSLY_VERIFY =
  "A PUBLICLY LAUNCHED PAID VENTURE MUST CONTINUOUSLY VERIFY ITS LIVE MONEY PATH." as const;
export const FOUNDER_CHECKOUT_IS_NOT_MONITORING =
  "FOUNDER PHYSICAL CHECKOUT TESTING IS NOT A SUBSTITUTE FOR AUTOMATED PAYMENT QC." as const;
export const HIGH_PRIORITY_COMMERCIAL_INCIDENT = "HIGH_PRIORITY_COMMERCIAL_INCIDENT" as const;
export const PAYMENT_PATH_OPERATING_PRECEDENCE =
  "critical technical/commercial failure > waiting for growth evidence" as const;

export const PAID_VENTURE_FACTORY_PAYMENT_PATH_SEQUENCE = [
  "CommercialOfferContract",
  "BackendReadiness",
  "FulfillmentContract",
  "PaymentProviderConfiguration",
  "PaymentPathReadinessGate",
  "CommercialProductionReadinessGate",
  "PublicLaunchReadinessGate",
] as const;

export const LEAST_PRIVILEGE_PAYMENT_CREDENTIAL_RULE =
  "Never solve provider permission failure by switching to unrestricted financial credentials." as const;
