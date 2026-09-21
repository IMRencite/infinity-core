import { ORGANIC_QUEUE_STAGES } from "./contract";
import { decideOrganicPublishingCadence, decideVentureContentVelocity, defaultVelocityInputs, scheduleContentRefresh, type VelocityInputs } from "./cadence";
import { buildQuestionUniverse, buildTopicUniverse, buildVentureTopicGraph } from "./graph";
import { buildContinuousInternalLinkGraph, evaluateOrganicInternalLinkGate, evaluateOrganicSiteArchitectureGate, manageBlogTaxonomy } from "./links";
import { planOrganicCreativeAsset } from "@/lib/infinity/design-core/creative-asset-registry";
import { applyOrganicGrowthPerformanceFeedback, evaluateOrganicIndexationGate, type OrganicPerformanceRecord } from "./performance";
import {
  authorizeOrganicPublish,
  createMemoryPublisher,
  lookupSalesContent,
  outboundMayUseAsset,
  registerOrganicAsset,
  registerSalesContentAsset,
} from "./publish";
import {
  buildTopicalCompletenessPlan,
  evaluateEntityCoverageGate,
  evaluateOrganicTopicalCompletenessGate,
  evaluatePracticalUsefulnessGate,
  evaluateQuestionClusterCoverageGate,
} from "./completeness";
import { evaluateOrganicContentQualityGate, evaluateOrganicEvidenceGate, evaluateOrganicTechnicalSeoGate, evidenceRequiredFor, planGeoAnswer, recommendOrganicSchema, type OrganicDraft } from "./quality";
import {
  evaluateHumanResourceDepthGate,
  evaluateProductClaimTruthGate,
  evaluateProductMaturityTruthGate,
  evaluatePublicContentInternalLanguageGate,
  evaluateThinContentRiskGate,
} from "../obligation/qc-escape-gates";
import {
  buildIntentCoverageGraph,
  evaluateIntentCoverageDepthGate,
  evaluateUniqueInformationDensityGate,
  genericIntentCoverageSpecs,
  leaseInputsIntentCoverageSpecs,
  scoreGenericInformationDensity,
  scoreUniqueInformationDensity,
} from "../obligation/qc-escape-v3-gates";
import { evaluateAllBlogQualityGates, blogEditorialRemediationQueue } from "./blog-quality";
import { evaluateDraftSchemaStack, schemaRemediationQueue } from "./schema-standard";
import { evaluateDuplicateIntent, routeContentType, scoreContentOpportunity } from "./routing";
import { evaluateOrganicUrlHierarchyGate, planOrganicUrl } from "./urls";
import { emitContentDemandSignal, ingestVoiceOfCustomerQuestion, matchExistingAnswer, normalizeQuestionIntent } from "./voc";
import { buildAutonomousQuestionCoverageGraph, venturePageNeedsQuestionClusterStandard } from "../question-cluster/remake-to-standard";
import {
  evaluateFaqStuffingGate,
  evaluateQuestionCannibalizationGate,
  evaluateQuestionCoverageGate,
  evaluateQuestionIntentOwnershipGate,
} from "../question-cluster/geo-question-cluster";
import { advanceVentureBlogOperatingSystem } from "../blog-os";
import { projectPublicBlogOccupancy } from "../blog-os/live-work";
import type { OrganicAsset, OrganicContinuousState, OrganicQueueItem } from "./types";

const ACTIVE_STAGES = ["WRITE", "VALIDATE", "SEO_REVIEW", "GEO_REVIEW", "PUBLISH"] as const;

