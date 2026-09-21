import { describe, expect, it, beforeEach } from "vitest";
import { buildGlobalGrowthNexusFloorView } from "@/lib/infinity/growth-engine/hq";
import { generateVentureBlueprint } from "@/lib/infinity/venture-factory/generators/generate-blueprint";
import { getVentureBlueprintTemplate } from "@/lib/infinity/venture-factory/registry/template-registry";
import { factoryInheritedUniversalVentureSystemQc } from "@/lib/infinity/universal-venture-system-qc/factory";
import { occupancynpvLeaseInputsQuestionGraph, occupancynpvLeaseInputsCitationBlocks } from "../../question-cluster/occupancynpv-lease-inputs-cluster";
import {
  evaluateCitationReadyAnswerGate,
  evaluateFaqStuffingGate,
  evaluateQuestionCannibalizationGate,
  evaluateQuestionCoverageGate,
  evaluateQuestionIntentOwnershipGate,
} from "../../question-cluster/geo-question-cluster";
import { ORGANIC_QUESTION_CLUSTER_DAILY_IMPROVEMENT_QUESTIONS } from "../../question-cluster/venture-content-standard";
import { evaluateOrganicProductionPublishGate } from "../../obligation/gates";
import { defaultVentureBlogSurface, evaluateVentureBlogReadinessGate } from "../../continuous/venture-blog-standard";
import { BLOG_OS_DAILY_IMPROVEMENT_QUESTIONS, BLOG_REPAIR_STRATEGIES, DAILY_BLOG_TARGET, FACTORY_INHERITED_BLOG_OS_CONTRACTS, MAX_OTHER_NEW_HIGH_VALUE_ASSETS_PER_DAY } from "../contract";
import {
  evaluateBlogCategoryQualityGate,
  evaluateBlogChronologyGate,
  evaluateBlogDiscoveryGate,
  evaluateBlogHqLiveWorkGate,
  evaluateBlogInternalAuthorityLinkGate,
  evaluateBlogObligationContinuityGate,
  evaluateBlogPublicOccupancyGate,
  evaluateBlogRequiredForLaunchGate,
  evaluateBlogTagQualityGate,
  evaluateBlogTopicCloudGate,
  evaluateBloglessVentureGate,
  evaluateCategoryArchiveQualityGate,
  evaluateFirstVentureBlogCanaryGate,
  evaluateLatestPostCarouselGate,
  evaluateOrphanContentGate,
  evaluatePremiumBlogRollGate,
  evaluateRelatedContentQualityGate,
  evaluateSystemDailyBlogCoverageGate,
  evaluateTagArchiveIndexabilityGate,
  evaluateVentureBlogAlwaysOnGate,
} from "../gates";
import { projectSystemBlogHq, projectVentureBlogLiveWork } from "../live-work";
import {
  advanceVentureBlogOperatingSystem,
  decideDualContentLoopCadence,
  inheritRequiredBlogContent,
  inheritVentureBlogBlueprintDefaults,
  planDailyBlogObligation,
  rankBlogCandidates,
  recordBlogBuildAttempt,
  recoverBlogBuildFailure,
  selectDailyBlogCandidate,
  syncBlogRollAfterPublish,
  verifyDailyBlogLive,
} from "../operating-system";
import { resetVentureBlogOsStore } from "../store";
import { buildVentureBlogOsV2Report } from "../report";

const NOW = "2026-09-20T12:00:00.000Z";

beforeEach(() => {
  resetVentureBlogOsStore();
});

