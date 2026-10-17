import { CLUB_THROTTLE_CORE_TEE } from "./club-throttle-catalog";

export type CanonicalProductRecord = {
  venture_id: string;
  product_id: string;
  slug: string;
  title: string;
  collection_slug: string;
  published: boolean;
  sellable: boolean;
  available: boolean;
  price_usd: number | null;
  currency: "usd";
  primary_image: string;
  primary_image_kind:
    | "PROVIDER_GARMENT_MOCKUP"
    | "COMPOSED_GARMENT_DESIGN"
    | "RAW_ARTWORK"
    | "GENERIC_SILHOUETTE"
    | "STOREFRONT_MERCHANDISING_RENDER";
  variant_ids: string[];
  released_at: string;
  source: "CANONICAL_INVENTORY";
};

const inventory = new Map<string, CanonicalProductRecord>();
let seeded = false;

function key(venture_id: string, product_id: string): string {
  return `${venture_id}::${product_id}`;
}

export function registerCanonicalProduct(record: CanonicalProductRecord): CanonicalProductRecord {
  inventory.set(key(record.venture_id, record.product_id), { ...record, variant_ids: [...record.variant_ids] });
  return inventory.get(key(record.venture_id, record.product_id))!;
}

export function listCanonicalProducts(venture_id: string, opts?: { published_only?: boolean; sellable_only?: boolean }): CanonicalProductRecord[] {
  return [...inventory.values()]
    .filter((row) => row.venture_id === venture_id)
    .filter((row) => opts?.published_only === false || row.published)
    .filter((row) => !opts?.sellable_only || row.sellable)
    .sort((left, right) => right.released_at.localeCompare(left.released_at));
}

export function getCanonicalProduct(venture_id: string, product_id: string): CanonicalProductRecord | null {
  return inventory.get(key(venture_id, product_id)) ?? null;
}

export function listCanonicalProductsByCollection(venture_id: string, collection_slug: string): CanonicalProductRecord[] {
  return listCanonicalProducts(venture_id).filter((row) => row.collection_slug === collection_slug);
}

export function listNewReleaseProducts(venture_id: string): CanonicalProductRecord[] {
  return listCanonicalProducts(venture_id).slice(0, 8);
}

export function searchCanonicalProducts(venture_id: string, query: string): CanonicalProductRecord[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return listCanonicalProducts(venture_id);
  return listCanonicalProducts(venture_id).filter((row) => `${row.title} ${row.slug} ${row.collection_slug}`.toLowerCase().includes(needle));
}

export function resetCanonicalProductInventory(): void {
  inventory.clear();
  seeded = false;
}

export function clubThrottleCoreTeeProductRecord(): CanonicalProductRecord {
  return {
    venture_id: "club-throttle",
    product_id: CLUB_THROTTLE_CORE_TEE.product_id,
    slug: CLUB_THROTTLE_CORE_TEE.slug,
    title: CLUB_THROTTLE_CORE_TEE.title,
    collection_slug: CLUB_THROTTLE_CORE_TEE.collection_slug,
    published: true,
    sellable: false,
    available: true,
    price_usd: CLUB_THROTTLE_CORE_TEE.price_usd,
    currency: "usd",
    primary_image: "/visual/product-core-garment.svg",
    primary_image_kind: "COMPOSED_GARMENT_DESIGN",
    variant_ids: ["S", "M", "L", "XL", "2XL"].map((size) => `${CLUB_THROTTLE_CORE_TEE.product_id}:${size}:black`),
    released_at: "2026-09-24",
    source: "CANONICAL_INVENTORY",
  };
}

export function clubThrottleKickstandsUpProductRecord(): CanonicalProductRecord {
  return {
    venture_id: "club-throttle",
    product_id: "cprod_club_throttle_kickstands_up_v1",
    slug: "kickstands-up-tee",
    title: "Kickstands Up Tee",
    collection_slug: "after-dark",
    published: true,
    sellable: false,
    available: true,
    price_usd: 48,
    currency: "usd",
    primary_image: "/visual/product-kickstands-up-garment.svg",
    primary_image_kind: "COMPOSED_GARMENT_DESIGN",
    variant_ids: ["S", "M", "L", "XL", "2XL"].map((size) => `cprod_club_throttle_kickstands_up_v1:${size}:black`),
    released_at: "2026-09-25",
    source: "CANONICAL_INVENTORY",
  };
}

export function seedCanonicalProductInventory(): void {
  if (seeded) return;
  registerCanonicalProduct(clubThrottleCoreTeeProductRecord());
  registerCanonicalProduct(clubThrottleKickstandsUpProductRecord());
  seeded = true;
}

export function ensureCanonicalProductInventory(): CanonicalProductRecord[] {
  seedCanonicalProductInventory();
  return listCanonicalProducts("club-throttle");
}

export function auditCommerceCatalogDrift(input: {
  venture_id: string;
  pdp: "CANONICAL_INVENTORY" | "HARDCODED";
  shop: "CANONICAL_INVENTORY" | "HARDCODED";
  collections: "CANONICAL_INVENTORY" | "HARDCODED";
  search: "CANONICAL_INVENTORY" | "HARDCODED";
  new_releases: "CANONICAL_INVENTORY" | "HARDCODED";
  related: "CANONICAL_INVENTORY" | "HARDCODED";
  recommendations: "CANONICAL_INVENTORY" | "HARDCODED";
  buy_again: "CANONICAL_INVENTORY" | "HARDCODED";
  cart: "CANONICAL_INVENTORY" | "HARDCODED";
}): { venture_id: string; split: boolean; required_action: "NONE" | "MIGRATE_TO_CANONICAL_INVENTORY" } {
  const sources = [input.pdp, input.shop, input.collections, input.search, input.new_releases, input.related, input.recommendations, input.buy_again, input.cart];
  const split = sources.some((source) => source !== "CANONICAL_INVENTORY");
  return {
    venture_id: input.venture_id,
    split,
    required_action: split ? "MIGRATE_TO_CANONICAL_INVENTORY" : "NONE",
  };
}
