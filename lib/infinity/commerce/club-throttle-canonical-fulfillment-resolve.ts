import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  CLUB_THROTTLE_CANONICAL_REGISTRY_REL,
  buildClubThrottleCanonicalProductionRegistry,
  type CanonicalProductionRegistryRow,
} from "./club-throttle-canonical-production-registry.ts";
import {
  CLUB_THROTTLE_SEVEN_SHIRT_MERCH,
  CLUB_THROTTLE_SUPERSEDED_GELATO_PRODUCT_IDS,
} from "./club-throttle-canonical-seven-shirt-catalog.ts";
import { loadClubThrottleVariantBindings } from "./club-throttle-variant-complete-replacement.ts";

export type ResolvedCanonicalLine = {
  sku: string;
  slug: string;
  product_id: string;
  gelato_product_id: string;
  registry_row: CanonicalProductionRegistryRow;
};

export function loadClubThrottleProductionRegistry(cwd = process.cwd()): {
  rows: CanonicalProductionRegistryRow[];
  superseded: readonly string[];
  qc: "PASS" | "FAIL";
} {
  const path = join(cwd, CLUB_THROTTLE_CANONICAL_REGISTRY_REL);
  if (existsSync(path)) {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      rows?: CanonicalProductionRegistryRow[];
      superseded_hidden?: string[];
      CANONICAL_PRODUCT_REGISTRY_QC?: string;
    };
    return {
      rows: parsed.rows ?? [],
      superseded: parsed.superseded_hidden ?? [...CLUB_THROTTLE_SUPERSEDED_GELATO_PRODUCT_IDS],
      qc: parsed.CANONICAL_PRODUCT_REGISTRY_QC === "PASS" ? "PASS" : "FAIL",
    };
  }
  const built = buildClubThrottleCanonicalProductionRegistry(cwd);
  return {
    rows: built.rows,
    superseded: built.superseded_hidden,
    qc: built.CANONICAL_PRODUCT_REGISTRY_QC,
  };
}

export function resolveCanonicalFulfillmentLine(input: {
  slug?: string;
  product_id?: string;
  gelato_product_id?: string;
  cwd?: string;
}): { ok: true; line: ResolvedCanonicalLine } | { ok: false; reason: string } {
  const registry = loadClubThrottleProductionRegistry(input.cwd);
  const gelatoId = input.gelato_product_id?.trim();
  if (gelatoId && registry.superseded.includes(gelatoId)) {
    return { ok: false, reason: "SUPERSEDED_GELATO_PRODUCT" };
  }
  const bindings = loadClubThrottleVariantBindings(input.cwd);
  const skuFromSuperseded =
    gelatoId && bindings
      ? bindings.bindings.find(
          (b) => b.gelato_product_id === gelatoId || b.superseded_gelato_product_id === gelatoId,
        )?.sku
      : null;
  const merch =
    (input.slug ? CLUB_THROTTLE_SEVEN_SHIRT_MERCH.find((m) => m.slug === input.slug) : null) ??
    (input.product_id ? CLUB_THROTTLE_SEVEN_SHIRT_MERCH.find((m) => m.product_id === input.product_id) : null) ??
    (skuFromSuperseded ? CLUB_THROTTLE_SEVEN_SHIRT_MERCH.find((m) => m.sku === skuFromSuperseded) : null) ??
    (gelatoId ? CLUB_THROTTLE_SEVEN_SHIRT_MERCH.find((m) => m.gelato_product_id === gelatoId) : null);
  if (!merch) return { ok: false, reason: "NOT_IN_REGISTRY" };
  const row = registry.rows.find((r) => r.SKU === merch.sku);
  if (!row) return { ok: false, reason: "REGISTRY_ROW_MISSING" };
  if (
    gelatoId &&
    gelatoId !== row.CURRENT_CANONICAL_GELATO_PRODUCT_ID &&
    !registry.superseded.includes(gelatoId)
  ) {
    return { ok: false, reason: "GELATO_ID_MISMATCH" };
  }
  if (registry.superseded.includes(row.CURRENT_CANONICAL_GELATO_PRODUCT_ID)) {
    return { ok: false, reason: "SUPERSEDED_GELATO_PRODUCT" };
  }
  return {
    ok: true,
    line: {
      sku: row.SKU,
      slug: merch.slug,
      product_id: merch.product_id,
      gelato_product_id: row.CURRENT_CANONICAL_GELATO_PRODUCT_ID,
      registry_row: row,
    },
  };
}

export function auditNoSupersededFulfillment(cwd?: string): "PASS" | "FAIL" {
  const registry = loadClubThrottleProductionRegistry(cwd);
  if (registry.qc !== "PASS") return "FAIL";
  return registry.rows.every(
    (r) => !registry.superseded.includes(r.CURRENT_CANONICAL_GELATO_PRODUCT_ID),
  )
    ? "PASS"
    : "FAIL";
}
