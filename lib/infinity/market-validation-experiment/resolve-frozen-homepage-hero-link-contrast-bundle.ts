import { existsSync, readFileSync } from "node:fs";
import {
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
} from "./constants";
export const HOMEPAGE_HERO_FORBIDDEN_PREDECESSOR_ARTIFACT_IDS = [
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
] as const;

export const FROZEN_HOMEPAGE_HERO_LINK_CONTRAST_SNAPSHOT_PATH =
  ".infinity/homepage-hero-link-contrast-deploy-successor.json" as const;
export const FROZEN_HOMEPAGE_HERO_LINK_CONTRAST_PE_BUILD_PATH =
  ".infinity/homepage-hero-pe-build.json" as const;

type FrozenFile = { path: string; content: string; encoding?: "base64" | "utf8" };

function isHqPublicFile(file: FrozenFile): boolean {
  return file.path.includes("command-chamber") || file.content.includes("InfinityDecisionCore");
}

function readFrozenPeBuild(): { status: string; frozen: boolean; artifactId: string; digest: string } | null {
  if (!existsSync(FROZEN_HOMEPAGE_HERO_LINK_CONTRAST_PE_BUILD_PATH)) return null;
  return JSON.parse(readFileSync(FROZEN_HOMEPAGE_HERO_LINK_CONTRAST_PE_BUILD_PATH, "utf8")) as {
    status: string;
    frozen: boolean;
    artifactId: string;
    digest: string;
  };
}

export function resolveFrozenHomepageHeroLinkContrastDeploymentBundle(): {
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
  fullFrozenBundleAvailable: false;
  hqFiles: number;
  scopeSeparation: "PASS" | "FAIL";
  peBuildFrozen: "PASS" | "FAIL";
  admission: "PASS" | "FAIL";
  pageLoopOverall: string | null;
  hookBoundary: string | null;
  founderVisualReviewReady: string | null;
} {
  const lockedArtifact = CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID;
  const lockedDigest = CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST;
  const fail = (stopReason: string, extra: Partial<ReturnType<typeof resolveFrozenHomepageHeroLinkContrastDeploymentBundle>> = {}) => ({
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
    fullFrozenBundleAvailable: false as const,
    hqFiles: extra.hqFiles ?? 0,
    scopeSeparation: extra.scopeSeparation ?? "FAIL",
    peBuildFrozen: extra.peBuildFrozen ?? "FAIL",
    admission: "FAIL" as const,
    pageLoopOverall: extra.pageLoopOverall ?? null,
    hookBoundary: extra.hookBoundary ?? null,
    founderVisualReviewReady: extra.founderVisualReviewReady ?? null,
  });

  if (!existsSync(FROZEN_HOMEPAGE_HERO_LINK_CONTRAST_SNAPSHOT_PATH)) {
    return fail("FROZEN_BUNDLE_SNAPSHOT_MISSING");
  }
  const snapshot = JSON.parse(readFileSync(FROZEN_HOMEPAGE_HERO_LINK_CONTRAST_SNAPSHOT_PATH, "utf8")) as {
    artifactId?: string;
    digest?: string;
    routes?: number;
    lockedDigest?: string;
    digestMatchesLock?: boolean;
    hookBoundary?: string;
    founderVisualReviewReady?: string;
    pageLoop?: { overall?: string; files?: FrozenFile[] };
  };
  const artifactId = snapshot.artifactId ?? "";
  if (
    artifactId !== lockedArtifact ||
    HOMEPAGE_HERO_FORBIDDEN_PREDECESSOR_ARTIFACT_IDS.includes(
      artifactId as (typeof HOMEPAGE_HERO_FORBIDDEN_PREDECESSOR_ARTIFACT_IDS)[number],
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
    fullFrozenBundleAvailable: false,
    hqFiles,
    scopeSeparation: hqFiles === 0 ? "PASS" : "FAIL",
    peBuildFrozen,
    admission,
    pageLoopOverall: snapshot.pageLoop?.overall ?? null,
    hookBoundary: snapshot.hookBoundary ?? null,
    founderVisualReviewReady: snapshot.founderVisualReviewReady ?? null,
  };
}
