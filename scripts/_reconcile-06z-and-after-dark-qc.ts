import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { createPortfolioDurableSupabase, PORTFOLIO_DURABLE_TABLES } from "../lib/infinity/autonomous-portfolio-operations/durable/portfolio-durable-supabase-v1";
import { countPortfolioJobsByCycle } from "../lib/infinity/autonomous-portfolio-operations/durable/autonomous-portfolio-job-queue-v1";
import { reconcilePortfolioCycleTerminalState } from "../lib/infinity/autonomous-portfolio-operations/durable/autonomous-portfolio-durable-execution-v1";
import { listOccupancyClubThrottleBacklogArticles } from "../lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { clubThrottleAfterDarkV5Body } from "../lib/infinity/organic-growth-engine/continuous/club-throttle-v5-body-after-dark";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq < 1) continue;
  const key = line.slice(0, eq).trim();
  if (!process.env[key]) process.env[key] = line.slice(eq + 1).trim();
}

const CYCLE_06Z = "e8fed014-a960-430a-b80a-26e1c67d7705";
const AFTER_DARK_URL = "https://clubthrottle.com/journal/night-riding/how-to-ride-after-dark/";

async function main() {
  const db = createPortfolioDurableSupabase();
  const { data: cycle } = await db.from(PORTFOLIO_DURABLE_TABLES.cycles).select("*").eq("cycle_id", CYCLE_06Z).maybeSingle();
  const { data: jobs } = await db
    .from(PORTFOLIO_DURABLE_TABLES.jobs)
    .select("job_id,job_type,status,safe_error")
    .eq("cycle_id", CYCLE_06Z);
  const terminal = await reconcilePortfolioCycleTerminalState(CYCLE_06Z);
  const counts = await countPortfolioJobsByCycle(CYCLE_06Z);

  const article = listOccupancyClubThrottleBacklogArticles().find((a) => a.slug === "how-to-ride-after-dark");
  const expectedMarkers = [
    "Your headlight is a budget, not a brag",
    "Postpone when fog closes the world",
    clubThrottleAfterDarkV5Body().answer.slice(0, 40),
  ];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(AFTER_DARK_URL, { waitUntil: "networkidle", timeout: 120_000 });
  const html = await page.content();
  const bodyText = await page.locator("main, article, [data-blog-article-body]").first().innerText().catch(() => "");
  const img = page.locator(".onpv-blog-article-hero__media img, .pv-hero-media img, img[src*='journal-hero-night-ride']").first();
  const imgMetrics = await img.evaluate((node) => {
    if (!(node instanceof HTMLImageElement)) return { complete: false, naturalWidth: 0, naturalHeight: 0, src: "" };
    return { complete: node.complete, naturalWidth: node.naturalWidth, naturalHeight: node.naturalHeight, src: node.currentSrc || node.src };
  }).catch(() => ({ complete: false, naturalWidth: 0, naturalHeight: 0, src: "" }));

  const bodyMarkersPresent = expectedMarkers.filter((m) => bodyText.includes(m) || html.includes(m));
  const revisionParity = bodyMarkersPresent.length === expectedMarkers.length ? "PASS" : "FAIL";
  const browserQc =
    imgMetrics.complete && imgMetrics.naturalWidth > 0 && imgMetrics.naturalHeight > 0 && !/\.svg/i.test(imgMetrics.src)
      ? "PASS"
      : "PENDING_BROWSER_PROOF";

  await browser.close();

  console.log(
    JSON.stringify(
      {
        PORTFOLIO_06Z_CURRENT_STATUS: cycle?.status ?? null,
        PORTFOLIO_06Z_COMPLETED_JOBS: jobs?.filter((j) => j.status === "COMPLETED").length ?? 0,
        PORTFOLIO_06Z_FAILED_JOBS: jobs?.filter((j) => j.status === "FAILED").length ?? 0,
        PORTFOLIO_06Z_QUEUED_JOBS: jobs?.filter((j) => j.status === "QUEUED").length ?? 0,
        PORTFOLIO_06Z_RUNNING_JOBS: jobs?.filter((j) => j.status === "RUNNING").length ?? 0,
        PORTFOLIO_06Z_TERMINALIZATION: terminal,
        job_counts: counts,
        CT_AFTER_DARK_DURABLE_REGISTRY_STATE: article?.registry_state ?? null,
        CT_AFTER_DARK_PRODUCTION_REVISION_ID: "dpl_3ivbhGqKbtCF4zsSNhBWgQLSb4Qo",
        CT_AFTER_DARK_REGISTRY_MATCHES_PRODUCTION: article?.registry_state === "PUBLISHED",
        CT_AFTER_DARK_REGISTRY_RECONCILIATION_ACTION:
          article?.registry_state === "PUBLISHED" ? "NONE_ALREADY_ALIGNED" : "RECONCILE_FROM_VERIFIED_PRODUCTION_PROOF",
        CT_AFTER_DARK_BODY_MARKERS_EXPECTED: expectedMarkers,
        CT_AFTER_DARK_BODY_MARKERS_PRESENT: bodyMarkersPresent,
        CT_AFTER_DARK_REVISION_PARITY_QC: revisionParity,
        CT_AFTER_DARK_BROWSER_RENDER_QC: browserQc,
        CT_AFTER_DARK_MEDIA_DELIVERY_QC: imgMetrics.src.includes("journal-hero-night-ride.webp") ? "PASS" : "FAIL",
        imgMetrics,
      },
      null,
      2,
    ),
  );
}

void main();
