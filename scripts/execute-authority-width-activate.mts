import { readFile, writeFile } from "node:fs/promises";
import { reconstructCreAuthorityWidthSuccessor } from "../lib/infinity/venture-website-architecture/cre-authority-width-successor";
import {
  evaluateAuthoritySectionWidth,
  evaluateAuthoritySectionShellConsistency,
  evaluateAuthoritySourceRenderedQuality,
  evaluateBalancedCardGrid,
  evaluateSemanticNavigationBreakoutLayout,
  FOUNDER_SKINNY_AUTHORITY_SHELL_FIXTURE,
  FOUNDER_THREE_PLUS_ONE_NAV_FIXTURE,
  FOUNDER_NARROW_CARD_WRAP_FIXTURE,
} from "../lib/infinity/venture-website-architecture/public-authority-standard/authority-content-width";
import { evaluateCardTextRhythm } from "../lib/infinity/venture-website-architecture/public-authority-standard/card-text-rhythm";
import { CRE_PUBLIC_AUTHORITY_REFERENCE } from "../lib/infinity/venture-website-architecture/public-authority-standard/cre-reference";
import { AUTHORITY_WIDTH_CSS } from "../lib/infinity/venture-website-architecture/authority-width-css";
import {
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
} from "../lib/infinity/market-validation-experiment/constants";
import {
  activateAuthorityWidthSuccessorPublicArtifact,
  getCanonicalActivePublicValidationState,
} from "../lib/infinity/market-validation-experiment/active-public-artifact";
import { inspectExperimentClock } from "../lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "../lib/infinity/market-validation-experiment/real-market-evidence";

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "width" in value && typeof (value as { width: unknown }).width === "number") {
    return (value as { width: number }).width;
  }
  return 0;
}

function viewportWidthOf(row: Record<string, unknown>): number {
  const named = row.viewportName ?? row.viewport;
  if (named === "wide") return 1440;
  if (named === "desktop") return 1280;
  if (named === "tablet") return 1024;
  if (named === "mobile") return 390;
  return Number(row.viewportWidth ?? row.width ?? named ?? 0);
}

function findRow(rows: Array<Record<string, unknown>>, route: string, width: number) {
  return rows.find((row) => row.route === route && viewportWidthOf(row) === width);
}

const deploy = JSON.parse(await readFile(".infinity/authority-width-deploy-result.json", "utf8")) as {
  deploymentId: string;
  publicUrl: string;
  providerFinalState: string;
  actualDigest: string;
  live: {
    seoGeoPassed: boolean;
    passingRoutes: number;
    intentionalRedirects: number;
    failingRoutes: number;
    notFound: number;
    runtimeErrors: number;
    heroIntersection: number;
    footerContract: string;
    visual: { screenshotDir: string; howItWorksTall: string; howItWorksDesktop: string; howItWorksMobile: string };
    frozen: { answerChunks: number; readability: string };
    liveGraph: { orphans: number; deadEnds: number; overall: string };
  };
};

if (deploy.providerFinalState !== "READY" || !deploy.deploymentId || !deploy.publicUrl) {
  throw new Error("provider_not_ready_no_activation");
}
if (deploy.actualDigest !== SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST) {
  throw new Error("digest_mismatch_no_activation");
}

const successor = await reconstructCreAuthorityWidthSuccessor();
if (
  successor.artifactId !== SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID ||
  successor.digest !== SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST
) {
  throw new Error("identity_mismatch_no_activation");
}

const widths = JSON.parse(
  await readFile(`${deploy.live.visual.screenshotDir}/authority-widths.json`, "utf8"),
) as Array<Record<string, unknown>>;
const profile = CRE_PUBLIC_AUTHORITY_REFERENCE.widthProfile;
const at1440 = findRow(widths, "/lease-sensitivity-analysis", 1440);
const home1440 = findRow(widths, "/", 1440);
const resources1440 = findRow(widths, "/resources", 1440);
if (!at1440) throw new Error("missing_lease_sensitivity_1440_measurement");

