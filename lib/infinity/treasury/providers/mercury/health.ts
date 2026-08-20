import type { ProviderEnvironment, ProviderHealth } from "../../constants";
import type { EpistemicAmount, TreasuryProviderConnection } from "../../types";
import { unknownAmount } from "../../types";
import type { MercuryPublicConfig } from "./config";

export function mercuryHealthFromError(error: unknown): ProviderHealth {
  if (error && typeof error === "object" && "name" in error) {
    const name = String((error as { name?: string }).name);
    if (name === "ProviderAuthFailedError") return "AUTH_FAILED";
    if (name === "ProviderRateLimitedError") return "RATE_LIMITED";
    if (name === "ProviderTimeoutError") return "UNAVAILABLE";
    if (name === "ProviderUnavailableError") return "UNAVAILABLE";
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: string }).code);
    if (code === "AUTH_FAILED") return "AUTH_FAILED";
    if (code === "RATE_LIMITED") return "RATE_LIMITED";
    if (code === "TIMEOUT") return "UNAVAILABLE";
  }
  return "DEGRADED";
}

export function mercuryStatusLabel(input: {
  health: ProviderHealth;
  mode: ProviderEnvironment;
}): string {
  if (input.health === "NOT_CONFIGURED") return "NOT CONFIGURED";
  if (input.health === "READ_ONLY_VERIFIED" && input.mode === "SANDBOX") return "SANDBOX CONNECTED";
  if (input.health === "READ_ONLY_VERIFIED" && input.mode === "PRODUCTION") return "PRODUCTION CONNECTED · READ ONLY";
  if (input.health === "CONFIGURED") return "CONFIGURED · NOT VERIFIED";
  if (input.health === "AUTH_FAILED") return "AUTH FAILED";
  if (input.health === "RATE_LIMITED") return "RATE LIMITED";
  if (input.health === "UNAVAILABLE") return "UNAVAILABLE";
  if (input.health === "DEGRADED") return "DEGRADED";
  return "NOT CONFIGURED";
}

export function resolveMercuryHealth(input: {
  publicConfig: MercuryPublicConfig;
  connection: TreasuryProviderConnection | null;
}): ProviderHealth {
  if (!input.publicConfig.enabled || input.publicConfig.mode === "DISABLED" || !input.publicConfig.tokenConfigured) {
    return "NOT_CONFIGURED";
  }
  if (input.connection?.health === "READ_ONLY_VERIFIED" && input.connection.lastSyncAt) {
    return "READ_ONLY_VERIFIED";
  }
  if (input.connection?.health) return input.connection.health;
  return "CONFIGURED";
}

export function emptyProviderBalance(): EpistemicAmount {
  return unknownAmount();
}
