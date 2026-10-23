import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import type { BlogBacklogArticle } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { occupancyTiAmortizationV5Body } from "@/lib/infinity/organic-growth-engine/continuous/occupancy-v5-body-ti-amortization";
import type { OrganicDraft } from "@/lib/infinity/organic-growth-engine/continuous/quality";
import {
  getOnpvDurableOpportunity,
  listOnpvCommittedDurableOpportunities,
  setOnpvDurableOpportunityLifecycle,
  type OnpvDurableOpportunityRecord,
} from "./occupancynpv-durable-opportunity-catalog-v1";
import {
  registerOnpvMaterializedBacklogArticle,
  mergeOnpvMaterializedBacklogArticles,
} from "./occupancynpv-materialized-backlog-overlay-v1";

export const ONPV_OPPORTUNITY_MATERIALIZER_V1 = "ONPV_OPPORTUNITY_MATERIALIZER_V1" as const;

export type MaterializeOccupancyNpvContentCandidateResult =
  | { outcome: "MATERIALIZED"; article: BlogBacklogArticle; opportunity_id: string }
  | { outcome: "ALREADY_MATERIALIZED"; article: BlogBacklogArticle | null; opportunity_id: string }
  | { outcome: "FAIL"; opportunity_id: string; reasons: string[] };

