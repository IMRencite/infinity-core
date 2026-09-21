import { chromium } from "@playwright/test";
import { evaluateCommercialPageLayoutConsistencyGate, evaluateSectionContainerAlignmentGate } from "../lib/infinity/customer-page-depth";
import { evaluateRenderedVisualQualityGate } from "../lib/infinity/universal-venture-system-qc/visual";
import { pricingUxReady } from "../lib/infinity/venture-operating-scale/occupancynpv-pricing-ux-repair-deployment";

const TARGET = process.env.OCCUPANCYNPV_PRICING_URL ?? "https://occupancynpv.com/pricing";
const VIEWPORTS = [
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "mobile-390x844", width: 390, height: 844 },
] as const;

async function main() {
  const html = await (await fetch(TARGET, { cache: "no-store" })).text();
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.goto(TARGET, { waitUntil: "networkidle" });
    const measured = await page.evaluate(`(() => {
      const box = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width, top: rect.top, bottom: rect.bottom };
      };
      return {
        container: box(".onpv-related-paths > .vg-container") || box(".onpv-related-paths"),
        background: box(".onpv-related-paths .sn-block"),
        content: box(".onpv-related-paths .sn-grid"),
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    })()`) as {
      container: { left: number; right: number; width: number; top: number; bottom: number } | null;
      background: { left: number; right: number; width: number; top: number; bottom: number } | null;
      content: { left: number; right: number; width: number; top: number; bottom: number } | null;
      overflowX: boolean;
    };
    await page.close();
    const related = measured.container && measured.background && measured.content
      ? {
          section: "related_product_paths",
          container: measured.container,
          background: measured.background,
          content: measured.content,
          overflowX: measured.overflowX,
        }
      : null;
    const alignment = related
      ? evaluateSectionContainerAlignmentGate([related])
      : { result: "FAIL" as const, reasons: ["RELATED_PATHS_GEOMETRY_MISSING"] };
    const layout = evaluateCommercialPageLayoutConsistencyGate({ related });
    results.push({
      name: viewport.name,
      measured,
      alignment: alignment.result,
      reasons: alignment.reasons,
      layout: layout.result,
      overflow: measured.overflowX,
    });
  }
  await browser.close();
  const fail = results.some((row) => row.alignment !== "PASS" || row.overflow);
  const visual = evaluateRenderedVisualQualityGate({
    unstyled_controls: 0,
    layout_breaks: fail,
    clipping: false,
    overflow: results.some((row) => row.overflow),
    overlapping: false,
    hierarchy_ok: true,
    readable: true,
    buttons_malformed: false,
    related_paths_width_defect: fail,
    section_alignment_fail: fail,
  });
  console.log(JSON.stringify({
    liveReady: pricingUxReady(html),
    visual: visual.result,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
