import { EXPANSION_QUESTION_PAGES } from "@/lib/infinity/venture-website-architecture/authority-expansion-catalog";
import { SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import { DEPTH_QUESTION_PAGES } from "@/lib/infinity/venture-website-architecture/search-demand-depth-catalog";
import type { OrganicAsset } from "./types";

export function liveOccupancyNpvQuestionAssets(): OrganicAsset[] {
  const pages = [...SEO_GEO_QUESTION_PAGES, ...EXPANSION_QUESTION_PAGES, ...DEPTH_QUESTION_PAGES];
  return pages.map((page) => ({
    asset_id: `live:${page.route}`,
    venture_id: "occupancynpv",
    url: page.route.endsWith("/") ? page.route : `${page.route}/`,
    title: page.title,
    content_type: "EVERGREEN_QUESTION",
    topic: page.hub.replace(/^\//, ""),
    cluster: page.hub,
    question_answered: page.question,
    intent: page.question,
    status: "PUBLISHED",
    published_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    quality_score: 88,
    evidence_status: "PASS",
    internal_links: [page.hub.endsWith("/") ? page.hub : `${page.hub}/`, "/"],
    taxonomy: { categories: [page.hub.replace(/^\//, "")], tags: [page.hub.replace(/^\//, "")] },
    sales_relevance: 0.7,
    objections_addressed: [],
    indexation: "indexed",
  }));
}

export function liveOccupancyNpvHubs() {
  return SEO_GEO_TOPIC_HUBS.map((hub) => ({
    route: hub.route.endsWith("/") ? hub.route : `${hub.route}/`,
    title: hub.title,
    cluster: hub.cluster,
  }));
}
