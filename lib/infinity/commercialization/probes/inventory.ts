import {
  CLOUDFLARE_LIVE_ENV,
  credentialPresence,
  envFlagConfigured,
  STRIPE_LIVE_ENV,
  STRIPE_SECRET_KEY_ENV,
  VERCEL_LIVE_ENV,
  VERCEL_TOKEN_ENV,
} from "../providers/config";
import { loadCloudflareConfig } from "../providers/cloudflare/config";
import { loadNamecheapConfig } from "../providers/namecheap/config";

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
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "TEST";
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return "LIVE";
  if (envFlagConfigured(STRIPE_LIVE_ENV) === "CONFIGURED") return "LIVE";
  return "UNKNOWN";
}

/** Env-only inventory. Never calls provider APIs. Never returns secret values. */
export function buildProviderInventory(): ProviderInventory {
  const namecheap = loadNamecheapConfig();
  const cloudflare = loadCloudflareConfig();
  const namecheapConfigured = namecheap.credentials ? "CONFIGURED" : "NOT_CONFIGURED";
  const cloudflareConfigured = cloudflare.credentials ? "CONFIGURED" : "NOT_CONFIGURED";
  const vercelConfigured = configuredFromPresence([credentialPresence(VERCEL_TOKEN_ENV, 11)]);
  const stripeConfigured = configuredFromPresence([credentialPresence(STRIPE_SECRET_KEY_ENV, 11)]);

  return {
    registrar: {
      providerKey: "namecheap.com_v1",
      providerName: "Namecheap",
      configured: namecheapConfigured,
      environment:
        namecheap.public.mode === "SANDBOX" ? "SANDBOX" : namecheap.public.mode === "PRODUCTION" ? "LIVE" : "UNKNOWN",
      credentialPresence: namecheap.public.credentialPresence,
      readCapabilities: ["listDomains", "getDomain", "getExpiration", "getNameservers", "verifyAuth"],
      writeCapabilities: ["registerDomain", "renewDomain", "transferDomain", "configureNameservers"],
      liveProbeSupport: true,
      readOnlyEnforceable: true,
      capabilities: namecheap.credentials
        ? ["listDomains", "getDomain", "getExpiration", "getNameservers", "verifyAuth"]
        : [],
    },
    dns: {
      providerKey: "cloudflare.dns_v1",
      providerName: "Cloudflare",
      configured: cloudflareConfigured,
      environment: cloudflare.credentials ? "LIVE" : envFlagConfigured(CLOUDFLARE_LIVE_ENV) === "CONFIGURED" ? "LIVE" : "UNKNOWN",
      credentialPresence: cloudflare.public.tokenConfigured ? "YES" : "NO",
      readCapabilities: ["verifyToken", "listZones", "getZone", "listRecords", "getRecord"],
      writeCapabilities: ["createZone", "createRecord", "updateRecord", "deleteRecord"],
      liveProbeSupport: true,
      readOnlyEnforceable: true,
      capabilities: cloudflare.credentials ? ["verifyToken", "listZones", "getZone", "listRecords"] : [],
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
      readCapabilities: ["getBalance", "listProducts", "listPrices", "listWebhookEndpoints"],
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
          ? ["getBalance", "listProducts", "listPrices", "getTransaction", "getSubscription"]
          : [],
    },
  };
}
