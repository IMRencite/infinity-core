import { createHash } from "node:crypto";
import { describe, expect, it, beforeEach } from "vitest";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import {
  CANONICAL_FOOTER_COPY,
  CANONICAL_IMR_LABEL,
  CANONICAL_IMR_URL,
  CANONICAL_INFINITY_OS_LABEL,
  CANONICAL_INFINITY_OS_URL,
} from "@/lib/infinity/venture-build-orchestration/constants";
import { validateVentureArtifact } from "@/lib/infinity/venture-build-orchestration/validate";
import { authorizedBuildCompileInput } from "@/lib/infinity/venture-build-orchestration/fixtures";
import { executeGovernedVentureBuild } from "@/lib/infinity/venture-build-orchestration/execute";
import {
  VALIDATION_GRADE_PUBLIC_VENTURE_TEMPLATE_V1,
  CANONICAL_FOOTER_VISIBLE_FORMAT,
  auditFooterContract,
  auditValidationGrade,
  evaluatePublicLegalCompleteness,
} from "@/lib/infinity/public-venture-template";
import {
  CRE_CANDIDATE_ID,
  LIVE_PUBLIC_CRE_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  SUCCESSOR_CRE_ARTIFACT_ID,
  VALIDATION_GRADE_REPAIR_REASON,
  VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
  WRITE_BOUNDARY,
} from "@/lib/infinity/market-validation-experiment/constants";
import { currentCreValidationArtifactId, resetCurrentCreValidationArtifactIdCache } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import { executeMarketValidationExperiment, resetExperimentRuntime } from "@/lib/infinity/market-validation-experiment/execute";
import { auditLiveCrePublicArtifact } from "@/lib/infinity/market-validation-experiment/live-cre-public-audit";
import {
  FOUNDER_ASSISTED_FIRST_COHORT_MAX,
  founderAssistedMissionProvenance,
  founderAssistedOutreachTemplate,
  founderApprovedProspects,
  inspectFounderProspectAvailability,
} from "@/lib/infinity/market-validation-experiment/founder-assisted-cohort";
import { evaluateOutreachReadiness } from "@/lib/infinity/market-validation-experiment/acquisition-outreach-gate";
import { inspectMarketValidationAcquisitionMission } from "@/lib/infinity/market-validation-experiment/acquisition-mission";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { inspectCollectingHqPresence } from "@/lib/infinity/market-validation-experiment/collecting-hq";
import {
  SUCCESSOR_CRE_SOURCE_DIGEST,
  VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/source-bundle-request";
import { persistIsolatedArtifactVerification } from "@/lib/infinity/market-validation-experiment/isolated-artifact-verification";
import { runIsolatedArtifactInstallAndBuild } from "@/lib/infinity/venture-build-orchestration/isolated-artifact-build";
import { qualificationContract } from "@/lib/infinity/market-validation-experiment/qualification-contract";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { lastReadySourceBundleRemainsVerified } from "@/lib/infinity/market-validation-experiment/live-validation-failure";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function digestOf(files: Array<{ path: string; content: string }>): string {
  const manifest = files
    .map((file) => `${file.path}:${createHash("sha256").update(file.content).digest("hex")}`)
    .sort()
    .join("|");
  return createHash("sha256").update(manifest).digest("hex");
}

describe("VALIDATION GRADE PUBLIC VENTURE TEMPLATE + CANONICAL FOOTER V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetCurrentCreValidationArtifactIdCache();
  });

  it("defines a global validation-grade contract that is not CRE-only", () => {
    expect(VALIDATION_GRADE_PUBLIC_VENTURE_TEMPLATE_V1).toBe("VALIDATION_GRADE_PUBLIC_VENTURE_TEMPLATE_V1");
    expect(CANONICAL_FOOTER_VISIBLE_FORMAT).toBe(
      "Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR",
    );
    expect(CANONICAL_FOOTER_COPY).toBe(CANONICAL_FOOTER_VISIBLE_FORMAT);
    expect(CANONICAL_INFINITY_OS_LABEL).toBe("An Infinity OS Venture");
    expect(CANONICAL_IMR_LABEL).toBe("By IMR");
    expect(CANONICAL_INFINITY_OS_URL).toBe("https://imros.io");
    expect(CANONICAL_IMR_URL).toBe("https://infinitemediaresources.com");
  });

  it("classifies the immutable live CRE artifact as functionally valid and below validation grade", () => {
    const live = auditLiveCrePublicArtifact();
    expect(live.artifactId).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(live.digest).toBe(SUCCESSOR_CRE_SOURCE_DIGEST);
    expect(live.mutated).toBe(false);
    expect(LIVE_PUBLIC_CRE_ARTIFACT_ID).toBe("art_850f8be949fabef62674");
    expect(live.functional).toBe("PASS");
    expect(live.validationGradeOverall).toBe("FAIL");
    expect(live.classification).toBe("FUNCTIONALLY_VALID_VISUALLY_BELOW_VALIDATION_GRADE");
    expect(live.footerAudit.privacyPresent).toBe(false);
    expect(live.footerAudit.termsPresent).toBe(false);
    expect(live.footerAudit.sitemapPresent).toBe(false);
    expect(live.footerAudit.infiniteOsLinked).toBe(false);
    expect(live.footerAudit.imrLinked).toBe(false);
    expect(live.footerAudit.duplicateRawBrandingUrls).toBe(true);
    expect(live.footerAudit.exactWording).toBe("FAIL");
  });

  it("generates a global validation-grade successor that future ventures inherit", async () => {
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const files = result.artifact!.files;
    const grade = auditValidationGrade(files);
    const footer = auditFooterContract(files);
    const legal = evaluatePublicLegalCompleteness(files);
    expect(result.artifact!.artifactId).toBe(currentCreValidationArtifactId());
    expect(result.artifact!.artifactId).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(result.artifact!.artifactId).not.toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(files.map((file) => file.content).join("\n")).toContain("An Infinity OS Venture");
    expect(files.map((file) => file.content).join("\n")).not.toContain("An Infinite OS Venture");
    expect(VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST).toMatch(/^[a-f0-9]{64}$/);
    expect(result.artifact!.lineage?.predecessorArtifactId).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(result.artifact!.lineage?.repairReason).toBe(VALIDATION_GRADE_REPAIR_REASON);
    expect(digestOf(files)).not.toBe(SUCCESSOR_CRE_SOURCE_DIGEST);
    expect(grade.contract).toBe(VALIDATION_GRADE_PUBLIC_VENTURE_TEMPLATE_V1);
    expect(grade.responsive).toBe("PASS");
    expect(grade.intentionalContainer).toBe("PASS");
    expect(grade.hero).toBe("PASS");
    expect(grade.ctaStyling).toBe("PASS");
    expect(grade.form).toBe("PASS");
    expect(grade.pricing).toBe("PASS");
    expect(grade.disclosure).toBe("PASS");
    expect(grade.footer).toBe("PASS");
    expect(grade.fakeTrustSignals).toBe("NO");
    expect(grade.validationGradeOverall).toBe("PASS");
    expect(grade.classification).toBe("VALIDATION_GRADE_READY");
    expect(grade.classification).not.toBe("PRODUCTION_GRADE");
    expect(footer.visibleFormat).toBe(CANONICAL_FOOTER_VISIBLE_FORMAT);
    expect(footer.privacyPresent).toBe(true);
    expect(footer.termsPresent).toBe(true);
    expect(footer.sitemapPresent).toBe(true);
    expect(footer.infiniteOsLinked).toBe(true);
    expect(footer.imrLinked).toBe(true);
    expect(footer.duplicateRawBrandingUrls).toBe(false);
    expect(footer.exactWording).toBe("PASS");
    expect(legal.complete).toBe("PASS");
    expect(legal.fabricatedLegalClaims).toBe(false);
    expect(evaluateSecretSafety(files).status).toBe("PASS");
    expect(files.some((file) => file.path === "app/privacy-policy/page.tsx")).toBe(true);
    expect(files.some((file) => file.path === "app/terms-of-service/page.tsx")).toBe(true);
    expect(files.some((file) => file.path === "app/sitemap.ts")).toBe(true);
    const blob = files.map((file) => file.content).join("\n");
    expect(blob).toContain("utm_source");
    expect(blob).toContain("document.referrer");
    expect(blob).not.toMatch(/testimonial|customers already|trusted by/i);
    expect(blob).not.toMatch(/An Infinite OS Venture/);
    expect(blob).toMatch(/An Infinity OS Venture/);
    const validation = validateVentureArtifact({
      artifact: result.artifact!,
      buildPackage: result.artifactResult!.buildPackage!,
    });
    expect(validation.passed).toBe(true);
    expect(validation.footer).toBe("PASS");
  }, 180_000);

  it("fails public completeness when legal destinations are missing", () => {
    const incomplete = evaluatePublicLegalCompleteness([
      { path: "app/page.tsx", content: "<h1>Hi</h1>" },
      { path: "components/venture-footer.tsx", content: "<footer>no links</footer>" },
    ]);
    expect(incomplete.privacy).toBe("FAIL");
    expect(incomplete.terms).toBe("FAIL");
    expect(incomplete.sitemap).toBe("FAIL");
    expect(incomplete.complete).toBe("FAIL");
  });

  it("applies the same footer and legal completeness to a non-CRE authorized build artifact", async () => {
    const result = await executeGovernedVentureBuild({ compile: authorizedBuildCompileInput() });
    const files = result.artifact!.files;
    const footer = auditFooterContract(files);
    const legal = evaluatePublicLegalCompleteness(files);
    expect(result.artifact?.files.some((file) => file.path === "components/validation-grade.tsx")).toBe(true);
    expect(footer.exactWording).toBe("PASS");
    expect(legal.privacy).toBe("PASS");
    expect(legal.terms).toBe("PASS");
    expect(legal.sitemap).toBe("PASS");
    expect(result.validation?.passed).toBe(true);
  }, 180_000);

  it("prepares a bounded founder-assisted cohort without sending or fabricating prospects", async () => {
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const prospects = inspectFounderProspectAvailability();
    const outreach = evaluateOutreachReadiness({
      successorFiles: result.artifact!.files,
      successorDeployedLive: false,
      liveArtifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    });
    const mission = inspectMarketValidationAcquisitionMission({
      blocker: outreach.blocker,
      messagesBeingPrepared: false,
    });
    const message = founderAssistedOutreachTemplate({ compliantArtifactLive: false });
    expect(FOUNDER_ASSISTED_FIRST_COHORT_MAX).toBe(8);
    expect(founderApprovedProspects()).toEqual([]);
    expect(prospects.count).toBe(0);
    expect(prospects.founderProspectInputRequired).toBe(true);
    expect(prospects.fabricatedProspects).toBe(false);
    expect(prospects.scrapedProspects).toBe(false);
    expect(outreach.validationGradeDesign).toBe("PASS");
    expect(outreach.canonicalFooter).toBe("PASS");
    expect(outreach.privacy).toBe("PASS");
    expect(outreach.terms).toBe("PASS");
    expect(outreach.sitemap).toBe("PASS");
    expect(outreach.liveCompliantArtifact).toBe("FAIL");
    expect(outreach.blocker).toBe("PUBLIC_ARTIFACT_DEPLOYMENT_REQUIRED");
    expect(outreach.messagesSent).toBe(0);
    expect(mission.missionType).toBe("MARKET_VALIDATION_ACQUISITION");
    expect(mission.missionState).toBe("READY_BLOCKED");
    expect(mission.activeWorkTruthful).toBe(true);
    expect(message.finishedProductClaim).toBe(false);
    expect(message.fabricatedTraction).toBe(false);
    expect(message.earlyValidationDisclosure).toBe("PASS");
    expect(message.includesLiveUrl).toBe(false);
    expect(message.template).toMatch(/early validation|pilot/i);
    expect(qualificationContract().contractId).toBe("cre_lease_npv_qualified_prospect_v1");
    const provenance = founderAssistedMissionProvenance();
    expect(provenance.source).toBe("founder_assisted_introduction");
    expect(provenance.medium).toBe("direct_introduction");
    expect(provenance.campaign).toBe("cre_validation_first_8_v1");
    expect(provenance.experiment).toBe(LOCKED_CRE_EXPERIMENT_ID);
    expect(provenance.candidate).toBe(CRE_CANDIDATE_ID);
    expect(provenance.founderTime).toBe("UNKNOWN");
    expect(provenance.providerFinancialSpend).toBe("NOT_APPLICABLE");
  }, 180_000);

  it("preserves the live experiment, evidence clock, HQ rooms, and write boundary", () => {
    const snapshot = inspectRealMarketEvidence({ now: new Date("2026-08-29T16:00:00.000Z") });
    const clock = inspectExperimentClock(new Date("2026-08-29T16:00:00.000Z"));
    const hq = inspectCollectingHqPresence({ experimentState: "COLLECTING" });
    expect(snapshot.experiment.state).toBe("COLLECTING");
    expect(snapshot.experiment.artifactId).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(clock.evidenceStart).toBe("2026-08-29T15:18:52.131Z");
    expect(clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(snapshot.counts.qualifiedVisitors).toBe(0);
    expect(snapshot.counts.strongIntent).toBe(0);
    expect(snapshot.counts.pricingSelections).toBe(0);
    expect(snapshot.counts.qualifiedSubmissions).toBe(0);
    expect(snapshot.decision.currentDecision).toBe("VALIDATE");
    expect(snapshot.decision.buildReady).toBe(false);
    expect(hq.validationStation).toBe("COLLECTING");
    expect(hq.signalIntelligence).toBe("COLLECTING");
    expect(hq.deploymentDepot).toBe("PRESENT_IDLE");
    expect(hq.creationLab).toBe("PRESENT_IDLE");
    expect(hq.fakeActiveWork).toBe(false);
    expect(lastReadySourceBundleRemainsVerified().artifactId).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(WRITE_BOUNDARY.outboundMarketingSends).toBe(0);
    expect(snapshot.unauthorizedActions.providerDeployments).toBe(0);
    expect(snapshot.unauthorizedActions.protectionMutations).toBe(0);
    const dashboard = readFileSync(join(process.cwd(), "app/dashboard/page.tsx"), "utf8");
    const money = readFileSync(
      join(process.cwd(), "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"),
      "utf8",
    );
    expect(dashboard).toContain("InfinityHqExperience");
    expect(money).toContain('money: "Money"');
  });

  it("builds the validation-grade successor in an isolated npm ci + next build", async () => {
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const artifact = result.artifact!;
    expect(artifact.artifactId).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(digestOf(artifact.files)).not.toBe(SUCCESSOR_CRE_SOURCE_DIGEST);
    expect(artifact.files.map((file) => file.content).join("\n")).toContain("An Infinity OS Venture");
    const isolated = await runIsolatedArtifactInstallAndBuild({
      files: artifact.files,
      keepRoot: false,
      infinityCoreRoot: process.cwd(),
    });
    persistIsolatedArtifactVerification({
      artifactId: artifact.artifactId,
      sourceDigest: digestOf(artifact.files),
      result: isolated,
    });
    if (isolated.installResult !== "PASS") {
      throw new Error(`isolated_install_failed:${isolated.install.stderr}\n${isolated.install.stdout}`);
    }
    if (isolated.buildResult !== "PASS") {
      throw new Error(`isolated_build_failed:${isolated.build.stderr}\n${isolated.build.stdout}`);
    }
    expect(isolated.installResult).toBe("PASS");
    expect(isolated.buildResult).toBe("PASS");
    expect(isolated.typescript).toBe("PASS");
    expect(isolated.nextProductionBuild).toBe("PASS");
    expect(isolated.rootNodeModulesLeakage).toBe(false);
  }, 300_000);
});
