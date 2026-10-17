import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type Stripe from "stripe";

export const STRIPE_PROMOTION_RESOURCE_PROVISIONER_V1 = "STRIPE_PROMOTION_RESOURCE_PROVISIONER_V1" as const;
export const STRIPE_PROMOTION_PROVISIONING_KEY_ENV = "STRIPE_PROMOTION_PROVISIONING_KEY" as const;

export type StripePromotionProviderAction = "REUSED" | "CREATED" | "RECONCILED";

export type StripePromotionResourceMapping = {
  venture_id: string;
  promotion_id: string;
  public_code: string;
  provider: "stripe";
  resource_version: string;
  infinity_resource_id: string;
  stripe_coupon_id: string;
  amount_off_cents: number;
  currency: "usd";
  duration: "once";
  customer_facing_name: string;
  status: "ACTIVE" | "SUPERSEDED";
  provisioned_at: string;
  last_reconciled_at: string;
};

export type StripePromotionResourceRegistryV1 = {
  schema: "STRIPE_PROMOTION_RESOURCE_REGISTRY_V1";
  mappings: StripePromotionResourceMapping[];
};

export function safeStripeKeyFingerprint(key: string): string {
  const t = key.trim();
  if (t.length < 12) return "INVALID";
  return `${t.slice(0, 7)}…${t.slice(-4)}`;
}

/** Deterministic Infinity provider resource id (Stripe coupon id, max 40 chars). */
export function infinityStripeCouponResourceId(input: {
  venture_id: string;
  public_code: string;
  amount_off_cents: number;
  resource_version: string;
}): string {
  const code = input.public_code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const raw = `${input.venture_id}_${code}_${input.amount_off_cents}OFF_${input.resource_version}`;
  return raw.slice(0, 40);
}

export function defaultRegistryPath(cwd = process.cwd()): string {
  return join(cwd, "lib/infinity/commerce/stripe-promotion-resource-registry-v1.json");
}

export function loadStripePromotionResourceRegistry(path = defaultRegistryPath()): StripePromotionResourceRegistryV1 {
  if (!existsSync(path)) {
    return { schema: "STRIPE_PROMOTION_RESOURCE_REGISTRY_V1", mappings: [] };
  }
  const parsed = JSON.parse(readFileSync(path, "utf8")) as StripePromotionResourceRegistryV1;
  if (parsed.schema !== "STRIPE_PROMOTION_RESOURCE_REGISTRY_V1") {
    throw new Error("INVALID_PROMOTION_REGISTRY_SCHEMA");
  }
  return parsed;
}

