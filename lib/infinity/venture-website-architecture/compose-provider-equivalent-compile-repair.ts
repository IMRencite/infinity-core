import { CRE_CANDIDATE_ID, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import {
  CONTENT_ARCHITECTURE_VERSION,
  DESIGN_SYSTEM_VERSION,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_REASON,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SITE_CONTRACT,
  VENTURE_SITE_ARCHITECTURE_VERSION,
} from "./constants";

const LINEAGE_EXPORTS = [
  "VALIDATION_CANDIDATE_ID",
  "VALIDATION_EXPERIMENT_ID",
  "VALIDATION_ARTIFACT_ID",
] as const;

function upsert(files: Array<{ path: string; content: string }>, path: string, content: string): Array<{ path: string; content: string }> {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push({ path, content });
  return next;
}

function ensureExport(content: string, name: string, value: string): string {
  const pattern = new RegExp(`export const ${name} = (?:"[^"]*"|'[^']*')`);
  if (pattern.test(content)) {
    return content.replace(pattern, `export const ${name} = ${JSON.stringify(value)}`);
  }
  return `export const ${name} = ${JSON.stringify(value)};\n${content}`;
}

export function ensureValidationLineageDeclarations(
  content: string,
  input: { candidateId: string; experimentId: string; artifactId: string },
): string {
  let next = ensureExport(content, "VALIDATION_CANDIDATE_ID", input.candidateId);
  next = ensureExport(next, "VALIDATION_EXPERIMENT_ID", input.experimentId);
  next = ensureExport(next, "VALIDATION_ARTIFACT_ID", input.artifactId);
  if (!next.includes("validationLineage")) {
    next = next.replace(
      `export async function submitPilotForm(form: Record<string, unknown>): Promise<{ ok: boolean }> {
  return postValidationIngest({ kind: "form", form });
}`,
      `export async function submitPilotForm(form: Record<string, unknown>): Promise<{ ok: boolean }> {
  return postValidationIngest({
    kind: "form",
    form,
    validationLineage: {
      candidateId: VALIDATION_CANDIDATE_ID,
      experimentId: VALIDATION_EXPERIMENT_ID,
      artifactId: VALIDATION_ARTIFACT_ID,
    },
  });
}`,
    );
  }
  return next;
}

export function ensureValidationLineageImports(content: string): string {
  const ingestImport = content.match(/import\s*\{([^}]+)\}\s*from\s*["']([^"']*ingest-client)["']/);
  if (ingestImport) {
    const existing = ingestImport[1]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const next = [...new Set([...existing, ...LINEAGE_EXPORTS])];
    return content.replace(ingestImport[0], `import { ${next.join(", ")} } from "${ingestImport[2]}";`);
  }
  if (/\bVALIDATION_CANDIDATE_ID\b/.test(content) || /\bVALIDATION_EXPERIMENT_ID\b/.test(content)) {
    return `import { ${LINEAGE_EXPORTS.join(", ")} } from "../ingest-client";\n${content}`;
  }
  return content;
}

export function composeProviderEquivalentCompileRepairFiles(input: {
  files: Array<{ path: string; content: string }>;
  artifactId: string;
  predecessorArtifactId: string;
  predecessorDigest: string;
  candidateId?: string;
  experimentId?: string;
}): Array<{ path: string; content: string }> {
  const candidateId = input.candidateId ?? CRE_CANDIDATE_ID;
  const experimentId = input.experimentId ?? LOCKED_CRE_EXPERIMENT_ID;
  let files = input.files.map((item) => ({ ...item }));
  const ingest = files.find((item) => item.path.replace(/\\/g, "/") === "app/ingest-client.ts");
  if (ingest) {
    ingest.content = ensureValidationLineageDeclarations(ingest.content, {
      candidateId,
      experimentId,
      artifactId: input.artifactId,
    });
  }
  const early = files.find((item) => item.path.replace(/\\/g, "/") === "app/early-access/page.tsx");
  if (early) early.content = ensureValidationLineageImports(early.content);
  const homepage = files.find((item) => item.path.replace(/\\/g, "/") === "app/page.tsx");
  if (homepage) {
    homepage.content = homepage.content.replace(/data-artifact-id="[^"]+"/, `data-artifact-id="${input.artifactId}"`);
    if (!homepage.content.includes(`data-candidate-id="${candidateId}"`)) {
      homepage.content = homepage.content.replace(
        `data-artifact-id="${input.artifactId}"`,
        `data-artifact-id="${input.artifactId}" data-candidate-id="${candidateId}"`,
      );
    }
    if (!homepage.content.includes(`data-experiment-id="${experimentId}"`)) {
      homepage.content = homepage.content.replace(
        `data-artifact-id="${input.artifactId}"`,
        `data-artifact-id="${input.artifactId}" data-experiment-id="${experimentId}"`,
      );
    }
  }
  const manifest = files.find((item) => item.path.replace(/\\/g, "/") === "artifact-manifest.json");
  if (manifest) {
    try {
      const parsed = JSON.parse(manifest.content) as Record<string, unknown>;
      parsed.artifactId = input.artifactId;
      parsed.generationContract = PROVIDER_EQUIVALENT_COMPILE_REPAIR_SITE_CONTRACT;
      parsed.lineage = {
        predecessorArtifactId: input.predecessorArtifactId,
        predecessorDigest: input.predecessorDigest,
        repairReason: PROVIDER_EQUIVALENT_COMPILE_REPAIR_REASON,
        generationContract: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SITE_CONTRACT,
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
