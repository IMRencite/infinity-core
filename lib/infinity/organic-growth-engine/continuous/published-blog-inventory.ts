import { occupancynpvExpansionPublishedRecords } from "./occupancynpv-expansion-records";
import { clubThrottleJournalPublishedRecords } from "./club-throttle-journal";
import {
  OCCUPANCYNPV_CAM_FIRST_YEAR_ASSET_ID,
  OCCUPANCYNPV_CAM_FIRST_YEAR_ASSET_VERSION,
  OCCUPANCYNPV_CAM_FIRST_YEAR_PATH,
  OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION,
  OCCUPANCYNPV_CAM_VISUALS,
} from "./occupancynpv-cam-first-year-page";

export type PublishedBlogStatus = "DRAFT" | "PUBLISHED" | "REFRESHED" | "UNPUBLISHED";

export type PublishedBlogRecord = {
  venture_id: string;
  asset_id: string;
  obligation_id: string | null;
  content_version: string;
  visual_version: string;
  publication_status: PublishedBlogStatus;
  title: string;
  slug: string;
  path: string;
  canonical_url: string;
  excerpt: string;
  primary_category: string;
  secondary_categories: string[];
  tags: string[];
  featured_image: string;
  featured_image_alt: string;
  published_at: string;
  updated_at: string;
  indexability: boolean;
  discovery_eligibility: boolean;
  featured: boolean;
  reading_time?: string;
  legacy_paths?: string[];
  schema: Record<string, unknown>;
  publication_evidence: string | null;
};

const inventory = new Map<string, PublishedBlogRecord>();
let occupancynpvSeeded = false;

function recordKey(venture_id: string, asset_id: string): string {
  return `${venture_id}::${asset_id}`;
}

export function registerPublishedBlogRecord(record: PublishedBlogRecord): PublishedBlogRecord {
  const next = { ...record, secondary_categories: [...record.secondary_categories], tags: [...record.tags] };
  inventory.set(recordKey(record.venture_id, record.asset_id), next);
  return next;
}

export function getPublishedBlogRecord(venture_id: string, asset_id: string): PublishedBlogRecord | null {
  return inventory.get(recordKey(venture_id, asset_id)) ?? null;
}

export function listPublishedBlogRecords(venture_id?: string): PublishedBlogRecord[] {
  return [...inventory.values()]
    .filter((row) => !venture_id || row.venture_id === venture_id)
    .filter((row) => row.publication_status === "PUBLISHED" || row.publication_status === "REFRESHED")
    .filter((row) => row.discovery_eligibility)
    .sort((left, right) => left.published_at.localeCompare(right.published_at) || left.asset_id.localeCompare(right.asset_id));
}

export function publishedBlogRecordToCatalogPost(record: PublishedBlogRecord): {
  asset_id: string;
  slug: string;
  path: string;
  legacy_paths?: string[];
  title: string;
  excerpt: string;
  published: string;
  modified: string;
  primaryCategory: string;
  category: string;
  categories: string[];
  tags: string[];
  image: string;
  image_alt: string;
  featured: boolean;
  reading_time?: string;
} {
  return {
    asset_id: record.asset_id,
    slug: record.slug,
    path: record.path,
    legacy_paths: record.legacy_paths,
    title: record.title,
    excerpt: record.excerpt,
    published: record.published_at.slice(0, 10),
    modified: record.updated_at.slice(0, 10),
    primaryCategory: record.primary_category,
    category: record.primary_category,
    categories: [record.primary_category, ...record.secondary_categories],
    tags: record.tags,
    image: record.featured_image,
    image_alt: record.featured_image_alt,
    featured: record.featured,
    reading_time: record.reading_time,
  };
}

export function resetPublishedBlogInventory(): void {
  inventory.clear();
  occupancynpvSeeded = false;
}

export function occupancynpvInterestRatePublishedRecord(): PublishedBlogRecord {
  return {
    venture_id: "occupancynpv",
    asset_id: "blog-interest-rate",
    obligation_id: "obl:occupancynpv:interest-rate",
    content_version: "interest-rate-v1",
    visual_version: "hero-building-v1",
    publication_status: "PUBLISHED",
    title: "How do interest rates affect commercial property values?",
    slug: "how-interest-rates-affect-commercial-property-values",
    path: "/blog/valuation/how-interest-rates-affect-commercial-property-values/",
    canonical_url: "https://occupancynpv.com/blog/valuation/how-interest-rates-affect-commercial-property-values/",
    excerpt:
      "Financing costs change the yield buyers require. Same NOI at a higher cap rate is a lower indicated value. This is a property-valuation story, not a tenant lease NPV.",
    primary_category: "Valuation",
    secondary_categories: [],
    tags: ["Interest Rates", "Cap Rates", "Commercial Real Estate"],
    featured_image: "/media/hero-building.webp",
    featured_image_alt: "Commercial office building exterior at late afternoon light.",
    published_at: "2026-09-17",
    updated_at: "2026-09-17",
    indexability: true,
    discovery_eligibility: true,
    featured: false,
    reading_time: "16 min read",
    legacy_paths: ["/blog/how-interest-rates-affect-commercial-property-values/"],
    schema: { type: "Article", id: "blog-interest-rate" },
    publication_evidence: "LIVE_VERIFIED",
  };
}