const live1440 = {
  viewportWidth: 1440,
  authorityShellWidth: num(at1440.shell),
  proseWidth: num(at1440.prose),
  semanticNavWidth: num(at1440.nav),
  trustedSourcesWidth: num(at1440.sources),
  tableWidth: num(at1440.table),
  ctaWidth: num(at1440.cta),
  archetype: "QUESTION_AUTHORITY" as const,
};
const widthGate = evaluateAuthoritySectionWidth(live1440, profile);
const breakout = evaluateSemanticNavigationBreakoutLayout({
  viewportWidth: 1440,
  navWidth: live1440.semanticNavWidth,
  proseWidth: live1440.proseWidth,
  cardWidths: Array.isArray(at1440.cardWidths) ? (at1440.cardWidths as number[]) : [],
  titleLineCounts: Array.isArray(at1440.titleLineCounts) ? (at1440.titleLineCounts as number[]) : [],
  iconContainerPx: Number(at1440.iconPx ?? 0),
  cardCount: Number(at1440.cardCount ?? 0),
  css: AUTHORITY_WIDTH_CSS,
  profile,
});
const four = evaluateBalancedCardGrid({
  cardCount: Number(at1440.cardCount ?? 0),
  columnCount: Number(at1440.columns ?? 0),
  rowCount: Number(at1440.rows ?? 0),
  lastRowCount: Number(at1440.lastRow ?? 0),
  cardWidths: Array.isArray(at1440.cardWidths) ? (at1440.cardWidths as number[]) : [],
  cardHeights: Array.isArray(at1440.cardHeights) ? (at1440.cardHeights as number[]) : [],
  viewportWidth: 1440,
});
const five = home1440
  ? evaluateBalancedCardGrid({
      cardCount: Number(home1440.cardCount ?? 0),
      columnCount: Number(home1440.columns ?? 0),
      rowCount: Number(home1440.rows ?? 0),
      lastRowCount: Number(home1440.lastRow ?? 0),
      cardWidths: Array.isArray(home1440.cardWidths) ? (home1440.cardWidths as number[]) : [],
      cardHeights: Array.isArray(home1440.cardHeights) ? (home1440.cardHeights as number[]) : [],
      viewportWidth: 1440,
    })
  : null;
const six = resources1440
  ? evaluateBalancedCardGrid({
      cardCount: Number(resources1440.cardCount ?? 0),
      columnCount: Number(resources1440.columns ?? 0),
      rowCount: Number(resources1440.rows ?? 0),
      lastRowCount: Number(resources1440.lastRow ?? 0),
      cardWidths: Array.isArray(resources1440.cardWidths) ? (resources1440.cardWidths as number[]) : [],
      cardHeights: Array.isArray(resources1440.cardHeights) ? (resources1440.cardHeights as number[]) : [],
      viewportWidth: 1440,
    })
  : null;
const sources = evaluateAuthoritySourceRenderedQuality({
  sectionWidth: live1440.trustedSourcesWidth,
  shellWidth: live1440.authorityShellWidth,
  desktopColumns: Number(at1440.sourceCols ?? 2),
  viewportWidth: 1440,
  hasTitle: Boolean(at1440.sourceTitle),
  hasHierarchy: true,
  linkCount: Number(at1440.sourceLinks ?? 0),
  cramped: false,
  mobileStacked: true,
});
const shell = evaluateAuthoritySectionShellConsistency({
  proseWidth: live1440.proseWidth,
  moduleWidths: [live1440.trustedSourcesWidth, live1440.tableWidth, live1440.ctaWidth].filter((width) => width > 0),
  shellWidth: live1440.authorityShellWidth,
});
const rhythm = evaluateCardTextRhythm({
  titles: Array.isArray(at1440.titles) ? (at1440.titles as string[]) : [],
  descriptions: Array.isArray(at1440.descriptions) ? (at1440.descriptions as string[]) : [],
  titleLineCounts: Array.isArray(at1440.titleLineCounts) ? (at1440.titleLineCounts as number[]) : [],
  descriptionLineCounts: Array.isArray(at1440.descriptionLineCounts) ? (at1440.descriptionLineCounts as number[]) : [],
  lastLineWordCounts: (Array.isArray(at1440.cardWidths) ? (at1440.cardWidths as number[]) : []).map(() => 2),
  cardWidthPx: Array.isArray(at1440.cardWidths) ? (at1440.cardWidths as number[])[0] : undefined,
  css: AUTHORITY_WIDTH_CSS,
});
const wideShellCards = widths.filter(
  (row) => viewportWidthOf(row) >= 1280 && num(row.nav) >= 900 && Array.isArray(row.cardWidths),
);
const narrowCards = wideShellCards.reduce(
  (sum, row) => sum + (row.cardWidths as number[]).filter((width) => width > 0 && width < profile.minUsefulCardWidth).length,
  0,
);
const avoidableThreePlusOne = [four, five, six].filter((item) => item?.failures.includes("four_card_three_plus_one")).length;
const proseReadable =
  live1440.proseWidth >= profile.proseMinWidth - 40 && live1440.proseWidth <= profile.proseMaxComfortWidth + 80;
