import { reconstructCreSearchDepthSuccessor } from "../lib/infinity/venture-website-architecture/cre-search-depth-successor.ts";
import { evaluateRenderedTextContrastGate, FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE, FOUNDER_TRUSTED_SOURCES_INK_RESET_FIXTURE } from "../lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate.ts";
import { pageContent } from "../lib/infinity/venture-website-architecture/answer-authority/page-inspect.ts";

const successor = await reconstructCreSearchDepthSuccessor();
const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
const cam = pageContent(successor.files, "/commercial-lease-npv/should-cam-be-in-lease-npv");
const rendered = evaluateRenderedTextContrastGate({ html: cam, css });
process.stdout.write(
  JSON.stringify(
    {
      artifactId: successor.artifactId,
      digest: successor.digest,
      predecessorArtifactId: successor.predecessorArtifactId,
      predecessorDigest: successor.predecessorDigest,
      routes: successor.routes,
      ready: successor.founderVisualReviewReady,
      demand: successor.demand.overall,
      discovery: successor.discovery.overall,
      cannibal: successor.cannibal.overall,
      rhythm: successor.rhythm.overall,
      contrast: successor.contrast.overall,
      publishability: successor.publishability.ready,
      camHasSourceBoard: /pv-source-board/.test(cam),
      sourceBoardInk: /--pv-source-board-ink:\s*#152033/.test(css),
      sourceBoardLink: /--pv-source-board-link:\s*#1d4e89/.test(css),
      unscopedEmphasisA: /\[data-surface=["']EMPHASIS["']\]\s+a\s*\{/.test(css) && !/\[data-surface=["']EMPHASIS["']\]\s+\.pv-cta-panel a/.test(css),
      paleFixture: evaluateRenderedTextContrastGate(FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE).overall,
      resetFixture: evaluateRenderedTextContrastGate(FOUNDER_TRUSTED_SOURCES_INK_RESET_FIXTURE).overall,
      camRendered: rendered.overall,
      camTrustedSources: rendered.trustedSources,
      camLinks: rendered.trustedSourcesLinks,
      leaks: rendered.unscopedEmphasisLeaks,
    },
    null,
    2,
  ) + "\n",
);
