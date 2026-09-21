import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectLiveProspectDiscoveryCapability, invokeMarketValidationAcquisitionRuntime } from "../index";

function hydrateLocalResearchEnv(): void {
  const envFile = join(process.cwd(), ".env.local");
  if (!existsSync(envFile)) return;
  const allowed = new Set(["GEMINI_API_KEY", "GOOGLE_API_KEY", "RESEARCH_PROVIDER", "RESEARCH_ENABLED", "GEMINI_RESEARCH_MODEL"]);
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || !allowed.has(match[1]) || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

const REPORT = join(process.cwd(), ".infinity", "mission-activity", "live-cre-discovery-report.json");

describe.skipIf(process.env.INFINITY_LIVE_PROSPECT_DISCOVERY !== "1")("CRE live prospect discovery cycle", () => {
  it("runs bounded read-only discovery when live research capability exists", async () => {
    hydrateLocalResearchEnv();
    const capability = inspectLiveProspectDiscoveryCapability();
    if (!capability.available) {
      writeFileSync(
        REPORT,
        `${JSON.stringify({ executed: false, liveGrounded: false, reason: capability.reason, provider: capability.provider }, null, 2)}\n`,
      );
      expect(capability.reason).toBe("LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED");
      return;
    }
    const result = await invokeMarketValidationAcquisitionRuntime({
      organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
      now: new Date("2026-08-29T16:00:00.000Z"),
      liveDiscovery: true,
    });
    writeFileSync(
      REPORT,
      `${JSON.stringify(
        {
          executed: result.discovery.executed,
          liveGrounded: result.discovery.liveGrounded,
          researchProvider: result.discovery.researchProvider,
          candidatesFound: result.discovery.candidatesFound,
          highConfidenceQualified: result.discovery.highConfidenceQualified,
          fabricatedProspects: result.discovery.fabricatedProspects,
          classification: result.discovery.classification,
          attempts: result.discovery.attempts,
          providersUsed: result.discovery.providersUsed,
          lineage: result.discovery.lineage,
          publicWeb: result.discovery.publicWeb
            ? {
                searchProvider: result.discovery.publicWeb.trace.searchProvider,
                queryCount: result.discovery.publicWeb.trace.queryCount,
                resultCount: result.discovery.publicWeb.trace.resultCount,
                fetchCount: result.discovery.publicWeb.trace.fetchCount,
                evidenceCount: result.discovery.publicWeb.trace.evidenceCount,
                qualifiedCount: result.discovery.publicWeb.trace.qualifiedCount,
                reasoningProvider: result.discovery.publicWeb.trace.reasoningProvider,
              }
            : null,
          blocker: result.governance.blocker,
          missionId: result.nextMission.missionId,
          artifactId: result.experiment.artifactId,
          evidenceStart: result.experiment.clock.evidenceStart,
          deadline: result.experiment.clock.deadline,
          outreach: result.discovery.outreach ?? null,
          nextMission: result.nextMission,
          founderRequest: result.governance.request,
          prospects: result.discovery.prospects.map((prospect) => ({
            name: prospect.name,
            organization: prospect.organization,
            role: prospect.publicRole,
            url: prospect.publicProfileUrl,
            qualified: prospect.qualification.qualified,
            confidence: prospect.qualification.confidence,
            contactability: prospect.contactability ?? null,
          })),
        },
        null,
        2,
      )}\n`,
    );
    expect(result.discovery.fabricatedProspects).toBe(false);
    expect(result.discovery.maxCohortRespected).toBe(true);
    expect(result.unauthorizedActions.realOutreach).toBe(0);
    expect(result.experiment.artifactId).toBe("art_d20f8a53a3ef1de20ebe");
    expect(result.experiment.clock.restarted).toBe(false);
    expect(result.governance.blocker).not.toBe("FOUNDER_PROSPECT_INPUT_REQUIRED");
  }, 180_000);
});
