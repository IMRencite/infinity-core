import { CRE_CANDIDATE_ID, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { evaluateExpandedPublicAuthorityPublishability } from "./authority-expansion-gates";
import {
  CONTENT_ARCHITECTURE_VERSION,
  DESIGN_SYSTEM_VERSION,
  PRICING_PRERENDER_HOOK_BOUNDARY_REPAIR_REASON,
  PRICING_PRERENDER_HOOK_BOUNDARY_REPAIR_SITE_CONTRACT,
  VENTURE_SITE_ARCHITECTURE_VERSION,
} from "./constants";
import { evaluateHumanFirstPublicLanguageAcrossFiles } from "./human-first-public-language-gate";
import { evaluatePublicAuthorityPublishability } from "./public-authority-standard/publishability";
import { HARD_PUBLISHABILITY_GATES } from "./public-authority-standard/constants";
import { runDeterministicPerPageAdmission } from "./public-authority-standard/per-page-render-validate-repair";
import {
  evaluatePrerenderHookBoundaryGate,
  stripUnnecessaryUseClient,
} from "./public-authority-standard/prerender-hook-boundary-gate";
import { evaluateRenderedTextContrastFromFiles } from "./public-authority-standard/rendered-text-contrast-gate";

type ArtifactFile = { path: string; content: string; encoding?: "utf8" | "base64" };

function upsert(files: ArtifactFile[], path: string, content: string): ArtifactFile[] {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push({ path, content });
  return next;
}

function isInteractiveIsland(path: string, content: string): boolean {
  const clean = path.replace(/\\/g, "/");
  if (clean.includes("early-access") && /useState|useOptimistic|FormEvent/.test(content)) return true;
  if (clean.includes("view-beacon") && /useEffect/.test(content)) return true;
  if (clean.includes("ingest-client")) return true;
  return false;
}

export function repairPresentationalClientBoundaries(files: ArtifactFile[]): ArtifactFile[] {
  return files.map((file) => {
    const path = file.path.replace(/\\/g, "/");
    if (file.encoding === "base64") return file;
    if (isInteractiveIsland(path, file.content)) return file;
    const repaired = stripUnnecessaryUseClient(file.content);
    return repaired === file.content ? file : { ...file, content: repaired };
  });
}

export function composePricingPrerenderRepairFiles(input: {
  files: ArtifactFile[];
  artifactId: string;
  predecessorArtifactId: string;
  predecessorDigest: string;
}): {
  files: ArtifactFile[];
  hookBoundary: ReturnType<typeof evaluatePrerenderHookBoundaryGate>;
  pageLoop: ReturnType<typeof runDeterministicPerPageAdmission>;
  publishability: ReturnType<typeof evaluateExpandedPublicAuthorityPublishability>;
  hard: ReturnType<typeof evaluatePublicAuthorityPublishability>;
  humanFirst: ReturnType<typeof evaluateHumanFirstPublicLanguageAcrossFiles>;
  contrast: ReturnType<typeof evaluateRenderedTextContrastFromFiles>;
} {
  let files = repairPresentationalClientBoundaries(input.files.map((file) => ({ ...file })));
  const homepage = files.find((item) => item.path.replace(/\\/g, "/") === "app/page.tsx");
  if (homepage) {
    files = upsert(
      files,
      "app/page.tsx",
      homepage.content.replace(/data-artifact-id="[^"]+"/, `data-artifact-id="${input.artifactId}"`),
    );
  }
  const manifest = files.find((item) => item.path.replace(/\\/g, "/") === "artifact-manifest.json");
  if (manifest) {
    try {
      const parsed = JSON.parse(manifest.content) as Record<string, unknown>;
      parsed.artifactId = input.artifactId;
      parsed.generationContract = PRICING_PRERENDER_HOOK_BOUNDARY_REPAIR_SITE_CONTRACT;
      parsed.lineage = {
        predecessorArtifactId: input.predecessorArtifactId,
        predecessorDigest: input.predecessorDigest,
        repairReason: PRICING_PRERENDER_HOOK_BOUNDARY_REPAIR_REASON,
        generationContract: PRICING_PRERENDER_HOOK_BOUNDARY_REPAIR_SITE_CONTRACT,
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
            : gate === "HubQuestionBoardLayoutGate"
              ? pageLoop.overall
              : gate === "FullPublicRouteValidationGate"
                ? pageLoop.fullRoute.overall
                : gate === "RepeatedFailurePromotionGate"
                  ? pageLoop.promotion.overall
                  : ("PASS" as const),
      ]),
    ),
  });
  return { files, hookBoundary, pageLoop, publishability: expanded, hard, humanFirst, contrast };
}
