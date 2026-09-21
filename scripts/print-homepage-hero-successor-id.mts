import { reconstructCreHomepageHeroLinkContrastSuccessor } from "../lib/infinity/venture-website-architecture/cre-homepage-hero-link-contrast-successor.ts";

const successor = await reconstructCreHomepageHeroLinkContrastSuccessor();
process.stdout.write(
  `${JSON.stringify(
    {
      artifactId: successor.artifactId,
      digest: successor.digest,
      routes: successor.routes,
      pageLoop: successor.pageLoop.overall,
      heroLinks: successor.heroLinks.overall,
      hubLayout: successor.hubLayout.overall,
      humanFirst: successor.humanFirst.overall,
      hook: successor.hookBoundary.overall,
      ready: successor.founderVisualReviewReady,
      premium: successor.hard.ready,
    },
    null,
    2,
  )}\n`,
);
