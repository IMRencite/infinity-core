import type { FounderDailyReportItem } from "./types";

export const FOUNDER_DAILY_REPORT_PORTFOLIO_OPERATIONS_QC = "FounderDailyReportPortfolioOperationsQc" as const;

export type PortfolioOperatingReportSnapshot = {
  ventures_operated: number;
  assets_considered: number;
  assets_published: number;
  quality_holds: number;
  self_heal_attempts: number;
  self_heal_recoveries: number;
  product_concepts: number;
  products_advanced_beyond_concept: number;
  blockers: string[];
};

export function founderDailyReportPortfolioOperationsQc(snapshot: PortfolioOperatingReportSnapshot | null): "PASS" | "FAIL" {
  if (!snapshot) return "FAIL";
  if (snapshot.ventures_operated < 1) return "FAIL";
  return "PASS";
}

export function portfolioOperatingFounderDailyItems(snapshot: PortfolioOperatingReportSnapshot): FounderDailyReportItem[] {
  const items: FounderDailyReportItem[] = [];
  const base = (status: FounderDailyReportItem["status"], title: string, source: string) => ({
    item_id: `portfolio:${source}:${title.slice(0, 40)}`,
    status,
    engine: "portfolio",
    title,
    source_ids: [source],
    href: "/dashboard/growth",
  });
  items.push(
    base(
      "COMPLETED",
      `Portfolio cycle operated ${snapshot.ventures_operated} live venture${snapshot.ventures_operated === 1 ? "" : "s"}`,
      "portfolio-operating-cycle",
    ),
  );
  if (snapshot.assets_published > 0) {
    items.push(
      base(
        "COMPLETED",
        `Autonomous publish: ${snapshot.assets_published} quality-passing asset${snapshot.assets_published === 1 ? "" : "s"}`,
        "portfolio-autonomous-publish",
      ),
    );
  }
  if (snapshot.quality_holds > 0) {
    items.push(
      base(
        "IN_PROGRESS",
        `Quality hold: ${snapshot.quality_holds} asset${snapshot.quality_holds === 1 ? "" : "s"} awaiting QC or opportunity`,
        "portfolio-quality-hold",
      ),
    );
  }
  if (snapshot.self_heal_attempts > 0) {
    items.push(
      base(
        snapshot.self_heal_recoveries > 0 ? "COMPLETED" : "IN_PROGRESS",
        `Content self-heal: ${snapshot.self_heal_attempts} attempt(s), ${snapshot.self_heal_recoveries} recovery`,
        "portfolio-self-heal",
      ),
    );
  }
  if (snapshot.products_advanced_beyond_concept > 0) {
    items.push(
      base(
        "COMPLETED",
        `Club Throttle merch: ${snapshot.products_advanced_beyond_concept} concept(s) advanced beyond CONCEPT`,
        "portfolio-product-advance",
      ),
    );
  }
  for (const blocker of snapshot.blockers) {
    items.push(base("BLOCKED", blocker, "portfolio-blocker"));
  }
  return items;
}

void FOUNDER_DAILY_REPORT_PORTFOLIO_OPERATIONS_QC;
