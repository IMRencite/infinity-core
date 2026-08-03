import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClientOptions } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { AppSupabaseClient, PublicSupabaseSchemaName } from "./admin";

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

export function createClient(): AppSupabaseClient {
  const { url, publishableKey } = getSupabaseConfig();

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
