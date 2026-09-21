import { PAID_VENTURE_FACTORY_PAYMENT_PATH_SEQUENCE } from "./principles";

export function paidVentureFactoryRequiresPaymentPathQc(): boolean {
  return true;
}

export function paidVentureFactoryPaymentPathSequence(): readonly string[] {
  return PAID_VENTURE_FACTORY_PAYMENT_PATH_SEQUENCE;
}

export function factoryPaymentPathIsProviderNeutral(): boolean {
  return true;
}

export function futurePaidVentureMustVerifyExecutablePath(input: {
  productsExist: boolean;
  pricesExist: boolean;
  webhookExists: boolean;
  livePathVerified: boolean;
}): "BLOCKED" | "READY" {
  if (!input.livePathVerified) return "BLOCKED";
  return input.productsExist && input.pricesExist && input.webhookExists ? "READY" : "BLOCKED";
}
