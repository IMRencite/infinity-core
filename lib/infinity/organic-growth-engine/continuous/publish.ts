import { ORGANIC_PUBLISHING_AUTHORIZATION_GATE } from "./contract";
import type { OrganicAsset, OrganicNamedGate, OrganicPublisherAdapter } from "./types";
import { intentsOverlap } from "./voc";

export function authorizeOrganicPublish(input: {
  venture_active: boolean;
  website_approved: boolean;
  publishing_enabled: boolean;
  quality: OrganicNamedGate;
  duplicate: OrganicNamedGate | { result: "PASS" | "FAIL" };
  url: OrganicNamedGate;
  evidence: OrganicNamedGate;
  links: OrganicNamedGate;
  schema: OrganicNamedGate;
  velocity_available: boolean;
  completeness?: OrganicNamedGate[];
  schema_stack?: OrganicNamedGate[];
  blog_gates?: OrganicNamedGate[];
  escape_gates?: OrganicNamedGate[];
}): OrganicNamedGate {
  const reasons: string[] = [];
  if (!input.venture_active) reasons.push("venture_inactive");
  if (!input.website_approved) reasons.push("website_not_approved");
  if (!input.publishing_enabled) reasons.push("publishing_disabled");
  if (input.quality.result !== "PASS") reasons.push("quality_gate");
  if (input.duplicate.result !== "PASS") reasons.push("duplicate_intent");
  if (input.url.result !== "PASS") reasons.push("url_hierarchy");
  if (input.evidence.result !== "PASS") reasons.push("evidence");
  if (input.links.result !== "PASS") reasons.push("internal_links");
  if (input.schema.result !== "PASS") reasons.push("schema");
  if (!input.velocity_available) reasons.push("velocity_capacity");
  for (const gate of input.completeness ?? []) {
    if (gate.result !== "PASS") reasons.push(gate.gate);
  }
  for (const gate of input.schema_stack ?? []) {
    if (gate.result !== "PASS") reasons.push(gate.gate);
  }
  for (const gate of input.blog_gates ?? []) {
    if (gate.result !== "PASS") reasons.push(gate.gate);
  }
  for (const gate of input.escape_gates ?? []) {
    if (gate.result !== "PASS") reasons.push(gate.gate);
  }
  return {
    gate: ORGANIC_PUBLISHING_AUTHORIZATION_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

export function createMemoryPublisher(): OrganicPublisherAdapter & { drafts: Map<string, OrganicAsset>; published: Map<string, OrganicAsset> } {
  const drafts = new Map<string, OrganicAsset>();
  const published = new Map<string, OrganicAsset>();
  return {
    id: "nextjs_repository",
    drafts,
    published,
    async createDraft(asset) {
      drafts.set(asset.asset_id, { ...asset, status: "DRAFT" });
      return { ok: true, draft_id: asset.asset_id };
    },
    async updateDraft(draft_id, asset) {
      drafts.set(draft_id, asset);
      return { ok: true };
    },
    async publish(draft_id) {
      const draft = drafts.get(draft_id);
      if (!draft) return { ok: false, url: "" };
      const live = { ...draft, status: "PUBLISHED" as const, published_at: new Date().toISOString() };
      published.set(live.url, live);
      drafts.delete(draft_id);
      return { ok: true, url: live.url };
    },
    async updatePublishedContent(url, asset) {
      published.set(url, { ...asset, status: "REFRESHED" });
      return { ok: true };
    },
    async addInternalLinks(url, links) {
      const current = published.get(url);
      if (current) published.set(url, { ...current, internal_links: [...new Set([...current.internal_links, ...links])] });
      return { ok: Boolean(current) };
    },
    async setTaxonomy(url, taxonomy) {
      const current = published.get(url);
      if (current) published.set(url, { ...current, taxonomy });
      return { ok: Boolean(current) };
    },
    async setMetadata(url, title) {
      const current = published.get(url);
      if (current) published.set(url, { ...current, title });
      return { ok: Boolean(current) };
    },
    async setSchema() {
      return { ok: true };
    },
    async getPublicationState(url) {
      if (published.has(url)) return "PUBLISHED";
      if ([...drafts.values()].some((row) => row.url === url)) return "DRAFT";
      return "UNKNOWN";
    },
  };
}

export function registerOrganicAsset(asset: OrganicAsset, registry: OrganicAsset[]): OrganicAsset[] {
  const next = registry.filter((row) => row.asset_id !== asset.asset_id && row.url !== asset.url);
  next.push(asset);
  return next;
}

export function registerSalesContentAsset(asset: OrganicAsset): {
  venture: string;
  url: string;
  title: string;
  topic: string;
  question_answered: string;
  intent: string;
  objections_addressed: string[];
  sales_stage_relevance: string;
  persona_relevance: string;
  commercial_relevance: number;
  freshness: string;
  quality_status: string;
} {
  return {
    venture: asset.venture_id,
    url: asset.url,
    title: asset.title,
    topic: asset.topic,
    question_answered: asset.question_answered,
    intent: asset.intent,
    objections_addressed: asset.objections_addressed,
    sales_stage_relevance: asset.sales_relevance >= 0.7 ? "EVALUATION" : "AWARENESS",
    persona_relevance: "buyer",
    commercial_relevance: asset.sales_relevance,
    freshness: asset.updated_at,
    quality_status: asset.quality_score >= 80 ? "APPROVED" : "WEAK",
  };
}

export function lookupSalesContent(input: {
  question: string;
  assets: OrganicAsset[];
}): { asset: OrganicAsset | null; demand: boolean } {
  const hit = input.assets.find((asset) => {
    if (asset.status !== "PUBLISHED" && asset.status !== "REFRESHED") return false;
    if (asset.quality_score < 80) return false;
    return intentsOverlap(input.question, `${asset.intent} ${asset.question_answered} ${asset.topic} ${asset.title}`);
  });
  return { asset: hit ?? null, demand: !hit };
}

export function outboundMayUseAsset(input: {
  purpose: "question_response" | "objection_resolution" | "follow_up_education" | "comparison" | "industry_explanation" | "decision_support" | "generic";
  asset: OrganicAsset | null;
}): boolean {
  if (!input.asset || input.asset.status !== "PUBLISHED") return false;
  if (input.purpose === "generic") return false;
  return input.asset.quality_score >= 80;
}
