import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import {
  FrozenBundleSnapshotMissingError,
  readFrozenSemanticNavWidthMutedTextDeploySuccessorSnapshot,
} from "@/lib/infinity/market-validation-experiment/read-frozen-semantic-nav-width-muted-text-deploy-successor-snapshot";
import { occupancynpvPrivacyPolicyPageSource, occupancynpvTermsOfServicePageSource } from "./occupancynpv-legal-surface-pages";
import { OCCUPANCYNPV_LEGAL_SURFACE_REPAIR_REASON, OCCUPANCYNPV_LEGAL_SURFACE_REPAIR_SITE_CONTRACT } from "./constants";
import { premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { digestOfAuthorityFiles } from "./cre-successor";

export type AuthorityFile = { path: string; content: string; encoding?: "utf8" | "base64" };

export function occupancynpvLegalSurfaceSuccessorArtifactId(): string {
  return premiumAuthorityArtifactIdFor({
    planId: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    packageId: "occupancynpv-legal-surface-repair-v1",
    packageVersion: "1",
    contract: OCCUPANCYNPV_LEGAL_SURFACE_REPAIR_SITE_CONTRACT,
  });
}

export function composeOccupancynpvLegalSurfaceRepairFiles(files: AuthorityFile[]): {
  files: AuthorityFile[];
  changedPaths: string[];
} {
  const privacy = occupancynpvPrivacyPolicyPageSource();
  const terms = occupancynpvTermsOfServicePageSource();
  const changedPaths: string[] = [];
  const next = files.map((file) => {
    const path = file.path.replace(/\\/g, "/");
    if (path === "app/privacy-policy/page.tsx") {
      changedPaths.push(path);
      return { ...file, content: privacy, encoding: "utf8" as const };
    }
    if (path === "app/terms-of-service/page.tsx") {
      changedPaths.push(path);
      return { ...file, content: terms, encoding: "utf8" as const };
    }
    return file;
  });
  return { files: next, changedPaths };
}

export { FrozenBundleSnapshotMissingError } from "@/lib/infinity/market-validation-experiment/read-frozen-semantic-nav-width-muted-text-deploy-successor-snapshot";

export function reconstructOccupancynpvLegalSurfaceSuccessor(): {
  artifactId: string;
  digest: string;
  predecessorArtifactId: string;
  predecessorDigest: string;
  repairReason: typeof OCCUPANCYNPV_LEGAL_SURFACE_REPAIR_REASON;
  files: AuthorityFile[];
  changedPaths: string[];
  routes: number;
  immutable: true;
} {
  const snapshot = readFrozenSemanticNavWidthMutedTextDeploySuccessorSnapshot();
  const predecessorFiles = (snapshot.pageLoop?.files ?? []) as AuthorityFile[];
  const composed = composeOccupancynpvLegalSurfaceRepairFiles(predecessorFiles);
  return {
    artifactId: occupancynpvLegalSurfaceSuccessorArtifactId(),
    digest: digestOfAuthorityFiles(composed.files),
    predecessorArtifactId: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
    repairReason: OCCUPANCYNPV_LEGAL_SURFACE_REPAIR_REASON,
    files: composed.files,
    changedPaths: composed.changedPaths,
    routes: snapshot.routes ?? 93,
    immutable: true,
  };
}
