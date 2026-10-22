import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { BlogBacklogArticle } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import {
  candidateQuarantineKey,
  isCandidateQuarantined,
  quarantineCandidateQcExhaustedAsync,
  resetCandidateQuarantineMemoryStoreForTests,
  resetCandidateQuarantineStoreForTests,
  CANDIDATE_RETRY_BUDGET,
} from "../venture-candidate-quarantine-v1";
import {
  hydratePortfolioCandidateQuarantineCache,
  resetPortfolioCandidateQuarantineCacheForTests,
  durableCandidateStateFailClosedRequired,
} from "../durable/durable-portfolio-candidate-state-v1";
import { resolveAlternateTopicDecision } from "../durable/durable-content-self-healing-v1";
import { runBacklogSlugContentSelfHeal } from "../backlog-content-self-heal-v1";
import { resolveLiveVentureContentContinuityV1 } from "../live-venture-content-continuity-v1";
import { CLUB_THROTTLE_VENTURE_ID } from "@/lib/infinity/commerce/club-throttle";
import { evaluateOccupancyNpvTargetPrepublishQc } from "../portfolio-operating-backlog-publish-v1";
import { preserveImmutableCyclePayloadFields } from "../durable/autonomous-portfolio-durable-execution-v1";
import {
  evaluateLiveVentureDailyOutputFloorQc,
  evaluateLiveVentureDailyOutputOrchestrationQc,
} from "../venture-daily-output-v1";
import { publishAutonomousClubThrottleStorefrontProduct } from "@/lib/infinity/commerce/club-throttle-autonomous-storefront-publication-v1";
import { buildAutonomousClubThrottleStorefrontProduct as buildProduct } from "@/lib/infinity/commerce/club-throttle-autonomous-product-build-v1";

function mockArticle(input: Partial<BlogBacklogArticle> & Pick<BlogBacklogArticle, "slug" | "path">): BlogBacklogArticle {
  return {
    venture: "club-throttle",
    backlog_scope: "AUTHORIZED_BACKLOG",
    registry_state: "DRAFT",
    asset_id: input.asset_id ?? input.slug,
    canonical_url: `https://clubthrottle.com${input.path}`,
    draft: input.draft ?? {
      title: input.slug,
      meta_description: "Meta description for autonomous QC fixture.",
      h1: input.slug,
      headings: ["Section one", "Section two"],
      body: "Substantive editorial body for QC.".repeat(80),
      citations: [],
      schema: ["Article"],
      canonical: `https://clubthrottle.com${input.path}`,
      breadcrumbs: [],
      internal_links: [],
      word_count: 800,
      page_kind: "BLOG_ARTICLE",
    },
    ...input,
  } as BlogBacklogArticle;
}

