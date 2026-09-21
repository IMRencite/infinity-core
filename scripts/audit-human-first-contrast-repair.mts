import { reconstructCreSearchDepthSuccessor } from "../lib/infinity/venture-website-architecture/cre-search-depth-successor.ts";
import { SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST } from "../lib/infinity/market-validation-experiment/constants.ts";
import { searchDepthRouteManifest } from "../lib/infinity/market-validation-experiment/cre-authority-expansion-routes.ts";
import { auditPublicMachineVoice, evaluateHumanFirstPublicLanguageAcrossFiles } from "../lib/infinity/venture-website-architecture/human-first-public-language-gate.ts";
import { evaluateRenderedTextContrastFromFiles } from "../lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate.ts";
import { evaluateSectionSurfaceContrast, extractSurfaceSequence } from "../lib/infinity/venture-website-architecture/public-authority-standard/section-surface-system.ts";
import { pageContent } from "../lib/infinity/venture-website-architecture/answer-authority/page-inspect.ts";

const successor = await reconstructCreSearchDepthSuccessor();
const routes = searchDepthRouteManifest().pageRoutes.filter((route) => !route.endsWith(".xml") && !route.endsWith(".txt"));
const textFiles = successor.files.filter((file) => file.encoding !== "base64").map((file) => ({ path: file.path, content: file.content }));
const audit = auditPublicMachineVoice(textFiles, routes);
const humanFirst = evaluateHumanFirstPublicLanguageAcrossFiles(textFiles, routes);
const rendered = evaluateRenderedTextContrastFromFiles(textFiles);
const occupancy = pageContent(textFiles, "/occupancy-costs");
const emphasisInner = occupancy.match(/<section[^>]*data-surface="EMPHASIS"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
const css = textFiles.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
const contrast = evaluateSectionSurfaceContrast({
  variants: extractSurfaceSequence(pageContent(textFiles, "/commercial-lease-npv/why-use-npv-when-comparing-leases")),
  textOnEmphasisLight: css.includes("--pv-surface-emphasis-ink"),
  cardsDistinctOnTinted: css.includes('[data-surface="TINTED"] .sn-card'),
  linksReadable: css.includes('[data-surface="EMPHASIS"] .pv-cta-panel a'),
  html: occupancy,
  css,
});
console.log(
  JSON.stringify(
    {
      artifactId: successor.artifactId,
      digest: successor.digest,
      digestParity: successor.digest === SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
      routes: successor.routes,
      ready: successor.founderVisualReviewReady,
      publishability: successor.publishability.ready,
      publishabilityFailures: successor.publishability.failures,
      hard: successor.hard.ready,
      hardFailures: successor.hard.failures,
      humanFirst: humanFirst.overall,
      humanFirstFindings: humanFirst.findings.slice(0, 20),
      remaining: audit.remaining,
      byRoute: audit.byRoute,
      visibleAnswerChunk: humanFirst.visibleAnswerChunk,
      hideTheEngine: humanFirst.hideTheEngine,
      relatedPagePlaceholders: humanFirst.relatedPagePlaceholders,
      intentOwnershipAuthoring: humanFirst.intentOwnershipAuthoring,
      rendered: rendered.overall,
      paleTitlesOnLight: rendered.paleTitlesOnLight,
      unscopedEmphasisLeaks: rendered.unscopedEmphasisLeaks,
      nestedLightWithoutInkReset: rendered.nestedLightWithoutInkReset,
      goDeeperTitle: rendered.goDeeperTitle,
      cardTitles: rendered.cardTitles,
      trustedSources: rendered.trustedSources,
      disclosure: rendered.disclosure,
      cta: rendered.cta,
      whyItMattersBody: rendered.whyItMattersBody,
      headings: rendered.headings,
      tokenContrast: contrast.overall,
      emphasisHasLightModules: /Trusted sources|sn-title|pv-source-board|sn-block/i.test(emphasisInner),
    },
    null,
    2,
  ),
);