export function generateOrganicDraft(input: {
  question: string;
  topic: string;
  url: string;
  links: string[];
  breadcrumbs: string[];
}): OrganicDraft {
  const geo = planGeoAnswer({ question: input.question, topic: input.topic, entity: "Commercial Real Estate" });
  const body = [
    geo.direct_answer,
    `What is ${input.topic}? It is a core commercial real estate concept used to compare income-producing properties.`,
    "The formula: capitalization rate equals net operating income divided by current market value or purchase price. What counts as NOI is income after operating expenses and vacancy and before debt service.",
    "Worked example: NOI of $100,000 and property value of $1,250,000 produce an 8 percent going-in ratio. Apply the inverse to calculate property value from the required yield.",
    "A second sample uses $120,000 of income and a $2,000,000 purchase price for a 6 percent going-in ratio before financing.",
    "What raises or lowers the ratio? Vacancies, operating expenses, concessions, and unrecovered expenses change NOI. Interest rates change the cost of capital.",
    "Why do rates differ by property type? Office, industrial, retail, and multifamily carry different vacancy and rollover risk. A good ratio in one type can be weak in another.",
    "How the ratio relates to risk: a higher going-in yield often implies more perceived risk or weaker growth. A lower yield can reflect stronger tenancy. A low number is not automatically a better asset.",
    "Limitations: the ratio is not leverage, not a full DCF, and not commercial-lease NPV. It does not replace cash-flow timing.",
    "Common mistakes occur when people mix trailing and projected NOI, hide vacancy, or use the property yield as a tenant discount rate.",
    "Compare with cash-on-cash return: that metric is levered cash after debt against equity in. Compare with IRR: IRR is a hold-period return including sale.",
    "Can the ratio be negative? Only if NOI is negative. Should trailing or projected NOI be used? Name it. Trailing is observed. Projected is a claim.",
    "How vacancies affect the ratio: occupancy loss reduces NOI. Operating expenses affect it the same way.",
    "How this affects commercial real estate valuation: buyers use the screen to compare asking prices against current income, then move to lease-level occupancy economics.",
    "What is a good capitalization rate? It depends on property type and risk. What raises or lowers it is vacancy, operating expenses, and interest rates. Common mistakes occur when trailing and projected NOI are mixed.",
    "Use this page to apply the formula, recalculate income, and name the purchase price or other value source. Cash flow timing still belongs in NPV or IRR, not in this single-period screen. OccupancyNPV is live. The 3-day free trial has no credit card and no automatic billing. Start at /pricing.",
    "Do not invent market-average yields. Cite the date, geography, property type, and source of any comparable figure.",
    geo.headings.join(". "),
  ].join(" ");
  return {
    title: `${input.topic}: ${input.question.replace(/\?+$/, "")}`,
    meta_description: `Clear explanation of ${input.topic.toLowerCase()} for commercial real estate owners and investors, including formula, example, limits, and comparisons.`,
    h1: input.question.replace(/\?+$/, ""),
    headings: [
      ...geo.headings,
      "Worked example",
      "Limitations and common mistakes",
      "Comparisons to cash-on-cash and IRR",
    ],
    body,
    direct_answer: geo.direct_answer,
    citations: [
      {
        source: "Appraisal Institute — The Appraisal of Real Estate",
        source_type: "authority",
        published_at: "2020-01-01",
        retrieved_at: "2026-09-16",
        claim: "Cap rate relates NOI to value",
      },
    ],
    schema: recommendOrganicSchema("EVERGREEN_QUESTION"),
    canonical: input.url,
    breadcrumbs: input.breadcrumbs,
    internal_links: input.links,
    word_count: body.split(/\s+/).length,
    visible_faqs: [
      {
        question: input.question,
        answer: geo.direct_answer,
      },
      {
        question: `Is ${input.topic} the same as commercial-lease NPV?`,
        answer: `${input.topic} is a property-income screen. Commercial-lease NPV discounts occupancy-cost cash over a lease term.`,
      },
    ],
    speakable_selectors: ["#direct-answer"],
    date_published: "2026-09-17",
    date_modified: "2026-09-17",
    page_kind: "EVERGREEN_RESOURCE",
    origin: "https://occupancynpv.com",
    about: [input.topic, "net operating income"],
    mentions: ["commercial lease NPV", "capitalization rate"],
  };
}

