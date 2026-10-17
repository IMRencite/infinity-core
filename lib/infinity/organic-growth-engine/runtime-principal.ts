import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function organicRuntimeKey(env: NodeJS.ProcessEnv = process.env): string | null {
  const key = env.ORGANIC_RUNTIME_KEY || env.SUPABASE_ORGANIC_RUNTIME_KEY || null;
  return key && key.length > 20 ? key : null;
}

export function createOrganicRuntimeClient(env: NodeJS.ProcessEnv = process.env): SupabaseClient | null {
  if (env.VITEST) return null;
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const jwt = organicRuntimeKey(env);
  if (!url || !publishable || !jwt) return null;
  if (!jwt.startsWith("eyJ")) return null;
  return createClient(url, publishable, {
    accessToken: async () => jwt,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
