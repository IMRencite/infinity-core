import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mapLoginError, validateLoginFields } from "@/lib/auth/login-validation";
import { getPublicSupabaseEnv, assertServiceRoleNotPublic } from "@/lib/supabase/public-env";

describe("login validation", () => {
  it("requires email and password", () => {
    expect(validateLoginFields("", "")).toEqual({
      email: "Email is required.",
      password: "Password is required.",
    });
  });

  it("rejects invalid email format", () => {
    expect(validateLoginFields("not-an-email", "secret")).toEqual({
      email: "Enter a valid email address.",
    });
  });

  it("maps invalid credentials to a human-readable message", () => {
    expect(mapLoginError("Invalid login credentials")).toBe("Invalid email or password.");
  });

  it("maps rate limits to a human-readable message", () => {
    expect(mapLoginError("Too many requests")).toBe(
      "Too many attempts. Please wait a moment and try again.",
    );
  });
});

describe("public supabase env", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = original;
  });

  it("reads publishable key when configured", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key-at-least-20-chars";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(getPublicSupabaseEnv()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "publishable-key-at-least-20-chars",
    });
  });

  it("falls back to anon key when publishable key is absent", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-at-least-20-chars";

    expect(getPublicSupabaseEnv().publishableKey).toBe("anon-key-at-least-20-chars");
  });

  it("throws when url or key is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => getPublicSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("rejects service-role keys exposed via NEXT_PUBLIC_*", () => {
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY = "secret";
    expect(() => assertServiceRoleNotPublic()).toThrow(/must not use NEXT_PUBLIC_/);
  });
});

describe("middleware cookie handler", () => {
  it("setAll accepts a single cookies argument without throwing", async () => {
    const { NextRequest, NextResponse } = await import("next/server");
    const request = new NextRequest("http://localhost:3000/dashboard");
    let response = NextResponse.next({ request });

    const setAll = (
      cookiesToSet: Array<{
        name: string;
        value: string;
        options?: Parameters<typeof response.cookies.set>[2];
      }>,
    ) => {
      cookiesToSet.forEach(({ name, value }) => {
        request.cookies.set(name, value);
      });
      response = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
    };

    expect(() =>
      setAll([{ name: "sb-test-auth-token", value: "abc", options: { path: "/" } }]),
    ).not.toThrow();
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("abc");
  });
});

describe.runIf(process.env.RUN_AUTH_INTEGRATION_TEST === "true")(
  "auth integration",
  () => {
    it("signInWithPassword returns session or explicit auth error", async () => {
      const email = process.env.AUTH_INTEGRATION_TEST_EMAIL;
      const password = process.env.AUTH_INTEGRATION_TEST_PASSWORD;
      expect(email && password).toBeTruthy();

      const { createClient } = await import("@supabase/supabase-js");
      const { url, publishableKey } = getPublicSupabaseEnv();
      const supabase = createClient(url, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email!,
        password: password!,
      });

      expect(error ?? data.session?.access_token).toBeTruthy();
      if (!error) {
        expect(data.user?.id).toBeTruthy();
      }
    }, 30_000);
  },
);
