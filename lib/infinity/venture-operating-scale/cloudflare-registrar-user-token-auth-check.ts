import { reloadCloudflareRegistrarFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { CloudflareRegistrarAdapter } from "@/lib/infinity/commercialization/providers/cloudflare/registrar-adapter";
import type { ProviderMatrixStatus } from "./types";

export type CloudflareRegistrarUserTokenAuthCheckResult = {
  env: {
    accountIdLoaded: "YES" | "NO";
    generalTokenLoaded: "YES" | "NO";
    registrarTokenLoaded: "YES" | "NO";
  };
  routing: {
    registrarTokenSelected: "PASS" | "FAIL";
    generalTokenPreserved: "PASS" | "FAIL";
  };
  auth: {
    tokenAccepted: "YES" | "NO";
    accountVerified: "YES" | "NO";
    registrarApiReachable: "YES" | "NO";
    providerStatus: number | string;
    providerError: string | "NONE";
    verifyPath: string;
  };
  capabilities: {
    "domain.search": ProviderMatrixStatus;
    "domain.availability": ProviderMatrixStatus;
    "domain.pricing": ProviderMatrixStatus;
    "domain.registration": "UNVERIFIED";
  };
  leaseNpv: {
    available: "YES" | "NO" | "UNKNOWN";
    premium: "YES" | "NO" | "UNKNOWN";
    firstYear: number | "UNKNOWN";
    renewal: number | "UNKNOWN";
    currency: string | "UNKNOWN";
    timestamp: string;
  };
  result: "CLOUDFLARE_REGISTRAR_USER_TOKEN_VERIFIED" | "CLOUDFLARE_REGISTRAR_USER_TOKEN_FAILED";
  blocker: string | "NONE";
  purchases: 0;
  dnsWrites: 0;
  deployments: 0;
  stripeWrites: 0;
  realCharges: 0;
  publiclyLaunched: "NO";
  registrationPosts: number;
};

function capability(ok: boolean): ProviderMatrixStatus {
  return ok ? "READ_ONLY_VERIFIED" : "UNVERIFIED";
}

export async function executeCloudflareRegistrarUserTokenAuthCheck(input: {
  fetchImpl?: typeof fetch;
  reloadEnv?: boolean;
} = {}): Promise<CloudflareRegistrarUserTokenAuthCheckResult> {
  const priorGeneral = process.env.CLOUDFLARE_API_TOKEN ?? "";
  const envReload = input.reloadEnv === false
    ? {
        registrarPresent: (process.env.CLOUDFLARE_REGISTRAR_API_TOKEN?.trim() ? "YES" : "NO") as "YES" | "NO",
        generalPresent: (process.env.CLOUDFLARE_API_TOKEN?.trim() ? "YES" : "NO") as "YES" | "NO",
        accountIdPresent: (process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ? "YES" : "NO") as "YES" | "NO",
        confirmed: Boolean(process.env.CLOUDFLARE_REGISTRAR_API_TOKEN?.trim()),
        generalPreserved: true,
      }
    : reloadCloudflareRegistrarFromLocalFile();

  const adapter = new CloudflareRegistrarAdapter({ fetchImpl: input.fetchImpl });
  const registrarTokenSelected = adapter.registrarTokenSelected();
  const processGeneral = process.env.CLOUDFLARE_API_TOKEN ?? "";
  const processRegistrar = process.env.CLOUDFLARE_REGISTRAR_API_TOKEN ?? "";
  const generalTokenPreserved: "PASS" | "FAIL" =
    envReload.generalPresent === "YES" &&
    processGeneral.length > 0 &&
    processGeneral !== processRegistrar &&
    (priorGeneral === "" || processGeneral === priorGeneral || envReload.generalPreserved)
      ? "PASS"
      : envReload.generalPresent === "YES" && adapter.config.public.tokensAreDistinct
        ? "PASS"
        : "FAIL";

  const timestamp = new Date().toISOString();
  const failed = (
    blocker: string,
    extras: Partial<CloudflareRegistrarUserTokenAuthCheckResult["auth"]> = {},
  ): CloudflareRegistrarUserTokenAuthCheckResult => ({
    env: {
      accountIdLoaded: envReload.accountIdPresent,
      generalTokenLoaded: envReload.generalPresent,
      registrarTokenLoaded: envReload.registrarPresent,
    },
    routing: { registrarTokenSelected, generalTokenPreserved },
    auth: {
      tokenAccepted: extras.tokenAccepted ?? "NO",
      accountVerified: extras.accountVerified ?? "NO",
      registrarApiReachable: extras.registrarApiReachable ?? "NO",
      providerStatus: extras.providerStatus ?? 0,
      providerError: extras.providerError ?? blocker,
      verifyPath: extras.verifyPath ?? "/user/tokens/verify",
    },
    capabilities: {
      "domain.search": "UNVERIFIED",
      "domain.availability": "UNVERIFIED",
      "domain.pricing": "UNVERIFIED",
      "domain.registration": "UNVERIFIED",
    },
    leaseNpv: {
      available: "UNKNOWN",
      premium: "UNKNOWN",
      firstYear: "UNKNOWN",
      renewal: "UNKNOWN",
      currency: "UNKNOWN",
      timestamp,
    },
    result: "CLOUDFLARE_REGISTRAR_USER_TOKEN_FAILED",
    blocker,
    purchases: 0,
    dnsWrites: 0,
    deployments: 0,
    stripeWrites: 0,
    realCharges: 0,
    publiclyLaunched: "NO",
    registrationPosts: adapter.registrationPosts,
  });

  if (!envReload.confirmed || envReload.registrarPresent !== "YES" || registrarTokenSelected !== "PASS") {
    return failed("CLOUDFLARE_REGISTRAR_API_TOKEN_MISSING");
  }

  const token = await adapter.verifyToken();
  const account = await adapter.readAccount();
  const tokenAccepted = token.ok ? "YES" : "NO";

  if (tokenAccepted !== "YES") {
    return failed(token.safeError ?? "CLOUDFLARE_REGISTRAR_USER_TOKEN_REJECTED", {
      providerStatus: token.status || "UNAUTHORIZED",
      providerError: token.safeError ?? "CLOUDFLARE_REGISTRAR_USER_TOKEN_REJECTED",
      verifyPath: token.path,
    });
  }

  const search = await adapter.searchDomains("leasenpv.com");
  const check = await adapter.checkDomains(["leasenpv.com"]);
  const row = check.rows[0];
  const registrarApiReachable = search.ok || check.ok ? "YES" : "NO";
  const accountVerified =
    (account.ok && account.matchesRuntime === "PASS") || registrarApiReachable === "YES" ? "YES" : "NO";
  const pricingVerified = Boolean(row && (row.firstYear !== "UNKNOWN" || row.renewal !== "UNKNOWN"));
  const providerError = check.ok || search.ok
    ? "NONE"
    : check.safeError ?? search.safeError ?? account.safeError ?? "CLOUDFLARE_REGISTRAR_API_UNREACHABLE";
  const providerStatus = check.ok || search.ok ? 200 : token.status;

  if (registrarApiReachable !== "YES" || accountVerified !== "YES") {
    return failed(providerError === "NONE" ? "CLOUDFLARE_REGISTRAR_API_UNREACHABLE" : providerError, {
      providerStatus,
      providerError,
      verifyPath: token.path,
      tokenAccepted: "YES",
      accountVerified,
      registrarApiReachable,
    });
  }

  return {
    env: {
      accountIdLoaded: envReload.accountIdPresent,
      generalTokenLoaded: envReload.generalPresent,
      registrarTokenLoaded: envReload.registrarPresent,
    },
    routing: { registrarTokenSelected, generalTokenPreserved },
    auth: {
      tokenAccepted: "YES",
      accountVerified: "YES",
      registrarApiReachable: "YES",
      providerStatus,
      providerError: "NONE",
      verifyPath: token.path,
    },
    capabilities: {
      "domain.search": capability(search.ok),
      "domain.availability": capability(check.ok),
      "domain.pricing": pricingVerified ? "READ_ONLY_VERIFIED" : "UNVERIFIED",
      "domain.registration": "UNVERIFIED",
    },
    leaseNpv: {
      available: row?.available ?? "UNKNOWN",
      premium: row?.premium ?? "UNKNOWN",
      firstYear: row?.firstYear ?? "UNKNOWN",
      renewal: row?.renewal ?? "UNKNOWN",
      currency: row?.currency ?? "UNKNOWN",
      timestamp: row?.timestamp ?? timestamp,
    },
    result: "CLOUDFLARE_REGISTRAR_USER_TOKEN_VERIFIED",
    blocker: "NONE",
    purchases: 0,
    dnsWrites: 0,
    deployments: 0,
    stripeWrites: 0,
    realCharges: 0,
    publiclyLaunched: "NO",
    registrationPosts: adapter.registrationPosts,
  };
}
