import { occupancynpvPublishedBlogPosts } from "../../continuous/occupancynpv-blog-catalog";
import type { DayAccountingStatus } from "./types";

export type DayAccount = {
  operating_date: string;
  status: DayAccountingStatus;
  evidence: string;
  candidate_id: string | null;
  expected_url: string | null;
};

export function accountOccupancyNpvDays(input: {
  now: string;
  public: {
    blog_index_ok: boolean;
    sitemap: string;
    cam_status: number;
    interest_status: number;
    index_has_sep18: boolean;
    index_has_sep19: boolean;
    index_has_sep17: boolean;
  };
}): DayAccount[] {
  const catalog = occupancynpvPublishedBlogPosts();
  const catalogDates = new Set(catalog.map((row) => row.published));
  const sitemap = input.public.sitemap;
  const liveInterest = input.public.interest_status === 200;
  const liveCam = input.public.cam_status === 200;
  const sep17Live = catalogDates.has("2026-09-17") && liveInterest && (sitemap.includes("how-interest-rates-affect-commercial-property-values") || input.public.index_has_sep17);

  function missedOrUnmeasured(date: string, hinted: boolean): DayAccount {
    if (catalogDates.has(date) || hinted) {
      return {
        operating_date: date,
        status: "NOT_MEASURED",
        evidence: "catalog_or_index_hint_without_live_url",
        candidate_id: null,
        expected_url: null,
      };
    }
    return {
      operating_date: date,
      status: "MISSED",
      evidence: "catalog+sitemap+index_no_article; latest_live=2026-09-17",
      candidate_id: null,
      expected_url: null,
    };
  }

  return [
    missedOrUnmeasured("2026-09-18", input.public.index_has_sep18),
    missedOrUnmeasured("2026-09-19", input.public.index_has_sep19),
    {
      operating_date: "2026-09-20",
      status: liveCam ? "LIVE_VERIFIED" : "MISSED",
      evidence: liveCam ? "public_cam_url" : "expected_/blog/occupancy-costs/cam-first-year/_absent; catalog_latest=2026-09-17",
      candidate_id: "cand:cam-operating-year",
      expected_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
    },
    {
      operating_date: "2026-09-21",
      status: Date.parse(input.now) > Date.parse("2026-09-22T03:59:59.000Z") ? "MISSED" : "DUE",
      evidence: "blog-os_planned_cam_candidate; not_live_verified",
      candidate_id: "cand:cam-operating-year",
      expected_url: "https://occupancynpv.com/blog/occupancy-costs/cam-first-year/",
    },
    {
      operating_date: "2026-09-17",
      status: sep17Live ? "LIVE_VERIFIED" : "NOT_MEASURED",
      evidence: "catalog+public_interest_article",
      candidate_id: "blog-interest-rate",
      expected_url: "https://occupancynpv.com/blog/valuation/how-interest-rates-affect-commercial-property-values/",
    },
  ];
}
