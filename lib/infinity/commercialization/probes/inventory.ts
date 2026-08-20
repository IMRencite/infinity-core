import {
  CLOUDFLARE_API_TOKEN_ENV,
  CLOUDFLARE_LIVE_ENV,
  credentialPresence,
  envFlagConfigured,
  NAMECHEAP_API_KEY_ENV,
  NAMECHEAP_API_USER_ENV,
  NAMECHEAP_CLIENT_IP_ENV,
  NAMECHEAP_LIVE_ENV,
  STRIPE_LIVE_ENV,
  STRIPE_SECRET_KEY_ENV,
  VERCEL_LIVE_ENV,
  VERCEL_TOKEN_ENV,
} from "../providers/config";

export type ProviderConfigured = "CONFIGURED" | "NOT_CONFIGURED" | "PARTIALLY_CONFIGURED" | "INVALID_CONFIGURATION";

export type ProviderEnvironment = "TEST" | "LIVE" | "SANDBOX" | "UNKNOWN";

export type ProviderInventoryEntry = {
  providerKey: string;
  providerName: string;
  configured: ProviderConfigured;
  environment: ProviderEnvironment;
  credentialPresence: "YES" | "NO";
  readCapabilities: string[];
  writeCapabilities: string[];
  liveProbeSupport: boolean;
  readOnlyEnforceable: true;
  capabilities: string[];
};

export type ProviderInventory = {
  registrar: ProviderInventoryEntry;
  dns: ProviderInventoryEntry;
  hosting: ProviderInventoryEntry;
  payments: ProviderInventoryEntry;
};

function configuredFromPresence(parts: Array<"CONFIGURED" | "MISSING" | "INVALID">): ProviderConfigured {
  if (parts.every((p) => p === "CONFIGURED")) return "CONFIGURED";
  if (parts.every((p) => p === "MISSING")) return "NOT_CONFIGURED";
  if (parts.some((p) => p === "INVALID")) return "INVALID_CONFIGURATION";
  return "PARTIALLY_CONFIGURED";
}

function stripeEnvironment(): ProviderEnvironment {
  const key = process.env[STRIPE_SECRET_KEY_ENV]?.trim() ?? "";
  if (key.startsWith("sk_test_")) return "TEST";
  if (key.startsWith("sk_live_")) return "LIVE";
  if (envFlagConfigured(STRIPE_LIVE_ENV) === "CONFIGURED") return "LIVE";
  return "UNKNOWN";
}

/** Env-only inventory. Never calls provider APIs. Never returns secret values. */
export function buildProviderInventory(): ProviderInventory {
  const namecheapParts = [
    credentialPresence(NAMECHEAP_API_USER_ENV),
    credentialPresence(NAMECHEAP_API_KEY_ENV),
    credentialPresence(NAMECHEAP_CLIENT_IP_ENV, 7),
  ] as const;
  const namecheapConfigured = configuredFromPresence([...namecheapParts]);
  const cloudflareConfigured = configuredFromPresence([credentialPresence(CLOUDFLARE_API_TOKEN_ENV)]);
  const vercelConfigured = configuredFromPresence([credentialPresence(VERCEL_TOKEN_ENV, 11)]);
  const stripeConfigured = configuredFromPresence([credentialPresence(STRIPE_SECRET_KEY_ENV, 11)]);

  return {
    registrar: {
      providerKey: "namecheap.com_v1",
      providerName: "Namecheap",
      configured: namecheapConfigured,
      environment: envFlagConfigured(NAMECHEAP_LIVE_ENV) === "CONFIGURED" ? "LIVE" : "UNKNOWN",
      credentialPresence: namecheapConfigured === "CONFIGURED" ? "YES" : "NO",
      readCapabilities: ["searchDomains", "getAvailability", "getRegistrationPrice", "getRenewalPrice"],
      writeCapabilities: ["registerDomain", "configureNameservers"],
      liveProbeSupport: true,
      readOnlyEnforceable: true,
      capabilities:
        namecheapConfigured === "CONFIGURED"
          ? ["searchDomains", "getAvailability", "getRegistrationPrice", "getRenewalPrice"]
          : [],
    },
    dns: {
      providerKey: "cloudflare.dns_v1",
      providerName: "Cloudflare",
      configured: cloudflareConfigured,
      environment: envFlagConfigured(CLOUDFLARE_LIVE_ENV) === "CONFIGURED" ? "LIVE" : "UNKNOWN",
      credentialPresence: cloudflareConfigured === "CONFIGURED" ? "YES" : "NO",
      readCapabilities: ["getZone", "listRecords", "verifyRecord", "listZones"],
      writeCapabilities: ["createZone", "createRecord", "updateRecord", "deleteRecord"],
      liveProbeSupport: true,
      readOnlyEnforceable: true,
      capabilities: cloudflareConfigured === "CONFIGURED" ? ["getZone", "listRecords", "verifyRecord"] : [],
    },
    hosting: {
      providerKey: "vercel.com_v1",
      providerName: "Vercel",
      configured: vercelConfigured,
      environment: envFlagConfigured(VERCEL_LIVE_ENV) === "CONFIGURED" ? "LIVE" : "UNKNOWN",
      credentialPresence: vercelConfigured === "CONFIGURED" ? "YES" : "NO",
      readCapabilities: ["getUser", "listProjects", "listDeployments", "listDomains"],
      writeCapabilities: ["createProject", "deploy", "attachDomain", "promoteAlias"],
      liveProbeSupport: true,
      readOnlyEnforceable: true,
      capabilities:
        vercelConfigured === "CONFIGURED" ? ["getUser", "listProjects", "listDeployments", "getDeployment"] : [],
    },
    payments: {
      providerKey: "stripe.com_v1",
      providerName: "Stripe",
      configured: stripeConfigured,
      environment: stripeEnvironment(),
      credentialPresence: stripeConfigured === "CONFIGURED" ? "YES" : "NO",
      readCapabilities: ["getAccount", "listProducts", "listPrices", "listWebhookEndpoints"],
      writeCapabilities: [
        "createProduct",
        "createPrice",
        "createCustomer",
        "createCheckout",
        "createPaymentIntent",
        "createSubscription",
        "refund",
      ],
      liveProbeSupport: true,
      readOnlyEnforceable: true,
      capabilities:
        stripeConfigured === "CONFIGURED"
          ? ["getAccount", "listProducts", "listPrices", "getTransaction", "getSubscription"]
          : [],
    },
  };
}
