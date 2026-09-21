import { ORGANIC_INTERNAL_LINK_GATE } from "./contract";
import type { OrganicAsset, OrganicNamedGate, VentureTopicGraph } from "./types";

export function buildContinuousInternalLinkGraph(input: {
  asset: OrganicAsset;
  assets: OrganicAsset[];
  graph: VentureTopicGraph;
  conversion_url?: string;
}): { links: string[]; updated_hubs: string[] } {
  const parent = inferParentUrl(input.asset.url);
  const siblings = input.assets
    .filter((row) => row.asset_id !== input.asset.asset_id && (shareCluster(row, input.asset) || inferParentUrl(row.url) === parent || /noi|cap-rate|valuation/.test(row.url)))
    .map((row) => row.url);
  const relatedBlogs = input.assets
    .filter((row) => (row.content_type === "BLOG" || row.content_type === "GUIDE") || /invest|returns/.test(row.url))
    .map((row) => row.url);
  const conversion = input.conversion_url ?? inferConversionUrl(input.asset);
  const links = [...new Set([parent, ...siblings.slice(0, 4), ...relatedBlogs.slice(0, 2), conversion].filter(Boolean))];
  const updated_hubs = parent ? [parent] : [];
  input.graph.internal_links.push(...links.map((to) => ({ from: input.asset.url, to, rel: "related" })));
  if (parent) input.graph.internal_links.push({ from: parent, to: input.asset.url, rel: "child" });
  return { links, updated_hubs };
}

function shareCluster(a: OrganicAsset, b: OrganicAsset): boolean {
  return a.cluster === b.cluster || a.topic === b.topic || a.url.split("/").slice(0, 4).join("/") === b.url.split("/").slice(0, 4).join("/");
}

function inferParentUrl(url: string): string {
  const parts = url.split("/").filter(Boolean);
  if (parts.length <= 2) return `/${parts[0] ?? "commercial-real-estate"}/`;
  return `/${parts.slice(0, -1).join("/")}/`;
}

function inferConversionUrl(asset: OrganicAsset): string {
  if (asset.venture_id === "occupancynpv") return "/";
  return "/contact/";
}

export function manageBlogTaxonomy(input: {
  title: string;
  topic: string;
  existing_tags?: string[];
}): { categories: string[]; tags: string[] } {
  const category = input.topic || "Market Education";
  const allowed = new Set([
    "valuation",
    "leasing",
    "financing",
    "investment",
    "cap-rate",
    "noi",
    "occupancy",
    "commercial-real-estate",
    "interest-rates",
    "cap-rates",
  ]);
  const proposed = [
    category.toLowerCase().replace(/\s+/g, "-"),
    ...((input.existing_tags ?? []).map((tag) => tag.toLowerCase().replace(/\s+/g, "-"))),
  ];
  const tags = [...new Set(proposed.filter((tag) => allowed.has(tag) || tag === category.toLowerCase().replace(/\s+/g, "-")))].slice(0, 4);
  return { categories: [category], tags };
}

export function evaluateOrganicInternalLinkGate(asset: OrganicAsset): OrganicNamedGate {
  const reasons: string[] = [];
  if (asset.internal_links.length < 2) reasons.push("missing_internal_links");
  if (!asset.internal_links.some((link) => link.split("/").filter(Boolean).length < asset.url.split("/").filter(Boolean).length)) {
    reasons.push("missing_parent_link");
  }
  if (!asset.internal_links.some((link) => link === "/" || /contact|demo|pricing|occupancy/.test(link))) {
    reasons.push("missing_conversion_path");
  }
  return {
    gate: ORGANIC_INTERNAL_LINK_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

export function evaluateOrganicSiteArchitectureGate(assets: OrganicAsset[]): OrganicNamedGate {
  const reasons: string[] = [];
  const urls = assets.map((row) => row.url);
  const orphans = assets.filter((row) => row.status === "PUBLISHED" && row.internal_links.length === 0);
  if (orphans.length) reasons.push("orphan_pages");
  if (assets.some((row) => row.url.split("/").filter(Boolean).length > 5)) reasons.push("excessive_url_depth");
  const dupes = urls.filter((url, index) => urls.indexOf(url) !== index);
  if (dupes.length) reasons.push("duplicate_paths");
  const tagCounts = new Map<string, number>();
  for (const asset of assets) {
    for (const tag of asset.taxonomy.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  if ([...tagCounts.values()].some((count) => count === 1) && tagCounts.size > 20) reasons.push("tag_spam");
  return {
    gate: "OrganicSiteArchitectureGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}
