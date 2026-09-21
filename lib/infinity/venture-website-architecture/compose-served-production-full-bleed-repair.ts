import { creDesignContext, produceVentureDesignTokens } from "@/lib/infinity/public-venture-design/design-intelligence";
import { applyServedProductionFullBleedCss } from "@/lib/infinity/public-venture-design/rendered-layout/served-full-bleed-css";
import { CRE_CANDIDATE_ID, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import {
  CONTENT_ARCHITECTURE_VERSION,
  DESIGN_SYSTEM_VERSION,
  SERVED_PRODUCTION_FULL_BLEED_REPAIR_REASON,
  SERVED_PRODUCTION_FULL_BLEED_REPAIR_SITE_CONTRACT,
  VENTURE_SITE_ARCHITECTURE_VERSION,
} from "./constants";
import { ensureValidationLineageDeclarations } from "./compose-provider-equivalent-compile-repair";

function upsert(
  files: Array<{ path: string; content: string }>,
  path: string,
  content: string,
): Array<{ path: string; content: string }> {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push({ path, content });
  return next;
}

export function composeServedProductionFullBleedRepairFiles(input: {
  files: Array<{ path: string; content: string }>;
  artifactId: string;
  predecessorArtifactId: string;
  predecessorDigest: string;
  candidateId?: string;
  experimentId?: string;
}): Array<{ path: string; content: string }> {
  const tokens = produceVentureDesignTokens(creDesignContext());
  const candidateId = input.candidateId ?? CRE_CANDIDATE_ID;
  const experimentId = input.experimentId ?? LOCKED_CRE_EXPERIMENT_ID;
  let files = input.files.map((item) => ({ ...item }));
  const css = files.find((item) => item.path.replace(/\\/g, "/") === "styles/globals.css");
  if (css) css.content = applyServedProductionFullBleedCss(css.content, tokens);
  const ingest = files.find((item) => item.path.replace(/\\/g, "/") === "app/ingest-client.ts");
  if (ingest) {
    ingest.content = ensureValidationLineageDeclarations(ingest.content, {
      candidateId,
      experimentId,
      artifactId: input.artifactId,
    });
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
      parsed.generationContract = SERVED_PRODUCTION_FULL_BLEED_REPAIR_SITE_CONTRACT;
      parsed.lineage = {
        predecessorArtifactId: input.predecessorArtifactId,
        predecessorDigest: input.predecessorDigest,
        repairReason: SERVED_PRODUCTION_FULL_BLEED_REPAIR_REASON,
        generationContract: SERVED_PRODUCTION_FULL_BLEED_REPAIR_SITE_CONTRACT,
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