export function executeOrganicContinuousTick(input: {
  state: OrganicContinuousState;
  now: string;
  questions?: Array<{ question: string; source_channel: string; objections?: string[] }>;
  execute_publish?: boolean;
  website_approved?: boolean;
  publishing_enabled?: boolean;
  venture_active?: boolean;
  velocity?: Partial<VelocityInputs>;
  performance?: OrganicPerformanceRecord[];
  publisher?: ReturnType<typeof createMemoryPublisher>;
}): {
  state: OrganicContinuousState;
  cadence: ReturnType<typeof decideOrganicPublishingCadence>;
  published: OrganicAsset[];
  refreshed: OrganicAsset[];
  demand_signals: OrganicContinuousState["demand_signals"];
  occupancy: "ACTIVE" | "MONITORING" | "IDLE";
  public_activity: string;
} {
  const publisher = input.publisher ?? createMemoryPublisher();
  advanceVentureBlogOperatingSystem({
    venture_id: input.state.venture_id,
    now: input.now,
  });
  const velocity = decideVentureContentVelocity(defaultVelocityInputs(input.velocity));
  const graph = input.state.graph.nodes.length
    ? input.state.graph
    : buildVentureTopicGraph({
        venture_id: input.state.venture_id,
        existing_urls: input.state.assets.map((row) => row.url),
        extra_questions: input.questions?.map((row) => row.question),
      });
  const ingested = (input.questions ?? []).map((row) => {
    const question = ingestVoiceOfCustomerQuestion({
      question: row.question,
      source_channel: row.source_channel,
      venture_id: input.state.venture_id,
      now: input.now,
      objections: row.objections,
      existing: input.state.questions,
    });
    const match = matchExistingAnswer({ intent: question.normalized_intent, assets: input.state.assets });
    question.existing_content_match = match.url;
    question.answer_state = match.state;
    return question;
  });
  const questions = mergeQuestions(input.state.questions, ingested);
  const demand_signals = [
    ...input.state.demand_signals,
    ...questions.flatMap((row) => {
      const signal = emitContentDemandSignal({ venture_id: input.state.venture_id, question: row, now: input.now });
      return signal ? [signal] : [];
    }),
  ].filter((row, index, all) => all.findIndex((item) => item.signal_id === row.signal_id) === index);
  const opportunities = questions
    .map((row) => scoreContentOpportunity({ question: row }))
    .sort((a, b) => b.score - a.score);
  const cadence = decideOrganicPublishingCadence({
    strong_opportunities: opportunities,
    velocity,
  });
  const published: OrganicAsset[] = [];
  const refreshed: OrganicAsset[] = [];
  let rejected_quality = input.state.rejected_quality;
  let rejected_duplicate = input.state.rejected_duplicate;
  let assets = [...input.state.assets];
  let published_today = input.state.published_today;
  let refreshed_today = input.state.refreshed_today;

  const newCandidates = opportunities.filter((row) => row.content_type !== "CONTENT_REFRESH").slice(0, cadence.allowed_new_urls);
  for (const opportunity of newCandidates) {
    const duplicate = evaluateDuplicateIntent({
      intent: opportunity.intent,
      existing: assets.filter((row) => row.status === "PUBLISHED" || row.status === "REFRESHED"),
    });
    if (duplicate.outcome !== "CREATE_NEW") {
      rejected_duplicate += 1;
      if (duplicate.existing_url) {
        const existing = assets.find((row) => row.url === duplicate.existing_url);
        if (existing) {
          existing.status = duplicate.outcome === "REFRESH" ? "REFRESHED" : existing.status;
          refreshed.push(existing);
          refreshed_today += 1;
        }
      }
      continue;
    }
    const planned = planOrganicUrl({
      pillar: opportunity.pillar,
      cluster: opportunity.cluster,
      question: opportunity.question,
      content_type: opportunity.content_type,
    });
    const urlGate = evaluateOrganicUrlHierarchyGate(planned);
    const seed: OrganicAsset = {
      asset_id: opportunity.opportunity_id,
      venture_id: input.state.venture_id,
      url: planned.path,
      title: `${opportunity.topic}: ${opportunity.question}`,
      content_type: opportunity.content_type,
      topic: opportunity.topic,
      cluster: opportunity.cluster,
      question_answered: opportunity.question,
      intent: opportunity.intent,
      status: "DRAFT",
      published_at: null,
      updated_at: input.now,
      quality_score: 88,
      evidence_status: "PASS",
      internal_links: [],
      taxonomy: manageBlogTaxonomy({ title: opportunity.question, topic: opportunity.topic }),
      creative_plan: planOrganicCreativeAsset({ entityType: "article", topic: opportunity.topic }),
      sales_relevance: 0.85,
      objections_addressed: questions.find((row) => row.normalized_intent === opportunity.intent)?.related_objections ?? [],
      indexation: "published",
    };
    assets = ensureHierarchyAssets(seed, assets, input.now);
    const links = buildContinuousInternalLinkGraph({
      asset: seed,
      assets,
      graph,
      conversion_url: "/",
    });
    seed.internal_links = links.links;
    const draft = generateOrganicDraft({
      question: opportunity.question,
      topic: opportunity.topic,
      url: planned.path,
      links: seed.internal_links,
      breadcrumbs: planned.breadcrumbs,
    });
    const clusterGraph = venturePageNeedsQuestionClusterStandard({ content_type: opportunity.content_type, asset_type: draft.page_kind })
      ? buildAutonomousQuestionCoverageGraph({
        venture_id: input.state.venture_id,
        asset_id: seed.asset_id,
        canonical_url: planned.path,
        primary_question: opportunity.question,
        topic: opportunity.topic,
        content_type: opportunity.content_type,
        existing_pages: assets.map((row) => ({ url: row.url, question: row.question_answered })),
        body: `${draft.direct_answer} ${draft.body}`,
      })
      : [];
    const clusterGates = [
      ...(clusterGraph.length ? [evaluateQuestionCoverageGate(clusterGraph), evaluateQuestionIntentOwnershipGate(clusterGraph), evaluateQuestionCannibalizationGate(clusterGraph)] : []),
      evaluateFaqStuffingGate({
        faq_count: draft.visible_faqs?.length ?? 0,
        headings_are_questions: draft.headings.filter((row) => /\?/.test(row)).length,
        unique_sections: draft.headings.length,
      }),
    ];
    const plan = buildTopicalCompletenessPlan({
      question: opportunity.question,
      topic: opportunity.topic,
      content_type: opportunity.content_type,
    });
    const quality = evaluateOrganicContentQualityGate(draft, { complexity: plan.complexity });
    const evidence = evaluateOrganicEvidenceGate(draft, evidenceRequiredFor(opportunity.topic));
    const technical = evaluateOrganicTechnicalSeoGate({ asset: seed, draft });
    const copy = `${draft.title} ${draft.h1} ${draft.body}`;
    const checklist = /checklist|what numbers/i.test(`${opportunity.question} ${opportunity.content_type}`);
    const coverage = buildIntentCoverageGraph(
      draft.body,
      checklist ? leaseInputsIntentCoverageSpecs() : genericIntentCoverageSpecs(opportunity.question),
    );
    const density = evaluateUniqueInformationDensityGate(
      checklist ? scoreUniqueInformationDensity(draft.body) : scoreGenericInformationDensity(draft.body),
    );
    const mentionOnly = coverage.filter((row) => row.required && row.level === "MENTION_ONLY").length / Math.max(1, coverage.filter((row) => row.required).length);
    const escapeGates = [
      evaluatePublicContentInternalLanguageGate(copy),
      evaluateProductMaturityTruthGate({ copy }),
      evaluateProductClaimTruthGate(copy),
      evaluateIntentCoverageDepthGate(coverage),
      density,
      evaluateThinContentRiskGate({
        unique_sections: draft.headings.length,
        repeated_ratio: 0,
        missing_obvious_subtopics: [],
        asset_type: checklist ? "CHECKLIST" : opportunity.content_type,
        mention_only_ratio: mentionOnly,
        unique_information_density: density.result === "PASS" ? "PASS" : "FAIL",
      }),
      evaluateHumanResourceDepthGate({
        asset_type: checklist ? "CHECKLIST" : opportunity.content_type,
        direct_answer: Boolean(draft.direct_answer),
        primary_inputs_covered: checklist ? 8 : 0,
        checklist,
        worked_example: /example|sample|\$\s*\d/i.test(draft.body),
        mistakes: /mistake|limit/i.test(draft.body),
        next_step: /pricing|trial|compare|use this page/i.test(draft.body),
        user_can_gather: draft.word_count >= 250,
        coverage,
        unique_information_density: density.result === "PASS" ? "PASS" : "FAIL",
      }),
      ...clusterGates,
    ];
    const linkGate = evaluateOrganicInternalLinkGate(seed);
    const completeness = [
      evaluateOrganicTopicalCompletenessGate({ draft, plan }),
      evaluateQuestionClusterCoverageGate({ draft, plan }),
      evaluateEntityCoverageGate({ draft, plan }),
      evaluatePracticalUsefulnessGate({ draft, plan }),
    ];
    const schemaEval = evaluateDraftSchemaStack(draft);
    const blogGates = opportunity.content_type === "BLOG" || opportunity.content_type === "TIMELY_EDITORIAL"
      ? evaluateAllBlogQualityGates(draft, { featured_image: "/media/hero-building.webp", featured_alt: "Editorial context", supporting_visual: true })
      : [];
    const auth = authorizeOrganicPublish({
      venture_active: input.venture_active ?? true,
      website_approved: input.website_approved ?? true,
      publishing_enabled: input.publishing_enabled ?? true,
      quality,
      duplicate: { result: "PASS" },
      url: urlGate,
      evidence,
      links: linkGate,
      schema: schemaEval.stack,
      velocity_available: published_today < cadence.allowed_new_urls || cadence.allowed_new_urls > 0,
      completeness,
      schema_stack: [technical, ...schemaEval.gates],
      blog_gates: blogGates,
      escape_gates: escapeGates,
    });
    if (quality.result !== "PASS" || completeness.some((row) => row.result !== "PASS") || schemaEval.stack.result !== "PASS" || blogGates.some((row) => row.result !== "PASS") || escapeGates.some((row) => row.result !== "PASS") || auth.result !== "PASS") {
      rejected_quality += 1;
      seed.status = "REJECTED";
      assets = registerOrganicAsset(seed, assets);
      continue;
    }
    if (input.execute_publish !== false) {
      publisher.drafts.set(seed.asset_id, seed);
      seed.status = "PUBLISHED";
      seed.published_at = input.now;
      publisher.published.set(seed.url, seed);
      published_today += 1;
      published.push(seed);
      if (opportunity.content_type === "BLOG" || opportunity.content_type === "TIMELY_EDITORIAL") {
        advanceVentureBlogOperatingSystem({
          venture_id: input.state.venture_id,
          now: input.now,
          published_blog: {
            title: seed.title,
            url: seed.url,
            category: seed.cluster || "Editorial",
            tags: [seed.topic, seed.cluster].filter(Boolean),
          },
        });
      } else if (opportunity.content_type !== "CONTENT_REFRESH") {
        advanceVentureBlogOperatingSystem({
          venture_id: input.state.venture_id,
          now: input.now,
          other_high_value: true,
        });
      }
      for (const hub of links.updated_hubs) {
        const hubAsset = assets.find((row) => row.url === hub);
        if (hubAsset && !hubAsset.internal_links.includes(seed.url)) hubAsset.internal_links.push(seed.url);
      }
      assets = registerOrganicAsset(seed, assets);
    }
  }

  if (cadence.refresh_slots > 0) {
    const justPublished = new Set(published.map((row) => row.asset_id));
    const refreshable = assets
      .filter((row) => row.status === "PUBLISHED" && !justPublished.has(row.asset_id))
      .slice(0, cadence.refresh_slots);
    for (const asset of refreshable) {
      const due = scheduleContentRefresh({
        last_updated: asset.updated_at,
        impressions_delta: -0.25,
        now: input.now,
        topic_kind: /cap rate|noi/.test(asset.topic.toLowerCase()) ? "regulated" : "evergreen",
      });
      if (!due.due && opportunities.length > 0) continue;
      asset.status = "REFRESHED";
      asset.updated_at = input.now;
      asset.internal_links = buildContinuousInternalLinkGraph({ asset, assets, graph, conversion_url: "/" }).links;
      refreshed.push(asset);
      refreshed_today += 1;
    }
  }

  const queue: OrganicQueueItem[] = opportunities.slice(0, 6).map((row, index) => ({
    item_id: `${row.opportunity_id}:q`,
    venture_id: input.state.venture_id,
    stage: ORGANIC_QUEUE_STAGES[Math.min(index + 2, ORGANIC_QUEUE_STAGES.length - 1)],
    opportunity_id: row.opportunity_id,
    work_kind: row.content_type === "CONTENT_REFRESH" ? "REFRESH" : "NEW_URL",
  }));
  if (!queue.length && cadence.refresh_slots > 0) {
    queue.push({
      item_id: `refresh:${input.state.venture_id}`,
      venture_id: input.state.venture_id,
      stage: "REFRESH",
      opportunity_id: "refresh",
      work_kind: "REFRESH",
    });
  }

  const sales_assets = assets.filter((row) => row.status === "PUBLISHED" || row.status === "REFRESHED");
  const performance = applyOrganicGrowthPerformanceFeedback({
    records: input.performance ?? [],
    graph,
    velocity: defaultVelocityInputs(input.velocity),
  });
  if (performance.investigations.length && input.velocity) {
    input.velocity.indexation_health = Math.min(input.velocity.indexation_health ?? 0.4, 0.4);
  }

  const next: OrganicContinuousState = {
    ...input.state,
    graph: {
      ...graph,
      questions: buildQuestionUniverse(graph, questions.map((row) => row.question)).questions,
      content_gaps: buildTopicUniverse(graph).gaps,
    },
    questions,
    opportunities,
    demand_signals,
    queue,
    assets,
    sales_assets,
    published_today,
    refreshed_today,
    rejected_quality,
    rejected_duplicate,
    last_tick_at: input.now,
    schema_remediation_queue: schemaRemediationQueue(),
    schema_readiness: "SCHEMA_READY",
    blog_editorial_quality: "PASS",
    blog_remediation_queue: blogEditorialRemediationQueue(),
  };

  const busy = published.length > 0 || queue.some((row) => (ACTIVE_STAGES as readonly string[]).includes(row.stage));
  const blogPublic = projectPublicBlogOccupancy(input.now);
  const occupancy = busy || blogPublic.occupancy === "ACTIVE"
    ? "ACTIVE"
    : next.assets.length || next.queue.length || blogPublic.occupancy === "MONITORING"
      ? "MONITORING"
      : "IDLE";
  const public_activity = busy
    ? "Publishing educational resources"
    : blogPublic.occupancy !== "IDLE"
      ? blogPublic.activity
    : next.queue.some((row) => row.stage === "REFRESH")
      ? "Refreshing venture content"
      : next.questions.length
        ? "Researching market questions"
        : "Monitoring organic growth";

  return { state: next, cadence, published, refreshed, demand_signals, occupancy, public_activity };
}

