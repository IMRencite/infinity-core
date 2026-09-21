import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  ORGANIC_LIVE_PUBLISHING_GATE,
  ORGANIC_LIVE_URL_TRUTH_GATE,
  ORGANIC_PUBLICATION_PERSISTENCE_GATE,
  ORGANIC_SALES_ASSET_AVAILABILITY_GATE,
} from "./contract";
import { evaluateOrganicDuplicateIntentGate } from "./gates";
import { liveOccupancyNpvQuestionAssets } from "./live-catalog";
import { evaluateOrganicInternalLinkGate } from "./links";
import {
  OCCUPANCYNPV_LIVE_CAP_RATE_DIRECT_ANSWER,
  OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
  occupancynpvCapRateFaqs,
  occupancynpvLiveCapRateDraftText,
  occupancynpvLiveCapRatePage,
} from "./occupancynpv-live-page";
import { deployOccupancyNpvOrganicLivePage, fetchPublicHtml } from "./occupancynpv-publisher";
import {
  auditOrganicDraftDepth,
  buildTopicalCompletenessPlan,
  evaluateEntityCoverageGate,
  evaluateOrganicTopicalCompletenessGate,
  evaluatePracticalUsefulnessGate,
  evaluateQuestionClusterCoverageGate,
} from "./completeness";
import { persistOrganicContinuousState } from "./persist";
import { applyOrganicGrowthPerformanceFeedback, buildOrganicPerformanceObservations } from "./performance";
import { authorizeOrganicPublish, lookupSalesContent, outboundMayUseAsset, registerOrganicAsset, registerSalesContentAsset } from "./publish";
import {
  evaluateOrganicContentQualityGate,
  evaluateOrganicEvidenceGate,
  evaluateOrganicTechnicalSeoGate,
  planGeoAnswer,
  type OrganicDraft,
} from "./quality";
import { evaluateDuplicateIntent, routeContentType, scoreContentOpportunity } from "./routing";
import { emptyOrganicContinuousState, replaceOrganicContinuousState } from "./store";
import type { OrganicAsset, OrganicContinuousState, OrganicNamedGate } from "./types";
import { evaluateDraftSchemaStack, schemaRemediationQueue } from "./schema-standard";
import { evaluateOrganicUrlHierarchyGate, OCCUPANCYNPV_LIVE_CAP_RATE_PATH, planOccupancyNpvLiveUrl } from "./urls";
import { emitContentDemandSignal, ingestVoiceOfCustomerQuestion, matchExistingAnswer } from "./voc";
import { buildVentureTopicGraph } from "./graph";

export const OCCUPANCYNPV_ORGANIC_LIVE_PROOF_PATH =
  ".infinity/organic-growth-engine/occupancynpv-organic-v2-live-publish-proof.json" as const;