function normTopic(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function evaluateOnpvOpportunityDistinctnessQc(input: {
  opportunity: OnpvDurableOpportunityRecord;
  articles?: BlogBacklogArticle[];
}): { ONPV_OPPORTUNITY_DISTINCTNESS_QC: "PASS" | "FAIL"; reasons: string[] } {
  const articles = mergeOnpvMaterializedBacklogArticles(input.articles ?? listOccupancyClubThrottleBacklogArticles());
  const reasons: string[] = [];
  const pathNorm = input.opportunity.path.replace(/\/+$/, "").toLowerCase();
  const topicNorm = normTopic(input.opportunity.topic);
  for (const a of articles) {
    if (a.venture !== "occupancynpv") continue;
    if (a.path.replace(/\/+$/, "").toLowerCase() === pathNorm) {
      reasons.push("DUPLICATE_PATH");
    }
    if (a.slug === input.opportunity.slug) reasons.push("DUPLICATE_SLUG");
    if (a.title && normTopic(a.title) === topicNorm) reasons.push("DUPLICATE_TOPIC");
  }
  return {
    ONPV_OPPORTUNITY_DISTINCTNESS_QC: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

function draftForOpportunity(opportunity: OnpvDurableOpportunityRecord): OrganicDraft {
  const bodyPack = occupancyTiAmortizationV5Body();
  return {
    title: opportunity.topic,
    meta_description:
      "TI allowance amortization adds a labeled occupancy-cost line across lease years. Model amortization with abatement, recoveries, and allowance timing before you trust net effective rent.",
    h1: opportunity.topic,
    headings: bodyPack.headings,
    body: bodyPack.body,
    direct_answer: bodyPack.answer,
    citations: [
      {
        source: "https://www.naiop.org/",
        source_type: "authority",
        retrieved_at: "2026-10-22",
        claim: "Lease concessions and TI treatment vary by market and lease structure.",
      },
      {
        source: "https://www.boma.org/",
        source_type: "authority",
        retrieved_at: "2026-10-22",
        claim: "Occupancy-cost components include rent, recoveries, and timing items such as amortization and abatement.",
      },
    ],
    schema: ["Organization", "WebSite", "WebPage", "BlogPosting", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    canonical: opportunity.path,
    breadcrumbs: ["Blog", "Leasing", opportunity.topic],
    internal_links: [
      "/blog/leasing/gross-lease-vs-net-lease-for-tenants/",
      "/blog/leasing/how-free-rent-affects-occupancy-cost-for-tenants/",
      "/blog/leasing/how-do-you-compare-two-commercial-lease-options/",
      "/compare-commercial-leases",
    ],
    word_count: bodyPack.body.split(/\s+/).length,
    visible_faqs: bodyPack.faqs,
    speakable_selectors: ["h1", "[data-direct-answer]"],
    date_published: "2026-10-22",
    date_modified: "2026-10-22",
    page_kind: "BLOG_ARTICLE",
    origin: "https://occupancynpv.com",
  };
}

export function materializeOccupancyNpvContentCandidate(input: {
  opportunity_id: string;
  now?: string;
}): MaterializeOccupancyNpvContentCandidateResult {
  const opportunity = getOnpvDurableOpportunity(input.opportunity_id);
  if (!opportunity || opportunity.venture_id !== CRE_VENTURE_ID) {
    return { outcome: "FAIL", opportunity_id: input.opportunity_id, reasons: ["OPPORTUNITY_NOT_FOUND"] };
  }
  if (opportunity.lifecycle === "MATERIALIZED" || opportunity.lifecycle === "BUILD_PENDING" || opportunity.lifecycle === "BUILT") {
    const existing = mergeOnpvMaterializedBacklogArticles(listOccupancyClubThrottleBacklogArticles()).find(
      (a) => a.slug === opportunity.slug,
    );
    return { outcome: "ALREADY_MATERIALIZED", article: existing ?? null, opportunity_id: opportunity.opportunity_id };
  }
  const distinct = evaluateOnpvOpportunityDistinctnessQc({ opportunity });
  if (distinct.ONPV_OPPORTUNITY_DISTINCTNESS_QC !== "PASS") {
    return { outcome: "FAIL", opportunity_id: opportunity.opportunity_id, reasons: distinct.reasons };
  }
  const draft = draftForOpportunity(opportunity);
  const now = input.now ?? new Date().toISOString();
  const article: BlogBacklogArticle = {
    venture: "occupancynpv",
    title: opportunity.topic,
    slug: opportunity.slug,
    path: opportunity.path,
    canonical_url: opportunity.canonical_url,
    source_files: ["occupancy-v5-body-ti-amortization.ts", "occupancynpv-opportunity-materialization-v1.ts"],
    registry_state: "COMPOSE_ONLY",
    asset_id: `onpv-materialized-${opportunity.opportunity_id}`,
    draft,
    backlog_scope: "AUTHORIZED_BACKLOG",
  };
  registerOnpvMaterializedBacklogArticle(article, draft);
  setOnpvDurableOpportunityLifecycle(opportunity.opportunity_id, "MATERIALIZED", now);
  return { outcome: "MATERIALIZED", article, opportunity_id: opportunity.opportunity_id };
}

export function onpvOpportunityToCandidateQc(input: {
  opportunity_id: string;
}): "PASS" | "FAIL" {
  const result = materializeOccupancyNpvContentCandidate({ opportunity_id: input.opportunity_id });
  return result.outcome === "MATERIALIZED" || result.outcome === "ALREADY_MATERIALIZED" ? "PASS" : "FAIL";
}

export function onpvCandidateMaterializationIdempotencyQc(opportunity_id: string): "PASS" | "FAIL" {
  const first = materializeOccupancyNpvContentCandidate({ opportunity_id });
  const second = materializeOccupancyNpvContentCandidate({ opportunity_id });
  if (first.outcome === "FAIL") return "FAIL";
  return second.outcome === "ALREADY_MATERIALIZED" ? "PASS" : "FAIL";
}

export function selectNextOnpvMaterializableOpportunity(
  articles: BlogBacklogArticle[] = listOccupancyClubThrottleBacklogArticles(),
): OnpvDurableOpportunityRecord | null {
  const merged = mergeOnpvMaterializedBacklogArticles(articles);
  for (const opp of listOnpvCommittedDurableOpportunities()) {
    if (opp.lifecycle !== "DISCOVERED") continue;
    const distinct = evaluateOnpvOpportunityDistinctnessQc({ opportunity: opp, articles: merged });
    if (distinct.ONPV_OPPORTUNITY_DISTINCTNESS_QC === "PASS") return opp;
  }
  return null;
}

export function onpvOpportunityMaterializerQc(): "PASS" | "FAIL" {
  return typeof ONPV_OPPORTUNITY_MATERIALIZER_V1 === "string" ? "PASS" : "FAIL";
}
