import { mkdir } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { DEPTH_QUESTION_PAGES } from "@/lib/infinity/venture-website-architecture/search-demand-depth-catalog";
import {
  evaluateRenderedTextContrastGate,
  RENDERED_TEXT_CONTRAST_BROWSER_SCRIPT,
  type ComputedTextSample,
} from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate";
import { evaluateHumanFirstPublicLanguageGate } from "@/lib/infinity/venture-website-architecture/human-first-public-language-gate";
import { searchDepthLiveVerificationPassed, verifySearchDepthLivePublic } from "./cre-search-depth-live-verify";
import { SEARCH_DEPTH_LIVE_SAMPLE_ROUTES, searchDepthRouteManifest } from "./cre-authority-expansion-routes";

const EXTRA_LIVE_ROUTES = [
  "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client",
  "/commercial-lease-npv/npv-vs-total-lease-cost",
  "/lease-comparison/how-do-cfos-review-lease-comparisons",
  "/effective-rent/effective-rent-vs-asking-rent",
  "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk",
  "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking",
  "/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary",
] as const;

function pageOf(pages: Record<string, { body?: string }>, route: string): string {
  return pages[route]?.body ?? pages[`${route}/`]?.body ?? "";
}

export async function verifyHumanFirstContrastRepairLivePublic(input: {
  url: string;
  artifactId: string;
  experimentId: string;
  candidateId: string;
  files: Array<{ path: string; content: string; encoding?: string }>;
}) {
  const base = await verifySearchDepthLivePublic(input);
  const manifest = searchDepthRouteManifest();
  const css = input.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
  let visibleAnswerChunk = 0;
  let hideTheEngine = 0;
  let relatedPlaceholders = 0;
  let intentOwnership = 0;
  let machinePhrases = 0;
  for (const route of manifest.pageRoutes) {
    const html = pageOf(base.routes.pages, route);
    if (!html) continue;
    const human = evaluateHumanFirstPublicLanguageGate(html);
    visibleAnswerChunk += human.visibleAnswerChunk;
    hideTheEngine += human.hideTheEngine;
    relatedPlaceholders += human.relatedPagePlaceholders;
    intentOwnership += human.intentOwnershipAuthoring;
    machinePhrases += human.findings.length;
  }
  const screenshotDir = path.join(tmpdir(), `cre-human-first-contrast-live-${Date.now()}`);
  await mkdir(screenshotDir, { recursive: true });
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: "wide", width: 1440, height: 900 },
    { name: "desktop", width: 1280, height: 900 },
    { name: "tablet", width: 1024, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ] as const;
  const sampleRoutes = [...new Set([...SEARCH_DEPTH_LIVE_SAMPLE_ROUTES, ...EXTRA_LIVE_ROUTES])];
  const computed: ComputedTextSample[] = [];
  let nestedLightInEmphasis = 0;
  let photoWashOk = true;
  let shots = 0;
  try {
    for (const route of sampleRoutes) {
      const sizes = [
        "/occupancy-costs",
        "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client",
        "/how-it-works",
        "/commercial-lease-npv/should-cam-be-in-lease-npv",
      ].includes(route)
        ? viewports
        : viewports.filter((item) => item.name === "wide" || item.name === "mobile");
      for (const viewport of sizes) {
        const page = await browser.newPage();
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`${input.url.replace(/\/$/, "")}${route}`, { waitUntil: "networkidle", timeout: 45_000 });
        const measured = (await page.evaluate(RENDERED_TEXT_CONTRAST_BROWSER_SCRIPT)) as {
          samples: ComputedTextSample[];
          nestedLightInEmphasis: boolean;
          photoWashOpacity: number | null;
          emphasisContainsSources: boolean;
        };
        if (viewport.name === "wide") computed.push(...(measured.samples ?? []));
        if (measured.nestedLightInEmphasis) nestedLightInEmphasis += 1;
        if (measured.photoWashOpacity != null && (measured.photoWashOpacity < 0.06 || measured.photoWashOpacity > 0.28)) {
          photoWashOk = false;
        }
        await page.screenshot({
          path: path.join(screenshotDir, `${route.replace(/[^\w]+/g, "_") || "home"}_${viewport.name}.png`),
          fullPage: false,
        });
        shots += 1;
        if (
          (route === "/occupancy-costs" && viewport.name === "wide") ||
          (route === "/commercial-lease-npv/should-cam-be-in-lease-npv" && (viewport.name === "wide" || viewport.name === "mobile"))
        ) {
          for (const sel of [".sn-block", ".pv-source-board", ".pv-cta-panel", ".disclosure", ".pv-section-visual", "footer"]) {
            const loc = page.locator(sel).first();
            if (await loc.count()) {
              await loc.screenshot({
                path: path.join(
                  screenshotDir,
                  `${route === "/commercial-lease-npv/should-cam-be-in-lease-npv" ? "cam_" : "live_"}${sel.replace(/[^\w]+/g, "_")}_${viewport.name}.png`,
                ),
              });
              shots += 1;
            }
          }
        }
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  const rendered = evaluateRenderedTextContrastGate({
    html: `${pageOf(base.routes.pages, "/occupancy-costs")}\n${pageOf(base.routes.pages, "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client")}\n${pageOf(base.routes.pages, "/commercial-lease-npv/should-cam-be-in-lease-npv")}`,
    css,
    samples: computed,
  });
  const humanFirst = machinePhrases === 0 ? ("PASS" as const) : ("FAIL" as const);
  const paleTitles = rendered.paleTitlesOnLight;
  const headingSample = computed.find((sample) => sample.role === "trusted_sources_title") ?? null;
  const linkSample = computed.find((sample) => sample.role === "trusted_sources_link") ?? null;
  const bodySample = computed.find((sample) => sample.role === "trusted_sources_body") ?? null;
  const spokeSample = computed.find((sample) => sample.role === "emphasis_spoke_link") ?? null;
  const liveContrastPassed =
    rendered.overall === "PASS" &&
    paleTitles === 0 &&
    nestedLightInEmphasis === 0 &&
    rendered.unscopedEmphasisLeaks === 0 &&
    rendered.missingMandatorySamples === 0 &&
    Boolean(headingSample) &&
    Boolean(linkSample) &&
    photoWashOk;
  return {
    ...base,
    humanFirst,
    renderedTextContrast: rendered.overall,
    renderedHeadingInk: rendered.headings,
    goDeeperTitle: rendered.goDeeperTitle,
    cardTitles: rendered.cardTitles,
    trustedSources: rendered.trustedSources,
    trustedSourcesLinks: rendered.trustedSourcesLinks,
    trustedSourcesBody: rendered.trustedSourcesBody,
    emphasisSpokeLinks: rendered.emphasisSpokeLinks,
    darkOnDarkEmphasis: rendered.darkOnDarkEmphasis,
    missingMandatorySamples: rendered.missingMandatorySamples,
    camHeadingSample: headingSample,
    camLinkSample: linkSample,
    camBodySample: bodySample,
    camSpokeSample: spokeSample,
    disclosure: rendered.disclosure,
    ctaIsolation: rendered.cta,
    photoWash: photoWashOk ? ("PASS" as const) : ("FAIL" as const),
    computedStyleEvidence: computed.length ? ("PASS" as const) : ("FAIL" as const),
    paleTitlesOnLight: paleTitles,
    unscopedEmphasisLeaks: rendered.unscopedEmphasisLeaks,
    nestedLightInEmphasis,
    visibleAnswerChunk,
    hideTheEngine,
    relatedPagePlaceholders: relatedPlaceholders,
    intentOwnershipAuthoring: intentOwnership,
    machinePhrases,
    newStandaloneLive: DEPTH_QUESTION_PAGES.filter((page) => /<h1/i.test(pageOf(base.routes.pages, page.route))).length,
    extraShots: shots,
    extraScreenshotDir: screenshotDir,
  };
}

export function humanFirstContrastRepairLiveVerificationPassed(
  live: Awaited<ReturnType<typeof verifyHumanFirstContrastRepairLivePublic>>,
): boolean {
  return (
    searchDepthLiveVerificationPassed(live) &&
    live.humanFirst === "PASS" &&
    live.renderedTextContrast === "PASS" &&
    live.renderedHeadingInk === "PASS" &&
    live.goDeeperTitle === "PASS" &&
    live.cardTitles === "PASS" &&
    live.trustedSources === "PASS" &&
    live.trustedSourcesLinks === "PASS" &&
    live.trustedSourcesBody === "PASS" &&
    live.emphasisSpokeLinks === "PASS" &&
    live.darkOnDarkEmphasis === 0 &&
    live.missingMandatorySamples === 0 &&
    Boolean(live.camHeadingSample) &&
    Boolean(live.camLinkSample) &&
    Boolean(live.camSpokeSample) &&
    live.disclosure === "PASS" &&
    live.ctaIsolation === "PASS" &&
    live.photoWash === "PASS" &&
    live.computedStyleEvidence === "PASS" &&
    live.paleTitlesOnLight === 0 &&
    live.unscopedEmphasisLeaks === 0 &&
    live.nestedLightInEmphasis === 0 &&
    live.visibleAnswerChunk === 0 &&
    live.hideTheEngine === 0 &&
    live.relatedPagePlaceholders === 0 &&
    live.intentOwnershipAuthoring === 0 &&
    live.machinePhrases === 0
  );
}
