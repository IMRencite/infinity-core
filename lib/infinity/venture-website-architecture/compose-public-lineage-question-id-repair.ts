import { CRE_CANDIDATE_ID, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import {
  CONTENT_ARCHITECTURE_VERSION,
  DESIGN_SYSTEM_VERSION,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_REASON,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SITE_CONTRACT,
  VENTURE_SITE_ARCHITECTURE_VERSION,
} from "./constants";
import {
  applyPublicLineageToEarlyAccessForm,
  applyPublicLineageToHomepage,
  applyPublicLineageToIngestClient,
  applyQuestionIdentityToPageSource,
} from "./public-lineage-question-id";

function upsert(files: Array<{ path: string; content: string }>, path: string, content: string): Array<{ path: string; content: string }> {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push({ path, content });
  return next;
}

export function composePublicLineageQuestionIdRepairFiles(input: {
  files: Array<{ path: string; content: string }>;
  artifactId: string;
  predecessorArtifactId: string;
  predecessorDigest: string;
  candidateId?: string;
  experimentId?: string;
}): Array<{ path: string; content: string }> {
  const candidateId = input.candidateId ?? CRE_CANDIDATE_ID;
  const experimentId = input.experimentId ?? LOCKED_CRE_EXPERIMENT_ID;
  let files = input.files.map((item) => {
    const path = item.path.replace(/\\/g, "/");
    if (path === "app/page.tsx" || /app\/.+\/page\.tsx$/.test(path)) {
      return { ...item, content: applyQuestionIdentityToPageSource(item.content) };
    }
    return { ...item };
  });
  const ingest = files.find((item) => item.path.replace(/\\/g, "/") === "app/ingest-client.ts");
  if (ingest) ingest.content = applyPublicLineageToIngestClient(ingest.content, input.artifactId);
  const early = files.find((item) => item.path.replace(/\\/g, "/") === "app/early-access/page.tsx");
  if (early) early.content = applyPublicLineageToEarlyAccessForm(early.content);
  const homepage = files.find((item) => item.path.replace(/\\/g, "/") === "app/page.tsx");
  if (homepage) {
    homepage.content = applyPublicLineageToHomepage(homepage.content, {
      candidateId,
      experimentId,
      artifactId: input.artifactId,
    });
  }
  const manifest = files.find((item) => item.path.replace(/\\/g, "/") === "artifact-manifest.json");
  if (manifest) {
    try {
      const parsed = JSON.parse(manifest.content) as Record<string, unknown>;
      parsed.artifactId = input.artifactId;
      parsed.generationContract = PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SITE_CONTRACT;
      parsed.lineage = {
        predecessorArtifactId: input.predecessorArtifactId,
        predecessorDigest: input.predecessorDigest,
        repairReason: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_REASON,
        generationContract: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SITE_CONTRACT,
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
