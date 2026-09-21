import { describe, it, expect } from "vitest";
import { createServerClient } from "@supabase/ssr";

type CookieEntry = { name: string; value: string };

function createMemoryCookieClient(url: string, key: string, jar: CookieEntry[]) {
  return createServerClient(
    url as never,
    key,
    {
      cookies: {
        getAll() {
          return jar;
        },
        setAll(cookiesToSet: Array<{ name: string; value: string }>) {
          for (const cookie of cookiesToSet) {
            const index = jar.findIndex((entry) => entry.name === cookie.name);
            if (!cookie.value) {
              if (index >= 0) jar.splice(index, 1);
              continue;
            }
            const entry = { name: cookie.name, value: cookie.value };
            if (index >= 0) jar[index] = entry;
            else jar.push(entry);
          }
        },
      },
    } as never,
  );
}

describe("SSR auth cookie round-trip", () => {
  it.runIf(process.env.RUN_AUTH_INTEGRATION_TEST === "true")(
    "signIn writes cookies that a fresh server client can read via getUser",
    async () => {
      const email = process.env.AUTH_INTEGRATION_TEST_EMAIL;
      const password = process.env.AUTH_INTEGRATION_TEST_PASSWORD;
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      expect(email && password && url && key).toBeTruthy();

      const jar: CookieEntry[] = [];
      const writer = createMemoryCookieClient(url!, key!, jar);
      const { error: signInError } = await writer.auth.signInWithPassword({
        email: email!,
        password: password!,
      });
      expect(signInError).toBeNull();
      expect(jar.some((cookie) => cookie.name.includes("-auth-token"))).toBe(true);

      const reader = createMemoryCookieClient(url!, key!, jar);
      const {
        data: { user },
        error: userError,
      } = await reader.auth.getUser();

      expect(userError).toBeNull();
      expect(user?.email).toBe(email);
    },
    30_000,
  );
});

describe("browser bundle security", () => {
  it("does not expose service-role env names in public supabase client module", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("lib/supabase/client.ts", "utf8"),
    );
    expect(source).not.toMatch(/SERVICE_ROLE/);
    expect(source).toMatch(/getPublicSupabaseEnv/);
  });
});