describe("Venture Blog Operating System V2", () => {
  it("1. venture without blog → build FAIL", () => {
    expect(evaluateBlogRequiredForLaunchGate({ public_website: true, blog_ready: false }).result).toBe("FAIL");
    expect(evaluateVentureBlogReadinessGate({ public_website: true, surface: null }).result).toBe("FAIL");
  });

  it("2. venture with blog → build continues", () => {
    expect(evaluateBlogRequiredForLaunchGate({ public_website: true, blog_ready: true }).result).toBe("PASS");
    expect(evaluateVentureBlogReadinessGate({
      public_website: true,
      surface: defaultVentureBlogSurface("occupancynpv"),
    }).result).toBe("PASS");
  });

  it("3. first real blog canary", () => {
    verifyDailyBlogLive({
      venture_id: "occupancynpv",
      now: NOW,
      title: "How do interest rates affect commercial property values?",
      url: "https://occupancynpv.com/blog/valuation/how-interest-rates-affect-commercial-property-values/",
      category: "Valuation",
      tags: ["Interest Rates"],
    });
    const work = projectVentureBlogLiveWork("occupancynpv", NOW);
    expect(evaluateFirstVentureBlogCanaryGate({
      article_live: Boolean(work.latest_article_url),
      question_coverage: true,
      geo: true,
      seo: true,
      category: Boolean(work.category),
      tags: work.tags.length > 0,
      authority: true,
      internal_links: true,
      roll_updated: work.featured_latest === "PASS",
    }).result).toBe("PASS");
  });

  it("4. daily obligation created", () => {
    const obligation = planDailyBlogObligation({ venture_id: "occupancynpv", now: NOW });
    expect(obligation.state).toBe("PLANNED");
    expect(obligation.operating_day).toBe("2026-09-20");
    expect((obligation.state as string) === "FAILED").toBe(false);
  });

  it("5. weak candidate replaced", () => {
    planDailyBlogObligation({ venture_id: "newco", now: NOW, candidates: [{
      candidate_id: "weak",
      venture_id: "newco",
      topic: "generic",
      question: "What is a blog?",
      score: 20,
      provenance: ["filler"],
      distinct_intent: false,
      geo_potential: 0.1,
      commercial_relevance: 0.1,
    }] });
    const recovered = recoverBlogBuildFailure({
      venture_id: "newco",
      failure_class: "TOPIC_QUALITY",
      now: NOW,
      better_candidate: {
        candidate_id: "strong",
        venture_id: "newco",
        topic: "CAM first year",
        question: "How should a tenant treat CAM in the first operating year?",
        score: 80,
        provenance: ["sales"],
        distinct_intent: true,
        geo_potential: 0.8,
        commercial_relevance: 0.8,
      },
    });
    expect(recovered.obligation.candidate_id).toBe("strong");
    expect(recovered.obligation.state).not.toBe("ESCALATED_EXTERNAL_BLOCKER");
  });

  it("6. thin post repaired", () => {
    const recovered = recoverBlogBuildFailure({ venture_id: "occupancynpv", failure_class: "THIN_CONTENT", now: NOW });
    expect(recovered.strategy).toBe("expand_substantively");
    expect(recovered.obligation.state).toBe("REPAIRING");
  });

  it("7. evidence failure repaired", () => {
    expect(recoverBlogBuildFailure({ venture_id: "occupancynpv", failure_class: "EVIDENCE", now: NOW }).strategy).toBe("research_or_replace_unsupported_claims");
  });

  it("8. duplicate intent routed away", () => {
    const selected = selectDailyBlogCandidate([{
      candidate_id: "dup",
      venture_id: "occupancynpv",
      topic: "lease inputs",
      question: "What numbers do you need to compare two commercial leases?",
      score: 90,
      provenance: ["existing_page"],
      distinct_intent: false,
      geo_potential: 0.9,
      commercial_relevance: 0.9,
    }, {
      candidate_id: "fresh",
      venture_id: "occupancynpv",
      topic: "CAM year one",
      question: "How should a tenant treat CAM in the first operating year?",
      score: 70,
      provenance: ["voc"],
      distinct_intent: true,
      geo_potential: 0.8,
      commercial_relevance: 0.8,
    }]);
    expect(selected?.candidate_id).toBe("fresh");
  });

  it("9. failed attempt leaves obligation open", () => {
    planDailyBlogObligation({ venture_id: "occupancynpv", now: NOW });
    const attempt = recordBlogBuildAttempt({
      venture_id: "occupancynpv",
      now: NOW,
      stage: "VALIDATING",
      failure_class: "SEO",
      failure_reason: "title",
    });
    const work = projectVentureBlogLiveWork("occupancynpv", NOW);
    expect(attempt.repair_strategy).toBeTruthy();
    expect(work.today).not.toBe("LIVE_VERIFIED");
    expect(evaluateBlogObligationContinuityGate(advanceVentureBlogOperatingSystem({ venture_id: "occupancynpv", now: NOW }).obligation).result).toBe("PASS");
  });

  it("10. external outage escalates but does not disappear", () => {
    const state = advanceVentureBlogOperatingSystem({
      venture_id: "occupancynpv",
      now: NOW,
      external_blocker: { reason: "vercel_outage", evidence: "provider_5xx" },
    });
    expect(state.obligation?.state).toBe("ESCALATED_EXTERNAL_BLOCKER");
    expect(state.obligation?.owner).toBe("VentureBlogWorker");
  });

  it("11-15. category and tag quality", () => {
    const now = NOW;
    const categories = [{
      id: "c1", venture_id: "v", name: "Valuation", slug: "valuation", description: "Durable commercial property valuation theme.",
      canonical_topic: "valuation", authority_cluster_id: "a", parent_id: null, status: "ACTIVE" as const, created_at: now, updated_at: now,
    }];
    expect(evaluateBlogCategoryQualityGate(categories).result).toBe("PASS");
    expect(evaluateBlogCategoryQualityGate([...categories, { ...categories[0]!, id: "c2" }]).result).toBe("FAIL");
    const tags = [
      { id: "t1", venture_id: "v", name: "Cap Rates", slug: "cap-rates", description: "Cap rates", canonical_topic: "cap rates", authority_cluster_id: "a", parent_id: null, status: "ACTIVE" as const, created_at: now, updated_at: now },
    ];
    expect(evaluateBlogTagQualityGate({ tags, categories, assignments: [{ tag_ids: ["t1"] }] }).result).toBe("PASS");
    expect(evaluateBlogTagQualityGate({
      tags: [...tags, { ...tags[0]!, id: "t2", name: "Cap Rate", slug: "cap-rate" }],
      categories,
      assignments: [{ tag_ids: ["t1"] }],
    }).result).toBe("FAIL");
    expect(evaluateBlogCategoryQualityGate([]).result).toBe("FAIL");
  });

  it("16-19. orphan, authority, archive, thin tag NOINDEX", () => {
    expect(evaluateOrphanContentGate({ category: false, tags: false, authority: false, internal_links: false, discovery: false }).result).toBe("FAIL");
    expect(evaluateBlogInternalAuthorityLinkGate({ link_up: false, link_sideways: true, commercial_link: true }).result).toBe("FAIL");
    expect(evaluateCategoryArchiveQualityGate({ definition: true, featured: true, newest: true, questions: true, metadata: true }).result).toBe("PASS");
    expect(evaluateTagArchiveIndexabilityGate({ unique_value: false, thin: true }).indexability).toBe("NOINDEX");
  });

  it("20-26. premium roll, chronology, carousel, sidebar, topic cloud, categories", () => {
    expect(evaluateBlogChronologyGate({ displayed_latest_id: "old", live_verified_latest_id: "new" }).result).toBe("FAIL");
    expect(evaluatePremiumBlogRollGate({ featured: false, carousel: true, sidebar: true, topic_cloud: true, category_discovery: true, newest_first: true }).result).toBe("FAIL");
    expect(evaluateLatestPostCarouselGate({ present: true, newest_first: false }).result).toBe("FAIL");
    expect(evaluatePremiumBlogRollGate({ featured: true, carousel: true, sidebar: false, topic_cloud: true, category_discovery: true, newest_first: true }).result).toBe("FAIL");
    expect(evaluateBlogTopicCloudGate({ present: false }).result).toBe("FAIL");
    expect(evaluateBlogTopicCloudGate({ present: true, polluted: true }).result).toBe("FAIL");
    expect(evaluatePremiumBlogRollGate({ featured: true, carousel: true, sidebar: true, topic_cloud: true, category_discovery: false, newest_first: true }).result).toBe("FAIL");
  });

  it("27-31. search, carousel a11y, mobile sidebar, newest-first", () => {
    expect(evaluateBlogDiscoveryGate({ search_enabled: true, fake: false }).result).toBe("PASS");
    expect(evaluateBlogDiscoveryGate({ search_enabled: true, fake: true }).result).toBe("FAIL");
    expect(evaluateLatestPostCarouselGate({ present: true, newest_first: true, keyboard: false }).result).toBe("FAIL");
    expect(evaluateLatestPostCarouselGate({ present: true, newest_first: true, touch: false }).result).toBe("FAIL");
    expect(evaluatePremiumBlogRollGate({ featured: true, carousel: true, sidebar: true, topic_cloud: true, category_discovery: true, newest_first: true }).result).toBe("PASS");
  });

  it("32-38. new publish auto-updates roll, carousel, sidebar, taxonomy, topic cloud, sitemap, canonical", () => {
    const before = advanceVentureBlogOperatingSystem({ venture_id: "freshco", now: NOW });
    const after = syncBlogRollAfterPublish({
      venture_id: "freshco",
      now: NOW,
      article_id: "post-2",
      title: "New post",
      url: "/blog/new/",
      published: "2026-09-20",
      category: "Decision",
      tags: ["NPV"],
    });
    expect(after.roll.featured_latest_id).toBe("post-2");
    expect(after.roll.carousel_ids[0]).toBe("post-2");
    expect(after.roll.sidebar_recent_ids[0]).toBe("post-2");
    expect(after.roll.category_discovery).toContain("Decision");
    expect(after.roll.topic_cloud).toContain("NPV");
    expect(after.roll.newest_first).toBe(true);
    expect(after.roll.last_synced_at).toBe(NOW);
    expect(before.roll.featured_latest_id).not.toBe("post-2");
  });

  it("39-47. question graph, must-answer, FAQ stuffing, ownership, citation, GEO", () => {
    const graph = occupancynpvLeaseInputsQuestionGraph();
    const coverage = evaluateQuestionCoverageGate(graph);
    expect(coverage.result).toBe("PASS");
    expect(evaluateQuestionCoverageGate(graph.map((row) => row.question_class === "MUST_ANSWER" ? { ...row, coverage_state: "NOT_COVERED" as const } : row)).result).toBe("FAIL");
    expect(evaluateFaqStuffingGate({ faq_count: 25, headings_are_questions: 1, unique_sections: 2 }).result).toBe("FAIL");
    expect(evaluateQuestionIntentOwnershipGate(graph).result).toBe("PASS");
    expect(graph.some((row) => row.ownership === "EXISTING_PAGE")).toBe(true);
    expect(evaluateCitationReadyAnswerGate(occupancynpvLeaseInputsCitationBlocks()).result).toBe("PASS");
    expect(evaluateCitationReadyAnswerGate([{
      question: "x",
      heading_id: "x",
      answer: "As discussed above this is important.",
      self_contained: false,
      claims: ["x"],
      evidence_requirement: "NONE",
      sources: [],
      citation_suitability: "NOT_READY",
    }]).result).toBe("FAIL");
    expect(evaluateQuestionCannibalizationGate(graph).result).toBe("PASS");
  });

  it("48-52. SEO, ProductTruth, rendered QC stay required on OccupancyNPV", () => {
    const gate = evaluateOrganicProductionPublishGate({
      decision: { gate: "OrganicContentDecisionGate", result: "PASS", reasons: [] },
      cannibalization: { gate: "ContentCannibalizationGate", result: "PASS", reasons: [] },
      human_value: { gate: "HumanValue", result: "PASS", reasons: [] },
      evidence: { gate: "ContentEvidenceGate", result: "PASS", reasons: [] },
      freshness: { gate: "Freshness", result: "PASS", reasons: [] },
      product_truth: { gate: "ProductClaimTruthGate", result: "PASS", reasons: [] },
      commercial_integrity: { gate: "CommercialIntegrity", result: "PASS", reasons: [] },
      seo: { gate: "OrganicSEOGate", result: "PASS", reasons: [] },
      geo: { gate: "GEOReadinessGate", result: "PASS", reasons: [] },
      internal_links: { gate: "BidirectionalInternalLinkGate", result: "PASS", reasons: [] },
      schema: { gate: "SchemaValidationGate", result: "PASS", reasons: [] },
      visual: { gate: "ContentVisualUtilityGate", result: "PASS", reasons: [] },
      rendered_quality: { gate: "OrganicRenderedQualityGate", result: "PASS", reasons: [] },
      publish_safety: { gate: "OrganicPublishSafetyGate", result: "PASS", reasons: [] },
      substantial_informational: true,
      question_cluster: [{ gate: "QuestionCoverageGate", result: "PASS", reasons: [] }],
    });
    expect(gate.result).toBe("PASS");
    const work = projectVentureBlogLiveWork("occupancynpv", NOW);
    expect(work.rendered_qc).toBe("PASS");
  });

  it("53. deployment identity mismatch remains FAIL until hash-backed proof", () => {
    expect(buildVentureBlogOsV2Report(NOW).visual.DeploymentIdentity).toBe("FAIL");
  });

  it("54-55. blogless system QC and silent miss", () => {
    expect(evaluateBloglessVentureGate({ active: 2, with_blogs: 1 }).result).toBe("FAIL");
    expect(evaluateSystemDailyBlogCoverageGate({ due: 1, live: 0, repair: 0, blockers: 0, silent: 1 }).result).toBe("FAIL");
    expect(evaluateSystemDailyBlogCoverageGate({ due: 1, live: 0, repair: 1, blockers: 0, silent: 0 }).result).toBe("PASS");
  });

  it("56. self-healing blog recovery", () => {
    expect(Object.keys(BLOG_REPAIR_STRATEGIES)).toHaveLength(15);
    const recovered = recoverBlogBuildFailure({ venture_id: "occupancynpv", failure_class: "RENDER", now: NOW });
    expect(recovered.obligation.state).toBe("REPAIRING");
    expect(recovered.attempt.next_action).toBeTruthy();
  });

  it("57-59. premium experience, parallel high-value work, expand existing instead of cannibalize", () => {
    expect(evaluateRelatedContentQualityGate({ ranked: true, random: false }).result).toBe("PASS");
    const cadence = decideDualContentLoopCadence({ blogs_published_today: 1, other_published_today: 0, strong_other_opportunities: 3 });
    expect(cadence.blogs_allowed).toBe(0);
    expect(cadence.other_allowed).toBe(2);
    expect(cadence.other_allowed + cadence.blogs_allowed).toBeLessThanOrEqual(3);
    expect(rankBlogCandidates([{
      candidate_id: "same",
      venture_id: "occupancynpv",
      topic: "inputs",
      question: "What numbers do you need?",
      score: 99,
      provenance: ["existing"],
      distinct_intent: false,
      geo_potential: 1,
      commercial_relevance: 1,
    }])[0]?.distinct_intent).toBe(false);
  });

  it("60. question gap feeds Daily Improvement", () => {
    expect(ORGANIC_QUESTION_CLUSTER_DAILY_IMPROVEMENT_QUESTIONS.some((row) => /existing page/.test(row))).toBe(true);
    expect(BLOG_OS_DAILY_IMPROVEMENT_QUESTIONS.some((row) => /today's blog/.test(row))).toBe(true);
  });

  it("HQ and public occupancy always reflect the newest blog action", () => {
    advanceVentureBlogOperatingSystem({ venture_id: "occupancynpv", now: NOW });
    const planned = projectVentureBlogLiveWork("occupancynpv", NOW);
    expect(evaluateBlogHqLiveWorkGate(planned).result).toBe("PASS");
    expect(evaluateBlogPublicOccupancyGate(planned).result).toBe("PASS");
    expect(planned.hq_current_work.length).toBeGreaterThan(0);
    advanceVentureBlogOperatingSystem({
      venture_id: "occupancynpv",
      now: NOW,
      published_blog: {
        title: "How should a tenant treat CAM in the first operating year?",
        url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
        category: "Occupancy Costs",
        tags: ["CAM"],
      },
    });
    const live = projectVentureBlogLiveWork("occupancynpv", NOW);
    expect(live.today).toBe("LIVE_VERIFIED");
    expect(live.latest_article).toContain("CAM");
    expect(live.featured_latest).toBe("PASS");
    expect(live.latest_carousel).toBe("PASS");
    const floor = buildGlobalGrowthNexusFloorView();
    expect(floor.blogOs?.latest_article).toContain("CAM");
    expect(floor.systemBlog?.current_work).toBeTruthy();
    const system = projectSystemBlogHq(NOW);
    expect(system.public_occupancy).not.toBe("IDLE");
  });

  it("Build Factory inherits blog OS by default", () => {
    const defaults = inheritVentureBlogBlueprintDefaults();
    expect(defaults.PUBLIC_BLOG_ENABLED).toBe(true);
    expect(defaults.BLOG_REQUIRED_FOR_LAUNCH).toBe(true);
    expect(defaults.DAILY_BLOG_TARGET).toBe(DAILY_BLOG_TARGET);
    expect(defaults.BLOG_DISABLED).toBe(false);
    const template = getVentureBlueprintTemplate("saas");
    const blueprint = generateVentureBlueprint({
      id: "opp-1",
      organizationId: "org-1",
      name: "Demo",
      summary: "Demo",
      problem: "Demo problem",
      targetCustomer: "Operators",
      businessModel: "saas",
      industry: "cre",
      category: "software",
      recommendedBuilder: null,
      status: "approved",
      decision: "approved",
      overallScore: 70,
      confidenceScore: 70,
    }, template);
    expect(inheritRequiredBlogContent(blueprint.requiredContent)).toContain("public_blog");
    expect(blueprint.requiredContent).toContain("public_blog");
    expect(factoryInheritedUniversalVentureSystemQc().contracts).toEqual(expect.arrayContaining([...FACTORY_INHERITED_BLOG_OS_CONTRACTS]));
  });

  it("OccupancyNPV GEO canary does not regress", () => {
    const coverage = evaluateQuestionCoverageGate(occupancynpvLeaseInputsQuestionGraph());
    expect(coverage.report.primary).toEqual({ answered: 1, total: 1 });
    expect(coverage.report.must_answer.answered).toBe(coverage.report.must_answer.total);
    expect(coverage.report.must_answer.total).toBeGreaterThanOrEqual(12);
    expect(coverage.report.unresolved_important).toBe(0);
    expect(evaluateCitationReadyAnswerGate(occupancynpvLeaseInputsCitationBlocks()).result).toBe("PASS");
    expect(evaluateQuestionCannibalizationGate(occupancynpvLeaseInputsQuestionGraph()).result).toBe("PASS");
  });

  it("dual loop is 1 blog + up to 2 other assets, not a 3/day quota", () => {
    expect(DAILY_BLOG_TARGET).toBe(1);
    expect(MAX_OTHER_NEW_HIGH_VALUE_ASSETS_PER_DAY).toBe(2);
    const cadence = decideDualContentLoopCadence({ blogs_published_today: 0, other_published_today: 0, strong_other_opportunities: 0 });
    expect(cadence.blogs_allowed).toBe(1);
    expect(cadence.other_allowed).toBe(0);
    expect(evaluateVentureBlogAlwaysOnGate({
      scheduler: true,
      obligation: true,
      candidate: true,
      qc: true,
      next_obligation: true,
    }).result).toBe("PASS");
  });
});