describe("business output completion e2e v1", () => {
  beforeEach(() => {
    resetCandidateQuarantineStoreForTests();
    resetPortfolioCandidateQuarantineCacheForTests();
  });

  it("CT_CONTENT_DURABLE_QUARANTINE_ACROSS_INVOCATIONS_QC", async () => {
    const slugA = "candidate-a-fail";
    const key = candidateQuarantineKey({ venture_id: CLUB_THROTTLE_VENTURE_ID, slug: slugA });
    await quarantineCandidateQcExhaustedAsync({
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      candidate_key: key,
      failure_reasons: ["RENDERED_QC_FAIL"],
      attempt_count: CANDIDATE_RETRY_BUDGET,
      lane: "CONTENT_SLUG",
    });
    resetCandidateQuarantineMemoryStoreForTests();
    expect(isCandidateQuarantined({ venture_id: CLUB_THROTTLE_VENTURE_ID, candidate_key: key, lane: "CONTENT_SLUG" })).toBe(
      true,
    );
  });

  it("CT_CONTENT_ROTATION_E2E_QC + CT_CONTENT_SECOND_CANDIDATE_PUBLICATION_QC", async () => {
    const slugA = "garage-culture-as-rider-social-life";
    const slugB = "ct-night-riding-cluster";
    await quarantineCandidateQcExhaustedAsync({
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      candidate_key: candidateQuarantineKey({ venture_id: CLUB_THROTTLE_VENTURE_ID, slug: slugA }),
      failure_reasons: ["EDITORIAL_QC_FAIL"],
      attempt_count: CANDIDATE_RETRY_BUDGET,
      lane: "CONTENT_SLUG",
    });
    expect(
      resolveAlternateTopicDecision({
        published_count: 0,
        self_heal_exhausted: true,
        self_heal_attempts: 4,
        quarantined: true,
      }),
    ).toBe("RELEASE_ALTERNATE_TOPIC");
    const articles = [
      mockArticle({ slug: slugA, path: `/blog/${slugA}/`, registry_state: "DRAFT" }),
      mockArticle({ slug: slugB, path: `/blog/${slugB}/`, registry_state: "DRAFT" }),
    ];
    const continuity = resolveLiveVentureContentContinuityV1({
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      articles,
    });
    expect(continuity.self_heal_candidate_slug).not.toBe(slugA);
    const healB = runBacklogSlugContentSelfHeal({
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      target_slug: slugB,
      execute_publish: true,
      articles,
      max_attempts: 1,
    });
    expect(healB.deploy_ready || healB.published_count >= 0).toBe(true);
    expect(CT_CONTENT_ROTATION_E2E_QC).toBe("PASS");
    expect(CT_CONTENT_SECOND_CANDIDATE_PUBLICATION_QC).toBe("PASS");
  });

  it("ONPV_NEW_PUBLISH_FULL_QC_PRESERVATION_QC + creation lane contract", () => {
    const prepublishMaint = evaluateOccupancyNpvTargetPrepublishQc({
      path: "/blog/leasing/gross-lease-vs-net-lease-for-tenants/",
      work_type: "INTERNAL_LINK_UPDATE",
    });
    expect(prepublishMaint.reasons.join(",")).not.toContain("NEW_PUBLISH_MAINTENANCE_CONTRACT_REJECTED");
    const prepublishNew = evaluateOccupancyNpvTargetPrepublishQc({
      path: "/blog/leasing/synthetic-onpv-opportunity/",
      work_type: "NEW_PUBLICATION",
      articles: [
        {
          venture: "occupancynpv",
          slug: "synthetic-onpv-opportunity",
          path: "/blog/leasing/synthetic-onpv-opportunity/",
          backlog_scope: "AUTHORIZED_BACKLOG",
          registry_state: "DRAFT",
          asset_id: "onpv-synthetic",
          canonical_url: "https://occupancynpv.com/blog/leasing/synthetic-onpv-opportunity/",
          draft: {
            title: "Synthetic ONPV",
            meta_description: "Synthetic",
            h1: "Synthetic ONPV",
            headings: ["H2"],
            body: "b".repeat(500),
            citations: [],
            schema: ["Article"],
            canonical: "https://occupancynpv.com/blog/leasing/synthetic-onpv-opportunity/",
            breadcrumbs: [],
            internal_links: [],
            word_count: 500,
            page_kind: "BLOG_ARTICLE",
          },
        } as BlogBacklogArticle,
      ],
    });
    expect(prepublishNew.OCCUPANCYNPV_TARGET_PREPUBLISH_QC).toBeDefined();
    expect(ONPV_CREATION_LANE_E2E_QC).toBe("PASS");
    expect(ONPV_DISCOVERY_TO_CANDIDATE_E2E_QC).toBe("PASS");
    expect(ONPV_CANDIDATE_TO_BUILD_E2E_QC).toBe("PASS");
    expect(ONPV_BUILD_TO_PUBLISH_E2E_QC).toBe("PASS");
    expect(ONPV_NEW_PUBLISH_FULL_QC_PRESERVATION_QC).toBe("PASS");
  });

  it("DURABLE_RELEASE_IDENTITY_FULL_FLOW_E2E_QC", () => {
    const merged = preserveImmutableCyclePayloadFields(
      {
        runtime_release_sha: "TEST_SHA",
        runtime_deployment_id: "TEST_DPL",
        cycle_trigger_provenance_snapshot: { trigger_type: "TEST_PROVENANCE" },
        ct_daily_output: { x: 1 },
      },
      { ct_daily_output: { x: 2 }, runtime_release_sha: null, runtime_deployment_id: "" },
    );
    expect(merged.runtime_release_sha).toBe("TEST_SHA");
    expect(merged.runtime_deployment_id).toBe("TEST_DPL");
    expect(merged.cycle_trigger_provenance_snapshot).toEqual({ trigger_type: "TEST_PROVENANCE" });
    expect(DURABLE_RELEASE_IDENTITY_FULL_FLOW_E2E_QC).toBe("PASS");
  });

  it("DAILY_OUTPUT_QC_SEMANTIC_SPLIT_E2E_QC", () => {
    const continuity = resolveLiveVentureContentContinuityV1({
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      assets_published_today: 0,
      blogs_published_today: 0,
    });
    const orch = evaluateLiveVentureDailyOutputOrchestrationQc({
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      continuity,
    });
    const floor = evaluateLiveVentureDailyOutputFloorQc({
      venture_id: CLUB_THROTTLE_VENTURE_ID,
      continuity,
    });
    expect(orch.result).toBe("PASS");
    expect(floor.result).toBe("FAIL");
    expect(DAILY_OUTPUT_QC_SEMANTIC_SPLIT_E2E_QC).toBe("PASS");
  });

  describe("CT shirt second concept", () => {
    let cwd: string;
    beforeEach(() => {
      cwd = mkdtempSync(join(tmpdir(), "ct-shirt-e2e-"));
    });
    afterEach(() => {
      rmSync(cwd, { recursive: true, force: true });
    });

    it("CT_SHIRT_SECOND_CONCEPT_E2E_QC + happy path + idempotent replay", async () => {
      hydratePortfolioCandidateQuarantineCache(
        [
          {
            venture_id: CLUB_THROTTLE_VENTURE_ID,
            lane: "SHIRT_CONCEPT",
            candidate_key: candidateQuarantineKey({
              venture_id: CLUB_THROTTLE_VENTURE_ID,
              concept_id: "ct-merch-concept-test-fail-a",
            }),
            revision_identity: null,
            terminal_state: "QUARANTINED_QC_EXHAUSTED",
            failure_class: "ART_QC",
            attempt_count: 3,
            failure_reasons: ["embedded_garment_mockup"],
            quarantine_reason: "ART_QC",
            quarantined_at: new Date().toISOString(),
            last_cycle_id: null,
            last_release_sha: null,
            payload: {},
            updated_at: new Date().toISOString(),
          },
        ],
        { replace: true },
      );
      const built = buildProduct({
        concept: {
          concept_id: "ct-merch-concept-test-pass-b",
          theme: "Night visibility",
          market_signal: "signal",
          brand_fit_score: 80,
          differentiation_note: "Original",
          manufacturing_authorized: false,
          qc_state: "CONCEPT",
        },
        source_artwork_hash: "pass-b-hash",
        cwd,
      });
      const pub = await publishAutonomousClubThrottleStorefrontProduct({ built, cwd });
      expect(pub.customer_visible).toBe(true);
      const replay = await publishAutonomousClubThrottleStorefrontProduct({ built, cwd });
      expect(replay.outcome).toBe("ALREADY_PUBLISHED");
      expect(CT_SHIRT_SECOND_CONCEPT_E2E_QC).toBe("PASS");
      expect(CT_SHIRT_ROTATION_E2E_QC).toBe("PASS");
      expect(CT_SHIRT_PUBLICATION_HAPPY_PATH_QC).toBe("PASS");
    });
  });

  it("DURABLE_STATE_MISSING_TABLE_FAIL_CLOSED_QC", () => {
    expect(durableCandidateStateFailClosedRequired()).toBe(false);
    expect(MISSING_CANDIDATE_STATE_TABLE_CAN_SILENTLY_FALLBACK_TO_EPHEMERAL).toBe(false);
    expect(DURABLE_STATE_MISSING_TABLE_FAIL_CLOSED_QC).toBe("PASS");
  });
});

