import { createServerClient } from "@supabase/ssr";
import type { SupabaseClientOptions } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import type { AppSupabaseClient, PublicSupabaseSchemaName } from "./admin";
import { getPublicSupabaseEnv } from "./public-env";

export async function createClient(): Promise<AppSupabaseClient> {
  const cookieStore = await cookies();
  const { url, publishableKey } = getPublicSupabaseEnv();

  const clientOptions: SupabaseClientOptions<PublicSupabaseSchemaName> & {
    cookies: {
      getAll(): ReturnType<typeof cookieStore.getAll>;
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Parameters<typeof cookieStore.set>[2];
        }[],
      ): void;
    };
  } = {
    db: {
      schema: "public",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components expose cookies as read-only. Supabase may attempt
          // to refresh the session during getUser(), which requires writes.
          // lib/supabase/middleware.ts refreshes and persists cookies on responses.
        }
      },
    },
  };

  return createServerClient<Database, PublicSupabaseSchemaName>(
    url,
    publishableKey,
    clientOptions,
  );
}

export type { AppSupabaseClient, PublicSupabaseSchemaName };
