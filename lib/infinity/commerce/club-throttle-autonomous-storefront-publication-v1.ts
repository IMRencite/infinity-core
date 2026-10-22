import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CLUB_THROTTLE_VENTURE_ID } from "./club-throttle.ts";
import type { AutonomousClubThrottleBuiltProduct } from "./club-throttle-autonomous-product-build-v1.ts";
import { registerSuccessfulPublication } from "@/lib/infinity/autonomous-portfolio-operations/durable/autonomous-publication-idempotency-v1";

export const CLUB_THROTTLE_AUTONOMOUS_STOREFRONT_PUBLICATION_V1 =
  "CLUB_THROTTLE_AUTONOMOUS_STOREFRONT_PUBLICATION_V1" as const;

export const CLUB_THROTTLE_AUTONOMOUS_PUBLISHED_REGISTRY_REL =
  ".infinity/commerce/club-throttle-autonomous-customer-visible-products-v1.json" as const;

export type AutonomousPublishedStorefrontProduct = AutonomousClubThrottleBuiltProduct & {
  customer_visible: boolean;
  publication_timestamp: string;
  canonical_path: string;
  publication_asset_identity: string;
};

export type AutonomousPublishedRegistryV1 = {
  version: typeof CLUB_THROTTLE_AUTONOMOUS_STOREFRONT_PUBLICATION_V1;
  updated_at: string;
  rows: AutonomousPublishedStorefrontProduct[];
};

export function autonomousStorefrontPublicationAssetIdentity(input: {
  concept_id: string;
  source_artwork_hash: string;
}): string {
  return createHash("sha256")
    .update(`${CLUB_THROTTLE_VENTURE_ID}:${input.concept_id}:${input.source_artwork_hash}`)
    .digest("hex")
    .slice(0, 32);
}

export function loadAutonomousPublishedStorefrontRegistry(cwd = process.cwd()): AutonomousPublishedRegistryV1 {
  const path = join(cwd, CLUB_THROTTLE_AUTONOMOUS_PUBLISHED_REGISTRY_REL);
  if (!existsSync(path)) {
    return { version: CLUB_THROTTLE_AUTONOMOUS_STOREFRONT_PUBLICATION_V1, updated_at: new Date(0).toISOString(), rows: [] };
  }
  return JSON.parse(readFileSync(path, "utf8")) as AutonomousPublishedRegistryV1;
}

export function saveAutonomousPublishedStorefrontRegistry(cwd: string, registry: AutonomousPublishedRegistryV1): void {
  const path = join(cwd, CLUB_THROTTLE_AUTONOMOUS_PUBLISHED_REGISTRY_REL);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ ...registry, updated_at: new Date().toISOString() }, null, 2)}\n`);
}

export function countAutonomousShirtsPublishedOnUtcDay(cwd: string, dayIso: string): number {
  const day = dayIso.slice(0, 10);
  const registry = loadAutonomousPublishedStorefrontRegistry(cwd);
  return registry.rows.filter((r) => r.customer_visible && r.publication_timestamp.slice(0, 10) === day).length;
}

export type PublishAutonomousStorefrontProductResult =
  | {
      outcome: "CREATED" | "PUBLISHED";
      product: AutonomousPublishedStorefrontProduct;
      customer_visible: true;
      incremented_daily_counter: boolean;
    }
  | {
      outcome: "ALREADY_PUBLISHED";
      product: AutonomousPublishedStorefrontProduct;
      customer_visible: true;
      incremented_daily_counter: false;
    }
  | {
      outcome: "NOOP";
      reason: string;
      customer_visible: false;
      incremented_daily_counter: false;
    };

export async function publishAutonomousClubThrottleStorefrontProduct(input: {
  built: AutonomousClubThrottleBuiltProduct;
  cwd?: string;
  origin?: string;
}): Promise<PublishAutonomousStorefrontProductResult> {
  const cwd = input.cwd ?? process.cwd();
  const canonical_path = `/shop/${input.built.slug}`;
  const assetIdentity = autonomousStorefrontPublicationAssetIdentity({
    concept_id: input.built.concept_id,
    source_artwork_hash: input.built.source_artwork_hash,
  });
  const registry = loadAutonomousPublishedStorefrontRegistry(cwd);
  const existing = registry.rows.find((r) => r.publication_asset_identity === assetIdentity);
  if (existing?.customer_visible) {
    return {
      outcome: "ALREADY_PUBLISHED",
      product: existing,
      customer_visible: true,
      incremented_daily_counter: false,
    };
  }

  const now = new Date().toISOString();
  const row: AutonomousPublishedStorefrontProduct = {
    ...input.built,
    customer_visible: true,
    publication_timestamp: now,
    canonical_path,
    publication_asset_identity: assetIdentity,
  };
  const nextRows = [...registry.rows.filter((r) => r.publication_asset_identity !== assetIdentity), row];
  saveAutonomousPublishedStorefrontRegistry(cwd, {
    version: CLUB_THROTTLE_AUTONOMOUS_STOREFRONT_PUBLICATION_V1,
    updated_at: now,
    rows: nextRows,
  });

  await registerSuccessfulPublication({
    venture_id: CLUB_THROTTLE_VENTURE_ID,
    asset_identity: assetIdentity,
    canonical_path,
    content_revision: input.built.source_artwork_hash,
    production_url: `${(input.origin ?? "https://clubthrottle.com").replace(/\/+$/, "")}${canonical_path}`,
    payload: { product_id: input.built.product_id, sku: input.built.sku, source: "AUTONOMOUS_CREATIVE" },
  });

  return {
    outcome: existing ? "PUBLISHED" : "CREATED",
    product: row,
    customer_visible: true,
    incremented_daily_counter: true,
  };
}

export function listCustomerVisibleAutonomousStorefrontProducts(cwd = process.cwd()): AutonomousPublishedStorefrontProduct[] {
  return loadAutonomousPublishedStorefrontRegistry(cwd).rows.filter((r) => r.customer_visible);
}

export function autonomousStorefrontPublicationIdempotencyQc(): "PASS" | "FAIL" {
  const a = autonomousStorefrontPublicationAssetIdentity({ concept_id: "c1", source_artwork_hash: "abc" });
  const b = autonomousStorefrontPublicationAssetIdentity({ concept_id: "c1", source_artwork_hash: "abc" });
  const c = autonomousStorefrontPublicationAssetIdentity({ concept_id: "c1", source_artwork_hash: "def" });
  return a === b && a !== c && a.length === 32 ? "PASS" : "FAIL";
}
