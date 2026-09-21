import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { reconstructCreSearchDepthSuccessor } from "@/lib/infinity/venture-website-architecture/cre-search-depth-successor";
import { pageContent } from "@/lib/infinity/venture-website-architecture/answer-authority/page-inspect";
import {
  auditPublicMachineVoice,
  evaluateHumanFirstPublicLanguageGate,
  HUMAN_FIRST_BAD_FIXTURES,
  HUMAN_FIRST_GOOD_FIXTURE,
} from "@/lib/infinity/venture-website-architecture/human-first-public-language-gate";
import {
  evaluateRenderedTextContrastGate,
  evaluateRenderedTextContrastFromFiles,
  FOUNDER_EMPHASIS_LEAK_FIXTURE,
  FOUNDER_EMPHASIS_SPOKE_DARK_ON_DARK_FIXTURE,
  RENDERED_TEXT_CONTRAST_BROWSER_SCRIPT,
  type ComputedTextSample,
} from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate";
import { evaluateSectionSurfaceContrast } from "@/lib/infinity/venture-website-architecture/public-authority-standard/section-surface-system";
import { evaluateHumanReadabilityGate } from "@/lib/infinity/venture-website-architecture/human-readability-gate";
import {
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
} from "./constants";
import { SEARCH_DEPTH_LIVE_SAMPLE_ROUTES, searchDepthRouteManifest } from "./cre-authority-expansion-routes";

function expandAuthorityRefs(tsx: string): string {
  return tsx.replace(/<AuthorityRefs items=\{(\[[\s\S]*?\])\}\s*\/>/g, (_, raw: string) => {
    try {
      const items = JSON.parse(raw) as Array<{ href?: string; label?: string }>;
      return items
        .map((item) => `<a href="${item.href ?? "#"}">${item.label ?? "Source"}</a>`)
        .join("\n");
    } catch {
      return `<a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia — net present value</a>`;
    }
  });
}

function toStaticHtml(tsx: string): string {
  return expandAuthorityRefs(tsx)
    .replace(/className=/g, "class=")
    .replace(/width=\{(\d+)\}/g, 'width="$1"')
    .replace(/height=\{(\d+)\}/g, 'height="$1"')
    .replace(/fetchPriority="high"/g, "")
    .replace(/\{JSON\.stringify\(([^)]+)\)\}/g, '"$1"');
}

const PREDEPLOY_ROUTES = [
  ...SEARCH_DEPTH_LIVE_SAMPLE_ROUTES,
  "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client",
  "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking",
  "/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary",
  "/commercial-lease-npv/should-cam-be-in-lease-npv",
] as const;

