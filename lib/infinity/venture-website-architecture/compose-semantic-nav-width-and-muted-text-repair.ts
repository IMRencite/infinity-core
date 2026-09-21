import { CRE_CANDIDATE_ID, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { evaluateExpandedPublicAuthorityPublishability } from "./authority-expansion-gates";
import {
  CONTENT_ARCHITECTURE_VERSION,
  DESIGN_SYSTEM_VERSION,
  SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_REPAIR_REASON,
  SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_REPAIR_SITE_CONTRACT,
  VENTURE_SITE_ARCHITECTURE_VERSION,
} from "./constants";
import { applyDarkSurfaceMutedTextCss } from "./dark-surface-muted-text-css";
import { evaluateHumanFirstPublicLanguageAcrossFiles } from "./human-first-public-language-gate";
import { evaluatePublicAuthorityPublishability } from "./public-authority-standard/publishability";
import { HARD_PUBLISHABILITY_GATES } from "./public-authority-standard/constants";
import { runDeterministicPerPageAdmission } from "./public-authority-standard/per-page-render-validate-repair";
import { evaluatePrerenderHookBoundaryGate } from "./public-authority-standard/prerender-hook-boundary-gate";
import { evaluateRenderedTextContrastFromFiles } from "./public-authority-standard/rendered-text-contrast-gate";
import { evaluateRenderedMutedTextContrastGate } from "./public-authority-standard/rendered-muted-text-contrast-gate";
import { evaluateHubQuestionBoardLayout } from "./public-authority-standard/hub-discovery-rendered-quality";
import {
  evaluateHubQuestionDiscoveryCoverage,
  evaluateSearchDemandAuthoritySurface,
  evaluateSearchIntentCannibalization,
} from "./search-demand-depth-gates";
import { pageContent } from "./answer-authority/page-inspect";
import { applicableHubBoardRoutes } from "./compose-hub-question-board-layout-repair";
import { applyHomepageHeroLinkContrastCss } from "./homepage-hero-link-contrast-css";
import { applySemanticNavWidthUtilizationCss } from "./semantic-nav-width-utilization-css";
import {
  evaluateRenderedLinkContrastGate,
  FOUNDER_HOMEPAGE_HERO_REPAIRED_FIXTURE,
} from "./public-authority-standard/rendered-link-contrast-gate";

type ArtifactFile = { path: string; content: string; encoding?: "utf8" | "base64" };

function upsert(files: ArtifactFile[], path: string, content: string): ArtifactFile[] {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push({ path, content });
  return next;
}

function widenSemanticNavBlocks(source: string): string {
  return source.replace(/<nav className="sn-block(?![\w-])/g, '<nav className="sn-block pv-wide-module');
}

export function composeSemanticNavWidthAndMutedTextRepairFiles(input: {
  files: ArtifactFile[];
  artifactId: string;
  predecessorArtifactId: string;
  predecessorDigest: string;
}) {
  let files = input.files.map((file) => ({ ...file }));
  for (const file of files.filter((item) => item.encoding !== "base64" && item.path.replace(/\\/g, "/").endsWith("/page.tsx"))) {
    const next = widenSemanticNavBlocks(file.content).replace(/data-artifact-id="[^"]+"/, `data-artifact-id="${input.artifactId}"`);
    if (next !== file.content) files = upsert(files, file.path, next);
  }
  const cssPath = files.find((item) => item.path.replace(/\\/g, "/").endsWith("globals.css"))?.path ?? "app/globals.css";
  const cssFile = files.find((item) => item.path === cssPath);
  files = upsert(
    files,
    cssPath,
    applySemanticNavWidthUtilizationCss(applyDarkSurfaceMutedTextCss(applyHomepageHeroLinkContrastCss(cssFile?.content ?? ""))),
  );
  const manifest = files.find((item) => item.path.replace(/\\/g, "/") === "artifact-manifest.json");
  if (manifest) {
    try {
      const parsed = JSON.parse(manifest.content) as Record<string, unknown>;
      parsed.artifactId = input.artifactId;
      parsed.generationContract = SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_REPAIR_SITE_CONTRACT;
      parsed.lineage = {
        predecessorArtifactId: input.predecessorArtifactId,
        predecessorDigest: input.predecessorDigest,
        repairReason: SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_REPAIR_REASON,
        generationContract: SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_REPAIR_SITE_CONTRACT,
        siteArchitectureVersion: VENTURE_SITE_ARCHITECTURE_VERSION,
        contentArchitectureVersion: CONTENT_ARCHITECTURE_VERSION,
        designSystemVersion: DESIGN_SYSTEM_VERSION,
        candidateId: CRE_CANDIDATE_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
      };
      files = upsert(files, "artifact-manifest.json", `${JSON.stringify(parsed, null, 2)}\n`);
    } catch {
      /* keep */
    }
  }
  const routes = searchDepthRouteManifest();
  const pageLoop = runDeterministicPerPageAdmission({
    files,
    routes: [...routes.pageRoutes],
    redirects: [...routes.redirectSupport],
  });
  files = pageLoop.files;
  const css = files.find((item) => item.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
  const how = pageContent(files, "/how-it-works");
  const founderHtml = pageContent(files, "/commercial-lease-npv");
  const hubLayout = evaluateHubQuestionBoardLayout({ html: founderHtml, css });
  const discovery = evaluateHubQuestionDiscoveryCoverage(files);
  const demand = evaluateSearchDemandAuthoritySurface(files);
  const cannibal = evaluateSearchIntentCannibalization(files);
  const hookBoundary = evaluatePrerenderHookBoundaryGate(files);
  const contrast = evaluateRenderedTextContrastFromFiles(files);
  const perRouteMuted = [...routes.pageRoutes].map((route) =>
    evaluateRenderedMutedTextContrastGate({ html: pageContent(files, route), css }),
  );
  const howMuted = evaluateRenderedMutedTextContrastGate({ html: how, css });
  const muted = {
    ...howMuted,
    overall: perRouteMuted.every((item) => item.overall === "PASS") ? ("PASS" as const) : ("FAIL" as const),
    applicableDarkModules: perRouteMuted.filter((item) => item.applicableDarkModules > 0).length,
    validated: perRouteMuted.reduce((sum, item) => sum + item.validated, 0),
    failed: perRouteMuted.reduce((sum, item) => sum + item.failed, 0),
    darkSurfaceFailures: perRouteMuted.reduce((sum, item) => sum + item.darkSurfaceFailures, 0),
    lightSurfaceFailures: perRouteMuted.reduce((sum, item) => sum + item.lightSurfaceFailures, 0),
    missingMutedSamples: perRouteMuted.reduce((sum, item) => sum + item.missingMutedSamples, 0),
  };
  const humanFirst = evaluateHumanFirstPublicLanguageAcrossFiles(files);
  const heroLinks = evaluateRenderedLinkContrastGate({
    ...FOUNDER_HOMEPAGE_HERO_REPAIRED_FIXTURE,
    css,
  });
  const expanded = evaluateExpandedPublicAuthorityPublishability(files);
  const hard = evaluatePublicAuthorityPublishability({
    gateResults: Object.fromEntries(
      HARD_PUBLISHABILITY_GATES.map((gate) => [
        gate,
        gate === "RenderedTextContrastGate"
          ? contrast.overall
          : gate === "RenderedMutedTextContrastGate"
            ? muted.overall
            : gate === "RenderedHeadingInkGate"
              ? contrast.headings
              : gate === "RenderedLinkContrastGate"
                ? pageLoop.overall === "PASS" && heroLinks.overall === "PASS"
                  ? ("PASS" as const)
                  : ("FAIL" as const)
                : gate === "HumanFirstPublicLanguageGate"
                  ? humanFirst.overall
                  : gate === "HubQuestionDiscoveryCoverageGate"
                    ? discovery.overall
                    : gate === "HubQuestionBoardLayoutGate"
                      ? hubLayout.overall
                      : gate === "SearchDemandAuthoritySurfaceGate"
                        ? demand.overall
                        : gate === "SearchIntentCannibalizationGate"
                          ? cannibal.overall
                          : gate === "FullPublicRouteValidationGate"
                            ? pageLoop.fullRoute.overall
                            : gate === "RepeatedFailurePromotionGate"
                              ? pageLoop.promotion.overall
                              : ("PASS" as const),
      ]),
    ),
  });
  return {
    files,
    hubLayout,
    discovery,
    hookBoundary,
    pageLoop,
    publishability: expanded,
    hard,
    humanFirst,
    contrast,
    muted,
    demand,
    cannibal,
    heroLinks,
    hubRoutes: applicableHubBoardRoutes(files),
    howItWorks: how,
  };
}
