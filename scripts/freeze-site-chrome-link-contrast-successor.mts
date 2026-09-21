import { writeFile } from "node:fs/promises";
import { reconstructCreSiteChromeLinkContrastSuccessor } from "../lib/infinity/venture-website-architecture/cre-site-chrome-link-contrast-successor.ts";
import { SITE_CHROME_LINK_CONTRAST_MARKER } from "../lib/infinity/venture-website-architecture/site-chrome-link-contrast-css.ts";

const successor = await reconstructCreSiteChromeLinkContrastSuccessor();
const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
const slim = {
  artifactId: successor.artifactId,
  digest: successor.digest,
  predecessorArtifactId: successor.predecessorArtifactId,
  predecessorDigest: successor.predecessorDigest,
  routes: successor.routes,
  immutable: successor.immutable,
  founderVisualReviewReady: successor.founderVisualReviewReady,
  premiumReady: successor.hard.ready,
  pageLoop: {
    overall: successor.pageLoop.overall,
    rendered: successor.pageLoop.rendered,
    validated: successor.pageLoop.validated,
    finalFailed: successor.pageLoop.finalFailed,
    missingEvidence: successor.pageLoop.missingEvidence,
  },
  hubLayout: successor.hubLayout.overall,
  discovery: successor.discovery.overall,
  hookBoundary: successor.hookBoundary.overall,
  humanFirst: successor.humanFirst.overall,
  contrast: successor.contrast.overall,
  demand: successor.demand.overall,
  cannibal: successor.cannibal.overall,
  chromeMarker: css.includes(SITE_CHROME_LINK_CONTRAST_MARKER),
  colorMixNavRemaining: /\.pv-nav\s*\{[^}]*color-mix/.test(css) && !css.includes(SITE_CHROME_LINK_CONTRAST_MARKER),
};
await writeFile(".infinity/site-chrome-link-contrast-successor.json", `${JSON.stringify(slim, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(slim, null, 2)}\n`);
