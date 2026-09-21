import type { ProviderCapabilityStatus, ProviderProbeFailureCode } from "../../probes/status";

export type ExternalConfigurationBlockClass =
  | "CODE_DEFECT"
  | "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED";

export type NamecheapProviderCause =
  | "API_FEATURE_NOT_ENABLED"
  | "API_USER_DISABLED_OR_LOCKED"
  | "API_USER_BLOCKED_BY_ADMINISTRATOR"
  | "USERNAME_DISABLED_OR_LOCKED"
  | "CLIENT_IP_WHITELIST"
  | "CLIENT_IP_DISABLED_OR_LOCKED"
  | "REQUEST_IP_DISABLED_OR_LOCKED"
  | "INVALID_API_KEY"
  | "INVALID_API_USER"
  | "CREDENTIAL_MISMATCH"
  | "ENDPOINT_MISMATCH"
  | "ACCOUNT_RESTRICTION"
  | "NETWORK_ERROR"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "NOT_CONFIGURED"
  | "OTHER";

export function classifyNamecheapProviderError(input: {
  message: string;
  code?: string | null;
  status?: number | null;
}): {
  status: ProviderCapabilityStatus;
  failureCode: ProviderProbeFailureCode;
  reason: string;
  blockClass: ExternalConfigurationBlockClass;
  cause: NamecheapProviderCause;
} {
  const message = input.message ?? "";
  const code = String(input.code ?? "");
  const status = input.status ?? null;

  if (
    /1017101/i.test(message) ||
    code === "1017101" ||
    /ApiUser has been blocked by administrator/i.test(message) ||
    /NAMECHEAP_API_USER_BLOCKED_BY_ADMINISTRATOR/i.test(message)
  ) {
    return {
      status: "FAILED",
      failureCode: "PERMISSION_DENIED",
      reason: "NAMECHEAP_API_USER_BLOCKED_BY_ADMINISTRATOR",
      blockClass: "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED",
      cause: "API_USER_BLOCKED_BY_ADMINISTRATOR",
    };
  }
  if (/1017103/i.test(message) || code === "1017103" || /UserName is disabled or locked/i.test(message)) {
    return {
      status: "FAILED",
      failureCode: "PERMISSION_DENIED",
      reason: "NAMECHEAP_USERNAME_DISABLED_OR_LOCKED",
      blockClass: "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED",
      cause: "USERNAME_DISABLED_OR_LOCKED",
    };
  }
  if (/1017150/i.test(message) || code === "1017150" || /RequestIP is disabled or locked/i.test(message)) {
    return {
      status: "FAILED",
      failureCode: "PERMISSION_DENIED",
      reason: "NAMECHEAP_REQUEST_IP_DISABLED_OR_LOCKED",
      blockClass: "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED",
      cause: "REQUEST_IP_DISABLED_OR_LOCKED",
    };
  }
  if (/1017105/i.test(message) || code === "1017105" || /ClientIP is disabled or locked/i.test(message)) {
    return {
      status: "FAILED",
      failureCode: "PERMISSION_DENIED",
      reason: "NAMECHEAP_CLIENT_IP_DISABLED_OR_LOCKED",
      blockClass: "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED",
      cause: "CLIENT_IP_DISABLED_OR_LOCKED",
    };
  }
  if (/not whitelisted|IP is not|1011150/i.test(message) || code === "1011150") {
    return {
      status: "FAILED",
      failureCode: "PERMISSION_DENIED",
      reason: "NAMECHEAP_CLIENT_IP_WHITELIST_REQUIRED",
      blockClass: "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED",
      cause: "CLIENT_IP_WHITELIST",
    };
  }
  if (/API Key is invalid|1011102/i.test(message) || code === "1011102") {
    return {
      status: "FAILED",
      failureCode: "AUTH_FAILED",
      reason: "AUTH_FAILED",
      blockClass: "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED",
      cause: "INVALID_API_KEY",
    };
  }
  if (/1011101/i.test(message) || code === "1011101" || /ApiUser is invalid/i.test(message)) {
    return {
      status: "FAILED",
      failureCode: "AUTH_FAILED",
      reason: "AUTH_FAILED",
      blockClass: "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED",
      cause: "INVALID_API_USER",
    };
  }
  if (/Authentication|AUTH_FAILED/i.test(message) || status === 401) {
    return {
      status: "FAILED",
      failureCode: "AUTH_FAILED",
      reason: "AUTH_FAILED",
      blockClass: "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED",
      cause: "CREDENTIAL_MISMATCH",
    };
  }
  if (status === 403) {
    return {
      status: "FAILED",
      failureCode: "PERMISSION_DENIED",
      reason: "PERMISSION_DENIED",
      blockClass: "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED",
      cause: "ACCOUNT_RESTRICTION",
    };
  }
  if (/429|rate limit/i.test(message) || status === 429) {
    return {
      status: "UNAVAILABLE",
      failureCode: "RATE_LIMITED",
      reason: "RATE_LIMITED",
      blockClass: "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED",
      cause: "RATE_LIMITED",
    };
  }
  if (/TIMEOUT|ECONN|ETIMEDOUT|network|AbortError|NAMECHEAP_TIMEOUT/i.test(message)) {
    return {
      status: "UNAVAILABLE",
      failureCode: "NETWORK_ERROR",
      reason: "NETWORK_ERROR",
      blockClass: "CODE_DEFECT",
      cause: "NETWORK_ERROR",
    };
  }
  if (status && status >= 500) {
    return {
      status: "UNAVAILABLE",
      failureCode: "PROVIDER_ERROR",
      reason: "PROVIDER_ERROR",
      blockClass: "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED",
      cause: "PROVIDER_ERROR",
    };
  }
  if (/INVALID_RESPONSE|malformed/i.test(message)) {
    return {
      status: "FAILED",
      failureCode: "INVALID_RESPONSE",
      reason: "INVALID_RESPONSE",
      blockClass: "CODE_DEFECT",
      cause: "OTHER",
    };
  }
  return {
    status: "FAILED",
    failureCode: "PROVIDER_ERROR",
    reason: message.slice(0, 80) || "PROVIDER_ERROR",
    blockClass: "PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED",
    cause: "OTHER",
  };
}

