import { reconstructCreSearchDepthSuccessor } from "../lib/infinity/venture-website-architecture/cre-search-depth-successor.ts";
import { pageContent } from "../lib/infinity/venture-website-architecture/answer-authority/page-inspect.ts";
import { RENDERED_TEXT_CONTRAST_BROWSER_SCRIPT, evaluateRenderedTextContrastFromFiles } from "../lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate.ts";

function expandAuthorityRefs(tsx: string): string {
  return tsx.replace(/<AuthorityRefs items=\{(\[[\s\S]*?\])\}\s*\/>/g, (_, raw: string) => {
    const items = JSON.parse(raw) as Array<{ href?: string; label?: string }>;
    return items.map((item) => `<a href="${item.href ?? "#"}">${item.label ?? "Source"}</a>`).join("\n");
  });
}

const successor = await reconstructCreSearchDepthSuccessor();
const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
const files = successor.files.filter((file) => file.encoding !== "base64").map((file) => ({ path: file.path, content: file.content }));
const allPages = evaluateRenderedTextContrastFromFiles(files);
const routes = [
  "/commercial-lease-npv/should-cam-be-in-lease-npv",
  "/commercial-lease-npv/why-use-npv-when-comparing-leases",
  "/occupancy-costs",
  "/lease-comparison/how-do-you-compare-two-commercial-lease-options",
  "/effective-rent/what-is-effective-rent",
  "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis",
  "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois",
  "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model",
];
const { chromium } = await import("@playwright/test");
const browser = await chromium.launch({ headless: true });
const rows = [];
try {
  for (const route of routes) {
    const html = `<!doctype html><html><head><style>${css}</style></head><body>${expandAuthorityRefs(pageContent(files, route)).replace(/className=/g, "class=")}</body></html>`;
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const measured = (await page.evaluate(RENDERED_TEXT_CONTRAST_BROWSER_SCRIPT)) as {
      samples: Array<{ role: string; color: string; background: string; contrast: number | null }>;
    };
    const spoke = measured.samples.find((sample) => sample.role === "emphasis_spoke_link");
    const source = measured.samples.find((sample) => sample.role === "trusted_sources_title");
    const sourceLink = measured.samples.find((sample) => sample.role === "trusted_sources_link");
    rows.push({
      route,
      spoke: spoke ?? null,
      sourceHeading: source?.color ?? null,
      sourceLink: sourceLink?.color ?? null,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
process.stdout.write(
  JSON.stringify(
    {
      digest: successor.digest,
      allPages: allPages.overall,
      darkOnDarkEmphasis: allPages.darkOnDarkEmphasis,
      emphasisSpokeLinks: allPages.emphasisSpokeLinks,
      trustedSources: allPages.trustedSources,
      missingMandatorySamples: allPages.missingMandatorySamples,
      rows,
    },
    null,
    2,
  ) + "\n",
);
