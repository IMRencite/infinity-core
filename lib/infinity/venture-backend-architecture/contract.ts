export const VENTURE_BACKEND_CONTRACT = "VentureBackendContract" as const;
export const VENTURE_BACKEND_REQUIRED_BY_DEFAULT = true as const;
export const VENTURE_BACKEND_PROVIDER_SPECIFIC = false as const;

export const BACKEND_CAPABILITIES = [
  "AUTHENTICATION",
  "CUSTOMER_IDENTITY",
  "PERSISTENCE",
  "BUSINESS_LOGIC",
  "API_LAYER",
  "ENTITLEMENTS",
  "FULFILLMENT_STATE",
  "PAYMENT_BINDING",
  "SERVER_VALIDATION",
  "FILE_STORAGE",
  "JOB_PROCESSING",
  "NOTIFICATIONS",
  "SUPPORT_STATE",
  "ADMIN_OPERATOR_STATE",
  "AUDIT_TRAIL",
  "OBSERVABILITY",
  "ANALYTICS",
  "SECURITY_AUTHORIZATION",
  "TENANT_ISOLATION",
  "RATE_LIMITING",
  "RECOVERY_RETRY",
  "WEBHOOK_PROCESSING",
] as const;

export type BackendCapability = (typeof BACKEND_CAPABILITIES)[number];
export type BackendCapabilityDecision = "REQUIRED" | "NOT_REQUIRED" | "DEFERRED_WITH_JUSTIFICATION";

export const VENTURE_PRODUCT_TYPES = [
  "SAAS_TOOL",
  "DIGITAL_DOWNLOAD",
  "GENERATED_REPORT",
  "SERVICE_DELIVERY",
  "MARKETPLACE",
  "LEAD_INTRODUCTION",
  "PHYSICAL_PRODUCT",
  "CONTENT_MEDIA",
] as const;

export type VentureProductType = (typeof VENTURE_PRODUCT_TYPES)[number];

export type BackendCapabilityRecord = {
  decision: BackendCapabilityDecision;
  justification: string;
};

export type VentureBackendProviderBinding = {
  capability: string;
  providerFamily: string;
  providerId: string | null;
  reason: string;
};

export type VentureBackendContract = {
  contract: typeof VENTURE_BACKEND_CONTRACT;
  ventureId: string;
  productType: VentureProductType;
  customerModel: string;
  customerAuth: boolean;
  dataModelRequirements: string[];
  authModel: string;
  persistenceRequirements: string[];
  businessLogicRequirements: string[];
  apiRequirements: string[];
  paymentIntegrationRequirements: string[];
  fulfillmentIntegrationRequirements: string[];
  backgroundJobRequirements: string[];
  storageRequirements: string[];
  securityModel: string;
  tenantModel: string;
  observabilityModel: string;
  backupRecoveryExpectations: string;
  operatorAdminCapabilities: string[];
  providerBindings: VentureBackendProviderBinding[];
  capabilities: Record<BackendCapability, BackendCapabilityRecord>;
  implicitNoneDisallowed: true;
  productionVerificationState: "UNVERIFIED" | "PARTIAL" | "VERIFIED";
};

export type GenerateVentureBackendContractInput = {
  ventureId: string;
  productType: VentureProductType;
  customerAuth?: boolean;
  customerModel?: string;
  paidOffer?: boolean;
  durableFulfillment?: boolean;
  providerBindings?: VentureBackendProviderBinding[];
};

const REQUIRED = (justification: string): BackendCapabilityRecord => ({
  decision: "REQUIRED",
  justification,
});
const NOT_REQUIRED = (justification: string): BackendCapabilityRecord => ({
  decision: "NOT_REQUIRED",
  justification,
});
const DEFERRED = (justification: string): BackendCapabilityRecord => ({
  decision: "DEFERRED_WITH_JUSTIFICATION",
  justification,
});

