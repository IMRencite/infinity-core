import { describe, expect, it, beforeEach } from "vitest";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FOUNDER_AUTHORIZATION_ID,
  parseFounderCeilingAmount,
  resetFounderAuthorization,
} from "../founder-authorization";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  SUCCESSOR_CRE_ARTIFACT_ID,
  VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
  WRITE_BOUNDARY,
} from "../constants";
import { VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST } from "../source-bundle-request";
import { executeMarketValidationExperiment, resetExperimentRuntime } from "../execute";
import { resetCurrentCreValidationArtifactIdCache } from "../current-cre-artifact";
import {
  THIS_REQUEST_VALIDATION_GRADE_SUCCESSOR_CEILINGS,
  VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID,
  digestOfFiles,
  evaluateValidationGradeSuccessorFounderAuthorization,
  priorDeploymentAuthorizationsAreNotReusable,
} from "../validation-grade-successor-authorization";
import {
  activateValidationGradeSuccessorPublicArtifact,
  getActivePublicValidationArtifactId,
} from "../active-public-artifact";
import { inspectExperimentClock } from "../experiment-clock";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import { inspectCollectingHqPresence } from "../collecting-hq";
import { CRE_VALIDATION_ALLOWLIST } from "../ingest";
import { auditLiveRenderedValidationGrade, auditLiveSitemapXml } from "../validation-grade-live-verify";
import { persistEconomicReadVerification, getEconomicReadVerification } from "../economic-read-verification";
import { inspectMarketValidationAcquisitionMission } from "../acquisition-mission";
import { evaluateOutreachReadiness } from "../acquisition-outreach-gate";

function persistPro() {
  persistEconomicReadVerification({
    liveReadAttempted: true,
    planStatus: "READ_ONLY_VERIFIED",
    timestamp: new Date().toISOString(),
    snapshot: {
      ...getEconomicReadVerification().snapshot,
      plan: {
        teamId: "team_expected",
        teamSlug: "infinity-test",
        plan: "pro",
        billingPeriod: null,
        source: "GET /v2/teams/{teamId}",
      },
    },
  });
}

