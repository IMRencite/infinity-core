import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

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

export type AdminSupabaseClient = SupabaseClient<Database>;

export function createAdminClient(): AdminSupabaseClient {
  const { url, serviceRoleKey } = getAdminConfig();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
