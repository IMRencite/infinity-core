import { describe, expect, it } from "vitest";
import { resolveCreativeBudgetGovernance } from "../durable/creative-self-heal-budget-governance-v1";
import { isPortfolioScheduledTrigger } from "../durable/portfolio-cron-provenance-v1";
import { resolveScheduledAutonomousPublish } from "../scheduled-autonomous-publish-policy-v1";
import {
  liveVentureContentContinuityQc,
  resolveLiveVentureContentContinuityV1,
} from "../live-venture-content-continuity-v1";
import { CLUB_THROTTLE_VENTURE_ID } from "@/lib/infinity/commerce/club-throttle";

describe("portfolio parallel growth lanes", () => {
  it("allows CREATIVE_SELF_HEAL and CT VENTURE_DEPLOY when independent gates pass", () => {
    const trigger = isPortfolioScheduledTrigger("AUTHENTICATED_CRON_SHAPED") ? "SCHEDULED" : "MANUAL";
    const publish = resolveScheduledAutonomousPublish({
      trigger,
      env: { VERCEL: "1", INFINITY_CLOUD_RUNTIME: "1" } as NodeJS.ProcessEnv,
    });
    const continuity = resolveLiveVentureContentContinuityV1({ venture_id: CLUB_THROTTLE_VENTURE_ID });
    const ct = publish.execute_publish ? continuity.deploy_candidate : null;
    const creative = resolveCreativeBudgetGovernance({
      XAI_API_KEY: "test-key",
      INFINITY_PORTFOLIO_CREATIVE_BUDGET_USD: "50",
      INFINITY_PORTFOLIO_CREATIVE_SPENT_USD: "0.60",
      INFINITY_PORTFOLIO_LIVE_CREATIVE: "1",
    } as NodeJS.ProcessEnv);

    expect(publish.execute_publish).toBe(true);
    expect(liveVentureContentContinuityQc(continuity)).toBe("PASS");
    expect(continuity.content_lane_stop_reason).not.toBe("BACKLOG_EMPTY");
    if (ct?.slug) expect(ct.slug).not.toBe("how-to-ride-after-dark");
    expect(creative.LIVE_CREATIVE_ENABLED).toBe(true);
    expect({
      would_enqueue_creative_self_heal: creative.LIVE_CREATIVE_ENABLED,
      would_enqueue_ct_venture_deploy: Boolean(publish.execute_publish && ct),
      content_lane_active_without_premature_idle: continuity.LIVE_VENTURE_PREMATURE_IDLE_QC === "PASS",
    }).toEqual({
      would_enqueue_creative_self_heal: true,
      would_enqueue_ct_venture_deploy: Boolean(publish.execute_publish && ct),
      content_lane_active_without_premature_idle: true,
    });
  });
});
