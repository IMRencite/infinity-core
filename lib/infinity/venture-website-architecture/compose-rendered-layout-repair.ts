import { creDesignContext, produceVentureDesignTokens } from "@/lib/infinity/public-venture-design";
import {
  applyFooterInnerContainer,
  applyFreeRentComposition,
  applyHowItWorksComposition,
  applyLongFormCompositionRepair,
  applyRenderedLayoutCss,
} from "@/lib/infinity/public-venture-design/rendered-layout";
import {
  CONTENT_ARCHITECTURE_VERSION,
  DESIGN_SYSTEM_VERSION,
  RENDERED_LAYOUT_REPAIR_REASON,
  RENDERED_LAYOUT_REPAIR_SITE_CONTRACT,
  VENTURE_SITE_ARCHITECTURE_VERSION,
} from "./constants";

function upsert(files: Array<{ path: string; content: string }>, path: string, content: string): Array<{ path: string; content: string }> {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push({ path, content });
  return next;
}

export function composeRenderedLayoutRepairFiles(input: {
  files: Array<{ path: string; content: string }>;
  artifactId: string;
  predecessorArtifactId: string;
  predecessorDigest: string;
}): Array<{ path: string; content: string }> {
  const tokens = produceVentureDesignTokens(creDesignContext());
  let files = input.files.map((item) => ({ ...item }));
  const css = files.find((item) => item.path.replace(/\\/g, "/") === "styles/globals.css");
  if (css) css.content = applyRenderedLayoutCss(css.content, tokens);
  const footer = files.find((item) => item.path.replace(/\\/g, "/").includes("venture-footer"));
  if (footer) footer.content = applyFooterInnerContainer(footer.content);
  files = files.map((item) => {
    const path = item.path.replace(/\\/g, "/");
    if (path === "app/how-it-works/page.tsx") return { ...item, content: applyHowItWorksComposition(item.content) };
    if (path === "app/resources/free-rent/page.tsx") return { ...item, content: applyFreeRentComposition(item.content) };
    if (/app\/.+\/page\.tsx$/.test(path) || path === "app/page.tsx") {
      return { ...item, content: applyLongFormCompositionRepair(item.content) };
    }
    return item;
  });
  const ingest = files.find((item) => item.path.replace(/\\/g, "/") === "app/ingest-client.ts");
  if (ingest) {
    ingest.content = ingest.content.replace(
      /export const VALIDATION_ARTIFACT_ID = "[^"]+"/,
      `export const VALIDATION_ARTIFACT_ID = ${JSON.stringify(input.artifactId)}`,
    );
  }
  const homepage = files.find((item) => item.path.replace(/\\/g, "/") === "app/page.tsx");
  if (homepage) {
    homepage.content = homepage.content.replace(/data-artifact-id="[^"]+"/, `data-artifact-id="${input.artifactId}"`);
  }
  const manifest = files.find((item) => item.path.replace(/\\/g, "/") === "artifact-manifest.json");
  if (manifest) {
    try {
      const parsed = JSON.parse(manifest.content) as Record<string, unknown>;
      parsed.artifactId = input.artifactId;
      parsed.generationContract = RENDERED_LAYOUT_REPAIR_SITE_CONTRACT;
      parsed.lineage = {
        predecessorArtifactId: input.predecessorArtifactId,
        predecessorDigest: input.predecessorDigest,
        repairReason: RENDERED_LAYOUT_REPAIR_REASON,
        generationContract: RENDERED_LAYOUT_REPAIR_SITE_CONTRACT,
        siteArchitectureVersion: VENTURE_SITE_ARCHITECTURE_VERSION,
        contentArchitectureVersion: CONTENT_ARCHITECTURE_VERSION,
        designSystemVersion: DESIGN_SYSTEM_VERSION,
        urlMigrationsPerformed: [],
        futureSiloMigrationDocumented: true,
      };
      files = upsert(files, "artifact-manifest.json", JSON.stringify(parsed, null, 2));
    } catch {
      // keep
    }
  }
  return files;
}
