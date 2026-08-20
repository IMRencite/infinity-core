import type { ActionTypeDefinition } from "@/lib/infinity/launch-gateway/action-registry";

/** Commercialization capabilities registered with External Action Gateway */
export const COMMERCIALIZATION_ACTION_TYPES: Record<string, ActionTypeDefinition> = {
  "payment.create_product": {
    actionType: "payment.create_product",
    sideEffectClass: "external_account_change",
    defaultRisk: "moderate",
    estimatedCostUsd: 0,
    requiredPermission: "payment.configure",
    supportsRollback: true,
    retryable: true,
    credentialScope: "payments.provider",
  },
  "payment.create_price": {
    actionType: "payment.create_price",
    sideEffectClass: "external_account_change",
    defaultRisk: "moderate",
    estimatedCostUsd: 0,
    requiredPermission: "payment.configure",
    supportsRollback: true,
    retryable: true,
    credentialScope: "payments.provider",
  },
  "payment.configure_checkout": {
    actionType: "payment.configure_checkout",
    sideEffectClass: "reversible_external",
    defaultRisk: "moderate",
    estimatedCostUsd: 0,
    requiredPermission: "payment.configure",
    supportsRollback: true,
    retryable: true,
    credentialScope: "payments.provider",
  },
  "payment.configure_webhook": {
    actionType: "payment.configure_webhook",
    sideEffectClass: "reversible_external",
    defaultRisk: "low",
    estimatedCostUsd: 0,
    requiredPermission: "payment.configure",
    supportsRollback: true,
    retryable: true,
    credentialScope: "payments.provider",
  },
};

export const COMMERCIALIZATION_GATEWAY_CAPABILITIES = [
  "REGISTER_DOMAIN",
  "UPDATE_DNS",
  "CREATE_HOSTING_PROJECT",
  "ATTACH_DOMAIN",
  "CREATE_PAYMENT_PRODUCT",
  "CREATE_PAYMENT_PRICE",
  "CONFIGURE_CHECKOUT",
  "CONFIGURE_WEBHOOK",
] as const;

export type CommercialGatewayCapability = (typeof COMMERCIALIZATION_GATEWAY_CAPABILITIES)[number];

export function mapCapabilityToActionType(capability: CommercialGatewayCapability): string {
  const map: Record<CommercialGatewayCapability, string> = {
    REGISTER_DOMAIN: "domain.register",
    UPDATE_DNS: "dns.configure",
    CREATE_HOSTING_PROJECT: "hosting.create_project",
    ATTACH_DOMAIN: "hosting.verify_deployment",
    CREATE_PAYMENT_PRODUCT: "payment.create_product",
    CREATE_PAYMENT_PRICE: "payment.create_price",
    CONFIGURE_CHECKOUT: "payment.configure_checkout",
    CONFIGURE_WEBHOOK: "payment.configure_webhook",
  };
  return map[capability];
}

/** Spend execution must pass through gateway — direct registrar calls blocked at adapter boundary */
export function assertGatewayBackedExecution(input: { authorizationRef: string | null; externalActionId?: string | null }): void {
  if (!input.authorizationRef) throw new Error("AUTHORIZATION_MISSING");
}