export function inspectNamecheapSafeConfiguration(publicConfig: {
  mode: "SANDBOX" | "PRODUCTION" | "DISABLED";
  usernameConfigured: boolean;
  clientIpConfigured: boolean;
  credentialPresence: "YES" | "NO";
  apiUserConfigured?: boolean;
  apiKeyConfigured?: boolean;
}): {
  apiUsernameConfigured: "YES" | "NO";
  apiUserConfigured: "YES" | "NO";
  apiKeyConfigured: "YES" | "NO";
  clientIpConfigured: "YES" | "NO";
  endpoint: "PRODUCTION" | "SANDBOX" | "UNKNOWN";
} {
  return {
    apiUsernameConfigured: publicConfig.usernameConfigured ? "YES" : "NO",
    apiUserConfigured: (publicConfig.apiUserConfigured ?? publicConfig.credentialPresence === "YES") ? "YES" : "NO",
    apiKeyConfigured: (publicConfig.apiKeyConfigured ?? publicConfig.credentialPresence === "YES") ? "YES" : "NO",
    clientIpConfigured: publicConfig.clientIpConfigured ? "YES" : "NO",
    endpoint: publicConfig.mode === "PRODUCTION" ? "PRODUCTION" : publicConfig.mode === "SANDBOX" ? "SANDBOX" : "UNKNOWN",
  };
}

export type NamecheapProviderRepairInstruction = {
  humanActionRequired: "YES" | "NO";
  supportInterventionRequired: "YES" | "NO";
  where: string;
  settings: string[];
  apiAccessMustBeEnabled: "YES" | "NO";
  whitelistCurrentPublicIp: "YES" | "NO";
  accountSupportMustUnblockApiUser: "YES" | "NO";
  doNotPasteCredentialsIntoChat: true;
  credentialsRemainServerOnly: true;
  infinityWillVerifyAfterward: string[];
  instructions: string;
};

export function buildNamecheapProviderRepairInstruction(cause: NamecheapProviderCause): NamecheapProviderRepairInstruction {
  const blocked = cause === "API_USER_BLOCKED_BY_ADMINISTRATOR" || cause === "API_USER_DISABLED_OR_LOCKED";
  const whitelist = cause === "CLIENT_IP_WHITELIST" || cause === "CLIENT_IP_DISABLED_OR_LOCKED" || cause === "REQUEST_IP_DISABLED_OR_LOCKED";
  const settings = [
    "Namecheap account → Profile → Tools → Business & Dev Tools → Namecheap API Access",
    "Enable API Access for the production API user",
    "Confirm ApiUser is enabled/unlocked (error 1017101 = disabled or locked)",
    "Whitelist the current public IPv4 of the Infinity server/runtime under API Access → Whitelisted IPs",
    "Confirm UserName matches the Namecheap account username and ApiUser matches the API user",
    "Use production endpoint https://api.namecheap.com/xml.response when NAMECHEAP_ENV=production",
  ];
  return {
    humanActionRequired: "YES",
    supportInterventionRequired: blocked ? "YES" : "NO",
    where: "https://ap.www.namecheap.com/settings/tools/apiaccess/",
    settings,
    apiAccessMustBeEnabled: "YES",
    whitelistCurrentPublicIp: "YES",
    accountSupportMustUnblockApiUser: blocked ? "YES" : "NO",
    doNotPasteCredentialsIntoChat: true,
    credentialsRemainServerOnly: true,
    infinityWillVerifyAfterward: [
      "namecheap.domains.check against leasenpv.com and the CRE shortlist",
      "namecheap.users.getPricing for the relevant TLD",
      "domain.search / domain.availability / domain.pricing readback",
      "No domain purchase, DNS write, or registration probe",
    ],
    instructions: [
      "Open Namecheap → Profile → Tools → Namecheap API Access.",
      "Enable API Access if it is off.",
      "If the API user shows blocked, disabled, or locked — or live calls return “ApiUser has been blocked by administrator” / 1017101 — contact Namecheap support and ask them to unblock the API user. A dashboard toggle may not be enough once an administrator block is in place.",
      "Whitelist the current public IPv4 used by Infinity (the NAMECHEAP_CLIENT_IP already stored server-side). Do not paste the API key, username, or IP into Cursor or chat.",
      "Keep credentials only in the server environment (.env.local / host secrets). Infinity will re-run domain.search, domain.availability, and domain.pricing after access is restored.",
      whitelist
        ? "This failure class is consistent with IP whitelist / locked RequestIP or ClientIP. Confirm the live egress IP is listed and enabled."
        : "This failure class is an API-user administrator block, not a missing Infinity adapter or wrong sandbox/production URL.",
    ].join(" "),
  };
}