export function defaultCapabilitiesForProductType(
  productType: VentureProductType,
  input: Pick<GenerateVentureBackendContractInput, "customerAuth" | "paidOffer" | "durableFulfillment">,
): Record<BackendCapability, BackendCapabilityRecord> {
  const auth = input.customerAuth === true;
  const paid = input.paidOffer !== false;
  const fulfill = input.durableFulfillment !== false;
  const base: Record<BackendCapability, BackendCapabilityRecord> = {
    AUTHENTICATION: auth ? REQUIRED("Authenticated customer accounts require a server auth backend.") : NOT_REQUIRED("Customer authentication is not part of this offer."),
    CUSTOMER_IDENTITY: auth || paid ? REQUIRED("Customer identity is required to bind accounts, orders, or entitlements.") : NOT_REQUIRED("No durable customer identity is promised."),
    PERSISTENCE: fulfill ? REQUIRED("Durable customer/product/fulfillment state cannot live only in the client.") : NOT_REQUIRED("No durable business state is required."),
    BUSINESS_LOGIC: REQUIRED("Server-side business rules are required whenever a customer promise exists."),
    API_LAYER: auth || fulfill ? REQUIRED("Server APIs mediate customer and fulfillment state.") : DEFERRED("No customer API is required until a durable product surface exists."),
    ENTITLEMENTS: paid ? REQUIRED("Paid access must be granted and checked server-side.") : NOT_REQUIRED("No paid entitlement is offered."),
    FULFILLMENT_STATE: fulfill ? REQUIRED("Fulfillment must create and reconcile durable delivery state.") : NOT_REQUIRED("No fulfillment state is promised."),
    PAYMENT_BINDING: paid ? REQUIRED("Payments must bind to identity and fulfillment on the server.") : NOT_REQUIRED("No payment binding is required."),
    SERVER_VALIDATION: REQUIRED("Client input is never trusted as authorization or commercial truth."),
    FILE_STORAGE: NOT_REQUIRED("No customer file artifacts are in the current product promise."),
    JOB_PROCESSING: DEFERRED("Background jobs are deferred until an asynchronous deliverable exists."),
    NOTIFICATIONS: DEFERRED("Transactional notifications are deferred unless delivery depends on them."),
    SUPPORT_STATE: REQUIRED("Support must be able to look up customer/fulfillment state."),
    ADMIN_OPERATOR_STATE: REQUIRED("Operators need a read projection of backend health and customer state."),
    AUDIT_TRAIL: paid || fulfill ? REQUIRED("Commercial state changes must be auditable.") : DEFERRED("Audit trail deferred until commercial state exists."),
    OBSERVABILITY: REQUIRED("A production backend cannot be autonomous if Infinity cannot observe it."),
    ANALYTICS: DEFERRED("Product analytics are deferred to Performance Intelligence when events exist."),
    SECURITY_AUTHORIZATION: auth || paid ? REQUIRED("Authorization is server-side. Frontend visibility is never authorization.") : REQUIRED("Public write surfaces still require server validation and abuse controls."),
    TENANT_ISOLATION: auth ? REQUIRED("Customer data must be isolated by account/workspace.") : NOT_REQUIRED("No multi-customer persisted product data."),
    RATE_LIMITING: auth || paid ? REQUIRED("Auth and payment surfaces require abuse limits.") : DEFERRED("Rate limiting deferred until a public write API exists."),
    RECOVERY_RETRY: fulfill || paid ? REQUIRED("Payment and fulfillment events must be recoverable and idempotent.") : DEFERRED("Recovery deferred until external events exist."),
    WEBHOOK_PROCESSING: paid ? REQUIRED("Verified provider webhooks reconcile payment and fulfillment.") : NOT_REQUIRED("No provider webhook surface."),
  };

  if (productType === "DIGITAL_DOWNLOAD") {
    base.FILE_STORAGE = REQUIRED("Download delivery requires stored artifacts and entitlement checks.");
    base.AUTHENTICATION = auth ? base.AUTHENTICATION : DEFERRED("Account optional if order+token delivery is sufficient.");
    base.JOB_PROCESSING = DEFERRED("Packaging jobs only if artifacts are generated after purchase.");
  }
  if (productType === "GENERATED_REPORT") {
    base.JOB_PROCESSING = REQUIRED("Report generation is an asynchronous job with recovery.");
    base.FILE_STORAGE = REQUIRED("Generated artifacts must persist until delivery.");
  }
  if (productType === "SERVICE_DELIVERY") {
    base.JOB_PROCESSING = REQUIRED("Service workflows require durable job/booking state.");
    base.NOTIFICATIONS = REQUIRED("Customer and operator communication is part of delivery.");
  }
  if (productType === "MARKETPLACE") {
    base.AUTHENTICATION = REQUIRED("Buyers and sellers require accounts.");
    base.TENANT_ISOLATION = REQUIRED("Buyer/seller permissions and listings must be isolated.");
  }
  if (productType === "LEAD_INTRODUCTION") {
    base.AUTHENTICATION = NOT_REQUIRED("Lead capture does not imply a customer login.");
    base.PERSISTENCE = REQUIRED("Lead state, consent, routing, and attribution must persist.");
    base.ENTITLEMENTS = NOT_REQUIRED("Leads are not product entitlements.");
    base.PAYMENT_BINDING = paid ? REQUIRED("Paid lead delivery must bind to the commercial event.") : NOT_REQUIRED("Unpaid lead routing has no payment binding.");
  }
  if (productType === "PHYSICAL_PRODUCT") {
    base.FULFILLMENT_STATE = REQUIRED("Orders, inventory binding, and shipping status must persist.");
    base.JOB_PROCESSING = REQUIRED("Fulfillment/shipping updates are asynchronous.");
  }
  if (productType === "CONTENT_MEDIA") {
    base.AUTHENTICATION = auth ? REQUIRED("Entitled content access requires auth.") : NOT_REQUIRED("Public content does not require accounts.");
    base.ENTITLEMENTS = auth || paid ? REQUIRED("Content access is an entitlement.") : NOT_REQUIRED("Public content has no entitlement layer.");
  }
  return base;
}

