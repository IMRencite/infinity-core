import { existsSync, readFileSync } from "node:fs";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SNAPSHOT_PATH } from "@/lib/infinity/market-validation-experiment/resolve-frozen-semantic-nav-width-muted-text-bundle";
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

export class FrozenBundleSnapshotMissingError extends Error {
  readonly error_class = "FROZEN_BUNDLE_SNAPSHOT_MISSING" as const;
  constructor(message = "FROZEN_BUNDLE_SNAPSHOT_MISSING") {
    super(message);
    this.name = "FrozenBundleSnapshotMissingError";
  }
}

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
  if (!existsSync(FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SNAPSHOT_PATH)) {
    throw new FrozenBundleSnapshotMissingError();
  }
  const snapshot = JSON.parse(readFileSync(FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SNAPSHOT_PATH, "utf8")) as {
    artifactId?: string;
    digest?: string;
    routes?: number;
    pageLoop?: { files?: AuthorityFile[] };
  };
  if (snapshot.artifactId !== CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID) {
    throw new Error(`legal_predecessor_id_drift:${snapshot.artifactId}`);
  }
  if (snapshot.digest !== CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST) {
    throw new Error(`legal_predecessor_digest_drift:${snapshot.digest}`);
  }
  const predecessorFiles = snapshot.pageLoop?.files ?? [];
  if (predecessorFiles.length === 0) throw new Error("FROZEN_BUNDLE_FILES_MISSING");
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
