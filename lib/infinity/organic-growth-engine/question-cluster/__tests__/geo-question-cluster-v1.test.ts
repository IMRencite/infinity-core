import { describe, expect, it } from "vitest";
import { generateOrganicDraft } from "../../continuous/cycle";
import { occupancynpvLeaseInputsDraft, occupancynpvLeaseInputsPageSource } from "../../continuous/occupancynpv-lease-inputs-page";
import { evaluateOrganicProductionPublishGate } from "../../obligation/gates";
import { evaluateAnswerRedundancyGate, evaluateCitationReadyAnswerGate, evaluateFaqStuffingGate, evaluateNaturalAnswerReadabilityGate, evaluateQuestionCannibalizationGate, evaluateQuestionCoverageGate, evaluateQuestionIntentOwnershipGate, applyVocQuestionSignal, buildOrganicQuestionGapReport } from "../geo-question-cluster";
import {
  occupancynpvLeaseInputsCitationBlocks,
  occupancynpvLeaseInputsCluster,
  occupancynpvLeaseInputsQuestionGraph,
} from "../occupancynpv-lease-inputs-cluster";
import {
  buildAutonomousQuestionCoverageGraph,
  evaluateAndRemakeSubstantialOrganicDraft,
  preferExistingPageExpansion,
  remakeOrganicDraftToQuestionClusterStandard,
  venturePageNeedsQuestionClusterStandard,
} from "../remake-to-standard";
import { evaluateVentureQuestionClusterStandard, ORGANIC_QUESTION_CLUSTER_DAILY_IMPROVEMENT_QUESTIONS } from "../venture-content-standard";

function publishGate(clusterPass: boolean, substantial = true) {
  return evaluateOrganicProductionPublishGate({
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
    substantial_informational: substantial,
    question_cluster: clusterPass
      ? [{ gate: "QuestionCoverageGate", result: "PASS", reasons: [] }]
      : [{ gate: "QuestionCoverageGate", result: "FAIL", reasons: ["MUST_ANSWER_UNRESOLVED"] }],
  });
}

