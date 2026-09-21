export type PublicSupabaseEnv = {
  url: string;
  publishableKey: string;
};

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!publishableKey) {
    throw new Error(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }

  return { url, publishableKey };
}

export function assertServiceRoleNotPublic(): void {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("NEXT_PUBLIC_") && key.includes("SERVICE_ROLE")) {
      throw new Error(`Service role key must not use NEXT_PUBLIC_ prefix: ${key}`);
    }
  }
}