export function saveStripePromotionResourceRegistry(
  registry: StripePromotionResourceRegistryV1,
  path = defaultRegistryPath(),
): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`);
}

export function findActiveMapping(
  registry: StripePromotionResourceRegistryV1,
  input: { venture_id: string; public_code: string },
): StripePromotionResourceMapping | undefined {
  const code = input.public_code.trim().toUpperCase();
  return registry.mappings.find(
    (row) =>
      row.venture_id === input.venture_id
      && row.public_code.toUpperCase() === code
      && row.status === "ACTIVE",
  );
}

export function resolveStripeCouponIdForCheckout(input: {
  venture_id: string;
  public_code: string;
  discount_usd: number;
  registry: StripePromotionResourceRegistryV1;
  env?: NodeJS.ProcessEnv;
}): string {
  const code = input.public_code.trim().toUpperCase();
  const env = input.env ?? process.env;
  const envOverride =
    env[`CLUB_THROTTLE_STRIPE_COUPON_${code}`]?.trim()
    || (code === "RIDEFIRST" ? env.CLUB_THROTTLE_STRIPE_COUPON_RIDEFIRST?.trim() : undefined);
  if (envOverride) return envOverride;
  const mapped = findActiveMapping(input.registry, { venture_id: input.venture_id, public_code: code });
  if (mapped?.stripe_coupon_id) return mapped.stripe_coupon_id;
  return infinityStripeCouponResourceId({
    venture_id: input.venture_id,
    public_code: code,
    amount_off_cents: Math.round(input.discount_usd * 100),
    resource_version: "v1",
  });
}

function couponTermsMatch(
  coupon: Stripe.Coupon,
  expected: { amount_off_cents: number; currency: string; name: string },
): boolean {
  return (
    coupon.amount_off === expected.amount_off_cents
    && (coupon.currency ?? "usd") === expected.currency
    && (coupon.name ?? "").toUpperCase() === expected.name.toUpperCase()
  );
}

export async function probeStripePromotionProvisioningKey(stripe: Stripe): Promise<{
  coupon_read: boolean;
  coupon_write: boolean;
  safe_errors: { read: string | null; write: string | null };
}> {
  const probeId = `infinity_probe_${Date.now()}`.slice(0, 40);
  let coupon_read = false;
  let coupon_write = false;
  let readErr: string | null = null;
  let writeErr: string | null = null;
  try {
    await stripe.coupons.retrieve("nonexistent_infinity_probe_coupon");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/no such coupon/i.test(msg)) coupon_read = true;
    else readErr = msg.slice(0, 120);
  }
  try {
    await stripe.coupons.create({
      id: probeId,
      amount_off: 1,
      currency: "usd",
      duration: "once",
      name: "PROBE",
    });
    coupon_write = true;
    await stripe.coupons.del(probeId);
  } catch (e) {
    writeErr = e instanceof Error ? e.message.slice(0, 120) : "WRITE_PROBE_FAILED";
  }
  return { coupon_read, coupon_write, safe_errors: { read: readErr, write: writeErr } };
}

export async function provisionStripePromotionCoupon(input: {
  stripe: Stripe;
  spec: {
    venture_id: string;
    promotion_id: string;
    public_code: string;
    amount_off_cents: number;
    currency: "usd";
    duration: "once";
    customer_facing_name: string;
    resource_version: string;
  };
  registry: StripePromotionResourceRegistryV1;
}): Promise<{
  action: StripePromotionProviderAction;
  stripe_coupon_id: string;
  infinity_resource_id: string;
  registry: StripePromotionResourceRegistryV1;
}> {
  const infinity_resource_id = infinityStripeCouponResourceId({
    venture_id: input.spec.venture_id,
    public_code: input.spec.public_code,
    amount_off_cents: input.spec.amount_off_cents,
    resource_version: input.spec.resource_version,
  });
  const existing = findActiveMapping(input.registry, {
    venture_id: input.spec.venture_id,
    public_code: input.spec.public_code,
  });
  const expectedTerms = {
    amount_off_cents: input.spec.amount_off_cents,
    currency: input.spec.currency,
    name: input.spec.customer_facing_name,
  };

  if (existing?.stripe_coupon_id) {
    try {
      const coupon = await input.stripe.coupons.retrieve(existing.stripe_coupon_id);
      if (couponTermsMatch(coupon, expectedTerms)) {
        return {
          action: "REUSED",
          stripe_coupon_id: existing.stripe_coupon_id,
          infinity_resource_id: existing.infinity_resource_id,
          registry: input.registry,
        };
      }
    } catch {
      /* fall through to create/reconcile */
    }
  }

  let action: StripePromotionProviderAction = "CREATED";
  let stripe_coupon_id = infinity_resource_id;

  try {
    const retrieved = await input.stripe.coupons.retrieve(infinity_resource_id);
    if (couponTermsMatch(retrieved, expectedTerms)) {
      action = "REUSED";
      stripe_coupon_id = infinity_resource_id;
    } else {
      throw new Error("COUPON_TERMS_MISMATCH");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (!/no such coupon|resource_missing/i.test(msg) && !msg.includes("COUPON_TERMS_MISMATCH")) {
      throw err;
    }
    if (msg.includes("COUPON_TERMS_MISMATCH")) {
      throw new Error("STRIPE_COUPON_ID_COLLISION_TERMS_MISMATCH");
    }
    await input.stripe.coupons.create({
      id: infinity_resource_id,
      amount_off: input.spec.amount_off_cents,
      currency: input.spec.currency,
      duration: input.spec.duration,
      name: input.spec.customer_facing_name,
      metadata: {
        venture_id: input.spec.venture_id,
        infinity_promotion_id: input.spec.promotion_id,
        infinity_public_code: input.spec.public_code,
        infinity_resource_version: input.spec.resource_version,
      },
    });
    action = "CREATED";
    stripe_coupon_id = infinity_resource_id;
  }

  const now = new Date().toISOString();
  const nextMappings = input.registry.mappings.filter(
    (row) =>
      !(
        row.venture_id === input.spec.venture_id
        && row.public_code.toUpperCase() === input.spec.public_code.toUpperCase()
        && row.status === "ACTIVE"
      ),
  );
  const prior = existing ?? findActiveMapping(input.registry, {
    venture_id: input.spec.venture_id,
    public_code: input.spec.public_code,
  });
  if (prior && prior.stripe_coupon_id !== stripe_coupon_id) action = "RECONCILED";

  nextMappings.push({
    venture_id: input.spec.venture_id,
    promotion_id: input.spec.promotion_id,
    public_code: input.spec.public_code.toUpperCase(),
    provider: "stripe",
    resource_version: input.spec.resource_version,
    infinity_resource_id,
    stripe_coupon_id,
    amount_off_cents: input.spec.amount_off_cents,
    currency: input.spec.currency,
    duration: input.spec.duration,
    customer_facing_name: input.spec.customer_facing_name,
    status: "ACTIVE",
    provisioned_at: prior?.provisioned_at ?? now,
    last_reconciled_at: now,
  });

  return {
    action,
    stripe_coupon_id,
    infinity_resource_id,
    registry: { schema: "STRIPE_PROMOTION_RESOURCE_REGISTRY_V1", mappings: nextMappings },
  };
}