describe("GEO question cluster + citation readiness V1", () => {
  const graph = occupancynpvLeaseInputsQuestionGraph();
  const source = occupancynpvLeaseInputsPageSource();
  const draft = occupancynpvLeaseInputsDraft();
  const coverage = evaluateQuestionCoverageGate(graph);

  it("1. primary question answered", () => {
    expect(coverage.report.primary.answered).toBe(coverage.report.primary.total);
    expect(source).toContain("id=\"direct-answer\"");
    expect(draft.direct_answer).toMatch(/Rent alone is not a comparison/);
  });

  it("2. must-answer cluster complete", () => {
    expect(coverage.report.must_answer.answered).toBe(coverage.report.must_answer.total);
    expect(coverage.report.must_answer.total).toBeGreaterThanOrEqual(12);
    expect(coverage.result).toBe("PASS");
  });

  it("3. missing must-answer causes FAIL", () => {
    const broken = graph.map((row) => row.question_class === "MUST_ANSWER" ? { ...row, coverage_state: "NOT_COVERED" as const } : row);
    expect(evaluateQuestionCoverageGate(broken).result).toBe("FAIL");
  });

  it("4. shallow FAQ stuffing fails", () => {
    expect(evaluateFaqStuffingGate({ faq_count: 25, headings_are_questions: 1, unique_sections: 2 }).result).toBe("FAIL");
    expect(source.match(/<h3>/g)?.length ?? 0).toBeLessThan(4);
  });

  it("5. same-intent question remains on primary page", () => {
    const rentOnly = graph.find((row) => row.question.includes("only need rent"));
    expect(rentOnly?.ownership).toBe("SAME_PAGE");
    expect(source).toContain("id=\"only-rent\"");
  });

  it("6. distinct-intent question routed to separate page", () => {
    const npv = graph.find((row) => row.question.includes("calculate NPV"));
    expect(npv?.ownership).toBe("EXISTING_PAGE");
    expect(npv?.coverage_state).toBe("ROUTED_TO_EXISTING_PAGE");
    expect(source).toContain("/commercial-lease-npv/what-is-npv-in-a-commercial-lease/");
  });

  it("7. existing-page-owned question does not create duplicate URL", () => {
    const renewal = graph.find((row) => row.question.includes("renewal versus relocation in detail"));
    expect(renewal?.ownership).toBe("EXISTING_PAGE");
    expect(evaluateQuestionCannibalizationGate(graph).result).toBe("PASS");
  });

  it("8. citation-ready direct answer", () => {
    const blocks = occupancynpvLeaseInputsCitationBlocks();
    expect(blocks[0]?.self_contained).toBe(true);
    expect(blocks[0]?.answer).not.toMatch(/as discussed above/);
    expect(source).toContain("data-citation-ready=\"true\"");
  });

  it("9. vague/non-self-contained answer fails", () => {
    expect(evaluateCitationReadyAnswerGate([{
      question: "What numbers?",
      heading_id: "x",
      answer: "As discussed above, it depends.",
      self_contained: false,
      claims: [],
      evidence_requirement: "NONE",
      sources: [],
      citation_suitability: "NOT_READY",
    }]).result).toBe("FAIL");
  });

  it("10. evidence-required claim lacks evidence and fails", () => {
    expect(evaluateCitationReadyAnswerGate([{
      question: "What numbers come from the lease?",
      heading_id: "from-the-lease",
      answer: "Take starting rent, term dates, increase language, and CAM from the proposal or signed lease documents.",
      self_contained: true,
      claims: ["from the lease"],
      evidence_requirement: "EXTERNAL",
      sources: [],
      citation_suitability: "READY",
    }]).result).toBe("FAIL");
  });

  it("11. product claim resolves ProductTruth", () => {
    const product = occupancynpvLeaseInputsCitationBlocks().find((row) => row.heading_id === "occupancynpv-needs");
    expect(product?.evidence_requirement).toBe("PRODUCT_TRUTH");
    expect(product?.answer).toMatch(/3-day free trial/);
    expect(product?.answer).toMatch(/does not invent/);
  });

  it("12. repeated answer blocks fail redundancy", () => {
    const same = "Include more than rent when you compare two commercial leases because extras change cash.";
    expect(evaluateAnswerRedundancyGate([same, same]).result).toBe("FAIL");
  });

  it("13. natural readable direct answers pass", () => {
    expect(evaluateNaturalAnswerReadabilityGate(occupancynpvLeaseInputsCitationBlocks().map((row) => row.answer)).result).toBe("PASS");
  });

  it("14. long useful page passes", () => {
    expect(draft.word_count).toBeGreaterThan(300);
    expect(source.split(/\s+/).length).toBeGreaterThan(600);
    expect(source).toContain("Worked teaching sample");
    expect(coverage.result).toBe("PASS");
  });

  it("15. long filler page fails", () => {
    expect(evaluateFaqStuffingGate({ faq_count: 20, headings_are_questions: 0, unique_sections: 1 }).result).toBe("FAIL");
  });

  it("16. question graph updates after VOC signal", () => {
    const next = applyVocQuestionSignal(graph, { question: "What do I need?", source: "SALES" });
    const hit = next.find((row) => /what numbers|what do i need/i.test(row.question));
    expect(hit?.sales_signal === "RECURRING" || hit?.importance_score).toBeTruthy();
  });

  it("17. existing page expansion preferred over cannibalizing page", () => {
    const decision = preferExistingPageExpansion({
      question: "How do you compare two commercial lease options?",
      current_url: "/new-thin-compare/",
      existing_pages: [{ url: "/lease-comparison/how-do-you-compare-two-commercial-lease-options/", question: "How do you compare two commercial lease options?" }],
    });
    expect(decision.expand).toBe(true);
    expect(evaluateQuestionIntentOwnershipGate(graph).result).toBe("PASS");
  });

  it("18. question gap report generated", () => {
    const gaps = buildOrganicQuestionGapReport(graph);
    expect(Array.isArray(gaps)).toBe(true);
    expect(gaps.some((row) => row.recommended_action === "PLAN_SEPARATE_PAGE")).toBe(true);
  });

  it("19. GEO gate integrated into publish gate", () => {
    expect(publishGate(true).result).toBe("PASS");
    expect(publishGate(false).result).toBe("FAIL");
    expect(publishGate(true, false).result).toBe("PASS");
  });

  it("20. visual QC still encoded after page expansion", () => {
    expect(source).toContain("pv-toc");
    expect(source).toContain("id=\"lower-rent-higher-cost\"");
    expect(source).toContain("className=\"pv-fin-table\"");
  });

  it("21. mobile navigation works on longer resource", () => {
    expect(source).toContain("aria-label=\"On this page\"");
    expect(source).toContain("href=\"#missing-number\"");
  });

  it("22. schema remains valid", () => {
    expect(draft.schema).toContain("FAQPage");
    expect(draft.visible_faqs?.length).toBeLessThan(4);
    expect(draft.canonical).toBe("/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/");
  });

  it("23. autonomous future page creates its own graph", () => {
    const future = buildAutonomousQuestionCoverageGraph({
      venture_id: "occupancynpv",
      asset_id: "future-cap-rate",
      canonical_url: "/commercial-real-estate/valuation/how-is-cap-rate-calculated/",
      primary_question: "How is cap rate calculated?",
      topic: "Cap Rates",
      content_type: "EVERGREEN_QUESTION",
      body: "Cap rate equals NOI divided by value.",
    });
    expect(future.some((row) => row.question_class === "PRIMARY")).toBe(true);
    expect(future.some((row) => row.question_class === "MUST_ANSWER")).toBe(true);
    expect(occupancynpvLeaseInputsCluster().questions_owned.length).toBeGreaterThan(10);
  });

  it("future pages that miss the standard are remade before publish", () => {
    const thin = generateOrganicDraft({
      question: "How is cap rate calculated?",
      topic: "Cap Rates",
      url: "/commercial-real-estate/valuation/how-is-cap-rate-calculated/",
      links: ["/"],
      breadcrumbs: ["Home"],
    });
    thin.body = "Cap rate is useful. Include more than rent.";
    thin.headings = ["Overview"];
    thin.visible_faqs = Array.from({ length: 16 }, (_, index) => ({ question: `FAQ ${index}?`, answer: "Include more than rent." }));
    const remade = evaluateAndRemakeSubstantialOrganicDraft({
      draft: thin,
      venture_id: "occupancynpv",
      asset_id: "cap-rate",
      question: "How is cap rate calculated?",
      topic: "Cap Rates",
      content_type: "EVERGREEN_QUESTION",
      url: thin.canonical,
    });
    expect(remade.remade).toBe(true);
    expect(remade.graph.some((row) => row.question_class === "PRIMARY")).toBe(true);
    expect(remade.draft.headings.some((row) => /\?/.test(row))).toBe(true);
    expect((remade.draft.visible_faqs?.length ?? 0) <= 3).toBe(true);
  });

  it("the same QC standard applies to every venture and remakes off-standard pages", () => {
    expect(venturePageNeedsQuestionClusterStandard({ role: "QUESTION_PAGE" })).toBe(true);
    expect(venturePageNeedsQuestionClusterStandard({ page_type: "LOGIN" })).toBe(false);
    const other = evaluateVentureQuestionClusterStandard({
      venture_id: "other-venture",
      role: "QUESTION_PAGE",
      html: "<h1>What is a term?</h1><h2>FAQ</h2>" + Array.from({ length: 16 }, (_, index) => `<h3>Q${index}?</h3><p>Include more than rent.</p>`).join(""),
      route: "/guide/what-is-a-term/",
    });
    expect(other.applies).toBe(true);
    expect(other.overall.result).toBe("FAIL");
    expect(other.remake_required).toBe(true);
    const login = evaluateVentureQuestionClusterStandard({
      venture_id: "other-venture",
      page_type: "LOGIN",
      role: "LOGIN",
      html: "<h1>Sign in</h1>",
      route: "/login",
    });
    expect(login.applies).toBe(false);
    const rebuilt = remakeOrganicDraftToQuestionClusterStandard({
      draft: generateOrganicDraft({
        question: "What is a term?",
        topic: "Lease term",
        url: "/guide/what-is-a-term/",
        links: [],
        breadcrumbs: ["Home"],
      }),
      graph: buildAutonomousQuestionCoverageGraph({
        venture_id: "other-venture",
        asset_id: "term",
        canonical_url: "/guide/what-is-a-term/",
        primary_question: "What is a term?",
        topic: "Lease term",
        content_type: "EVERGREEN_QUESTION",
        body: "Term is the window of cash.",
      }),
    });
    expect(rebuilt.remade).toBe(true);
    expect(rebuilt.draft.body).toMatch(/SBA/);
    expect(ORGANIC_QUESTION_CLUSTER_DAILY_IMPROVEMENT_QUESTIONS.length).toBeGreaterThanOrEqual(8);
  });
});
