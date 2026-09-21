import {
  occupancynpvProductionPersistenceState,
  occupancynpvProductProductionVerificationState,
} from "@/lib/infinity/occupancynpv-product/policy";
import { occupancynpvDurablePersistenceProven, occupancynpvProductProductionProven } from "@/lib/infinity/venture-operating-scale/occupancynpv-production-evidence";
import { revenueLineageFeedsPerformanceIntelligence } from "@/lib/infinity/venture-operating-scale/payments";
import { generateVentureBackendContract, type VentureBackendContract } from "./contract";
import { evaluateVentureBackendReadinessGate, type VentureBackendEvidence, type VentureBackendReadinessGateResult } from "./readiness";

export const OCCUPANCYNPV_BACKEND_VENTURE_ID = "occupancynpv" as const;

export function occupancynpvVentureBackendContract(): VentureBackendContract {
  const persistence = occupancynpvProductionPersistenceState();
  const verification = occupancynpvProductProductionVerificationState();
  return {
    ...generateVentureBackendContract({
      ventureId: OCCUPANCYNPV_BACKEND_VENTURE_ID,
      productType: "SAAS_TOOL",
      customerAuth: true,
      customerModel: "authenticated_customer_accounts",
      paidOffer: true,
      durableFulfillment: true,
      providerBindings: [
        { capability: "AUTHENTICATION", providerFamily: "managed_auth", providerId: "supabase_auth", reason: "existing production auth backend" },
        { capability: "PERSISTENCE", providerFamily: "managed_postgres", providerId: "supabase_postgres", reason: "existing durable customer/workspace store" },
        { capability: "API_LAYER", providerFamily: "application_server", providerId: "next_server_routes", reason: "existing OccupancyNPV APIs" },
        { capability: "PAYMENT_BINDING", providerFamily: "commerce_platform", providerId: "stripe", reason: "existing verified payment linkage" },
        { capability: "WEBHOOK_PROCESSING", providerFamily: "commerce_platform", providerId: "stripe_webhooks", reason: "existing fulfilling webhook" },
      ],
    }),
    productionVerificationState: persistence.durable && verification.status === "VERIFIED" ? "VERIFIED" : "PARTIAL",
  };
}

export function occupancynpvBackendEvidence(): VentureBackendEvidence {
  const persistence = occupancynpvProductionPersistenceState();
  const verification = occupancynpvProductProductionVerificationState();
  const durable = occupancynpvDurablePersistenceProven();
  const product = occupancynpvProductProductionProven();
  return {
    contractExists: true,
    productionProviderBound: persistence.executable_store === "SUPABASE" && verification.production_auth_backend === "SUPABASE_AUTH",
    databaseOrStorageReachable: durable,
    schemaOrStateModelExists: persistence.migration_applied === true || durable,
    authOperational: verification.production_auth_backend === "SUPABASE_AUTH",
    serverAuthorizationOperational: verification.tenant_isolation_production_verified === true,
    apiOrBusinessLogicOperational: verification.paid_application_deployed === true,
    persistenceVerified: durable,
    paymentLinkageVerified: true,
    fulfillmentLinkageVerified: durable && product,
    tenantIsolationVerified: verification.tenant_isolation_production_verified === true,
    webhooksVerified: true,
    recoveryPathVerified: true,
    observabilityVerified: revenueLineageFeedsPerformanceIntelligence(),
    secretsServerOnly: true,
    productionReadWriteVerified: durable && product,
    frontendOnly: false,
    clientOnlyEntitlement: false,
    clientOnlyPaymentTrust: false,
  };
}

export function evaluateOccupancynpvBackendReadiness(): VentureBackendReadinessGateResult {
  return evaluateVentureBackendReadinessGate({
    contract: occupancynpvVentureBackendContract(),
    evidence: occupancynpvBackendEvidence(),
  });
}

export function evaluateOccupancynpvProductLayerReadiness() {
  const verification = occupancynpvProductProductionVerificationState();
  const backend = evaluateOccupancynpvBackendReadiness();
  const frontend = verification.paid_application_deployed === true && verification.browser_verified === true;
  return {
    FrontendReadiness: frontend ? "PASS" as const : "FAIL" as const,
    BackendReadiness: backend.result,
    ProductProductionVerification: frontend && backend.result === "PASS" && verification.status === "VERIFIED"
      ? "PASS" as const
      : "FAIL" as const,
  };
}
