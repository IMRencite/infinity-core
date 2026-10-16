import { describe, expect, it } from "vitest";
import { resolveCreativeBudgetGovernance } from "../durable/creative-self-heal-budget-governance-v1";
import { isPortfolioScheduledTrigger } from "../durable/portfolio-cron-provenance-v1";
import { resolveScheduledAutonomousPublish } from "../scheduled-autonomous-publish-policy-v1";
import { pickClubThrottleAutonomousBacklogCandidate } from "../portfolio-operating-backlog-publish-v1";

describe("portfolio parallel growth lanes", () => {
  it("allows CREATIVE_SELF_HEAL and CT VENTURE_DEPLOY when independent gates pass", () => {
    const trigger = isPortfolioScheduledTrigger("AUTHENTICATED_CRON_SHAPED") ? "SCHEDULED" : "MANUAL";
    const publish = resolveScheduledAutonomousPublish({
      trigger,
      env: { VERCEL: "1", INFINITY_CLOUD_RUNTIME: "1" } as NodeJS.ProcessEnv,
    });
    const ct = publish.execute_publish ? pickClubThrottleAutonomousBacklogCandidate() : null;
    const creative = resolveCreativeBudgetGovernance({
      XAI_API_KEY: "test-key",
      INFINITY_PORTFOLIO_CREATIVE_BUDGET_USD: "50",
      INFINITY_PORTFOLIO_CREATIVE_SPENT_USD: "0.60",
      INFINITY_PORTFOLIO_LIVE_CREATIVE: "1",
    } as NodeJS.ProcessEnv);

    expect(publish.execute_publish).toBe(true);
    expect(ct?.slug).toBe("how-to-ride-after-dark");
    expect(creative.LIVE_CREATIVE_ENABLED).toBe(true);
    expect({
      would_enqueue_creative_self_heal: creative.LIVE_CREATIVE_ENABLED,
      would_enqueue_ct_venture_deploy: Boolean(publish.execute_publish && ct),
    }).toEqual({
      would_enqueue_creative_self_heal: true,
      would_enqueue_ct_venture_deploy: true,
    });
  });
});
