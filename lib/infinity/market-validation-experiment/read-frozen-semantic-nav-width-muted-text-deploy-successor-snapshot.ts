import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
} from "./constants";
import bundledDeploySuccessor from "./semantic-nav-width-muted-text-deploy-successor.bundled.json";
import { FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SNAPSHOT_PATH } from "./resolve-frozen-semantic-nav-width-muted-text-bundle";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

export const SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_SUCCESSOR_BUNDLED_PATH = join(
  MODULE_DIR,
  "semantic-nav-width-muted-text-deploy-successor.bundled.json",
);

export type FrozenSemanticNavWidthMutedTextDeploySuccessorSnapshot = {
  artifactId?: string;
  digest?: string;
  routes?: number;
  lockedDigest?: string;
  digestMatchesLock?: boolean;
  hookBoundary?: string;
  founderVisualReviewReady?: string;
  muted?: { overall?: string };
  pageLoop?: { overall?: string; files?: Array<{ path: string; content: string; encoding?: "base64" | "utf8" }> };
};

export class FrozenBundleSnapshotMissingError extends Error {
  readonly error_class = "FROZEN_BUNDLE_SNAPSHOT_MISSING" as const;
  constructor(message = "FROZEN_BUNDLE_SNAPSHOT_MISSING") {
    super(message);
    this.name = "FrozenBundleSnapshotMissingError";
  }
}

function parseSnapshot(raw: string, source: string): FrozenSemanticNavWidthMutedTextDeploySuccessorSnapshot {
  let parsed: FrozenSemanticNavWidthMutedTextDeploySuccessorSnapshot;
  try {
    parsed = JSON.parse(raw) as FrozenSemanticNavWidthMutedTextDeploySuccessorSnapshot;
  } catch {
    throw new FrozenBundleSnapshotMissingError(`FROZEN_BUNDLE_SNAPSHOT_INVALID:${source}`);
  }
  return parsed;
}

function assertLockedIdentity(snapshot: FrozenSemanticNavWidthMutedTextDeploySuccessorSnapshot): void {
  if (snapshot.artifactId !== CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID) {
    throw new Error(`legal_predecessor_id_drift:${snapshot.artifactId}`);
  }
  if (snapshot.digest !== CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST) {
    throw new Error(`legal_predecessor_digest_drift:${snapshot.digest}`);
  }
  const files = snapshot.pageLoop?.files ?? [];
  if (files.length === 0) throw new Error("FROZEN_BUNDLE_FILES_MISSING");
}

/** Authoritative frozen ONPV legal predecessor; local `.infinity` overrides bundled committed manifest. */
export function readFrozenSemanticNavWidthMutedTextDeploySuccessorSnapshot(
  cwd = process.cwd(),
): FrozenSemanticNavWidthMutedTextDeploySuccessorSnapshot {
  const localPath = join(cwd, FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SNAPSHOT_PATH);
  if (existsSync(localPath)) {
    const snapshot = parseSnapshot(readFileSync(localPath, "utf8"), localPath);
    assertLockedIdentity(snapshot);
    return snapshot;
  }
  if (existsSync(SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_SUCCESSOR_BUNDLED_PATH)) {
    const snapshot = parseSnapshot(
      readFileSync(SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_SUCCESSOR_BUNDLED_PATH, "utf8"),
      SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_SUCCESSOR_BUNDLED_PATH,
    );
    assertLockedIdentity(snapshot);
    return snapshot;
  }
  const snapshot = bundledDeploySuccessor as FrozenSemanticNavWidthMutedTextDeploySuccessorSnapshot;
  if (!snapshot?.pageLoop?.files?.length) {
    throw new FrozenBundleSnapshotMissingError();
  }
  assertLockedIdentity(snapshot);
  return snapshot;
}

export function frozenSemanticNavWidthMutedTextDeploySuccessorMaterialized(cwd = process.cwd()): boolean {
  try {
    readFrozenSemanticNavWidthMutedTextDeploySuccessorSnapshot(cwd);
    return true;
  } catch (err) {
    if (err instanceof FrozenBundleSnapshotMissingError) return false;
    throw err;
  }
}

export function frozenSemanticNavWidthMutedTextDeploySuccessorManifestHash(
  snapshot = readFrozenSemanticNavWidthMutedTextDeploySuccessorSnapshot(),
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        artifactId: snapshot.artifactId,
        digest: snapshot.digest,
        routes: snapshot.routes,
        fileCount: snapshot.pageLoop?.files?.length ?? 0,
      }),
    )
    .digest("hex");
}
