import { CRE_CANDIDATE_ID, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { evaluateExpandedPublicAuthorityPublishability } from "./authority-expansion-gates";
import {
  CONTENT_ARCHITECTURE_VERSION,
  DESIGN_SYSTEM_VERSION,
  HUB_QUESTION_BOARD_LAYOUT_REPAIR_REASON,
  HUB_QUESTION_BOARD_LAYOUT_REPAIR_SITE_CONTRACT,
  VENTURE_SITE_ARCHITECTURE_VERSION,
} from "./constants";
import { SEO_GEO_TOPIC_HUBS } from "./digital-real-estate-catalog";
import { renderRepairedHubQuestionDiscovery, replaceHubQuestionDiscovery } from "./hub-question-discovery";
import { applyHubDiscoveryLayoutCss } from "./authority-section-surface-css";
import { evaluateHumanFirstPublicLanguageAcrossFiles } from "./human-first-public-language-gate";
import { evaluatePublicAuthorityPublishability } from "./public-authority-standard/publishability";
import { HARD_PUBLISHABILITY_GATES } from "./public-authority-standard/constants";
import { runDeterministicPerPageAdmission } from "./public-authority-standard/per-page-render-validate-repair";
import { evaluatePrerenderHookBoundaryGate } from "./public-authority-standard/prerender-hook-boundary-gate";
import { evaluateRenderedTextContrastFromFiles } from "./public-authority-standard/rendered-text-contrast-gate";
import {
  evaluateHubQuestionBoardLayout,
} from "./public-authority-standard/hub-discovery-rendered-quality";
import {
  evaluateHubQuestionDiscoveryCoverage,
  evaluateSearchDemandAuthoritySurface,
  evaluateSearchIntentCannibalization,
} from "./search-demand-depth-gates";
import { pageContent } from "./answer-authority/page-inspect";
import { repairPresentationalClientBoundaries } from "./compose-pricing-prerender-repair";

type ArtifactFile = { path: string; content: string; encoding?: "utf8" | "base64" };

function upsert(files: ArtifactFile[], path: string, content: string): ArtifactFile[] {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push({ path, content });
  return next;
}

function filePath(route: string): string {
  const clean = route.replace(/\/+$/, "") || "/";
  return clean === "/" ? "app/page.tsx" : `app${clean}/page.tsx`;
}

export function applicableHubBoardRoutes(files: ArtifactFile[]): string[] {
  return SEO_GEO_TOPIC_HUBS.map((hub) => hub.route).filter((route) =>
    /data-hub-question-discovery/.test(pageContent(files, route)),
  );
}

export function composeHubQuestionBoardLayoutRepairFiles(input: {
  files: ArtifactFile[];
  artifactId: string;
  predecessorArtifactId: string;
  predecessorDigest: string;
}): {
  files: ArtifactFile[];
  hubLayout: ReturnType<typeof evaluateHubQuestionBoardLayout>;
  discovery: ReturnType<typeof evaluateHubQuestionDiscoveryCoverage>;
  hookBoundary: ReturnType<typeof evaluatePrerenderHookBoundaryGate>;
  pageLoop: ReturnType<typeof runDeterministicPerPageAdmission>;
  publishability: ReturnType<typeof evaluateExpandedPublicAuthorityPublishability>;
  hard: ReturnType<typeof evaluatePublicAuthorityPublishability>;
  humanFirst: ReturnType<typeof evaluateHumanFirstPublicLanguageAcrossFiles>;
  contrast: ReturnType<typeof evaluateRenderedTextContrastFromFiles>;
  demand: ReturnType<typeof evaluateSearchDemandAuthoritySurface>;
  cannibal: ReturnType<typeof evaluateSearchIntentCannibalization>;
  hubRoutes: string[];
} {
  let files = repairPresentationalClientBoundaries(input.files.map((file) => ({ ...file })));
  for (const hub of SEO_GEO_TOPIC_HUBS) {
    const path = filePath(hub.route);
    const current = files.find((item) => item.path.replace(/\\/g, "/") === path);
    if (!current || current.encoding === "base64") continue;
    const snippet = renderRepairedHubQuestionDiscovery(hub.route);
    if (!snippet) continue;
    files = upsert(files, path, replaceHubQuestionDiscovery(current.content, snippet));
  }
  const homepage = files.find((item) => item.path.replace(/\\/g, "/") === "app/page.tsx");
  if (homepage) {
    files = upsert(
      files,
      "app/page.tsx",
      homepage.content.replace(/data-artifact-id="[^"]+"/, `data-artifact-id="${input.artifactId}"`),
    );
  }
  const cssPath = files.find((item) => item.path.replace(/\\/g, "/").endsWith("globals.css"))?.path ?? "app/globals.css";
  const cssFile = files.find((item) => item.path === cssPath);
  files = upsert(files, cssPath, applyHubDiscoveryLayoutCss(cssFile?.content ?? ""));
  const manifest = files.find((item) => item.path.replace(/\\/g, "/") === "artifact-manifest.json");
  if (manifest) {
    try {
      const parsed = JSON.parse(manifest.content) as Record<string, unknown>;
      parsed.artifactId = input.artifactId;
      parsed.generationContract = HUB_QUESTION_BOARD_LAYOUT_REPAIR_SITE_CONTRACT;
      parsed.lineage = {
        predecessorArtifactId: input.predecessorArtifactId,
        predecessorDigest: input.predecessorDigest,
        repairReason: HUB_QUESTION_BOARD_LAYOUT_REPAIR_REASON,
        generationContract: HUB_QUESTION_BOARD_LAYOUT_REPAIR_SITE_CONTRACT,
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
  const founderHtml = pageContent(files, "/commercial-lease-npv");
  const hubLayout = evaluateHubQuestionBoardLayout({ html: founderHtml, css });
  const discovery = evaluateHubQuestionDiscoveryCoverage(files);
  const demand = evaluateSearchDemandAuthoritySurface(files);
  const cannibal = evaluateSearchIntentCannibalization(files);
  const hookBoundary = evaluatePrerenderHookBoundaryGate(files);
  const contrast = evaluateRenderedTextContrastFromFiles(files);
  const humanFirst = evaluateHumanFirstPublicLanguageAcrossFiles(files);
  const expanded = evaluateExpandedPublicAuthorityPublishability(files);
  const hard = evaluatePublicAuthorityPublishability({
    gateResults: Object.fromEntries(
      HARD_PUBLISHABILITY_GATES.map((gate) => [
        gate,
        gate === "RenderedTextContrastGate"
          ? contrast.overall
          : gate === "RenderedHeadingInkGate"
            ? contrast.headings
            : gate === "RenderedLinkContrastGate"
              ? pageLoop.overall
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
    demand,
    cannibal,
    hubRoutes: applicableHubBoardRoutes(files),
  };
}
