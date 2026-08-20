export const CURSOR_FORBIDDEN_ENV = [
  "STRIPE_SECRET_KEY",
  "STRIPE_SECRET",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MERCURY_API_KEY",
  "MERCURY_API_TOKEN",
  "RAMP_API_KEY",
  "CLOUDFLARE_API_TOKEN",
  "NAMECHEAP_API_KEY",
  "NAMECHEAP_API_USER",
  "NAMECHEAP_USERNAME",
  "NAMECHEAP_CLIENT_IP",
  "VERCEL_TOKEN",
  "AWS_SECRET_ACCESS_KEY",
  "BANK_PASSWORD",
  "CURSOR_API_KEY",
] as const;

export function sanitizeEnvForCursor(env: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (!value) continue;
    if (
      CURSOR_FORBIDDEN_ENV.some((forbidden) => key.toUpperCase().includes(forbidden.replace(/_KEY$/, ""))) ||
      /SECRET|PASSWORD|TOKEN|SERVICE_ROLE|BANK|STRIPE|NAMECHEAP_(API_KEY|API_USER|USERNAME|CLIENT_IP)/i.test(key)
    ) {
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function financialCredentialsAvailableToCursor(env: Record<string, string>): boolean {
  return Object.keys(env).some((key) =>
    /STRIPE_SECRET|MERCURY|RAMP|BANK_|SERVICE_ROLE|NAMECHEAP|CLOUDFLARE_API_TOKEN|VERCEL_TOKEN/i.test(key),
  );
}
