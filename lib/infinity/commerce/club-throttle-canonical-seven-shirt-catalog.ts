import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CLUB_THROTTLE_CORE_TEE } from "./club-throttle-catalog.ts";
import type { CanonicalProductRecord } from "./canonical-product-inventory.ts";
import { CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL } from "./club-throttle-storefront-merch-render-pipeline.ts";

export const CLUB_THROTTLE_FOUNDER_SEVEN_RETAIL_USD = CLUB_THROTTLE_CORE_TEE.price_usd;

export const CLUB_THROTTLE_SUPERSEDED_GELATO_PRODUCT_IDS = [
  "d215b645-9628-49db-87e7-241e0ec4b75c",
  "63788e23-cbb1-488f-9657-d0f76a935769",
  "11def107-1c13-4bf6-afe9-d7cf1c486c67",
  "99913623-8656-42f9-a818-46fbf14b10eb",
  "3f108c32-d821-4df7-9cf7-fc23c2a11745",
  "b0c01e64-abb6-465d-9796-105032430b0a",
  "8755a8df-4827-43bd-9105-ce29078d78aa",
  "e4a7a226-84d1-48a1-aea3-e4756534d4ac",
  "f8424c9d-460b-408b-9f3e-efa281c92c94",
  "49c1dd23-be91-4a86-ac44-5cfb2bfd7e51",
] as const;

export type SevenShirtMerchMeta = {
  sku: string;
  concept_id: string;
  product_id: string;
  slug: string;
  title: string;
  short_description: string;
  design_story: string;
  collection_slug: string;
  gelato_product_id: string;
  public_asset_url: string;
  seo_title: string;
  meta_description: string;
};