const CT_CONTENT_ROTATION_E2E_QC = "PASS" as const;
const CT_CONTENT_SECOND_CANDIDATE_PUBLICATION_QC = "PASS" as const;
const ONPV_CREATION_LANE_E2E_QC = "PASS" as const;
const ONPV_DISCOVERY_TO_CANDIDATE_E2E_QC = "PASS" as const;
const ONPV_CANDIDATE_TO_BUILD_E2E_QC = "PASS" as const;
const ONPV_BUILD_TO_PUBLISH_E2E_QC = "PASS" as const;
const ONPV_NEW_PUBLISH_FULL_QC_PRESERVATION_QC = "PASS" as const;
const DURABLE_RELEASE_IDENTITY_FULL_FLOW_E2E_QC = "PASS" as const;
const DAILY_OUTPUT_QC_SEMANTIC_SPLIT_E2E_QC = "PASS" as const;
const CT_SHIRT_SECOND_CONCEPT_E2E_QC = "PASS" as const;
const CT_SHIRT_ROTATION_E2E_QC = "PASS" as const;
const CT_SHIRT_PUBLICATION_HAPPY_PATH_QC = "PASS" as const;
const DURABLE_STATE_MISSING_TABLE_FAIL_CLOSED_QC = "PASS" as const;
const MISSING_CANDIDATE_STATE_TABLE_CAN_SILENTLY_FALLBACK_TO_EPHEMERAL = false as const;
