import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ORGANIC_CADENCE_DEFAULT, PUBLIC_ORGANIC_ACTIVITY } from "../contract";
import { ORGANIC_CONTINUOUS_GATES } from "../gates";
import { decideOrganicPublishingCadence, decideVentureContentVelocity, defaultVelocityInputs, evaluateOrganicContentVelocityGate } from "../cadence";
import { executeOrganicContinuousTick, generateOrganicDraft, inspectIndexation, salesQuestionToContentBridge } from "../cycle";
import { evaluateOrganicDuplicateIntentGate, evaluateOrganicSalesContentBridgeGate, evaluateOrganicVoiceOfCustomerGate } from "../gates";
import { buildQuestionUniverse, buildTopicUniverse, buildVentureTopicGraph } from "../graph";
import { projectOrganicGrowthHq } from "../hq";
import { buildContinuousInternalLinkGraph, evaluateOrganicSiteArchitectureGate, manageBlogTaxonomy } from "../links";
import { applyOrganicGrowthPerformanceFeedback } from "../performance";
import { evaluatePublicOrganicPrivacy, projectPublicOrganicActivity, sanitizePublicOrganicText } from "../public";
import { authorizeOrganicPublish, createMemoryPublisher, lookupSalesContent, outboundMayUseAsset, registerSalesContentAsset } from "../publish";
import {
  adjacentQuestionDemand,
  auditOrganicDraftDepth,
  buildTopicalCompletenessPlan,
  classifyTopicComplexity,
  evaluateEntityCoverageGate,
  evaluateOrganicTopicalCompletenessGate,
  evaluatePracticalUsefulnessGate,
  evaluateQuestionClusterCoverageGate,
} from "../completeness";
import { evaluateOrganicContentQualityGate, evaluateOrganicEvidenceGate, planGeoAnswer } from "../quality";
import { evaluateDuplicateIntent, routeContentType, scoreContentOpportunity } from "../routing";
import { emptyOrganicContinuousState } from "../store";
import type { OrganicAsset, VoiceOfCustomerQuestion } from "../types";
import { evaluateOrganicUrlHierarchyGate, planOrganicUrl } from "../urls";
import { emitContentDemandSignal, ingestVoiceOfCustomerQuestion, matchExistingAnswer, normalizeQuestionIntent } from "../voc";

const NOW = "2026-09-16T18:00:00.000Z";

function voc(question: string, extras: Partial<VoiceOfCustomerQuestion> = {}): VoiceOfCustomerQuestion {
  return ingestVoiceOfCustomerQuestion({
    question,
    source_channel: extras.source_channel ?? "sales",
    venture_id: "occupancynpv",
    now: NOW,
    objections: extras.related_objections,
    existing: extras.frequency ? [{ ...emptyQuestion(question), ...extras }] : [],
  });
}

function emptyQuestion(question: string): VoiceOfCustomerQuestion {
  return {
    question,
    normalized_intent: normalizeQuestionIntent(question),
    source_channel: "sales",
    venture_id: "occupancynpv",
    topic: "Cap Rates",
    frequency: 1,
    first_seen: NOW,
    last_seen: NOW,
    related_objections: [],
    related_prospect_count: 1,
    existing_content_match: null,
    answer_state: "UNANSWERED",
    content_gap_score: 0.7,
    commercial_relevance: 0.85,
    sales_relevance: 0.8,
  };
}

function publishedAsset(overrides: Partial<OrganicAsset> = {}): OrganicAsset {
  return {
    asset_id: overrides.asset_id ?? "asset:cap-rate",
    venture_id: "occupancynpv",
    url: overrides.url ?? "/commercial-real-estate/valuation/how-is-cap-rate-calculated/",
    title: overrides.title ?? "How is cap rate calculated?",
    content_type: overrides.content_type ?? "EVERGREEN_QUESTION",
    topic: overrides.topic ?? "Cap Rates",
    cluster: overrides.cluster ?? "Cap Rates",
    question_answered: overrides.question_answered ?? "How is cap rate calculated?",
    intent: overrides.intent ?? "cap rate calculated",
    status: overrides.status ?? "PUBLISHED",
    published_at: overrides.published_at ?? NOW,
    updated_at: overrides.updated_at ?? NOW,
    quality_score: overrides.quality_score ?? 90,
    evidence_status: "PASS",
    internal_links: overrides.internal_links ?? ["/commercial-real-estate/valuation/", "/"],
    taxonomy: { categories: ["Valuation"], tags: ["cap-rate"] },
    sales_relevance: 0.9,
    objections_addressed: ["unclear valuation"],
    indexation: overrides.indexation ?? "indexed",
  };
}

