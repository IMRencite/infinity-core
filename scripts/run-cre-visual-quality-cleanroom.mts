import { mkdir } from "node:fs/promises";
import path from "node:path";
import { reconstructCreVisualQualityRepairSuccessor } from "../lib/infinity/venture-website-architecture/cre-visual-quality-successor";
import { SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS } from "../lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import { auditVisualCompositionInBrowser } from "../lib/infinity/venture-website-architecture/visual-composition-browser";
import { runIsolatedArtifactInstallAndBuild } from "../lib/infinity/venture-build-orchestration";
import { startIsolatedArtifactProductionServer } from "../lib/infinity/public-venture-design/rendered-layout/served-production-server";

const successor = await reconstructCreVisualQualityRepairSuccessor();
process.stdout.write(
  `${JSON.stringify(
    {
      artifactId: successor.artifactId,
      digest: successor.digest,
      routes: successor.routes,
      ready: successor.publishability.ready,
      review: successor.founderVisualReviewReady,
      visual: successor.visual,
    },
    null,
    2,
  )}\n`,
);

const isolated = await runIsolatedArtifactInstallAndBuild({ files: successor.files, keepRoot: true });
if (isolated.buildResult !== "PASS") {
  process.stdout.write(`${JSON.stringify({ isolatedFail: true, stderr: isolated.build.stderr.slice(-2000) }, null, 2)}\n`);
  process.exitCode = 2;
  throw new Error("isolated_build_failed");
}
const server = await startIsolatedArtifactProductionServer({ isolatedRoot: isolated.root });
const screenshotDir = path.join(isolated.root, ".visual-qc");
await mkdir(screenshotDir, { recursive: true });
const routes = [
  "/",
  SEO_GEO_TOPIC_HUBS[0].route,
  SEO_GEO_TOPIC_HUBS[1].route,
  ...SEO_GEO_QUESTION_PAGES.map((page) => page.route),
  "/pricing",
  "/for/tenant-rep-brokers",
  "/resources",
];
try {
  const audit = await auditVisualCompositionInBrowser({
    origin: server.origin,
    routes,
    viewports: ["desktop", "wide", "mobile"],
    screenshotDir,
  });
  const footer = audit.pages.filter((page) => page.viewportName === "desktop").map((page) => page.footerLeft);
  const footerWide = audit.pages.filter((page) => page.viewportName === "wide").map((page) => page.footerLeft);
  const footerMobile = audit.pages.filter((page) => page.viewportName === "mobile").map((page) => page.footerLeft);
  process.stdout.write(
    `${JSON.stringify(
      {
        isolatedBuild: isolated.buildResult,
        origin: server.origin,
        routes: routes.length,
        measurements: audit.pages.length,
        screenshots: audit.screenshots.length,
        overflowX: audit.overflowX,
        footerTouches: audit.footerTouches,
        footerDesktopMin: Math.min(...footer),
        footerWideMin: Math.min(...footerWide),
        footerMobileMin: Math.min(...footerMobile),
        articleDesktop: audit.pages.find((page) => page.route === "/" && page.viewportName === "desktop")?.article,
        heroDesktop: audit.pages.find((page) => page.route === "/" && page.viewportName === "desktop")?.hero,
        tableDesktop: audit.pages.find((page) => page.route === SEO_GEO_QUESTION_PAGES[0].route && page.viewportName === "desktop")?.table,
        relatedDesktop: audit.pages.find((page) => page.route === SEO_GEO_QUESTION_PAGES[0].route && page.viewportName === "desktop")?.related,
        ctaDesktop: audit.pages.find((page) => page.route === SEO_GEO_QUESTION_PAGES[0].route && page.viewportName === "desktop")?.cta,
        tableUtilizationMin: Math.min(...audit.pages.map((page) => page.tableUtilization || 1)),
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await server.stop();
}
