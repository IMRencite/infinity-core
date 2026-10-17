/** CANONICAL_VARIANT_IDENTITY_V1 — venture × product × color × size. */

export const CANONICAL_VARIANT_IDENTITY_VERSION = "v1" as const;

export type CanonicalVariantParts = {
  venture_id: string;
  product_slug: string;
  garment_color: string;
  size: string;
};

const CLUB_THROTTLE_GARMENT_COLOR_SLUGS = new Set([
  "white",
  "black",
  "ash",
  "dark-heather",
  "natural",
  "light-blue",
]);

export function normalizeGarmentColorSlug(color: string | undefined | null): string {
  const c = (color ?? "white").trim().toLowerCase();
  if (CLUB_THROTTLE_GARMENT_COLOR_SLUGS.has(c)) return c;
  return "white";
}

export function canonicalVariantId(parts: CanonicalVariantParts): string {
  const color = normalizeGarmentColorSlug(parts.garment_color);
  return `${parts.venture_id}|${parts.product_slug}|${color}|${parts.size.toUpperCase()}`;
}

export function cartLineKey(line: { slug: string; size: string; color?: string | null }): string {
  return canonicalVariantId({
    venture_id: "club-throttle",
    product_slug: line.slug,
    garment_color: line.color ?? "white",
    size: line.size,
  });
}

export function parseCanonicalVariantId(id: string): CanonicalVariantParts | null {
  const parts = id.split("|");
  if (parts.length !== 4) return null;
  const [venture_id, product_slug, garment_color, size] = parts;
  if (!venture_id || !product_slug || !garment_color || !size) return null;
  return { venture_id, product_slug, garment_color, size };
}
