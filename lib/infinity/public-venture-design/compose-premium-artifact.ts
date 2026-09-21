import { createHash } from "node:crypto";
import { PREMIUM_VALIDATION_ARTIFACT_CONTRACT, PREMIUM_PUBLIC_VENTURE_REPAIR_REASON } from "./constants";
import { planPublicVentureComposition } from "./composition-planner";
import { planCreativeAssets } from "./creative-asset-plan";
import { produceVentureDesignDirection, produceVentureDesignTokens } from "./design-intelligence";
import { premiumValidationGlobalCss } from "./premium-css";
import { premiumCreLandingSource, premiumVenturePrimitivesSource } from "./premium-primitives";
import { auditPremiumValidation } from "./quality-gate";
import type { PageCompositionProvenance, PublicVentureDesignContext } from "./types";

export function premiumArtifactIdFor(input: { planId: string; packageId: string; packageVersion: string | number }): string {
  return `art_${createHash("sha256")
    .update([input.planId, input.packageId, String(input.packageVersion), PREMIUM_VALIDATION_ARTIFACT_CONTRACT].join(":"))
    .digest("hex")
    .slice(0, 20)}`;
}

function upsert(files: Array<{ path: string; content: string }>, path: string, content: string): Array<{ path: string; content: string }> {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push({ path, content });
  return next;
}

export function composePremiumValidationArtifact(input: {
  context: PublicVentureDesignContext;
  files: Array<{ path: string; content: string }>;
  artifactId: string;
  experimentId: string;
  ventureId: string;
  candidateId: string;
  predecessorArtifactId: string;
  predecessorDigest?: string | null;
}): {
  files: Array<{ path: string; content: string }>;
  provenance: PageCompositionProvenance;
  quality: ReturnType<typeof auditPremiumValidation>;
} {
  const direction = produceVentureDesignDirection(input.context);
  const tokens = produceVentureDesignTokens(input.context);
  const composition = planPublicVentureComposition(input.context);
  const creativeAssetPlan = planCreativeAssets({ context: input.context, composition });
  let files = input.files.map((item) => ({ ...item }));
  files = upsert(files, "styles/globals.css", premiumValidationGlobalCss(tokens));
  files = upsert(files, "components/premium-venture.tsx", premiumVenturePrimitivesSource());
  files = upsert(
    files,
    "app/page.tsx",
    premiumCreLandingSource({
      artifactId: input.artifactId,
      experimentId: input.experimentId,
      ventureId: input.ventureId,
      candidateId: input.candidateId,
    }),
  );
  const ingest = files.find((item) => item.path.replace(/\\/g, "/") === "app/ingest-client.ts");
  if (ingest) {
    ingest.content = ingest.content.replace(/export const VALIDATION_ARTIFACT_ID = "[^"]+"/, `export const VALIDATION_ARTIFACT_ID = ${JSON.stringify(input.artifactId)}`);
  }
  const manifest = files.find((item) => item.path.replace(/\\/g, "/") === "artifact-manifest.json");
  if (manifest) {
    try {
      const parsed = JSON.parse(manifest.content) as Record<string, unknown>;
      parsed.artifactId = input.artifactId;
      parsed.generationContract = PREMIUM_VALIDATION_ARTIFACT_CONTRACT;
      parsed.qualityTarget = input.context.artifactQualityTarget;
      parsed.lineage = {
        predecessorArtifactId: input.predecessorArtifactId,
        predecessorDigest: input.predecessorDigest ?? null,
        repairReason: PREMIUM_PUBLIC_VENTURE_REPAIR_REASON,
        generationContract: PREMIUM_VALIDATION_ARTIFACT_CONTRACT,
      };
      manifest.content = JSON.stringify(parsed, null, 2);
    } catch {
      // keep original manifest if unreadable
    }
  }
  const provenance: PageCompositionProvenance = {
    designDirection: direction,
    tokens,
    composition,
    creativeAssetPlan,
    qualityTarget: input.context.artifactQualityTarget,
    qualityResult: "PENDING",
  };
  files = upsert(files, "premium-provenance.json", JSON.stringify(provenance, null, 2));
  const quality = auditPremiumValidation(files);
  provenance.qualityResult = quality.classification;
  files = upsert(files, "premium-provenance.json", JSON.stringify(provenance, null, 2));
  return { files, provenance, quality };
}
