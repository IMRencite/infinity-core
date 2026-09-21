import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppSupabaseClient } from "@/lib/supabase/client";

const AUTH_DEBUG =
  process.env.NEXT_PUBLIC_AUTH_DEBUG === "true" ||
  process.env.NODE_ENV === "development";

export function authCookieNamesFromDocument(): string[] {
  if (typeof document === "undefined") return [];
  return document.cookie
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name) => name.includes("-auth-token") || name.startsWith("sb-"));
}

export async function verifyServerRecognizesSession(): Promise<{
  cookiePresent: boolean;
  userAuthenticated: boolean;
  authCookieNames: string[];
}> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch("/api/auth/diagnostic", {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      continue;
    }
    const json = (await response.json()) as {
      cookiePresent?: boolean;
      userAuthenticated?: boolean;
      authCookieNames?: string[];
    };
    const result = {
      cookiePresent: Boolean(json.cookiePresent),
      userAuthenticated: Boolean(json.userAuthenticated),
      authCookieNames: json.authCookieNames ?? [],
    };
    if (result.userAuthenticated || attempt === 4) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return { cookiePresent: false, userAuthenticated: false, authCookieNames: [] };
}

export function safeHqRedirectPath(target: string | null | undefined): string {
  if (!target || !target.startsWith("/") || target.startsWith("//") || target.includes("://") || target.includes("\\")) {
    return "/dashboard";
  }
  return target;
}

export async function completeBrowserLogin(
  supabase: AppSupabaseClient,
  targetPath = "/dashboard",
): Promise<{ ok: true } | { ok: false; reason: string }> {
  targetPath = safeHqRedirectPath(targetPath);
  const {
    data: { user: browserUser },
    error: browserUserError,
  } = await supabase.auth.getUser();

  if (browserUserError || !browserUser) {
    return { ok: false, reason: "Browser session not established after sign-in." };
  }

  const cookieNames = authCookieNamesFromDocument();
  if (AUTH_DEBUG) {
    console.info("[AUTH] browser getUser after signin authenticated=true");
    console.info("[AUTH] browser cookie names before navigation", cookieNames);
  }

  const serverCheck = await verifyServerRecognizesSession();
  if (AUTH_DEBUG) {
    console.info("[AUTH] server diagnostic before navigation", serverCheck);
  }

  if (!serverCheck.userAuthenticated) {
    return {
      ok: false,
      reason: serverCheck.cookiePresent
        ? "Server did not recognize the browser auth cookies."
        : "Auth cookies were not sent to the server.",
    };
  }

  if (AUTH_DEBUG) {
    console.info("[AUTH] redirect beginning hard navigation", targetPath);
  }

  window.location.assign(targetPath);
  return { ok: true };
}

export type { SupabaseClient };