export function occupancynpvCamFirstYearPublishedRecord(): PublishedBlogRecord {
  return {
    venture_id: "occupancynpv",
    asset_id: OCCUPANCYNPV_CAM_FIRST_YEAR_ASSET_ID,
    obligation_id: "obl:occupancynpv:cam-first-year",
    content_version: OCCUPANCYNPV_CAM_FIRST_YEAR_ASSET_VERSION,
    visual_version: "hero-interior-v1",
    publication_status: "PUBLISHED",
    title: OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION,
    slug: "cam-first-year",
    path: OCCUPANCYNPV_CAM_FIRST_YEAR_PATH,
    canonical_url: `https://occupancynpv.com${OCCUPANCYNPV_CAM_FIRST_YEAR_PATH}`,
    excerpt:
      "Treat first-year CAM as a labeled occupancy-cost estimate, not a finished bill. Compare it on the same timeline as rent.",
    primary_category: "Occupancy costs",
    secondary_categories: [],
    tags: ["CAM", "Occupancy Costs", "Commercial Leases"],
    featured_image: OCCUPANCYNPV_CAM_VISUALS.featured_image,
    featured_image_alt: OCCUPANCYNPV_CAM_VISUALS.featured_alt,
    published_at: "2026-09-24",
    updated_at: "2026-09-25",
    indexability: true,
    discovery_eligibility: true,
    featured: true,
    reading_time: "14 min read",
    schema: { type: "Article", id: OCCUPANCYNPV_CAM_FIRST_YEAR_ASSET_ID, version: OCCUPANCYNPV_CAM_FIRST_YEAR_ASSET_VERSION },
    publication_evidence: "SAME_URL_REPAIR",
  };
}

export function clubThrottleJournalPublishedRecord(): PublishedBlogRecord {
  return {
    venture_id: "club-throttle",
    asset_id: "journal-what-club-throttle-is-for",
    obligation_id: null,
    content_version: "journal-v1",
    visual_version: "journal-cover-v1",
    publication_status: "PUBLISHED",
    title: "What Club Throttle is for",
    slug: "what-club-throttle-is-for",
    path: "/blog/",
    canonical_url: "https://clubthrottle.com/blog/",
    excerpt: "The shop, the hour, and what we will not print.",
    primary_category: "Journal",
    secondary_categories: [],
    tags: ["Club Throttle", "Rider apparel"],
    featured_image: "/visual/journal-cover.svg",
    featured_image_alt: "Night road journal",
    published_at: "2026-09-24",
    updated_at: "2026-09-25",
    indexability: true,
    discovery_eligibility: true,
    featured: true,
    schema: { type: "Article", id: "journal-what-club-throttle-is-for" },
    publication_evidence: "STOREFRONT_COMPOSE",
  };
}

export function seedCanonicalPublishedBlogInventory(): void {
  if (!occupancynpvSeeded) {
    registerPublishedBlogRecord(occupancynpvInterestRatePublishedRecord());
    registerPublishedBlogRecord(occupancynpvCamFirstYearPublishedRecord());
    for (const record of occupancynpvExpansionPublishedRecords()) registerPublishedBlogRecord(record);
    for (const record of clubThrottleJournalPublishedRecords()) registerPublishedBlogRecord(record);
    occupancynpvSeeded = true;
  }
}

export function ensureCanonicalPublishedBlogInventory(): PublishedBlogRecord[] {
  seedCanonicalPublishedBlogInventory();
  return listPublishedBlogRecords();
}

export function listVentureBlogCatalogDrift(input: {
  venture_id: string;
  article_source: "CANONICAL_INVENTORY" | "HARDCODED_ARRAY" | "INLINE_COMPOSE" | "NONE";
  index_source: "CANONICAL_INVENTORY" | "HARDCODED_ARRAY" | "INLINE_COMPOSE" | "NONE";
  latest_source: "CANONICAL_INVENTORY" | "HARDCODED_ARRAY" | "INLINE_COMPOSE" | "NONE";
  category_source: "CANONICAL_INVENTORY" | "HARDCODED_ARRAY" | "INLINE_COMPOSE" | "NONE";
  sitemap_source: "CANONICAL_INVENTORY" | "HARDCODED_ARRAY" | "INLINE_COMPOSE" | "NONE";
}): {
  venture_id: string;
  split: boolean;
  sources: string[];
  required_action: "NONE" | "MIGRATE_TO_CANONICAL_INVENTORY";
} {
  const sources = [input.article_source, input.index_source, input.latest_source, input.category_source, input.sitemap_source];
  const split = sources.some((source) => source !== "CANONICAL_INVENTORY" && source !== "NONE");
  return {
    venture_id: input.venture_id,
    split,
    sources,
    required_action: split ? "MIGRATE_TO_CANONICAL_INVENTORY" : "NONE",
  };
}

export function auditFirstClassVentureBlogInventories() {
  ensureCanonicalPublishedBlogInventory();
  return [
    listVentureBlogCatalogDrift({
      venture_id: "occupancynpv",
      article_source: "CANONICAL_INVENTORY",
      index_source: "CANONICAL_INVENTORY",
      latest_source: "CANONICAL_INVENTORY",
      category_source: "CANONICAL_INVENTORY",
      sitemap_source: "CANONICAL_INVENTORY",
    }),
    listVentureBlogCatalogDrift({
      venture_id: "club-throttle",
      article_source: "CANONICAL_INVENTORY",
      index_source: "CANONICAL_INVENTORY",
      latest_source: "CANONICAL_INVENTORY",
      category_source: "NONE",
      sitemap_source: "CANONICAL_INVENTORY",
    }),
    listVentureBlogCatalogDrift({
      venture_id: "imros",
      article_source: "NONE",
      index_source: "NONE",
      latest_source: "NONE",
      category_source: "NONE",
      sitemap_source: "NONE",
    }),
  ];
}
