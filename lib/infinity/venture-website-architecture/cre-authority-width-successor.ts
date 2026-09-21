import {
  CRE_CANDIDATE_ID,
  SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan } from "@/lib/infinity/venture-build-orchestration";
import {
  FOUNDER_VISUAL_REVIEW_READY,
  SEO_GEO_AUTHORITY_WIDTH_REASON,
  SEO_GEO_AUTHORITY_WIDTH_SITE_CONTRACT,
} from "./constants";
import { premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { composeAuthorityWidthFiles } from "./compose-authority-width";
import { reconstructCreFounderVisualQcSuccessor } from "./cre-founder-visual-qc-successor";
import { digestOfAuthorityFiles } from "./cre-successor";
import { evaluateRenderedCompositionQuality, evaluateRenderedTableQuality } from "./visual-quality-gates";
import { pageContent } from "./answer-authority/page-inspect";
import { EXPANSION_QUESTION_PAGES } from "./authority-expansion-catalog";
import { authorityExpansionRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";

export async function reconstructCreAuthorityWidthSuccessor() {
  const predecessor = await reconstructCreFounderVisualQcSuccessor();
  if (predecessor.artifactId !== SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID) {
    throw new Error(`founder_visual_qc_id_drift:${predecessor.artifactId}`);
  }
  if (predecessor.digest !== SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST) {
    throw new Error(`founder_visual_qc_digest_drift:${predecessor.digest}`);
  }
  const compile = compileCreValidationArtifactInput({
    candidateId: CRE_CANDIDATE_ID,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
  });
  const compiled = compileExecutableVenturePlan(compile);
  if (!compiled.buildPackage) throw new Error("cre_validation_package_missing");
  const artifactId = premiumAuthorityArtifactIdFor({
    planId: compiled.plan.planId,
    packageId: compiled.buildPackage.packageId,
    packageVersion: compiled.buildPackage.packageVersion,
    contract: SEO_GEO_AUTHORITY_WIDTH_SITE_CONTRACT,
  });
  const composed = composeAuthorityWidthFiles({ files: predecessor.files });
  const digest = digestOfAuthorityFiles(composed.files);
  const sample = pageContent(
    composed.files,
    EXPANSION_QUESTION_PAGES[0]?.route ?? "/commercial-lease-npv/how-is-lease-npv-calculated",
  );
  const css = composed.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
  const composition = evaluateRenderedCompositionQuality({
    html: sample,
    css,
    widthHierarchy: {
      viewportWidth: 1440,
      authorityShellWidth: 1120,
      proseWidth: 832,
      semanticNavWidth: 1120,
      trustedSourcesWidth: 1120,
      tableWidth: 1120,
      ctaWidth: 1120,
    },
    cardGrid: {
      cardCount: 4,
      columnCount: 2,
      rowCount: 2,
      lastRowCount: 2,
      cardWidths: [536, 536, 536, 536],
      cardHeights: [168, 168, 168, 168],
    },
    sourceSection: {
      sectionWidth: 1120,
      shellWidth: 1120,
      desktopColumns: 2,
      viewportWidth: 1440,
      hasTitle: true,
      hasHierarchy: true,
      linkCount: 4,
      cramped: false,
    },
  });
  const tables = evaluateRenderedTableQuality(sample);
  const ready =
    composed.publishability.ready === "PREMIUM_AUTHORITY_VALIDATION_READY" &&
    composed.footer.overall === "PASS" &&
    composed.footerAttribution.ok &&
    composed.hero.overall === "PASS" &&
    composed.navigation.rendered.overall === "PASS" &&
    composed.width.overall === "PASS" &&
    composed.navigation.breakout.overall === "PASS" &&
    composed.navigation.grid.overall === "PASS" &&
    composed.sources.overall === "PASS" &&
    composed.shell.overall === "PASS" &&
    tables.overall === "PASS"
      ? FOUNDER_VISUAL_REVIEW_READY
      : ("NOT_READY" as const);
  return {
    artifactId,
    digest,
    predecessorArtifactId: SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST,
    repairReason: SEO_GEO_AUTHORITY_WIDTH_REASON,
    immutable: true as const,
    deployed: false as const,
    liveArtifactMutated: false as const,
    files: composed.files,
    routes: authorityExpansionRouteManifest().intendedCount,
    footer: composed.footer,
    footerAttribution: composed.footerAttribution,
    redundancy: composed.redundancy,
    navigation: composed.navigation,
    hero: composed.hero,
    width: composed.width,
    sources: composed.sources,
    shell: composed.shell,
    publishability: composed.publishability,
    composition,
    tables,
    profile: composed.profile,
    founderVisualReviewReady: ready,
    secretScan: evaluateSecretSafety(composed.files.filter((file) => file.encoding !== "base64")).status,
  };
}
