import { describe, expect, it } from "vitest";
import { MERCURY_PRODUCTION_BASE_URL } from "../constants";
import {
  MercuryCredentials,
  MercuryFinancialProvider,
  MercuryHttpClient,
  evaluateMercuryReadOnlyVerificationGate,
  loadMercuryConfig,
  mercuryTokenFingerprint,
  resolveMercuryApiToken,
  serializeMercuryPublicConfig,
} from "../providers/mercury";

const TOKEN = "secret-token:mercury_production_rma_test_token_DO_NOT_LOG";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("MercuryReadOnlyVerificationGate", () => {
  it("fingerprints tokens without exposing the secret", () => {
    const fingerprint = mercuryTokenFingerprint(TOKEN);
    expect(fingerprint?.hash).toMatch(/^[a-f0-9]{12}$/);
    expect(fingerprint?.prefix).not.toContain("test_token");
    expect(fingerprint?.type_class).toBe("PRODUCTION_RMA");
    expect(JSON.stringify(fingerprint)).not.toContain(TOKEN);
  });

  it("rejects quoted or newline-contaminated tokens without mutating them", () => {
    const quoted = resolveMercuryApiToken({ MERCURY_API_TOKEN: `"${TOKEN}"` });
    expect(quoted.token).toBe("");
    expect(quoted.fingerprint?.malformed).toBe(true);
    const dirty = resolveMercuryApiToken({ MERCURY_API_TOKEN: `${TOKEN}\n` });
    expect(dirty.token).toBe("");
    expect(dirty.fingerprint?.newline).toBe(true);
  });

  it("treats explicit env dicts as the test source and does not leak credentials", () => {
    const resolved = loadMercuryConfig({
      MERCURY_ENABLED: "true",
      MERCURY_ENV: "production",
      MERCURY_API_TOKEN: TOKEN,
    });
    expect(resolved.public.tokenConfigured).toBe(true);
    expect(resolved.public.tokenSource).toBe("env");
    expect(resolved.public.baseUrl).toBe(MERCURY_PRODUCTION_BASE_URL);
    expect(JSON.stringify(serializeMercuryPublicConfig(resolved.public))).not.toContain(TOKEN);
    expect(JSON.stringify(resolved.credentials)).not.toContain(TOKEN);
  });

  it("Bearer and Basic headers are both constructed, and Basic is used after Bearer 401", async () => {
    const credentials = new MercuryCredentials(TOKEN);
    expect(credentials.authorizationHeader("bearer")).toMatch(/^Bearer /);
    expect(credentials.authorizationHeader("basic")).toMatch(/^Basic /);
    const modes: string[] = [];
    const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const header = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? "");
      modes.push(header.startsWith("Basic") ? "basic" : header.startsWith("Bearer") ? "bearer" : "other");
      if (header.startsWith("Bearer")) return jsonResponse({ error: "unauthorized" }, 401);
      return jsonResponse({ accounts: [{ id: "acct-1", name: "Operating", availableBalance: 12 }] });
    }) as typeof fetch;
    const config = loadMercuryConfig({
      MERCURY_ENABLED: "true",
      MERCURY_ENV: "production",
      MERCURY_API_TOKEN: TOKEN,
    });
    const client = new MercuryHttpClient({ config: config.public, credentials: config.credentials, fetchImpl });
    const payload = await client.getJson("accounts", "GET_ACCOUNTS");
    expect(modes).toEqual(["bearer", "basic"]);
    expect(client.lastAuthMode).toBe("basic");
    expect(client.lastVerifiedAt).toBeTruthy();
    expect(payload).toEqual({ accounts: [{ id: "acct-1", name: "Operating", availableBalance: 12 }] });
  });

  it("Bearer success does not fall back to Basic", async () => {
    const modes: string[] = [];
    const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const header = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? "");
      modes.push(header.startsWith("Basic") ? "basic" : "bearer");
      return jsonResponse({ accounts: [] });
    }) as typeof fetch;
    const config = loadMercuryConfig({
      MERCURY_ENABLED: "true",
      MERCURY_ENV: "production",
      MERCURY_API_TOKEN: TOKEN,
    });
    const client = new MercuryHttpClient({ config: config.public, credentials: config.credentials, fetchImpl });
    await client.getJson("accounts", "GET_ACCOUNTS");
    expect(modes).toEqual(["bearer"]);
    expect(client.lastAuthMode).toBe("bearer");
  });

  it("missing token, wrong host, and 401 fail the read-only gate", async () => {
    const missing = loadMercuryConfig({ MERCURY_ENABLED: "true", MERCURY_ENV: "production", MERCURY_API_TOKEN: "" });
    expect(evaluateMercuryReadOnlyVerificationGate({
      publicConfig: missing.public,
      authenticatedRead: false,
      balanceFromMercury: false,
    }).result).toBe("FAIL");
    expect(missing.public.tokenConfigured).toBe(false);
    expect(missing.public.baseUrl).toBe(MERCURY_PRODUCTION_BASE_URL);
    const provider = new MercuryFinancialProvider({
      env: { MERCURY_ENABLED: "true", MERCURY_ENV: "production", MERCURY_API_TOKEN: TOKEN },
      fetchImpl: (async () => jsonResponse({ error: "no" }, 401)) as typeof fetch,
    });
    await expect(provider.getAccounts()).rejects.toMatchObject({ name: "ProviderAuthFailedError" });
    const denied = evaluateMercuryReadOnlyVerificationGate({
      publicConfig: provider.publicConfig,
      authenticatedRead: false,
      balanceFromMercury: false,
      writeCapabilityEnabled: true,
    });
    expect(denied.result).toBe("FAIL");
    expect(denied.reasons).toContain("WRITE_CAPABILITY_ENABLED");
  });

  it("passes only when a verified Mercury read backs treasury cash and writes stay disabled", async () => {
    const config = loadMercuryConfig({
      MERCURY_ENABLED: "true",
      MERCURY_ENV: "production",
      MERCURY_API_TOKEN: TOKEN,
    });
    const provider = new MercuryFinancialProvider({
      env: { MERCURY_ENABLED: "true", MERCURY_ENV: "production", MERCURY_API_TOKEN: TOKEN },
      fetchImpl: (async () => jsonResponse({
        accounts: [{ id: "acct-1", name: "Operating", kind: "checking", status: "active", availableBalance: 41.25, currentBalance: 41.25 }],
      })) as typeof fetch,
    });
    const accounts = await provider.getAccounts();
    expect(accounts.length).toBe(1);
    expect(provider.http.writeHttpCalls).toBe(0);
    const gate = evaluateMercuryReadOnlyVerificationGate({
      publicConfig: config.public,
      authenticatedRead: true,
      balanceFromMercury: true,
      writeCapabilityEnabled: false,
      leakedCredential: JSON.stringify(provider).includes(TOKEN),
      writeHttpCalls: provider.http.writeHttpCalls,
    });
    expect(gate.result).toBe("PASS");
    expect(provider.http.lastVerifiedAt).toBeTruthy();
  });
});