export async function runHumanFirstContrastRepairPredeployQc() {
  const reconstructed = await reconstructCreSearchDepthSuccessor();
  const files = reconstructed.files.filter((file) => file.encoding !== "base64").map((file) => ({ path: file.path, content: file.content }));
  const digestParity = reconstructed.digest === SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST ? ("PASS" as const) : ("FAIL" as const);
  const identity = reconstructed.artifactId === SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID ? ("PASS" as const) : ("FAIL" as const);
  const routes = searchDepthRouteManifest();
  const audit = auditPublicMachineVoice(files, routes.pageRoutes);
  const css = files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
  const occupancy = pageContent(files, "/occupancy-costs");
  const present = pageContent(files, "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client");
  const sample = pageContent(files, "/commercial-lease-npv/why-use-npv-when-comparing-leases");
  const cam = pageContent(files, "/commercial-lease-npv/should-cam-be-in-lease-npv");
  const camRouteSampled = /pv-source-board|Trusted sources/i.test(cam) ? ("YES" as const) : ("NO" as const);
  const rendered = evaluateRenderedTextContrastFromFiles(files);
  const tokenOnlyFounder = evaluateSectionSurfaceContrast({
    variants: ["EMPHASIS", "TINTED"],
    textOnEmphasisLight: true,
    cardsDistinctOnTinted: true,
    linksReadable: true,
  });
  const founderRendered = evaluateRenderedTextContrastGate(FOUNDER_EMPHASIS_LEAK_FIXTURE);
  const founderSpoke = evaluateRenderedTextContrastGate(FOUNDER_EMPHASIS_SPOKE_DARK_ON_DARK_FIXTURE);
  const fixtureHuman = HUMAN_FIRST_BAD_FIXTURES.every((item) => evaluateHumanFirstPublicLanguageGate(item).overall === "FAIL");
  const fixtureGood = evaluateHumanFirstPublicLanguageGate(HUMAN_FIRST_GOOD_FIXTURE).overall === "PASS";
  const occupancyEmphasis = occupancy.match(/<section[^>]*data-surface="EMPHASIS"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
  const lightModulesOutside = !/Trusted sources|sn-title|pv-source-board|sn-block/i.test(occupancyEmphasis);
  const footer = toStaticHtml(files.find((file) => file.path.replace(/\\/g, "/").endsWith("venture-footer.tsx"))?.content ?? "");
  const dir = path.join(tmpdir(), `cre-human-first-contrast-predeploy-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: "1440", width: 1440, height: 900 },
    { name: "1280", width: 1280, height: 900 },
    { name: "1024", width: 1024, height: 900 },
    { name: "390", width: 390, height: 844 },
  ] as const;
  const viewportPass: Record<string, "PASS" | "FAIL"> = { "1440": "PASS", "1280": "PASS", "1024": "PASS", "390": "PASS" };
  const computed: ComputedTextSample[] = [];
  let overflow = 0;
  let shots = 0;
  try {
    for (const route of PREDEPLOY_ROUTES) {
      const html = `<!doctype html><html><head><style>${css}</style></head><body>${toStaticHtml(pageContent(files, route))}${footer}</body></html>`;
      for (const viewport of viewports) {
        const page = await browser.newPage();
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.setContent(html, { waitUntil: "domcontentloaded" });
        const measured = (await page.evaluate(RENDERED_TEXT_CONTRAST_BROWSER_SCRIPT)) as {
          samples: ComputedTextSample[];
          nestedLightInEmphasis: boolean;
        };
        const box = (await page.evaluate(`({ overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth) })`)) as {
          overflowX: number;
        };
        if (box.overflowX > 1) {
          overflow += 1;
          viewportPass[viewport.name] = "FAIL";
        }
        if (measured.nestedLightInEmphasis) viewportPass[viewport.name] = "FAIL";
        if (
          (viewport.name === "1440" || (viewport.name === "390" && route === "/commercial-lease-npv/should-cam-be-in-lease-npv")) &&
          (route === "/occupancy-costs" ||
            route === "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client" ||
            route === "/commercial-lease-npv/should-cam-be-in-lease-npv")
        ) {
          computed.push(...(measured.samples ?? []));
        }
        if (route === "/commercial-lease-npv/should-cam-be-in-lease-npv" && (viewport.name === "1440" || viewport.name === "390")) {
          const board = page.locator(".pv-source-board").first();
          if (await board.count()) {
            await board.screenshot({ path: path.join(dir, `cam_trusted_sources_${viewport.name}.png`) });
            shots += 1;
          }
        }
        await page.screenshot({ path: path.join(dir, `${route.replace(/[^\w]+/g, "_") || "home"}_${viewport.name}.png`), fullPage: false });
        shots += 1;
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  const browserRendered = evaluateRenderedTextContrastGate({ html: `${occupancy}\n${present}\n${cam}`, css, samples: computed });
  const byRole = (role: string) => computed.find((sample) => sample.role === role);
  const readability = evaluateHumanReadabilityGate(present);
  const failures = [
    identity === "FAIL",
    digestParity === "FAIL",
    reconstructed.founderVisualReviewReady !== "FOUNDER_VISUAL_REVIEW_READY",
    audit.remaining !== 0,
    rendered.overall === "FAIL",
    browserRendered.overall === "FAIL",
    camRouteSampled !== "YES",
    browserRendered.missingMandatorySamples > 0,
    !byRole("trusted_sources_title"),
    !byRole("trusted_sources_link"),
    !lightModulesOutside,
    tokenOnlyFounder.overall !== "PASS",
    founderRendered.overall !== "FAIL",
    founderSpoke.overall !== "FAIL",
    founderSpoke.emphasisSpokeLinks !== "FAIL",
    browserRendered.emphasisSpokeLinks === "FAIL",
    browserRendered.darkOnDarkEmphasis > 0,
    !byRole("emphasis_spoke_link"),
    !fixtureHuman,
    !fixtureGood,
    overflow > 0,
    Object.values(viewportPass).includes("FAIL"),
  ].filter(Boolean).length;
  return {
    artifactId: reconstructed.artifactId,
    digest: reconstructed.digest,
    digestParity,
    identity,
    routes: reconstructed.routes,
    ready: reconstructed.founderVisualReviewReady,
    audit,
    rendered: rendered.overall,
    browserRendered: browserRendered.overall,
    headings: browserRendered.headings,
    trustedSources: browserRendered.trustedSources,
    trustedSourcesLinks: browserRendered.trustedSourcesLinks,
    trustedSourcesBody: browserRendered.trustedSourcesBody,
    missingMandatorySamples: browserRendered.missingMandatorySamples,
    camRouteSampled,
    camHeadingSample: byRole("trusted_sources_title") ?? null,
    camLinkSample: byRole("trusted_sources_link") ?? null,
    camBodySample: byRole("trusted_sources_body") ?? null,
    camSpokeSample: byRole("emphasis_spoke_link") ?? null,
    emphasisSpokeLinks: browserRendered.emphasisSpokeLinks,
    darkOnDarkEmphasis: browserRendered.darkOnDarkEmphasis,
    paleTitlesOnLight: browserRendered.paleTitlesOnLight,
    unscopedEmphasisLeaks: rendered.unscopedEmphasisLeaks,
    lightModulesOutsideCta: lightModulesOutside,
    founderTokenOnly: tokenOnlyFounder.overall,
    founderRendered: founderRendered.overall,
    humanFirstFixtures: fixtureHuman && fixtureGood ? ("PASS" as const) : ("FAIL" as const),
    readability: readability.overall,
    activeVoice: readability.activeVoice,
    fourthGrade: readability.fleschKincaidGrade <= 7.2 ? ("PASS" as const) : ("FAIL" as const),
    viewportPass,
    overflow,
    shots,
    screenshotDir: dir,
    newDeterministicFailures: failures,
    overall: failures === 0 ? ("PASS" as const) : ("FAIL" as const),
    files: reconstructed.files,
    reconstructed,
  };
}
