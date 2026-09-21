import { createServerClient } from "@supabase/ssr";
import type { SupabaseClientOptions } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import type { PublicSupabaseSchemaName } from "./admin";
import { getPublicSupabaseEnv } from "./public-env";

const authDebug = process.env.AUTH_DEBUG === "true";

export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getPublicSupabaseEnv();

  let supabaseResponse = NextResponse.next({
    request,
  });

  const clientOptions: SupabaseClientOptions<PublicSupabaseSchemaName> & {
    cookies: {
      getAll(): ReturnType<typeof request.cookies.getAll>;
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Parameters<typeof supabaseResponse.cookies.set>[2];
        }[],
      ): void;
    };
  } = {
    db: {
      schema: "public",
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          const host = request.nextUrl.hostname;
          const https = request.nextUrl.protocol === "https:" || host === "hq.imros.io" || process.env.VERCEL === "1";
          supabaseResponse.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: https ? true : Boolean(options?.secure),
            sameSite: options?.sameSite ?? "lax",
            path: options?.path ?? "/",
          });
        });

        if (authDebug) {
          console.info(
            `[auth] middleware setAll wrote ${cookiesToSet.length} cookie(s) for ${request.nextUrl.pathname}`,
          );
        }
      },
    },
  };

  const supabase = createServerClient<Database, PublicSupabaseSchemaName>(
    url,
    publishableKey,
    clientOptions,
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (authDebug) {
    const authCookies = request.cookies
      .getAll()
      .filter((cookie) => cookie.name.includes("-auth-token"));
    console.info(
      `[auth] middleware path=${request.nextUrl.pathname} user=${Boolean(user)} authCookies=${authCookies.length}`,
    );
  }

  return supabaseResponse;
}
