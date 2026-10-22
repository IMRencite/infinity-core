import { describe, expect, it } from "vitest";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import {
  evaluateOccupancyNpvTargetPrepublishQc,
  pickOccupancyNpvAutonomousBacklogCandidate,
  rankOccupancyNpvAutonomousPublishRows,
} from "../portfolio-operating-backlog-publish-v1";
import {
  ONPV_AUTONOMOUS_BACKLOG_EXPENSE_STOP_BASE_YEAR_ASSET_ID,
  ONPV_AUTONOMOUS_BACKLOG_FREE_RENT_ECONOMICS_ASSET_ID,
  ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_ASSET_ID,
  ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_PATH,
} from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-autonomous-backlog-v1";
import {
  buildVentureNextBestGrowthActionsV1,
  ventureNextBestGrowthActionQc,
} from "../venture-next-best-growth-action-engine-v1";

describe("occupancynpv autonomous backlog v44.2", () => {
  it("excludes published gross-vs-net and expense-stop from new-publication ranking; free-rent is next pick", () => {
    const articles = listOccupancyClubThrottleBacklogArticles();
    const gross = articles.find((a) => a.asset_id === ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_ASSET_ID);
    expect(gross?.registry_state).toBe("PUBLISHED");
    expect(gross?.path).toBe(ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_PATH);
    const expenseStop = articles.find((a) => a.asset_id === ONPV_AUTONOMOUS_BACKLOG_EXPENSE_STOP_BASE_YEAR_ASSET_ID);
    expect(expenseStop?.registry_state).toBe("PUBLISHED");
    const freeRent = articles.find((a) => a.asset_id === ONPV_AUTONOMOUS_BACKLOG_FREE_RENT_ECONOMICS_ASSET_ID);
    expect(freeRent?.registry_state).toBe("PUBLISHED");
    const prepublish = evaluateOccupancyNpvTargetPrepublishQc({
      path: ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_PATH,
      articles,
    });
    expect(prepublish.OCCUPANCYNPV_TARGET_PREPUBLISH_QC).toBe("PASS");
    const ranked = rankOccupancyNpvAutonomousPublishRows(articles);
    expect(ranked.some((r) => r.article.asset_id === ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_ASSET_ID)).toBe(false);
    expect(ranked.some((r) => r.article.asset_id === ONPV_AUTONOMOUS_BACKLOG_EXPENSE_STOP_BASE_YEAR_ASSET_ID)).toBe(false);
    expect(ranked.some((r) => r.article.asset_id === ONPV_AUTONOMOUS_BACKLOG_FREE_RENT_ECONOMICS_ASSET_ID)).toBe(false);
    expect(pickOccupancyNpvAutonomousBacklogCandidate(articles)).toBeNull();
  });

  it("portfolio next-best action selects lease cluster maintenance when publish queue is empty", () => {
    const actions = buildVentureNextBestGrowthActionsV1();
    expect(ventureNextBestGrowthActionQc(actions)).toBe("PASS");
    const onpv = actions.find((a) => a.venture_name === "OccupancyNPV");
    expect(onpv?.selected_work_type).toBe("INTERNAL_LINK_UPDATE");
    expect(onpv?.next_best_growth_action.toLowerCase()).toMatch(/maintain|internal-link|cluster|lease/);
    expect(pickOccupancyNpvAutonomousBacklogCandidate()).toBeNull();
  });
});
