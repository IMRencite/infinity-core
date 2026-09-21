import { occupancynpvPublishedBlogPosts } from "../continuous/occupancynpv-blog-catalog";
import { defaultVentureBlogSurface } from "../continuous/venture-blog-standard";
import type { VentureBlogOsState } from "./types";

const memory = new Map<string, VentureBlogOsState>();

function emptyRoll(): VentureBlogOsState["roll"] {
  return {
    featured_latest_id: null,
    featured_latest_title: null,
    featured_latest_url: null,
    featured_latest_published: null,
    carousel_ids: [],
    sidebar_recent_ids: [],
    topic_cloud: [],
    category_discovery: [],
    search_enabled: true,
    newest_first: true,
    last_synced_at: null,
    content_hash: null,
  };
}

export function emptyVentureBlogOsState(venture_id: string, public_name = venture_id, now = new Date().toISOString()): VentureBlogOsState {
  return {
    venture_id,
    public_name,
    operating_day: now.slice(0, 10),
    obligation: null,
    attempts: [],
    candidates: [],
    categories: [],
    tags: [],
    assignments: [],
    roll: emptyRoll(),
    remediations: [],
    other_high_value_today: 0,
    blogs_live_verified_today: 0,
    first_canary_live: false,
    always_on_proven: false,
    updated_at: now,
  };
}

export function seedOccupancyNpvBlogOsState(now = new Date().toISOString()): VentureBlogOsState {
  const posts = occupancynpvPublishedBlogPosts();
  const latest = [...posts].sort((a, b) => b.published.localeCompare(a.published))[0];
  const surface = defaultVentureBlogSurface("occupancynpv");
  return {
    ...emptyVentureBlogOsState("occupancynpv", "OccupancyNPV", now),
    first_canary_live: Boolean(latest),
    always_on_proven: true,
    categories: surface.taxonomy.categories.map((name, index) => ({
      id: `cat:occupancynpv:${index}`,
      venture_id: "occupancynpv",
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      description: "Durable OccupancyNPV authority theme for commercial-lease valuation and occupancy cost.",
      canonical_topic: name,
      authority_cluster_id: "cluster:occupancy-cost",
      parent_id: null,
      status: "ACTIVE",
      created_at: now,
      updated_at: now,
    })),
    tags: (latest?.tags ?? surface.taxonomy.tags).map((name, index) => ({
      id: `tag:occupancynpv:${index}`,
      venture_id: "occupancynpv",
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      description: `Reusable OccupancyNPV topic: ${name}`,
      canonical_topic: name,
      authority_cluster_id: "cluster:occupancy-cost",
      parent_id: null,
      status: "ACTIVE",
      created_at: now,
      updated_at: now,
    })),
    assignments: latest
      ? [{
        id: "assign:occupancynpv:latest",
        venture_id: "occupancynpv",
        article_id: latest.asset_id ?? latest.slug,
        category_id: "cat:occupancynpv:0",
        tag_ids: (latest.tags ?? []).map((_, index) => `tag:occupancynpv:${index}`),
        authority_cluster_id: "cluster:occupancy-cost",
        created_at: now,
        updated_at: now,
      }]
      : [],
    roll: {
      featured_latest_id: latest?.asset_id ?? latest?.slug ?? null,
      featured_latest_title: latest?.title ?? null,
      featured_latest_url: latest ? `https://occupancynpv.com${latest.path}` : null,
      featured_latest_published: latest?.published ?? null,
      carousel_ids: posts.map((row) => row.asset_id ?? row.slug),
      sidebar_recent_ids: posts.map((row) => row.asset_id ?? row.slug),
      topic_cloud: latest?.tags ?? [],
      category_discovery: surface.taxonomy.categories,
      search_enabled: true,
      newest_first: true,
      last_synced_at: now,
      content_hash: latest ? `blog:${latest.slug}:${latest.modified}` : null,
    },
  };
}

export function getVentureBlogOsState(venture_id: string): VentureBlogOsState | null {
  return memory.get(venture_id) ?? null;
}

export function replaceVentureBlogOsState(state: VentureBlogOsState): VentureBlogOsState {
  memory.set(state.venture_id, state);
  return state;
}

export function listVentureBlogOsStates(): VentureBlogOsState[] {
  return [...memory.values()];
}

export function resetVentureBlogOsStore(): void {
  memory.clear();
}

export function ensureVentureBlogOsState(venture_id: string, public_name = venture_id, now = new Date().toISOString()): VentureBlogOsState {
  const existing = memory.get(venture_id);
  if (existing) {
    if (existing.operating_day !== now.slice(0, 10)) {
      const next = {
        ...existing,
        operating_day: now.slice(0, 10),
        other_high_value_today: 0,
        blogs_live_verified_today: 0,
        updated_at: now,
      };
      memory.set(venture_id, next);
      return next;
    }
    return existing;
  }
  const seeded = venture_id === "occupancynpv" ? seedOccupancyNpvBlogOsState(now) : emptyVentureBlogOsState(venture_id, public_name, now);
  memory.set(venture_id, seeded);
  return seeded;
}
