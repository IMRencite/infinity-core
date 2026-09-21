import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CloudflareRegistrarAdapter } from "@/lib/infinity/commercialization/providers/cloudflare/registrar-adapter";
import { executeCloudflareRegistrarUserTokenAuthCheck } from "../cloudflare-registrar-user-token-auth-check";

const ACCOUNT = "cfacct00000000000000000000000000";

function userTokenFetch(): typeof fetch {
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (path.includes("/registrar/registrations") && method === "POST") {
      return new Response(JSON.stringify({ success: false, errors: [{ message: "blocked" }] }), { status: 400 });
    }
    if (path.endsWith("/user/tokens/verify")) {
      return new Response(JSON.stringify({ success: true, result: { status: "active" } }), { status: 200 });
    }
    if (path.includes(`/accounts/${ACCOUNT}/tokens/verify`)) {
      return new Response(JSON.stringify({ success: false, errors: [{ message: "account-owned path unused" }] }), { status: 403 });
    }
    if (path.includes(`/accounts/${ACCOUNT}`) && method === "GET" && !path.includes("registrar") && !path.includes("tokens")) {
      return new Response(JSON.stringify({ success: true, result: { id: ACCOUNT, name: "IMR fixture" } }), { status: 200 });
    }
    if (path.includes("/registrar/domain-search")) {
      return new Response(
        JSON.stringify({
          success: true,
          result: { domains: [{ name: "leasenpv.com", registrable: true, tier: "standard" }] },
        }),
        { status: 200 },
      );
    }
    if (path.includes("/registrar/domain-check") && method === "POST") {
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            domains: [
              {
                name: "leasenpv.com",
                registrable: true,
                tier: "standard",
                pricing: { currency: "USD", registration_cost: "9.15", renewal_cost: "10.44" },
              },
            ],
          },
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ success: false, errors: [{ message: "unhandled" }] }), { status: 404 });
  };
  return fetchImpl;
}

describe("Cloudflare Registrar user-token auth check", () => {
  beforeEach(() => {
    process.env.CLOUDFLARE_ACCOUNT_ID = ACCOUNT;
    process.env.CLOUDFLARE_API_TOKEN = "cf_general_fixture_token_not_real";
    process.env.CLOUDFLARE_REGISTRAR_API_TOKEN = "cf_registrar_user_fixture_token_not_real";
  });

  afterEach(() => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_REGISTRAR_API_TOKEN;
  });

  it("verifies a user-owned token at /user/tokens/verify even when an account ID is present", async () => {
    const requested: string[] = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      requested.push(String(url));
      return userTokenFetch()(url, init);
    };
    const adapter = new CloudflareRegistrarAdapter({ fetchImpl });
    const token = await adapter.verifyToken();
    expect(token.ok).toBe(true);
    expect(token.path).toBe("/user/tokens/verify");
    expect(requested.some((href) => href.includes("/user/tokens/verify"))).toBe(true);
    expect(requested.some((href) => href.includes("/accounts/") && href.includes("/tokens/verify"))).toBe(false);
  });

  it("authenticates with the registrar token and checks only leasenpv.com", async () => {
    const result = await executeCloudflareRegistrarUserTokenAuthCheck({
      reloadEnv: false,
      fetchImpl: userTokenFetch(),
    });
    expect(result.routing.registrarTokenSelected).toBe("PASS");
    expect(result.routing.generalTokenPreserved).toBe("PASS");
    expect(result.auth.tokenAccepted).toBe("YES");
    expect(result.auth.accountVerified).toBe("YES");
    expect(result.auth.registrarApiReachable).toBe("YES");
    expect(result.capabilities["domain.search"]).toBe("READ_ONLY_VERIFIED");
    expect(result.capabilities["domain.availability"]).toBe("READ_ONLY_VERIFIED");
    expect(result.capabilities["domain.pricing"]).toBe("READ_ONLY_VERIFIED");
    expect(result.capabilities["domain.registration"]).toBe("UNVERIFIED");
    expect(result.leaseNpv.available).toBe("YES");
    expect(result.purchases).toBe(0);
    expect(result.registrationPosts).toBe(0);
    expect(result.result).toBe("CLOUDFLARE_REGISTRAR_USER_TOKEN_VERIFIED");
    expect(JSON.stringify(result)).not.toMatch(/cf_registrar_user_fixture/);
  });

  it("treats Registrar success as account proof when Account Read is denied", async () => {
    const fetchImpl: typeof fetch = async (url, init) => {
      const path = String(url);
      if (path.includes(`/accounts/${ACCOUNT}`) && !path.includes("registrar") && !path.includes("tokens")) {
        return new Response(
          JSON.stringify({ success: false, errors: [{ message: "Unauthorized to access requested resource" }] }),
          { status: 403 },
        );
      }
      return userTokenFetch()(url, init);
    };
    const result = await executeCloudflareRegistrarUserTokenAuthCheck({
      reloadEnv: false,
      fetchImpl,
    });
    expect(result.auth.tokenAccepted).toBe("YES");
    expect(result.auth.accountVerified).toBe("YES");
    expect(result.auth.registrarApiReachable).toBe("YES");
    expect(result.result).toBe("CLOUDFLARE_REGISTRAR_USER_TOKEN_VERIFIED");
    expect(result.purchases).toBe(0);
  });
});
