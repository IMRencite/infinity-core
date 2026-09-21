import { existsSync, readFileSync } from "node:fs";
import {
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
} from "./constants";

export const SEMANTIC_NAV_WIDTH_MUTED_TEXT_FORBIDDEN_PREDECESSOR_ARTIFACT_IDS = [
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
] as const;

export const FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SNAPSHOT_PATH =
  ".infinity/semantic-nav-width-muted-text-deploy-successor.json" as const;
export const FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_PE_BUILD_PATH =
  ".infinity/semantic-nav-width-muted-text-pe-build.json" as const;

type FrozenFile = { path: string; content: string; encoding?: "base64" | "utf8" };

function isHqPublicFile(file: FrozenFile): boolean {
  return file.path.includes("command-chamber") || file.content.includes("InfinityDecisionCore");
}

function readFrozenPeBuild(): { status: string; frozen: boolean; artifactId: string; digest: string } | null {
  if (!existsSync(FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_PE_BUILD_PATH)) return null;
  return JSON.parse(readFileSync(FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_PE_BUILD_PATH, "utf8")) as {
    status: string;
    frozen: boolean;
    artifactId: string;
    digest: string;
  };
}

export function resolveFrozenSemanticNavWidthMutedTextDeploymentBundle(): {
  ok: boolean;
  stopReason: string | null;
  composed: false;
  composeInvoked: false;
  artifactId: string;
  digest: string;
  artifactExactMatch: "PASS" | "FAIL";
  digestExactMatch: "PASS" | "FAIL";
  routes: number;
  files: FrozenFile[];
  fullFrozenBundleAvailable: boolean;
  hqFiles: number;
  scopeSeparation: "PASS" | "FAIL";
  peBuildFrozen: "PASS" | "FAIL";
  admission: "PASS" | "FAIL";
  pageLoopOverall: string | null;
  hookBoundary: string | null;
  founderVisualReviewReady: string | null;
  mutedOverall: string | null;
} {
  const lockedArtifact = CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID;
  const lockedDigest = CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST;
  const fail = (
    stopReason: string,
    extra: Partial<ReturnType<typeof resolveFrozenSemanticNavWidthMutedTextDeploymentBundle>> = {},
  ) => ({
    ok: false,
    stopReason,
    composed: false as const,
    composeInvoked: false as const,
    artifactId: extra.artifactId ?? lockedArtifact,
    digest: extra.digest ?? lockedDigest,
    artifactExactMatch: extra.artifactExactMatch ?? "FAIL",
    digestExactMatch: extra.digestExactMatch ?? "FAIL",
    routes: extra.routes ?? 0,
    files: extra.files ?? [],
    fullFrozenBundleAvailable: Boolean(extra.files?.length),
    hqFiles: extra.hqFiles ?? 0,
    scopeSeparation: extra.scopeSeparation ?? "FAIL",
    peBuildFrozen: extra.peBuildFrozen ?? "FAIL",
    admission: "FAIL" as const,
    pageLoopOverall: extra.pageLoopOverall ?? null,
    hookBoundary: extra.hookBoundary ?? null,
    founderVisualReviewReady: extra.founderVisualReviewReady ?? null,
    mutedOverall: extra.mutedOverall ?? null,
  });

  if (!existsSync(FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SNAPSHOT_PATH)) {
    return fail("FROZEN_BUNDLE_SNAPSHOT_MISSING");
  }
  const snapshot = JSON.parse(readFileSync(FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SNAPSHOT_PATH, "utf8")) as {
    artifactId?: string;
    digest?: string;
    routes?: number;
    lockedDigest?: string;
    digestMatchesLock?: boolean;
    hookBoundary?: string;
    founderVisualReviewReady?: string;
    muted?: { overall?: string };
    pageLoop?: { overall?: string; files?: FrozenFile[] };
  };
  const artifactId = snapshot.artifactId ?? "";
  if (
    artifactId !== lockedArtifact ||
    SEMANTIC_NAV_WIDTH_MUTED_TEXT_FORBIDDEN_PREDECESSOR_ARTIFACT_IDS.includes(
      artifactId as (typeof SEMANTIC_NAV_WIDTH_MUTED_TEXT_FORBIDDEN_PREDECESSOR_ARTIFACT_IDS)[number],
    )
  ) {
    return fail("AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH", {
      artifactId,
      artifactExactMatch: "FAIL",
      routes: snapshot.routes ?? 0,
    });
  }
  const files = snapshot.pageLoop?.files ?? [];
  const digest = snapshot.digest ?? "";
  if (digest !== lockedDigest || snapshot.lockedDigest !== lockedDigest || snapshot.digestMatchesLock !== true) {
    return fail("REPAIRED_ARTIFACT_FREEZE_MISMATCH", {
      artifactId,
      digest,
      artifactExactMatch: "PASS",
      digestExactMatch: "FAIL",
      files,
      routes: snapshot.routes ?? 0,
    });
  }
  const hqFiles = files.filter(isHqPublicFile).length;
  const pe = readFrozenPeBuild();
  const peBuildFrozen =
    pe?.status === "PASS" &&
    pe.frozen === true &&
    pe.artifactId === lockedArtifact &&
    pe.digest === lockedDigest
      ? ("PASS" as const)
      : ("FAIL" as const);
  const admission =
    snapshot.routes === 93 &&
    snapshot.pageLoop?.overall === "PASS" &&
    snapshot.hookBoundary === "PASS" &&
    snapshot.founderVisualReviewReady === "FOUNDER_VISUAL_REVIEW_READY" &&
    snapshot.muted?.overall === "PASS" &&
    files.length > 0 &&
    hqFiles === 0 &&
    peBuildFrozen === "PASS"
      ? ("PASS" as const)
      : ("FAIL" as const);
  return {
    ok: admission === "PASS",
    stopReason: admission === "PASS" ? null : "PREDEPLOY_QUALITY_FAILED",
    composed: false,
    composeInvoked: false,
    artifactId,
    digest,
    artifactExactMatch: "PASS",
    digestExactMatch: "PASS",
    routes: snapshot.routes ?? 0,
    files,
    fullFrozenBundleAvailable: files.length > 0,
    hqFiles,
    scopeSeparation: hqFiles === 0 ? "PASS" : "FAIL",
    peBuildFrozen,
    admission,
    pageLoopOverall: snapshot.pageLoop?.overall ?? null,
    hookBoundary: snapshot.hookBoundary ?? null,
    founderVisualReviewReady: snapshot.founderVisualReviewReady ?? null,
    mutedOverall: snapshot.muted?.overall ?? null,
  };
}