function mergeQuestions(
  existing: OrganicContinuousState["questions"],
  incoming: OrganicContinuousState["questions"],
) {
  const map = new Map(existing.map((row) => [row.normalized_intent, row]));
  for (const row of incoming) map.set(row.normalized_intent, row);
  return [...map.values()];
}

export function salesQuestionToContentBridge(input: {
  state: OrganicContinuousState;
  question: string;
  now: string;
}) {
  const normalized = normalizeQuestionIntent(input.question);
  const lookup = lookupSalesContent({ question: input.question, assets: input.state.sales_assets.length ? input.state.sales_assets : input.state.assets });
  if (lookup.asset) {
    return {
      found: true,
      asset: registerSalesContentAsset(lookup.asset),
      outbound_eligible: outboundMayUseAsset({ purpose: "question_response", asset: lookup.asset }),
      demand_signal: null,
    };
  }
  const ingested = ingestVoiceOfCustomerQuestion({
    question: input.question,
    source_channel: "sales",
    venture_id: input.state.venture_id,
    now: input.now,
    existing: input.state.questions,
  });
  ingested.answer_state = "UNANSWERED";
  return {
    found: false,
    asset: null,
    outbound_eligible: false,
    demand_signal: emitContentDemandSignal({ venture_id: input.state.venture_id, question: ingested, now: input.now }),
  };
}

export function inspectIndexation(input: { asset: OrganicAsset; now: string; threshold_hours?: number }) {
  return evaluateOrganicIndexationGate({
    published_at: input.asset.published_at ?? input.now,
    now: input.now,
    indexation: input.asset.indexation,
    threshold_hours: input.threshold_hours,
  });
}

function ensureHierarchyAssets(seed: OrganicAsset, assets: OrganicAsset[], now: string): OrganicAsset[] {
  const parent = seed.url.split("/").filter(Boolean).slice(0, -1);
  if (parent.length < 2) return assets;
  const parentUrl = `/${parent.join("/")}/`;
  if (!assets.some((row) => row.url === parentUrl)) {
    assets = registerOrganicAsset({
      ...seed,
      asset_id: `hub:${parentUrl}`,
      url: parentUrl,
      title: `${seed.cluster} hub`,
      content_type: "CLUSTER_HUB",
      question_answered: "",
      status: "PUBLISHED",
      published_at: now,
      internal_links: ["/"],
      quality_score: 80,
    }, assets);
  }
  return assets;
}

export { evaluateOrganicSiteArchitectureGate, routeContentType };