export function generateVentureBackendContract(input: GenerateVentureBackendContractInput): VentureBackendContract {
  const customerAuth = input.customerAuth === true;
  const capabilities = defaultCapabilitiesForProductType(input.productType, input);
  const required = Object.entries(capabilities)
    .filter(([, value]) => value.decision === "REQUIRED")
    .map(([key]) => key);
  return {
    contract: VENTURE_BACKEND_CONTRACT,
    ventureId: input.ventureId,
    productType: input.productType,
    customerModel: input.customerModel ?? (customerAuth ? "authenticated_customer_accounts" : "anonymous_or_order_identity"),
    customerAuth,
    dataModelRequirements: required.includes("PERSISTENCE") ? ["durable customer/product/fulfillment records"] : [],
    authModel: customerAuth ? "server_authenticated_customer_session" : "none",
    persistenceRequirements: required.includes("PERSISTENCE") ? ["durable store reachable in production"] : [],
    businessLogicRequirements: ["server-validated product and commercial rules"],
    apiRequirements: required.includes("API_LAYER") ? ["server API for customer and fulfillment state"] : [],
    paymentIntegrationRequirements: required.includes("PAYMENT_BINDING") ? ["verified payment event to identity/entitlement binding"] : [],
    fulfillmentIntegrationRequirements: required.includes("FULFILLMENT_STATE") ? ["create and reconcile promised delivery state"] : [],
    backgroundJobRequirements: capabilities.JOB_PROCESSING.decision === "REQUIRED" ? ["recoverable background execution"] : [],
    storageRequirements: capabilities.FILE_STORAGE.decision === "REQUIRED" ? ["durable object/file storage"] : [],
    securityModel: "server-side authorization, secrets server-only, no client-only entitlement or payment trust",
    tenantModel: customerAuth ? "customer_account_isolation" : "single_tenant_or_none",
    observabilityModel: "uptime, request failures, persistence, payment reconcile, fulfillment, retries, jobs",
    backupRecoveryExpectations: required.includes("PERSISTENCE") ? "recoverable durable state and idempotent external events" : "not applicable",
    operatorAdminCapabilities: ["customer/account lookup", "entitlement/fulfillment status", "product health"],
    providerBindings: input.providerBindings ?? [],
    capabilities,
    implicitNoneDisallowed: true,
    productionVerificationState: "UNVERIFIED",
  };
}

export function backendContractRequiresDurableState(contract: VentureBackendContract): boolean {
  return BACKEND_CAPABILITIES.some((capability) => {
    if (capability === "OBSERVABILITY" || capability === "ANALYTICS" || capability === "SUPPORT_STATE" || capability === "ADMIN_OPERATOR_STATE") {
      return false;
    }
    return contract.capabilities[capability].decision === "REQUIRED";
  });
}

export function mapFactoryTemplateToProductType(template: string): VentureProductType {
  if (/saas|subscription/i.test(template)) return "SAAS_TOOL";
  if (/marketplace/i.test(template)) return "MARKETPLACE";
  if (/lead/i.test(template)) return "LEAD_INTRODUCTION";
  if (/download|digital/i.test(template)) return "DIGITAL_DOWNLOAD";
  if (/report|generated/i.test(template)) return "GENERATED_REPORT";
  if (/service|booking/i.test(template)) return "SERVICE_DELIVERY";
  if (/physical|commerce|shop/i.test(template)) return "PHYSICAL_PRODUCT";
  if (/content|media|newsletter/i.test(template)) return "CONTENT_MEDIA";
  return "SAAS_TOOL";
}