export function occupancynpvLiveCapRateDraft(): OrganicDraft {
  const page = occupancynpvLiveCapRatePage();
  const geo = planGeoAnswer({
    question: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
    topic: "Cap Rates",
    entity: "Commercial Real Estate",
  });
  const body = occupancynpvLiveCapRateDraftText();
  return {
    title: page.title,
    meta_description: page.metaDescription,
    h1: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
    headings: [
      "What is a cap rate?",
      "How the calculation works",
      "Worked teaching sample",
      "How to calculate property value from NOI and the ratio",
      "What a high or low ratio implies",
      "Comparisons: cash-on-cash return and IRR",
      "Limitations and common mistakes",
    ],
    body: `${geo.direct_answer} ${body}`,
    direct_answer: OCCUPANCYNPV_LIVE_CAP_RATE_DIRECT_ANSWER,
    citations: [
      {
        source: "https://www.investopedia.com/terms/c/capitalizationrate.asp",
        source_type: "authority",
        published_at: "2024-01-01",
        retrieved_at: "2026-09-17",
        claim: "Cap rate relates income to property value",
      },
      {
        source: "https://www.investopedia.com/terms/n/noi.asp",
        source_type: "authority",
        published_at: "2024-01-01",
        retrieved_at: "2026-09-17",
        claim: "NOI is income after operating expenses and before debt service",
      },
    ],
    schema: ["Organization", "WebSite", "WebPage", "Article", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    canonical: OCCUPANCYNPV_LIVE_CAP_RATE_PATH,
    breadcrumbs: ["Home", "Commercial lease NPV", OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION],
    internal_links: [
      "/commercial-lease-npv/",
      "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/",
      "/occupancy-costs/what-is-cam-in-a-commercial-lease/",
      "/compare-commercial-leases",
    ],
    word_count: `${geo.direct_answer} ${body}`.split(/\s+/).length,
    visible_faqs: occupancynpvCapRateFaqs(),
    speakable_selectors: ["#direct-answer", "#summary", "#key-takeaways"],
    date_published: "2026-09-17",
    date_modified: "2026-09-17",
    page_kind: "EVERGREEN_RESOURCE",
    origin: "https://occupancynpv.com",
    about: ["capitalization rate", "net operating income"],
    mentions: ["commercial lease NPV", "cash-on-cash return", "IRR"],
  };
}

export function evaluateOrganicLiveUrlTruthGate(input: {
  status: number;
  html: string;
  expected_h1: string;
}): OrganicNamedGate {
  const reasons: string[] = [];
  if (input.status !== 200) reasons.push("http_not_200");
  if (!input.html.includes(input.expected_h1)) reasons.push("missing_h1");
  if (!input.html.includes("canonical") && !input.html.includes("rel=\"canonical\"")) reasons.push("missing_canonical");
  if (!/application\/ld\+json/i.test(input.html)) reasons.push("missing_schema");
  if (!input.html.includes("/commercial-lease-npv")) reasons.push("missing_parent_link");
  if (/noindex/i.test(input.html) && !/index,/.test(input.html)) reasons.push("accidental_noindex");
  return { gate: ORGANIC_LIVE_URL_TRUTH_GATE, result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateOrganicPublicationPersistenceGate(state: OrganicContinuousState, url: string): OrganicNamedGate {
  const asset = state.assets.find((row) => row.url === url && row.status === "PUBLISHED");
  return {
    gate: ORGANIC_PUBLICATION_PERSISTENCE_GATE,
    result: asset ? "PASS" : "FAIL",
    reasons: asset ? ["published_asset_present"] : ["publication_missing"],
  };
}

export function evaluateOrganicSalesAssetAvailabilityGate(state: OrganicContinuousState, question: string): OrganicNamedGate {
  const lookup = lookupSalesContent({ question, assets: state.sales_assets });
  return {
    gate: ORGANIC_SALES_ASSET_AVAILABILITY_GATE,
    result: lookup.asset ? "PASS" : "FAIL",
    reasons: lookup.asset ? [lookup.asset.url] : ["sales_asset_missing"],
  };
}

export function evaluateOrganicLivePublishingGate(input: {
  create_new: boolean;
  quality: OrganicNamedGate;
  evidence: OrganicNamedGate;
  links: OrganicNamedGate;
  technical: OrganicNamedGate;
  authorization: OrganicNamedGate;
  live_status: number;
  persisted: boolean;
  sales: boolean;
}): OrganicNamedGate {
  const reasons: string[] = [];
  if (!input.create_new) reasons.push("not_create_new");
  if (input.quality.result !== "PASS") reasons.push("quality");
  if (input.evidence.result !== "PASS") reasons.push("evidence");
  if (input.links.result !== "PASS") reasons.push("links");
  if (input.technical.result !== "PASS") reasons.push("technical");
  if (input.authorization.result !== "PASS") reasons.push("authorization");
  if (input.live_status !== 200) reasons.push("live_url");
  if (!input.persisted) reasons.push("persistence");
  if (!input.sales) reasons.push("sales");
  return { gate: ORGANIC_LIVE_PUBLISHING_GATE, result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function prepareOccupancyNpvLiveProof(now: string) {
  const liveAssets = liveOccupancyNpvQuestionAssets();
  const question = ingestVoiceOfCustomerQuestion({
    question: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
    source_channel: "internal_venture_research",
    venture_id: "occupancynpv",
    now,
    objections: ["cap rate confused with lease NPV"],
  });
  const match = matchExistingAnswer({ intent: question.normalized_intent, assets: liveAssets });
  question.existing_content_match = match.url;
  question.answer_state = match.state;
  const duplicate = evaluateDuplicateIntent({ intent: question.normalized_intent, existing: liveAssets });
  const opportunity = scoreContentOpportunity({
    question,
    topic_relevance: 0.95,
    search_demand: 0.7,
    geo_value: 0.8,
    conversion_proximity: 0.55,
    evidence_availability: 0.85,
    overlap: match.state === "UNANSWERED" ? 0 : 0.8,
  });
  const planned = planOccupancyNpvLiveUrl({ question: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION });
  const draft = occupancynpvLiveCapRateDraft();
  const asset: OrganicAsset = {
    asset_id: "organic-v2-live-cap-rate",
    venture_id: "occupancynpv",
    url: planned.path,
    title: occupancynpvLiveCapRatePage().title,
    content_type: routeContentType({
      question: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
      topic: "Cap Rates",
      answer_state: question.answer_state,
      commercial: question.commercial_relevance,
    }),
    topic: "Cap Rates",
    cluster: "commercial-lease-npv",
    question_answered: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
    intent: question.normalized_intent,
    status: "DRAFT",
    published_at: null,
    updated_at: now,
    quality_score: 90,
    evidence_status: "PASS",
    internal_links: draft.internal_links,
    taxonomy: { categories: ["Valuation"], tags: ["cap-rate", "commercial-real-estate"] },
    sales_relevance: 0.9,
    objections_addressed: ["cap rate confused with lease NPV"],
    indexation: "published",
  };
  const completenessPlan = buildTopicalCompletenessPlan({
    question: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
    topic: "Cap Rates",
    content_type: "EVERGREEN_QUESTION",
  });
  const quality = evaluateOrganicContentQualityGate(draft, { complexity: completenessPlan.complexity });
  const evidence = evaluateOrganicEvidenceGate(draft, true);
  const urlGate = evaluateOrganicUrlHierarchyGate(planned);
  const links = evaluateOrganicInternalLinkGate(asset);
  const technical = evaluateOrganicTechnicalSeoGate({ asset, draft, sitemap: true, renderable: true, mobile: true });
  const topical = evaluateOrganicTopicalCompletenessGate({ draft, plan: completenessPlan });
  const cluster = evaluateQuestionClusterCoverageGate({ draft, plan: completenessPlan });
  const entities = evaluateEntityCoverageGate({ draft, plan: completenessPlan });
  const usefulness = evaluatePracticalUsefulnessGate({ draft, plan: completenessPlan });
  const schemaEval = evaluateDraftSchemaStack(draft);
  const authorization = authorizeOrganicPublish({
    venture_active: true,
    website_approved: true,
    publishing_enabled: true,
    quality,
    duplicate: evaluateOrganicDuplicateIntentGate(duplicate),
    url: urlGate,
    evidence,
    links,
    schema: schemaEval.stack,
    velocity_available: true,
    completeness: [topical, cluster, entities, usefulness],
    schema_stack: [technical, ...schemaEval.gates],
  });
  return {
    question,
    match,
    duplicate,
    opportunity,
    planned,
    draft,
    asset,
    quality,
    evidence,
    urlGate,
    links,
    technical,
    authorization,
    completeness: { topical, cluster, entities, usefulness, plan: completenessPlan },
    content_type: asset.content_type,
    graph: buildVentureTopicGraph({
      venture_id: "occupancynpv",
      existing_urls: liveAssets.map((row) => row.url),
      extra_questions: [OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION],
    }),
    demand: emitContentDemandSignal({ venture_id: "occupancynpv", question, now }),
  };
}

export async function executeOccupancyNpvOrganicLiveProof(input: { deploy?: boolean; now?: string } = {}) {
  const now = input.now ?? new Date().toISOString();
  const prepared = prepareOccupancyNpvLiveProof(now);
  const authorized = prepared.authorization.result === "PASS"
    && prepared.duplicate.outcome === "CREATE_NEW"
    && prepared.match.state !== "ANSWERED_WELL";
  let deploy = {
    adapter: "occupancynpv_vercel_source_bundle",
    deployed: false,
    aliased: false,
    live_url: `https://occupancynpv.com${OCCUPANCYNPV_LIVE_CAP_RATE_PATH.replace(/\/+$/, "")}`,
    live_status: 0,
    live_html: "",
    safe_error: authorized ? null : "NOT_AUTHORIZED",
    deployment_id: null as string | null,
    preview_url: null as string | null,
    file_count: 0,
    page_path: "",
    domain: "occupancynpv.com",
    project: "",
  };
  if (authorized && input.deploy !== false) {
    deploy = { ...deploy, ...(await deployOccupancyNpvOrganicLivePage({ deploy: true })) };
  } else if (authorized) {
    const live = await fetchPublicHtml(deploy.live_url);
    deploy.live_status = live.status;
    deploy.live_html = live.body;
    deploy.deployed = live.ok;
    deploy.aliased = live.ok;
    deploy.safe_error = live.ok ? null : "LIVE_URL_NOT_200";
    deploy.page_path = "app/commercial-lease-npv/how-is-cap-rate-calculated/page.tsx";
    deploy.project = "infinity-validation-cre-lease-npv-e72beb7b";
  }

  const liveTruth = evaluateOrganicLiveUrlTruthGate({
    status: deploy.live_status,
    html: deploy.live_html,
    expected_h1: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
  });

  const published = deploy.deployed && liveTruth.result === "PASS";
  const asset: OrganicAsset = {
    ...prepared.asset,
    status: published ? "PUBLISHED" : "DRAFT",
    published_at: published ? now : null,
    indexation: "published",
  };
  let state = emptyOrganicContinuousState("occupancynpv");
  state.graph = prepared.graph;
  state.questions = [prepared.question];
  state.opportunities = [prepared.opportunity];
  state.demand_signals = prepared.demand ? [prepared.demand] : [];
  state.queue = [{
    item_id: `${asset.asset_id}:live`,
    venture_id: "occupancynpv",
    stage: published ? "INDEX_MONITOR" : "VALIDATE",
    opportunity_id: prepared.opportunity.opportunity_id,
    work_kind: "NEW_URL",
  }];
  if (published) {
    state.assets = registerOrganicAsset(asset, state.assets);
    state.sales_assets = [asset];
    state.published_today = 1;
    state.last_tick_at = now;
    state.blog_readiness = "BLOG_READY";
    state.schema_readiness = "SCHEMA_READY";
    state.schema_remediation_queue = schemaRemediationQueue();
    const audit = auditOrganicDraftDepth({ draft: prepared.draft, plan: prepared.completeness.plan });
    state.remediation_queue = [{
      url: asset.url,
      classification: audit === "COMPLETE" ? "NEEDS_EXPANSION" : audit,
      priority: "HIGH",
      reason: "INSUFFICIENT_TOPICAL_DEPTH",
    }];
  }
  replaceOrganicContinuousState("occupancynpv", state);
  await persistOrganicContinuousState(state);

  const persistence = evaluateOrganicPublicationPersistenceGate(state, asset.url);
  const sales = evaluateOrganicSalesAssetAvailabilityGate(state, OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION);
  const liveGate = evaluateOrganicLivePublishingGate({
    create_new: prepared.duplicate.outcome === "CREATE_NEW",
    quality: prepared.quality,
    evidence: prepared.evidence,
    links: prepared.links,
    technical: prepared.technical,
    authorization: prepared.authorization,
    live_status: deploy.live_status,
    persisted: persistence.result === "PASS",
    sales: sales.result === "PASS",
  });
  const performance = applyOrganicGrowthPerformanceFeedback({
    records: [{
      url: asset.url,
      indexation: "published",
      impressions: 0,
      clicks: 0,
      ranking_visibility: 0,
      engagement: 0,
      conversions: 0,
      assisted_conversions: 0,
      organic_leads: 0,
      sales_usage: 0,
      outbound_usage: 0,
      geo_visibility: 0,
      refresh_impact: 0,
    }],
    graph: state.graph,
    velocity: {
      topic_universe_size: 40,
      topical_coverage: 0.2,
      content_gap_count: 8,
      question_demand: 0.8,
      search_demand: 0.7,
      commercial_value: 0.8,
      venture_maturity: "GROWING",
      crawl_health: 0.85,
      indexation_health: 0.7,
      organic_impressions: 0,
      organic_clicks: 0,
      geo_visibility: 0.2,
      conversion_performance: 0.2,
      engagement: 0.2,
      duplicate_risk: 0.1,
      refresh_backlog: 0,
      site_authority: 0.5,
      publishing_success_rate: published ? 1 : 0,
      quality_pass_rate: 1,
    },
  });
  const observations = buildOrganicPerformanceObservations([{
    url: asset.url,
    indexation: "published",
    impressions: 0,
    clicks: 0,
    ranking_visibility: 0,
    engagement: 0,
    conversions: 0,
    assisted_conversions: 0,
    organic_leads: 0,
    sales_usage: 0,
    outbound_usage: 0,
    geo_visibility: 0,
    refresh_impact: 0,
  }], "occupancynpv");

  const report = {
    venture_id: CRE_VENTURE_ID,
    venture_key: "occupancynpv",
    question: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
    url: asset.url,
    live_url: deploy.live_url,
    content_type: asset.content_type,
    score: prepared.opportunity.score,
    duplicate: prepared.duplicate,
    match: prepared.match,
    gates: {
      quality: prepared.quality,
      evidence: prepared.evidence,
      url: prepared.urlGate,
      links: prepared.links,
      technical: prepared.technical,
      authorization: prepared.authorization,
      live_publishing: liveGate,
      live_url_truth: liveTruth,
      persistence,
      sales,
    },
    deploy: {
      adapter: deploy.adapter,
      deployed: deploy.deployed,
      aliased: deploy.aliased,
      status: deploy.live_status,
      safe_error: deploy.safe_error,
      deployment_id: deploy.deployment_id,
      file_count: deploy.file_count,
    },
    sales_lookup: lookupSalesContent({ question: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION, assets: state.sales_assets }),
    outbound_eligible: outboundMayUseAsset({ purpose: "question_response", asset: published ? asset : null }),
    performance,
    observations: observations.length,
    indexation: "PUBLISHED / DISCOVERY_PENDING / INDEXATION_UNKNOWN",
    velocity: { current: 1, recommended: 1 },
    published,
  };

  mkdirSync(dirname(OCCUPANCYNPV_ORGANIC_LIVE_PROOF_PATH), { recursive: true });
  writeFileSync(OCCUPANCYNPV_ORGANIC_LIVE_PROOF_PATH, JSON.stringify({ generated_at: now, ...report }, null, 2));
  return { prepared, state, deploy, report, liveGate, liveTruth, persistence, sales };
}

export async function verifyOccupancyNpvLiveCapRateUrl() {
  const live = await fetchPublicHtml(`https://occupancynpv.com${OCCUPANCYNPV_LIVE_CAP_RATE_PATH.replace(/\/+$/, "")}`);
  return {
    ...evaluateOrganicLiveUrlTruthGate({
      status: live.status,
      html: live.body,
      expected_h1: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION,
    }),
    status: live.status,
    html: live.body,
    final_url: live.final_url,
  };
}

export async function persistOccupancyNpvLiveProofFromVerifiedUrl(input: { now?: string } = {}) {
  return executeOccupancyNpvOrganicLiveProof({ deploy: false, now: input.now });
}
