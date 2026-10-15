import { describe, expect, it } from "vitest";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import {
  evaluateOccupancyNpvTargetPrepublishQc,
  pickOccupancyNpvAutonomousBacklogCandidate,
  rankOccupancyNpvAutonomousPublishRows,
} from "../portfolio-operating-backlog-publish-v1";
import {
  ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_ASSET_ID,
  ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_PATH,
  occupancynpvAutonomousBacklogAssetMeta,
} from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-autonomous-backlog-v1";
import {
  buildVentureNextBestGrowthActionsV1,
  ventureNextBestGrowthActionQc,
} from "../venture-next-best-growth-action-engine-v1";

describe("occupancynpv autonomous backlog v44.2", () => {
  it("registers unpublished gross vs net asset with prepublish PASS", () => {
    const articles = listOccupancyClubThrottleBacklogArticles();
    const row = articles.find((a) => a.asset_id === ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_ASSET_ID);
    expect(row?.registry_state).toBe("PUBLISHED");
    expect(row?.path).toBe(ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_PATH);
    const prepublish = evaluateOccupancyNpvTargetPrepublishQc({
      path: ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_PATH,
      articles,
    });
    expect(prepublish.OCCUPANCYNPV_TARGET_PREPUBLISH_QC).toBe("PASS");
    const ranked = rankOccupancyNpvAutonomousPublishRows(articles);
    expect(ranked.some((r) => r.article.asset_id === ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_ASSET_ID)).toBe(true);
    const pick = pickOccupancyNpvAutonomousBacklogCandidate(articles);
    expect(pick?.asset_id).toBe(ONPV_AUTONOMOUS_BACKLOG_GROSS_VS_NET_ASSET_ID);
  });

  it("portfolio next-best action selects the new ONPV asset", () => {
    const meta = occupancynpvAutonomousBacklogAssetMeta();
    const actions = buildVentureNextBestGrowthActionsV1();
    expect(ventureNextBestGrowthActionQc(actions)).toBe("PASS");
    const onpv = actions.find((a) => a.venture_name === "OccupancyNPV");
    expect(onpv?.selected_work_type).toBe(meta.asset_type);
  });
});
