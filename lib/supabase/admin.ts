import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** PostgREST schema used by all application clients (excludes graphql_public). */
export type PublicSupabaseSchemaName = "public";

export type AppSupabaseClient = SupabaseClient<
  Database,
  PublicSupabaseSchemaName,
  PublicSupabaseSchemaName
>;

export type AdminSupabaseClient = AppSupabaseClient;

function getAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  return { url, serviceRoleKey };
}

export function createAdminClient(): AdminSupabaseClient {
  const { url, serviceRoleKey } = getAdminConfig();

  return createClient<Database, PublicSupabaseSchemaName, PublicSupabaseSchemaName>(
    url,
    serviceRoleKey,
    {
      db: {
        schema: "public",
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
