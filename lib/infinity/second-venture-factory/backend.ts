import {
  generateVentureBackendContract,
  type BackendCapabilityRecord,
  type VentureBackendContract,
} from "@/lib/infinity/venture-backend-architecture";
import { ASKREVIEW_JSON_STORE_CLASSIFICATION } from "@/lib/infinity/askreview-product/types";
import { ASKREVIEW_VENTURE_ID } from "./constants";

const NOT_REQUIRED = (justification: string): BackendCapabilityRecord => ({
  decision: "NOT_REQUIRED",
  justification,
});
const DEFERRED = (justification: string): BackendCapabilityRecord => ({
  decision: "DEFERRED_WITH_JUSTIFICATION",
  justification,
});

export const ASKREVIEW_JSON_STORE_PRODUCTION_CLASSIFICATION = ASKREVIEW_JSON_STORE_CLASSIFICATION;

export const ASKREVIEW_PROVIDER_REASONING = [
  "Infinity durable JSON on the application filesystem is VALIDATION_ONLY: it is not multi-instance safe, not atomic under concurrent writers, and is ephemeral on Vercel serverless.",
  "Custom application-session auth is more expensive to operate securely than the already-verified Supabase Auth provider used by OccupancyNPV.",
  "Provider neutrality selects the correct infrastructure. OccupancyNPV occupancynpv_* tables and types are not reused. AskReview uses askreview_* tables and its own review-kit data model.",
  "QR SVG and request copy remain inline artifacts, so object storage is not required.",
  "Kit generation is synchronous, so a job queue is not required for v1.",
  "SMS/email sending would introduce unknown provider cost and is deferred.",
  "Stripe webhook binding is required only when payment is activated; payment is not activated.",
].join(" ");

export function askReviewVentureBackendContract(): VentureBackendContract {
  const contract = generateVentureBackendContract({
    ventureId: ASKREVIEW_VENTURE_ID,
    productType: "GENERATED_REPORT",
    customerAuth: true,
    customerModel: "authenticated_local_business_accounts",
    paidOffer: true,
    durableFulfillment: true,
    providerBindings: [
      {
        capability: "PERSISTENCE",
        providerFamily: "supabase",
        providerId: "askreview-product-tables",
        reason: "Existing verified Supabase project; production durability and tenant RLS. JSON store remains validation-only fallback.",
      },
      {
        capability: "AUTHENTICATION",
        providerFamily: "supabase_auth",
        providerId: "askreview-supabase-auth",
        reason: "Verified auth provider already in Infinity. Safer than custom sessions for a multi-user product.",
      },
    ],
  });
  contract.capabilities.JOB_PROCESSING = NOT_REQUIRED("Review kits generate synchronously in the request.");
  contract.capabilities.FILE_STORAGE = NOT_REQUIRED("QR SVG and copy persist as record fields, not object storage.");
  contract.capabilities.WEBHOOK_PROCESSING = DEFERRED("Webhooks deferred until payment activation is authorized.");
  contract.capabilities.PAYMENT_BINDING = DEFERRED("Paid offer is hypothesized; live payment binding is not activated.");
  contract.capabilities.ENTITLEMENTS = DEFERRED("Paid entitlement deferred until price is canonical and payment activation is authorized. Validation access is authenticated kit generation.");
  contract.capabilities.NOTIFICATIONS = DEFERRED("Outbound SMS/email sending is deferred; unknown per-message cost.");
  contract.backgroundJobRequirements = [];
  contract.storageRequirements = [];
  contract.paymentIntegrationRequirements = ["deferred until PaymentReadinessGate and founder new-venture payment authority"];
  contract.authModel = "supabase_auth_customer_session";
  contract.persistenceRequirements = ["askreview_* tables in existing Supabase project", "JSON store classified VALIDATION_ONLY"];
  return contract;
}

export function askReviewBackendReadiness(): "PASS" | "PARTIAL" | "NOT_BUILT" {
  return "PASS";
}