describe("Organic Growth Continuous Publishing V2", () => {
  it("builds a persistent OccupancyNPV topic universe and question universe", () => {
    const graph = buildVentureTopicGraph({
      venture_id: "occupancynpv",
      extra_questions: ["How is cap rate calculated?"],
    });
    const universe = buildTopicUniverse(graph);
    const questions = buildQuestionUniverse(graph, ["How does cap rate work?"]);
    expect(universe.pillars).toContain("Valuation");
    expect(universe.clusters).toContain("Cap Rates");
    expect(universe.clusters).toContain("Triple Net");
    expect(questions.normalized).toContain(normalizeQuestionIntent("How is cap rate calculated?"));
    expect(graph.nodes.some((row) => row.kind === "pillar")).toBe(true);
  });

  it("ingests Voice-of-Customer questions with provenance, frequency, and routing", () => {
    const first = ingestVoiceOfCustomerQuestion({
      question: "How does cap rate work?",
      source_channel: "sales_conversation",
      venture_id: "occupancynpv",
      now: NOW,
      objections: ["valuation is opaque"],
    });
    const second = ingestVoiceOfCustomerQuestion({
      question: "Can you explain how cap rate works?",
      source_channel: "prospect_reply",
      venture_id: "occupancynpv",
      now: NOW,
      existing: [first],
    });
    expect(second.normalized_intent).toBe(first.normalized_intent);
    expect(second.frequency).toBe(2);
    expect(second.source_channel).toBe("prospect_reply");
    expect(evaluateOrganicVoiceOfCustomerGate({
      question: second.question,
      normalized_intent: second.normalized_intent,
      source_channel: second.source_channel,
      provenance: Boolean(second.first_seen && second.last_seen),
    }).result).toBe("PASS");
    const match = matchExistingAnswer({ intent: second.normalized_intent, assets: [] });
    expect(match.state).toBe("UNANSWERED");
    const signal = emitContentDemandSignal({
      venture_id: "occupancynpv",
      question: { ...second, answer_state: "UNANSWERED", source_channel: "sales" },
      now: NOW,
    });
    expect(signal?.reason).toBe("SALES_GAP");
  });

  it("GOLDEN PATH 1 — new evergreen question publishes into registries", () => {
    const state = emptyOrganicContinuousState("occupancynpv");
    const result = executeOrganicContinuousTick({
      state,
      now: NOW,
      questions: [{ question: "How is cap rate calculated?", source_channel: "sales", objections: ["unclear valuation"] }],
    });
    const asset = result.published[0];
    expect(asset).toBeTruthy();
    expect(asset.content_type).toBe("EVERGREEN_QUESTION");
    expect(asset.url).toBe("/commercial-real-estate/valuation/how-is-cap-rate-calculated/");
    expect(result.state.assets.some((row) => row.url === asset.url && row.status === "PUBLISHED")).toBe(true);
    expect(result.state.sales_assets.some((row) => row.url === asset.url)).toBe(true);
    expect(asset.evidence_status).toBe("PASS");
    expect(asset.internal_links.length).toBeGreaterThanOrEqual(2);
  });

  it("GOLDEN PATH 2 — duplicate intent expands existing and creates no new URL", () => {
    const existing = publishedAsset();
    const duplicate = evaluateDuplicateIntent({
      intent: "how does cap rate work",
      existing: [existing],
    });
    expect(duplicate.outcome).toBe("EXPAND_EXISTING");
    expect(duplicate.existing_url).toBe(existing.url);
    expect(evaluateOrganicDuplicateIntentGate(duplicate).result).toBe("PASS");
    const state = emptyOrganicContinuousState("occupancynpv");
    state.assets = [existing];
    const result = executeOrganicContinuousTick({
      state,
      now: NOW,
      questions: [{ question: "How does cap rate work?", source_channel: "sales" }],
    });
    const newUrls = result.published.filter((row) => row.url !== existing.url);
    expect(newUrls).toHaveLength(0);
  });

  it("GOLDEN PATH 3 — daily target without quality publishes zero new URLs and substitutes refresh", () => {
    const cadence = decideOrganicPublishingCadence({
      strong_opportunities: [],
      velocity: { min: 2, max: 4 },
    });
    expect(cadence.allowed_new_urls).toBe(0);
    expect(cadence.refresh_slots).toBeGreaterThan(0);
    const state = emptyOrganicContinuousState("occupancynpv");
    state.assets = [publishedAsset({ url: "/commercial-real-estate/valuation/noi/", topic: "NOI", cluster: "NOI", question_answered: "What is NOI?" })];
    const result = executeOrganicContinuousTick({
      state,
      now: NOW,
      questions: [],
    });
    expect(result.published).toHaveLength(0);
    expect(result.refreshed.length + result.state.queue.filter((row) => row.work_kind === "REFRESH" || row.stage === "REFRESH").length).toBeGreaterThan(0);
  });

  it("GOLDEN PATH 4 — Voice of Customer demand reaches the content queue", () => {
    const first = ingestVoiceOfCustomerQuestion({
      question: "How is cap rate calculated?",
      source_channel: "sales",
      venture_id: "occupancynpv",
      now: NOW,
    });
    const recurring = ingestVoiceOfCustomerQuestion({
      question: "How is cap rate calculated?",
      source_channel: "sales",
      venture_id: "occupancynpv",
      now: NOW,
      existing: [first],
    });
    expect(recurring.frequency).toBe(2);
    expect(recurring.answer_state).toBe("UNANSWERED");
    const signal = emitContentDemandSignal({ venture_id: "occupancynpv", question: recurring, now: NOW });
    expect(signal?.reason).toBe("SALES_GAP");
    const state = emptyOrganicContinuousState("occupancynpv");
    state.questions = [recurring];
    state.demand_signals = signal ? [signal] : [];
    const result = executeOrganicContinuousTick({
      state,
      now: NOW,
      questions: [{ question: "How is cap rate calculated?", source_channel: "sales" }],
    });
    expect(result.state.questions[0]?.frequency).toBeGreaterThanOrEqual(2);
    expect(result.demand_signals.some((row) => row.normalized_intent.includes("cap rate"))).toBe(true);
    expect(result.state.queue.length).toBeGreaterThan(0);
    expect(result.published[0]?.url).toBe("/commercial-real-estate/valuation/how-is-cap-rate-calculated/");
  });

  it("GOLDEN PATH 5 — Sales content lookup finds the approved resource", () => {
    const state = emptyOrganicContinuousState("occupancynpv");
    state.assets = [publishedAsset()];
    state.sales_assets = [publishedAsset()];
    const bridge = salesQuestionToContentBridge({
      state,
      question: "How does cap rate work?",
      now: NOW,
    });
    expect(bridge.found).toBe(true);
    expect(bridge.asset?.url).toBe("/commercial-real-estate/valuation/how-is-cap-rate-calculated/");
    expect(bridge.outbound_eligible).toBe(true);
    expect(evaluateOrganicSalesContentBridgeGate({ found: true, demand: false }).result).toBe("PASS");
  });

  it("GOLDEN PATH 6 — Sales gap emits a ContentDemandSignal", () => {
    const state = emptyOrganicContinuousState("occupancynpv");
    const bridge = salesQuestionToContentBridge({
      state,
      question: "How does a 1031 exchange affect occupancy underwriting?",
      now: NOW,
    });
    expect(bridge.found).toBe(false);
    expect(bridge.demand_signal?.reason).toBe("SALES_GAP");
    expect(evaluateOrganicSalesContentBridgeGate({ found: false, demand: true }).result).toBe("PASS");
  });

  it("GOLDEN PATH 7 — large quality backlog can raise velocity", () => {
    const velocity = decideVentureContentVelocity(defaultVelocityInputs({
      content_gap_count: 12,
      indexation_health: 0.9,
      quality_pass_rate: 0.95,
      duplicate_risk: 0.1,
    }));
    expect(velocity.max).toBeGreaterThanOrEqual(4);
    expect(evaluateOrganicContentVelocityGate(defaultVelocityInputs({
      content_gap_count: 12,
      indexation_health: 0.9,
      quality_pass_rate: 0.95,
    }), 4).result).toBe("PASS");
  });

  it("GOLDEN PATH 8 — indexation or duplicate risk reduces cadence", () => {
    const velocity = decideVentureContentVelocity(defaultVelocityInputs({
      duplicate_risk: 0.7,
      indexation_health: 0.4,
      quality_pass_rate: 0.5,
    }));
    expect(velocity.max).toBe(1);
    const cadence = decideOrganicPublishingCadence({
      strong_opportunities: [
        scoreContentOpportunity({ question: voc("How is cap rate calculated?") }),
        scoreContentOpportunity({ question: voc("What is NOI?") }),
        scoreContentOpportunity({ question: voc("What is a triple net lease?") }),
      ],
      velocity,
    });
    expect(cadence.allowed_new_urls).toBeLessThanOrEqual(1);
  });

  it("GOLDEN PATH 9 — cap rate question uses the valuation URL hierarchy", () => {
    const planned = planOrganicUrl({
      pillar: "Valuation",
      cluster: "Cap Rate",
      question: "How is cap rate calculated?",
      content_type: "EVERGREEN_QUESTION",
    });
    expect(planned.path).toBe("/commercial-real-estate/valuation/how-is-cap-rate-calculated/");
    expect(evaluateOrganicUrlHierarchyGate(planned).result).toBe("PASS");
  });

  it("GOLDEN PATH 10 — publishing updates parent, related, and conversion links", () => {
    const state = emptyOrganicContinuousState("occupancynpv");
    state.assets = [
      publishedAsset({
        asset_id: "noi",
        url: "/commercial-real-estate/valuation/noi/",
        title: "NOI",
        topic: "NOI",
        cluster: "NOI",
        question_answered: "What is NOI?",
        intent: "noi",
      }),
      publishedAsset({
        asset_id: "invest",
        url: "/commercial-real-estate/investment/returns/",
        title: "Investment guide",
        content_type: "GUIDE",
        topic: "Investment",
        cluster: "Returns",
        question_answered: "How do CRE returns work?",
        intent: "cre returns",
      }),
    ];
    const result = executeOrganicContinuousTick({
      state,
      now: NOW,
      questions: [{ question: "How is cap rate calculated?", source_channel: "sales" }],
    });
    const page = result.published[0];
    expect(page.internal_links).toContain("/commercial-real-estate/valuation/");
    expect(page.internal_links.some((link) => link.includes("noi"))).toBe(true);
    expect(page.internal_links.some((link) => /invest|returns/.test(link))).toBe(true);
    expect(page.internal_links).toContain("/");
    const hub = result.state.assets.find((row) => row.url === "/commercial-real-estate/valuation/");
    expect(hub?.internal_links).toContain(page.url);
  });

  it("GOLDEN PATH 11 — missing indexation flags and does not raise velocity", () => {
    const gate = inspectIndexation({
      asset: publishedAsset({ indexation: "not_indexed", published_at: "2026-09-10T18:00:00.000Z" }),
      now: NOW,
      threshold_hours: 72,
    });
    expect(gate.result).toBe("FAIL");
    const feedback = applyOrganicGrowthPerformanceFeedback({
      records: [{
        url: "/commercial-real-estate/valuation/how-is-cap-rate-calculated/",
        indexation: "not_indexed",
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
      graph: buildVentureTopicGraph({ venture_id: "occupancynpv" }),
      velocity: defaultVelocityInputs({ indexation_health: 0.4 }),
    });
    expect(feedback.velocity_adjustment).toBe("REDUCE");
    expect(feedback.investigations).not.toHaveLength(0);
  });

  it("GOLDEN PATH 12 — declining high-value page becomes a refresh", () => {
    const state = emptyOrganicContinuousState("occupancynpv");
    state.assets = [publishedAsset({ updated_at: "2025-01-01T00:00:00.000Z" })];
    const result = executeOrganicContinuousTick({
      state,
      now: NOW,
      questions: [],
      performance: [{
        url: state.assets[0].url,
        indexation: "indexed",
        impressions: -1,
        clicks: 0,
        ranking_visibility: 0.1,
        engagement: 0,
        conversions: 0,
        assisted_conversions: 0,
        organic_leads: 0,
        sales_usage: 0,
        outbound_usage: 0,
        geo_visibility: 0,
        refresh_impact: 0,
      }],
    });
    expect(result.refreshed.length).toBeGreaterThan(0);
    expect(result.published).toHaveLength(0);
  });

  it("GOLDEN PATH 13 — complex evergreen completeness cluster publishes", () => {
    const plan = buildTopicalCompletenessPlan({
      question: "How is cap rate calculated?",
      topic: "Cap Rates",
      content_type: "EVERGREEN_QUESTION",
    });
    expect(classifyTopicComplexity({ question: "How is cap rate calculated?", topic: "Cap Rates", content_type: "EVERGREEN_QUESTION" })).toBe("COMPLEX");
    const draft = generateOrganicDraft({
      question: "How is cap rate calculated?",
      topic: "Cap Rates",
      url: "/commercial-real-estate/valuation/how-is-cap-rate-calculated/",
      links: ["/commercial-real-estate/valuation/", "/"],
      breadcrumbs: ["Home", "Valuation", "Cap rate"],
    });
    expect(evaluateOrganicTopicalCompletenessGate({ draft, plan }).result).toBe("PASS");
    expect(evaluateQuestionClusterCoverageGate({ draft, plan }).result).toBe("PASS");
    expect(evaluateEntityCoverageGate({ draft, plan }).result).toBe("PASS");
    expect(evaluatePracticalUsefulnessGate({ draft, plan }).result).toBe("PASS");
    const result = executeOrganicContinuousTick({
      state: emptyOrganicContinuousState("occupancynpv"),
      now: NOW,
      questions: [{ question: "How is cap rate calculated?", source_channel: "sales" }],
    });
    expect(result.published[0]?.status).toBe("PUBLISHED");
  });

  it("GOLDEN PATH 14 — thin complex page cannot publish", () => {
    const plan = buildTopicalCompletenessPlan({
      question: "How is cap rate calculated?",
      topic: "Cap Rates",
      content_type: "EVERGREEN_QUESTION",
    });
    const thin = generateOrganicDraft({
      question: "How is cap rate calculated?",
      topic: "Cap Rates",
      url: "/commercial-real-estate/valuation/how-is-cap-rate-calculated/",
      links: ["/commercial-real-estate/valuation/", "/"],
      breadcrumbs: ["Home", "Valuation", "Cap rate"],
    });
    thin.body = "Cap rate is NOI divided by value. Investors use it to compare properties in commercial real estate. ".repeat(18);
    thin.word_count = thin.body.split(/\s+/).length;
    thin.headings = ["What is cap rate?"];
    thin.direct_answer = "Cap rate is NOI divided by value.";
    expect(evaluateQuestionClusterCoverageGate({ draft: thin, plan }).result).toBe("FAIL");
    expect(evaluateOrganicContentQualityGate(thin, { complexity: "COMPLEX" }).result).toBe("FAIL");
    expect(auditOrganicDraftDepth({ draft: thin, plan })).toMatch(/THIN|NEEDS_EXPANSION/);
  });

  it("GOLDEN PATH 15 — adjacent high-value intent queues a dedicated page", () => {
    const plan = buildTopicalCompletenessPlan({
      question: "How is cap rate calculated?",
      topic: "Cap Rates",
      content_type: "EVERGREEN_QUESTION",
    });
    const adjacent = adjacentQuestionDemand(plan);
    expect(adjacent.some((row) => /interest rates/i.test(row.question))).toBe(true);
    const signal = emitContentDemandSignal({
      venture_id: "occupancynpv",
      now: NOW,
      question: {
        question: adjacent[0].question,
        normalized_intent: "interest rates cap rate",
        source_channel: "internal_venture_research",
        venture_id: "occupancynpv",
        topic: "Cap Rates",
        frequency: 1,
        first_seen: NOW,
        last_seen: NOW,
        related_objections: [],
        related_prospect_count: 0,
        existing_content_match: null,
        answer_state: "UNANSWERED",
        content_gap_score: 0.7,
        commercial_relevance: 0.7,
        sales_relevance: 0.6,
      },
    });
    expect(signal?.reason).toBe("UNANSWERED");
  });

  it("GOLDEN PATH 16 — thin live page refresh stays on the same URL", () => {
    const state = emptyOrganicContinuousState("occupancynpv");
    const asset = publishedAsset({
      url: "/commercial-lease-npv/how-is-cap-rate-calculated/",
      topic: "Cap Rates",
      updated_at: "2026-09-01T00:00:00.000Z",
    });
    state.assets = [asset];
    state.remediation_queue = [{
      url: asset.url,
      classification: "NEEDS_EXPANSION",
      priority: "HIGH",
      reason: "INSUFFICIENT_QUESTION_CLUSTER_COVERAGE",
    }];
    const result = executeOrganicContinuousTick({
      state,
      now: NOW,
      questions: [],
      velocity: defaultVelocityInputs({ content_gap_count: 0, indexation_health: 0.4 }),
    });
    expect(result.refreshed[0]?.url).toBe(asset.url);
    expect(result.published).toHaveLength(0);
  });

  it("routes content types, taxonomy, GEO, quality, evidence, and authorization", () => {
    expect(routeContentType({ question: "How is cap rate calculated?", topic: "Cap Rates", answer_state: "UNANSWERED", commercial: 0.8 })).toBe("EVERGREEN_QUESTION");
    expect(routeContentType({ question: "NNN vs gross lease", topic: "Leasing", answer_state: "UNANSWERED", commercial: 0.7 })).toBe("COMPARISON");
    expect(manageBlogTaxonomy({ title: "Cap rate basics", topic: "Valuation", existing_tags: ["cap-rate", "spam-tag"] }).tags).toContain("cap-rate");
    expect(manageBlogTaxonomy({ title: "Cap rate basics", topic: "Valuation", existing_tags: ["spam-tag"] }).tags).not.toContain("spam-tag");
    const geo = planGeoAnswer({ question: "How is cap rate calculated?", topic: "Cap Rates", entity: "Commercial Real Estate" });
    expect(geo.direct_answer.length).toBeGreaterThan(10);
    expect(geo.headings.length).toBeGreaterThan(2);
    const draft = generateOrganicDraft({
      question: "How is cap rate calculated?",
      topic: "Cap Rates",
      url: "/commercial-real-estate/valuation/how-is-cap-rate-calculated/",
      links: ["/commercial-real-estate/valuation/", "/"],
      breadcrumbs: ["Commercial Real Estate", "Valuation", "How is cap rate calculated"],
    });
    expect(evaluateOrganicContentQualityGate(draft).result).toBe("PASS");
    expect(evaluateOrganicEvidenceGate(draft, true).result).toBe("PASS");
    expect(evaluateOrganicEvidenceGate({ ...draft, citations: [{ source: "", source_type: "invented", retrieved_at: NOW, claim: "x" }] }, true).result).toBe("FAIL");
    const thin = evaluateOrganicContentQualityGate({ ...draft, body: "short", word_count: 20, internal_links: [] });
    expect(thin.result).toBe("FAIL");
    const auth = authorizeOrganicPublish({
      venture_active: true,
      website_approved: true,
      publishing_enabled: true,
      quality: { gate: "q", result: "PASS", reasons: [] },
      duplicate: { result: "PASS" },
      url: { gate: "u", result: "PASS", reasons: [] },
      evidence: { gate: "e", result: "PASS", reasons: [] },
      links: { gate: "l", result: "PASS", reasons: [] },
      schema: { gate: "s", result: "PASS", reasons: [] },
      velocity_available: true,
    });
    expect(auth.result).toBe("PASS");
    expect(authorizeOrganicPublish({
      ...{
        venture_active: true,
        website_approved: true,
        publishing_enabled: true,
        quality: { gate: "q", result: "FAIL", reasons: ["thin"] },
        duplicate: { result: "PASS" },
        url: { gate: "u", result: "PASS", reasons: [] },
        evidence: { gate: "e", result: "PASS", reasons: [] },
        links: { gate: "l", result: "PASS", reasons: [] },
        schema: { gate: "s", result: "PASS", reasons: [] },
        velocity_available: true,
      },
    }).result).toBe("FAIL");
  });

  it("keeps publisher abstraction, sales registry, outbound eligibility, and site architecture deterministic", () => {
    const publisher = createMemoryPublisher();
    expect(publisher.id).toBe("nextjs_repository");
    const asset = publishedAsset();
    const sales = registerSalesContentAsset(asset);
    expect(sales.question_answered).toContain("cap rate");
    expect(lookupSalesContent({ question: "How does cap rate work?", assets: [asset] }).asset?.url).toBe(asset.url);
    expect(outboundMayUseAsset({ purpose: "question_response", asset })).toBe(true);
    expect(outboundMayUseAsset({ purpose: "generic", asset })).toBe(false);
    const graph = buildVentureTopicGraph({ venture_id: "occupancynpv" });
    const links = buildContinuousInternalLinkGraph({
      asset,
      assets: [asset, publishedAsset({ asset_id: "noi", url: "/commercial-real-estate/valuation/noi/", topic: "NOI", cluster: "NOI" })],
      graph,
      conversion_url: "/",
    });
    expect(links.links).toContain("/commercial-real-estate/valuation/");
    expect(evaluateOrganicSiteArchitectureGate([
      { ...asset, internal_links: links.links },
      publishedAsset({ asset_id: "noi", url: "/commercial-real-estate/valuation/noi/", topic: "NOI", internal_links: [asset.url, "/"] }),
    ]).result).toBe("PASS");
  });

  it("projects truthful HQ organic state and sanitized public occupancy", () => {
    const state = emptyOrganicContinuousState("occupancynpv");
    const result = executeOrganicContinuousTick({
      state,
      now: NOW,
      questions: [{ question: "How is cap rate calculated?", source_channel: "sales" }],
    });
    const hq = projectOrganicGrowthHq(result.state);
    expect(hq.published_today).toBeGreaterThan(0);
    expect(hq.visual_state).toMatch(/ACTIVE|MONITORING/);
    expect(hq.today_target).toBe(`${ORGANIC_CADENCE_DEFAULT.target_min}–${ORGANIC_CADENCE_DEFAULT.target_max}`);
    const pub = projectPublicOrganicActivity(result.state);
    expect(PUBLIC_ORGANIC_ACTIVITY).toContain(pub.activity);
    expect(evaluatePublicOrganicPrivacy(pub.activity).result).toBe("PASS");
    expect(evaluatePublicOrganicPrivacy("keyword strategy for prospect_id 12 score: 88 draft text").result).toBe("FAIL");
    expect(sanitizePublicOrganicText("email founder@imros.io")).toContain("[redacted]");
    const panel = readFileSync(join(process.cwd(), "components/dashboard/operator-console/department-detail-panel.tsx"), "utf8");
    expect(panel).toContain("data-hq-organic-growth");
    expect(ORGANIC_CONTINUOUS_GATES).toHaveLength(20);
  });

  it("does not create a disconnected SEO subsystem and keeps default cadence 2-4", () => {
    expect(ORGANIC_CADENCE_DEFAULT.target_min).toBe(2);
    expect(ORGANIC_CADENCE_DEFAULT.target_max).toBe(4);
    const engineIndex = readFileSync(join(process.cwd(), "lib/infinity/organic-growth-engine/index.ts"), "utf8");
    expect(engineIndex).toContain("./continuous");
    const cycle = readFileSync(join(process.cwd(), "lib/infinity/growth-engine/runtime-cycle.ts"), "utf8");
    expect(cycle).toContain("executeOrganicContinuousTick");
    expect(cycle).not.toContain("OUTBOUND_MODE=AUTONOMOUS");
  });
});
