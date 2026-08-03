import { createServerClient } from "@supabase/ssr";
import type { SupabaseClientOptions } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import type { PublicSupabaseSchemaName } from "./admin";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!publishableKey) {
    throw new Error(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return { url, publishableKey };
}

export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseConfig();

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
        headers: Record<string, string>,
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
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  };

  const supabase = createServerClient<Database, PublicSupabaseSchemaName>(
    url,
    publishableKey,
    clientOptions,
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}