describe("AUTHORIZED VALIDATION-GRADE SUCCESSOR DEPLOYMENT V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetFounderAuthorization();
    resetCurrentCreValidationArtifactIdCache();
    persistPro();
  });

  it("keeps attempt and spend separate and does not treat $5 as spent", () => {
    expect(parseFounderCeilingAmount("[REPLACE_WITH_EXPLICIT_FOUNDER_AMOUNT]").ok).toBe(false);
    expect(THIS_REQUEST_VALIDATION_GRADE_SUCCESSOR_CEILINGS.deploymentCeilingUsd).toBe(5);
    const founder = evaluateValidationGradeSuccessorFounderAuthorization();
    expect(founder.recognized).toBe(true);
    expect(founder.founderCeilingTreatedAsProviderCost).toBe(false);
    expect(founder.providerCostClassification).toBe("UNKNOWN");
    expect(founder.authorization?.authorizationId).not.toBe(FOUNDER_AUTHORIZATION_ID);
    expect(priorDeploymentAuthorizationsAreNotReusable().reusedPriorId).toBe(false);
    expect(WRITE_BOUNDARY.validationDeploymentsMax).toBe(1);
  });

  it("audits rendered validation-grade HTML, footer, and sitemap", () => {
    const landing = `
      <html><body>
        <header class="vg-hero"><div class="vg-container"><h1>Commercial Real Estate (CRE) Lease Comparison &amp; NPV Calculator</h1></div></header>
        <section class="vg-section"><div class="vg-container"><h2>Pricing being tested</h2>
          <article class="vg-pricing-card">Professional $290/year</article>
          <article class="vg-pricing-card">Per-deal $149/deal</article>
          <p>pricing is being tested. selection indicates interest. payment is not collected.</p>
        </section>
        <a class="vg-cta vg-cta--primary" href="/early-access">Request Pilot Access</a>
        <p>Pilot / early access — in validation. Calculations are informational. Not legal advice. Not investment advice.</p>
        <footer>
          <nav aria-label="Legal and venture attribution" data-footer-format="Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR">
            <a href="/privacy-policy/">Privacy Policy</a><span>|</span>
            <a href="/terms-of-service/">Terms of Service</a><span>|</span>
            <a href="/sitemap.xml">Sitemap</a><span>|</span>
            <a href="https://imros.io">An Infinity OS Venture</a><span>|</span>
            <a href="https://infinitemediaresources.com">By IMR</a>
          </nav>
        </footer>
      </body></html>`;
    const form = `
      <form class="vg-form">
        <label for="workEmail">Work email</label>
        <input id="workEmail" name="workEmail" />
        <button class="vg-cta vg-cta--primary">Request Pilot Access</button>
      </form>`;
    const css = `.vg-container{max-width:68rem}@media (max-width:640px){.vg-container{padding:1rem}}`;
    const design = auditLiveRenderedValidationGrade({
      landing,
      form,
      css,
      privacy: "Privacy Policy current-data behavior",
      terms: "Terms of Service",
      sitemap: "<urlset><url><loc>/privacy-policy</loc></url></urlset>",
    });
    expect(design.responsive).toBe("PASS");
    expect(design.container).toBe("PASS");
    expect(design.hero).toBe("PASS");
    expect(design.cta).toBe("PASS");
    expect(design.form).toBe("PASS");
    expect(design.pricing).toBe("PASS");
    expect(design.hierarchy).toBe("PASS");
    expect(design.disclosure).toBe("PASS");
    expect(design.mobile).toBe("PASS");
    expect(design.accessibility).toBe("PASS");
    expect(design.overall).toBe("PASS");
    expect(design.annual).toBe("PASS");
    expect(design.perDeal).toBe("PASS");
    expect(design.requestPilotAccess).toBe("PASS");
    expect(design.footerVisibleFormat).toBe(
      "Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR",
    );
    expect(design.privacyLink).toBe("PASS");
    expect(design.termsLink).toBe("PASS");
    expect(design.sitemapLink).toBe("PASS");
    expect(design.infiniteOs).toBe("PASS");
    expect(design.imr).toBe("PASS");
    expect(design.duplicateRawUrls).toBe(false);
    expect(
      auditLiveSitemapXml(
        `<urlset><url><loc>https://example.vercel.app/</loc></url><url><loc>https://example.vercel.app/early-access</loc></url><url><loc>https://example.vercel.app/privacy-policy</loc></url><url><loc>https://example.vercel.app/terms-of-service</loc></url></urlset>`,
      ),
    ).toBe("PASS");
  });

  it("activates the successor as the public artifact and waits for founder prospects", async () => {
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    expect(result.artifact!.artifactId).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(digestOfFiles(result.artifact!.files)).toBe(VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST);
    expect(getActivePublicValidationArtifactId()).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(CRE_VALIDATION_ALLOWLIST.artifactId).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    const activated = activateValidationGradeSuccessorPublicArtifact();
    expect(activated.activeArtifact).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(activated.predecessor).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(activated.predecessorLineage).toBe("PASS");
    expect(getActivePublicValidationArtifactId()).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(CRE_VALIDATION_ALLOWLIST.artifactId).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    const outreach = evaluateOutreachReadiness({
      successorFiles: result.artifact!.files,
      successorDeployedLive: true,
      liveArtifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    });
    expect(outreach.blocker).toBe("FOUNDER_PROSPECT_INPUT_REQUIRED");
    const mission = inspectMarketValidationAcquisitionMission({
      blocker: outreach.blocker,
      messagesBeingPrepared: false,
    });
    expect(mission.missionState).toBe("READY_BLOCKED");
    expect(mission.activeWorkTruthful).toBe(true);
    const evidence = inspectRealMarketEvidence({ artifactFiles: result.artifact!.files });
    expect(evidence.experiment.artifactId).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(evidence.acquisition.outreach.blocker).toBe("FOUNDER_PROSPECT_INPUT_REQUIRED");
    expect(evidence.acquisition.mission.missionState).toBe("READY_BLOCKED");
    expect(evidence.decision.currentDecision).toBe("VALIDATE");
    expect(evidence.decision.buildReady).toBe(false);
    expect(evidence.acquisition.prospects.count).toBe(0);
    const clock = inspectExperimentClock(new Date("2026-08-29T16:00:00.000Z"));
    expect(clock.evidenceStart).toBe("2026-08-29T15:18:52.131Z");
    expect(clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(clock.restarted).toBe(false);
    const hq = inspectCollectingHqPresence({ experimentState: "COLLECTING" });
    expect(hq.validationStation).toBe("COLLECTING");
    expect(hq.signalIntelligence).toBe("COLLECTING");
    expect(hq.deploymentDepot).toBe("PRESENT_IDLE");
    expect(hq.creationLab).toBe("PRESENT_IDLE");
    expect(hq.fakeActiveWork).toBe(false);
    const dashboard = readFileSync(join(process.cwd(), "app/dashboard/page.tsx"), "utf8");
    const money = readFileSync(
      join(process.cwd(), "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"),
      "utf8",
    );
    expect(dashboard).toContain("InfinityHqExperience");
    expect(money).toContain('money: "Money"');
    expect(LOCKED_CRE_EXPERIMENT_ID).toBe("exp_e72beb7b6d35e7b20acf");
    expect(VALIDATION_GRADE_SUCCESSOR_FOUNDER_AUTHORIZATION_ID).toBe(
      "founder_ceiling_cre_val_grade_successor_staging_v1",
    );
  }, 180_000);
});