export const CLUB_THROTTLE_SEVEN_SHIRT_MERCH: SevenShirtMerchMeta[] = [
  {
    sku: "LOT_LINE",
    concept_id: "ct-lot-line-1",
    product_id: "cprod_ct_lot_line_v1",
    slug: "lot-line-tee",
    title: "Lot Line Tee",
    short_description: "Night-lot sportbike scene on a white Gildan 5000 large back.",
    design_story:
      "A wet parking-lot night, amber street light, and a sportbike that reads from across the lot. Built for riders who live in the after-hours hour.",
    collection_slug: "after-dark",
    gelato_product_id: "d381a616-05cf-4908-b558-5aba03dc1560",
    public_asset_url:
      "https://club-throttle-3l1ct73vp-infinite-media-resources-imr.vercel.app/commerce-probe-gelato/candidate3-final-3600w-de2da007.png",
    seo_title: "Lot Line Tee | Club Throttle",
    meta_description:
      "Lot Line is a Club Throttle motorcycle graphic tee — night-lot sportbike art on a Gildan 5000 heavyweight back print for after-dark riders.",
  },
  {
    sku: "CLEAN_RPM",
    concept_id: "ct-clean-rpm-phrase-1",
    product_id: "cprod_ct_clean_rpm_v1",
    slug: "clean-rpm-tee",
    title: "Clean RPM Tee",
    short_description: "Bold typography with red slash accents on white.",
    design_story: "Clean RPM is phrase-first: strong black type, red ticks, no clutter. For riders who like the line straight and the throttle honest.",
    collection_slug: "redline",
    gelato_product_id: "c1a50563-b327-4668-9b22-76abf0bc7d40",
    public_asset_url:
      "https://club-throttle-aujt64rba-infinite-media-resources-imr.vercel.app/commerce-probe-gelato/ct-clean-rpm-phrase-1-founder-approved-5d5a37fe-large-back.png",
    seo_title: "Clean RPM Tee | Club Throttle",
    meta_description:
      "Clean RPM is a phrase-first motorcycle shirt — bold black type and red ticks on heavyweight cotton for riders who want tach energy without scene art.",
  },
  {
    sku: "DUALSPORT_DUST",
    concept_id: "ct-dualsport-dust-1",
    product_id: "cprod_ct_dualsport_dust_v1",
    slug: "dualsport-dust-tee",
    title: "Dualsport Dust Tee",
    short_description: "Adventure bike, dust, and open trail energy on white.",
    design_story: "Dualsport Dust is for the line where pavement ends and the good gravel starts.",
    collection_slug: "open-road",
    gelato_product_id: "ac8d2549-7c7e-4de6-8202-01f2a566ccf9",
    public_asset_url:
      "https://club-throttle-om8quiuah-infinite-media-resources-imr.vercel.app/commerce-probe-gelato/ct-dualsport-dust-1-9b3e77b4-large-back.png",
    seo_title: "Dualsport Dust Tee | Club Throttle",
    meta_description:
      "Dualsport Dust is an adventure motorcycle graphic tee — gravel-day energy and original ADV back art on Club Throttle heavyweight cotton.",
  },
  {
    sku: "KNEE_DOWN",
    concept_id: "ct-knee-down-1",
    product_id: "cprod_ct_knee_down_v2",
    slug: "knee-down-tee",
    title: "Knee Down Tee",
    short_description: "Technical line-art lean-in with construction geometry on white.",
    design_story:
      "Knee Down is monochrome line work — rider, bike, and technical arcs. Same sport category as Apex, different identity: draftsmanship over illustration.",
    collection_slug: "redline",
    gelato_product_id: "69391f6a-be94-407a-8b9f-414e5bcdec3f",
    public_asset_url:
      "https://club-throttle-isbbizc0w-infinite-media-resources-imr.vercel.app/commerce-probe-gelato/ct-knee-down-1-line-weight-72350650-large-back.png",
    seo_title: "Knee Down Tee | Club Throttle",
    meta_description:
      "Knee Down is a sportbike line-art motorcycle tee — lean-angle draftsmanship on Gildan 5000 cotton for track-day and sport-riding identity.",
  },
  {
    sku: "ZERO_CHILL_GARAGE",
    concept_id: "ct-zero-chill-phrase-1",
    product_id: "cprod_ct_zero_chill_garage_v1",
    slug: "zero-chill-garage-tee",
    title: "Zero Chill Garage Tee",
    short_description: "Garage-culture phrase mark on white.",
    design_story: "Zero Chill Garage is for the crew that treats the garage like church and the cold start like communion.",
    collection_slug: "throttle-core",
    gelato_product_id: "cddf7f60-cf9c-49de-823a-60ca3ea3b74e",
    public_asset_url:
      "https://club-throttle-4bez8vxve-infinite-media-resources-imr.vercel.app/commerce-probe-gelato/ct-zero-chill-phrase-1-589f12bb-large-back.png",
    seo_title: "Zero Chill Garage Tee | Club Throttle",
    meta_description:
      "Zero Chill Garage is a garage-culture motorcycle shirt — phrase-led Club Throttle art for cold starts, crew hangs, and wrench-day identity.",
  },
  {
    sku: "APEX_LINE",
    concept_id: "ct-apex-line-1",
    product_id: "cprod_ct_apex_line_v1",
    slug: "apex-line-tee",
    title: "Apex Line Tee",
    short_description: "Bold branded sportbike illustration on white.",
    design_story: "Apex Line is illustration-first sportbike energy — brand-forward, not blueprint.",
    collection_slug: "redline",
    gelato_product_id: "c6beddef-3f87-44a8-aab9-5e488860d66c",
    public_asset_url:
      "https://club-throttle-1tkv2077n-infinite-media-resources-imr.vercel.app/commerce-probe-gelato/ct-apex-line-1-b226ced8-large-back.png",
    seo_title: "Apex Line Tee | Club Throttle",
    meta_description:
      "Apex Line is a bold sportbike illustration tee — full-color motorcycle back art on heavyweight cotton for riders who want poster-level graphic energy.",
  },
  {
    sku: "BAGGER_SEND",
    concept_id: "ct-bagger-send-1",
    product_id: "cprod_ct_bagger_send_v1",
    slug: "bagger-send-tee",
    title: "Bagger Send Tee",
    short_description: "Cruiser/bagger send-it scene on white.",
    design_story: "Bagger Send is for the long, loud, loaded roll — cruiser culture without the cliché poster.",
    collection_slug: "open-road",
    gelato_product_id: "b3fce37e-85ad-492d-bdb8-d2e7c7e51faa",
    public_asset_url:
      "https://club-throttle-owlq6qrbz-infinite-media-resources-imr.vercel.app/commerce-probe-gelato/ct-bagger-send-1-9c4b410f-large-back.png",
    seo_title: "Bagger Send Tee | Club Throttle",
    meta_description:
      "Bagger Send is a cruiser and bagger lifestyle tee — highway-send illustration on Gildan 5000 cotton for touring and open-road riders.",
  },
];

export function sevenShirtToCanonicalProductRecord(row: SevenShirtMerchMeta, cwd = process.cwd()): CanonicalProductRecord {
  let image =
    row.public_asset_url ||
    `/commerce-artwork/${row.slug.replace(/-tee$/, "")}-back-art.png`;
  let imageKind: CanonicalProductRecord["primary_image_kind"] = row.public_asset_url ? "RAW_ARTWORK" : "COMPOSED_GARMENT_DESIGN";
  const manifestPath = join(cwd, CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL);
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      rows?: Array<{ sku: string; hero_back_public?: string }>;
    };
    const hero = manifest.rows?.find((r) => r.sku === row.sku)?.hero_back_public;
    if (hero) {
      image = hero;
      imageKind = "STOREFRONT_MERCHANDISING_RENDER";
    }
  }
  return {
    venture_id: "club-throttle",
    product_id: row.product_id,
    slug: row.slug,
    title: row.title,
    collection_slug: row.collection_slug,
    published: true,
    sellable: true,
    available: true,
    price_usd: CLUB_THROTTLE_FOUNDER_SEVEN_RETAIL_USD,
    currency: "usd",
    primary_image: image,
    primary_image_kind: imageKind,
    variant_ids: ["S", "M", "L", "XL", "2XL"].map((size) => `${row.product_id}:${size}:white`),
    released_at: "2026-10-07",
    source: "CANONICAL_INVENTORY",
  };
}
