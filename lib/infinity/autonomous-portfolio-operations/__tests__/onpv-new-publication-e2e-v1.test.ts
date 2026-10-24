import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { composeOccupancyNpvOrganicLiveFiles } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import { OCCUPANCYNPV_LIVE_CAP_RATE_PATH } from "@/lib/infinity/organic-growth-engine/continuous/urls";
import {
  evaluateOnpvBuildArtifactPublicationIdentity,
  injectOccupancyNpvBacklogPublicationsIntoSite,
} from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-backlog-publication-site-v1";
import { materializeOccupancyNpvContentCandidate } from "../occupancynpv-opportunity-materialization-v1";
import { resetOnpvDurableOpportunityStoreForTests } from "../occupancynpv-durable-opportunity-catalog-v1";
import { resetOnpvMaterializedBacklogOverlayForTests } from "../occupancynpv-materialized-backlog-overlay-v1";
import {
  markOnpvOpportunityBuilt,
  readOnpvOpportunityLifecycle,
} from "../onpv-durable-opportunity-state-v1";
import { evaluateOnpvPublicationIdentityParity, buildOnpvPublicationIdentityFromJobLineage } from "../onpv-publication-identity-v1";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";

const OPPORTUNITY_ID = "onpv-opp-ti-amortization-occupancy-cost-v1";
const SLUG = "how-ti-amortization-affects-occupancy-cost-for-tenants";
const PATH = `/blog/leasing/${SLUG}/`;
const CANONICAL = `https://occupancynpv.com${PATH.replace(/\/+$/, "")}`;

describe("onpv new publication e2e v1", () => {
  beforeEach(() => {
    resetOnpvDurableOpportunityStoreForTests();
    resetOnpvMaterializedBacklogOverlayForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function tiBuiltArticle() {
    const mat = await materializeOccupancyNpvContentCandidate({ opportunity_id: OPPORTUNITY_ID });
    expect(mat.outcome).not.toBe("FAIL");
    if (mat.outcome === "FAIL") throw new Error("materialize failed");
    await markOnpvOpportunityBuilt({ opportunity_id: OPPORTUNITY_ID });
    expect(readOnpvOpportunityLifecycle(OPPORTUNITY_ID)).toBe("BUILT");
    return mat.article!;
  }

  it("ONPV_NEW_PUBLICATION_DYNAMIC_ARTICLE_INJECTION_QC", async () => {
    const article = await tiBuiltArticle();
    const base = composeOccupancyNpvOrganicLiveFiles();
    const capRoute = `app${OCCUPANCYNPV_LIVE_CAP_RATE_PATH.replace(/\/+$/, "")}/page.tsx`;
    const capBefore = base.files.find((f) => f.path.replace(/\\/g, "/") === capRoute)?.content ?? "";
    const injected = injectOccupancyNpvBacklogPublicationsIntoSite(base.files, [article]);
    const tiRoute = `app${PATH.replace(/\/+$/, "")}/page.tsx`;
    expect(injected.injected_paths.some((p) => p.includes(SLUG))).toBe(true);
    expect(injected.files.some((f) => f.path.replace(/\\/g, "/") === tiRoute)).toBe(true);
    const capAfter = injected.files.find((f) => f.path.replace(/\\/g, "/") === capRoute)?.content ?? "";
    expect(capAfter).toBe(capBefore);
  });

  it("ONPV_BUILD_ARTIFACT_EXPECTED_ROUTE_QC", async () => {
    const article = await tiBuiltArticle();
    const composed = composeOccupancyNpvOrganicLiveFiles({ backlog_publications: [article] });
    const qc = evaluateOnpvBuildArtifactPublicationIdentity({ files: composed.files, article });
    expect(qc.ONPV_BUILD_ARTIFACT_EXPECTED_ROUTE_QC).toBe("PASS");
    expect(qc.ONPV_BUILD_ARTIFACT_ARTICLE_IDENTITY_QC).toBe("PASS");
    expect(composed.primary_publication_url).toBe(CANONICAL);
  });

  it("ONPV_WRONG_ARTICLE_ATTRIBUTION_E2E_QC", async () => {
    const article = await tiBuiltArticle();
    const composed = composeOccupancyNpvOrganicLiveFiles({ backlog_publications: [article] });
    expect(composed.primary_publication_url).not.toContain("how-is-cap-rate-calculated");
    const parity = evaluateOnpvPublicationIdentityParity({
      identity: buildOnpvPublicationIdentityFromJobLineage({
        lineage: {
          path: PATH,
          canonical_url: CANONICAL,
          asset_identity: "e6392c81e3f7dc7e89da7fb0f073a0e6",
          work_type: "NEW_PUBLICATION",
          slug: SLUG,
          opportunity_id: OPPORTUNITY_ID,
        },
        article,
        venture_id: CRE_VENTURE_ID,
      }),
      article,
      production_url: composed.primary_publication_url,
    });
    expect(parity.ONPV_PUBLICATION_IDENTITY_PARITY_QC).toBe("PASS");
  });

  it("TI_PUBLICATION_TEST_FAILS_WITH_STATIC_BUNDLE_BUG", () => {
    const base = composeOccupancyNpvOrganicLiveFiles();
    const tiRoute = `app${PATH.replace(/\/+$/, "")}/page.tsx`;
    expect(base.files.some((f) => f.path.replace(/\\/g, "/") === tiRoute)).toBe(false);
  });
});
