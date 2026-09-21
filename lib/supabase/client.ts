import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClientOptions } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { AppSupabaseClient, PublicSupabaseSchemaName } from "./admin";
import { getPublicSupabaseEnv } from "./public-env";

export function createClient(): AppSupabaseClient {
  const { url, publishableKey } = getPublicSupabaseEnv();

  const clientOptions: SupabaseClientOptions<PublicSupabaseSchemaName> = {
    db: {
      schema: "public",
    },
  };

  return createBrowserClient<Database, PublicSupabaseSchemaName>(
    url,
    publishableKey,
    clientOptions,
  );
}

export type { AppSupabaseClient, PublicSupabaseSchemaName };