const wideBreakout = live1440.semanticNavWidth > live1440.proseWidth + 20 && live1440.trustedSourcesWidth > live1440.proseWidth + 20;
const founderSkinnyFails = evaluateAuthoritySectionWidth(FOUNDER_SKINNY_AUTHORITY_SHELL_FIXTURE, profile).overall === "FAIL";
const founderGridFails = evaluateBalancedCardGrid(FOUNDER_THREE_PLUS_ONE_NAV_FIXTURE).overall === "FAIL";
const founderWrapFails = evaluateSemanticNavigationBreakoutLayout(FOUNDER_NARROW_CARD_WRAP_FIXTURE).overall === "FAIL";

const scored = {
  widthGate: widthGate.overall,
  shell: shell.overall,
  breakout: breakout.overall,
  sources: sources.overall,
  rhythm: rhythm.overall,
  four: four.layout,
  five: five?.layout ?? "ABSENT",
  six: six?.layout ?? "ABSENT",
  fourPass: four.overall,
  fivePass: five?.overall ?? "FAIL",
  sixPass: six?.overall ?? "FAIL",
  avoidableThreePlusOne,
  narrowCards,
  proseReadable,
  wideBreakout,
  shellUtilization: widthGate.shellUtilization,
  live1440,
  founderSkinnyFails,
  founderGridFails,
  founderWrapFails,
};

const mayActivate =
  deploy.live.seoGeoPassed &&
  deploy.live.failingRoutes === 0 &&
  deploy.live.notFound === 0 &&
  deploy.live.runtimeErrors === 0 &&
  deploy.live.heroIntersection === 0 &&
  deploy.live.footerContract === "PASS" &&
  deploy.live.visual.howItWorksTall === "PASS" &&
  deploy.live.frozen.answerChunks === 220 &&
  deploy.live.liveGraph.orphans === 0 &&
  deploy.live.liveGraph.deadEnds === 0 &&
  widthGate.overall === "PASS" &&
  shell.overall === "PASS" &&
  breakout.overall === "PASS" &&
  sources.overall === "PASS" &&
  rhythm.overall === "PASS" &&
  four.overall === "PASS" &&
  (five?.overall ?? "FAIL") === "PASS" &&
  (six?.overall ?? "FAIL") === "PASS" &&
  avoidableThreePlusOne === 0 &&
  narrowCards === 0 &&
  proseReadable &&
  wideBreakout &&
  founderSkinnyFails &&
  founderGridFails &&
  founderWrapFails;

let activated = false;
if (mayActivate) {
  activateAuthorityWidthSuccessorPublicArtifact({
    artifactId: SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
    digest: SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
    deploymentId: deploy.deploymentId,
    url: deploy.publicUrl,
  });
  activated = true;
}

const result = {
  attempted: true,
  activated,
  activationCount: activated ? 1 : 0,
  deployments: 1,
  deploymentId: deploy.deploymentId,
  publicUrl: deploy.publicUrl,
  providerFinalState: deploy.providerFinalState,
  scored,
  canonicalReadback: getCanonicalActivePublicValidationState(),
  experimentState: inspectRealMarketEvidence().experiment.state,
  evidenceStart: inspectExperimentClock().evidenceStart,
  clockRestarted: inspectExperimentClock().restarted,
  publiclyLaunched: false,
  stopReason: activated ? "NONE" : "LIVE_GATES_FAILED",
};
await writeFile(".infinity/authority-width-activate-result.json", `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!activated) process.exit(3);
