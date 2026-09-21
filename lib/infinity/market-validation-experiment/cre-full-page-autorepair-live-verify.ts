import {
  evaluateRenderedLinkContrastGate,
  RENDERED_LINK_CONTRAST_BROWSER_SCRIPT,
  type RenderedLinkSample,
} from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-link-contrast-gate";
import {
  evaluateRenderedTextContrastGate,
  RENDERED_TEXT_CONTRAST_BROWSER_SCRIPT,
  type ComputedTextSample,
} from "@/lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate";
import { evaluateHumanFirstPublicLanguageGate } from "@/lib/infinity/venture-website-architecture/human-first-public-language-gate";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import {
  humanFirstContrastRepairLiveVerificationPassed,
  verifyHumanFirstContrastRepairLivePublic,
} from "./cre-human-first-contrast-repair-live-verify";
import { searchDepthRouteManifest } from "./cre-authority-expansion-routes";

function pageOf(pages: Record<string, { body?: string }>, route: string): string {
  return pages[route]?.body ?? pages[`${route}/`]?.body ?? "";
}

export async function verifyFullPageAutorepairLivePublic(input: {
  url: string;
  artifactId: string;
  experimentId: string;
  candidateId: string;
  files: Array<{ path: string; content: string; encoding?: string }>;
}) {
  const base = await verifyHumanFirstContrastRepairLivePublic(input);
  const manifest = searchDepthRouteManifest();
  const redirects = new Set(SEO_GEO_REDIRECTS.map((item) => item.from));
  const pageRoutes = manifest.pageRoutes.filter((route) => !redirects.has(route));
  const css = input.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const textSamples: ComputedTextSample[] = [];
  const linkSamples: RenderedLinkSample[] = [];
  let overflowFailures = 0;
  let missingEvidence = 0;
  let routesRendered = 0;
  let contrastRouteFailures = 0;
  let linkRouteFailures = 0;
  let sameColor = 0;
  let nearInvisible = 0;
  let hoverFocus = 0;
  const cam = {
    board: null as string | null,
    heading: null as string | null,
    link: null as string | null,
    headingContrast: null as number | null,
    linkContrast: null as number | null,
    headingSample: "MISSING" as "PRESENT" | "MISSING",
    linkSample: "MISSING" as "PRESENT" | "MISSING",
  };
  try {
    for (const route of pageRoutes) {
      for (const viewport of [
        { name: "1280", width: 1280, height: 900 },
        { name: "390", width: 390, height: 844 },
      ]) {
        const page = await browser.newPage();
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`${input.url.replace(/\/$/, "")}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
        routesRendered += 1;
        const overflow = await page.evaluate(`Math.max(0, document.documentElement.scrollWidth - window.innerWidth)`);
        if (Number(overflow) > 1) overflowFailures += 1;
        const text = (await page.evaluate(RENDERED_TEXT_CONTRAST_BROWSER_SCRIPT)) as { samples: ComputedTextSample[] };
        const links = (await page.evaluate(RENDERED_LINK_CONTRAST_BROWSER_SCRIPT)) as RenderedLinkSample[];
        if (viewport.name === "1280") {
          textSamples.push(...(text.samples ?? []));
          linkSamples.push(...(links ?? []));
          const html = pageOf(base.routes.pages, route);
          const contrast = evaluateRenderedTextContrastGate({ html, css, samples: text.samples });
          const linkGate = evaluateRenderedLinkContrastGate({ html, css, samples: links });
          if (contrast.overall === "FAIL") contrastRouteFailures += 1;
          if (linkGate.overall === "FAIL") linkRouteFailures += 1;
          sameColor += linkGate.sameColorFailures;
          nearInvisible += linkGate.nearInvisibleFailures;
          hoverFocus += linkGate.hoverFocusFailures;
          missingEvidence += contrast.missingMandatorySamples + linkGate.missingSamples;
          if (route === "/commercial-lease-npv/should-cam-be-in-lease-npv") {
            const heading = text.samples?.find((sample) => sample.role === "trusted_sources_title");
            const link = text.samples?.find((sample) => sample.role === "trusted_sources_link") ?? links.find((sample) => sample.role === "trusted_sources_link");
            cam.board = heading?.background ?? link?.background ?? null;
            cam.heading = heading?.color ?? null;
            cam.link = link?.color ?? null;
            cam.headingContrast = heading?.contrast ?? null;
            cam.linkContrast = link?.contrast ?? null;
            cam.headingSample = heading ? "PRESENT" : "MISSING";
            cam.linkSample = link ? "PRESENT" : "MISSING";
          }
        }
        if (route === "/how-it-works" && viewport.name === "1280") {
          await page.setViewportSize({ width: 1440, height: 1600 });
          await page.waitForTimeout(200);
          const tallOverflow = await page.evaluate(`Math.max(0, document.documentElement.scrollWidth - window.innerWidth)`);
          if (Number(tallOverflow) > 1) overflowFailures += 1;
        }
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  let machinePhrases = 0;
  let placeholders = 0;
  for (const route of pageRoutes) {
    const human = evaluateHumanFirstPublicLanguageGate(pageOf(base.routes.pages, route));
    machinePhrases += human.findings.length;
    placeholders += human.relatedPagePlaceholders;
  }
  const allRouteContrast = evaluateRenderedTextContrastGate({
    html: pageRoutes.map((route) => pageOf(base.routes.pages, route)).join("\n"),
    css,
    samples: textSamples,
  });
  const allRouteLinks = evaluateRenderedLinkContrastGate({
    html: pageRoutes.map((route) => pageOf(base.routes.pages, route)).join("\n"),
    css,
    samples: linkSamples,
  });
  return {
    ...base,
    fullRouteRendered: routesRendered,
    pageRoutesChecked: pageRoutes.length,
    overflowFailures,
    contrastRouteFailures,
    linkRouteFailures,
    sameColorFailures: sameColor,
    nearInvisibleFailures: nearInvisible,
    hoverFocusFailures: hoverFocus,
    missingLiveEvidence: missingEvidence,
    fullTextContrast: allRouteContrast.overall,
    fullLinkContrast: allRouteLinks.overall,
    liveMachinePhrases: machinePhrases,
    livePlaceholders: placeholders,
    cam,
    contrastSamples: textSamples.length,
    linkSamples: linkSamples.length,
  };
}

export function fullPageAutorepairLiveVerificationPassed(
  live: Awaited<ReturnType<typeof verifyFullPageAutorepairLivePublic>>,
): boolean {
  return (
    humanFirstContrastRepairLiveVerificationPassed(live) &&
    live.fullTextContrast === "PASS" &&
    live.fullLinkContrast === "PASS" &&
    live.contrastRouteFailures === 0 &&
    live.linkRouteFailures === 0 &&
    live.sameColorFailures === 0 &&
    live.nearInvisibleFailures === 0 &&
    live.hoverFocusFailures === 0 &&
    live.missingLiveEvidence === 0 &&
    live.overflowFailures === 0 &&
    live.liveMachinePhrases === 0 &&
    live.livePlaceholders === 0 &&
    live.cam.headingSample === "PRESENT" &&
    live.cam.linkSample === "PRESENT" &&
    live.failingRoutes === 0 &&
    live.notFound === 0 &&
    live.runtimeErrors === 0
  );
}
