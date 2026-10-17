import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import {
  CLUB_THROTTLE_VERCEL_PROJECT_ID,
  fetchVercelProductionEnvValues,
} from "./club-throttle-vercel-production-env-audit.ts";

export const EMBEDDED_CHECKOUT_REQUIRES_STRIPE_PUBLISHABLE_KEY =
  "EMBEDDED_CHECKOUT_REQUIRES_STRIPE_PUBLISHABLE_KEY" as const;

export function stripePublishableFromProcessEnv(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
    env.STRIPE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}

export async function resolveStripePublishableKeyForClubThrottle(
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const local = stripePublishableFromProcessEnv(env);
  if (local) return local;
  const remote = await fetchVercelProductionEnvValues(
    CLUB_THROTTLE_VERCEL_PROJECT_ID,
    ["STRIPE_PUBLISHABLE_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
    env,
  );
  return remote.STRIPE_PUBLISHABLE_KEY?.trim() || remote.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "";
}

/** Push client-safe publishable key to club-throttle Vercel production env. */
export async function syncClubThrottleStripePublishableToVercel(publishableKey: string): Promise<{
  ok: boolean;
  safeError: string | null;
}> {
  const key = publishableKey.trim();
  if (!key.startsWith("pk_")) {
    return { ok: false, safeError: "INVALID_STRIPE_PUBLISHABLE_KEY_FORMAT" };
  }
  const vercel = new VercelDomainBindingAdapter();
  if (!vercel.tokenPresent()) return { ok: false, safeError: "VERCEL_TOKEN_MISSING" };
  for (const envKey of ["STRIPE_PUBLISHABLE_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] as const) {
    const row = await vercel.upsertProjectEnv({
      projectId: CLUB_THROTTLE_VERCEL_PROJECT_ID,
      key: envKey,
      value: key,
      target: ["production"],
    });
    if (!row.ok) return { ok: false, safeError: row.safeError ?? `VERCEL_ENV_UPSERT_FAILED:${envKey}` };
  }
  return { ok: true, safeError: null };
}
