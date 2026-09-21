import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  SUCCESSOR_CRE_ARTIFACT_ID,
} from "../constants";
import { executeMarketValidationExperiment, resetExperimentRuntime } from "../execute";
import { currentCreValidationArtifactId } from "../current-cre-artifact";
import { buildDeployableSourcePackage } from "../deployable-package";
import { SUCCESSOR_CRE_SOURCE_DIGEST } from "../source-bundle-request";
import { evaluateRuntimeAuthorizationState } from "../runtime-authorization-state";
import { getLastSuccessorAttemptGovernance } from "../attempt-financial-exposure";
import { lastConsumedSuccessorFounderAuthorization } from "../founder-authorization";
import { executeGeneratedIngestRoute } from "../generated-ingest-isolated";
import {
  LAST_OBSERVED_LIVE_INGEST,
  LAST_OBSERVED_LIVE_ROOT,
  LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID,
  HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE,
  classifyLiveHttpResponse,
  classifyLiveIngestFailure,
  evaluateGeneratedArtifactApplicationReadiness,
  inspectGeneratedArtifactRuntimeDependencies,
  lastReadySourceBundleRemainsVerified,
  liveValidationRepairDecision,
} from "../live-validation-failure";

describe("LIVE VALIDATION SITE + SAME-ORIGIN INGEST REPAIR V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
  });

  it("classifies the live root and ingest failures as Vercel Deployment Protection", () => {
    const root = classifyLiveHttpResponse({
      status: LAST_OBSERVED_LIVE_ROOT.status,
      location: LAST_OBSERVED_LIVE_ROOT.location,
      body: LAST_OBSERVED_LIVE_ROOT.body,
    });
    expect(LAST_OBSERVED_LIVE_ROOT.status).toBe(401);
    expect(root.classification).toBe("PROTECTION");
    expect(root.canonicalError).toBe("Protected deployment");
    expect(root.reachedApplication).toBe(false);
    const ingest = classifyLiveIngestFailure(LAST_OBSERVED_LIVE_INGEST);
    expect(ingest.status).toBe(401);
    expect(ingest.canonicalError).toBe("Protected deployment");
    expect(ingest.sameOriginTransport).toBe("PASS");
    expect(ingest.reachedGeneratedIngestRoute).toBe(false);
    expect(ingest.experimentValidationFailureCause).toContain("never executed");
    expect(classifyLiveHttpResponse({ status: 200, body: "Log in to Vercel", finalUrl: "https://vercel.com/login" }).classification).toBe(
      "PROTECTION",
    );
  });

  it("keeps the generated artifact self-contained and rejects arbitrary experiment IDs", async () => {
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const files = result.artifact?.files ?? [];
    expect(result.artifact?.artifactId).toBe(currentCreValidationArtifactId());
    expect(currentCreValidationArtifactId()).not.toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    const pkg = buildDeployableSourcePackage({
      artifactId: result.artifact!.artifactId,
      ventureId: result.experiment.ventureId,
      experimentId: result.experiment.experimentId,
      candidateId: CRE_CANDIDATE_ID,
      files,
    });
    expect(pkg.sourceDigest).not.toBe(SUCCESSOR_CRE_SOURCE_DIGEST);
    const deps = inspectGeneratedArtifactRuntimeDependencies(files);
    expect(deps.requiredServerSecrets).toEqual([]);
    expect(deps.requiredPublic).toEqual([]);
    expect(deps.missing).toEqual([]);
    expect(deps.hqDatabaseDependency).toBe(false);
    expect(deps.supabaseDependency).toBe(false);
    const app = evaluateGeneratedArtifactApplicationReadiness(files);
    expect(app.landing).toBe("PASS");
    expect(app.annual).toBe("PASS");
    expect(app.perDeal).toBe("PASS");
    expect(app.cta).toBe("PASS");
    expect(app.form).toBe("PASS");
    expect(app.footer).toBe("PASS");
    expect(app.disclosure).toBe("PASS");
    expect(app.ingestEmbedded).toBe("PASS");
    expect(app.arbitraryExperimentRejected).toBe("PASS");
    expect(app.staticLanding).toBe(true);
    const allowed = await executeGeneratedIngestRoute({
      files,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      body: {
        kind: "form",
        synthetic: true,
        form: {
          name: "Synthetic Broker",
          workEmail: "isolated-synthetic@broker.example",
          role: "CRE broker",
          company: "Boutique",
          teamSize: "3",
          dealFrequency: "Monthly",
          preferredPricing: "professional_annual",
          leaseWorkflow: true,
          pilotInterest: true,
        },
      },
    });
    expect(allowed.status).toBe(202);
    expect(allowed.json.accepted).toBe(1);
    const analytics = await executeGeneratedIngestRoute({
      files,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      body: { kind: "event", type: "PAGE_VIEW", synthetic: true },
    });
    expect(analytics.status).toBe(202);
    const rejected = await executeGeneratedIngestRoute({
      files,
      experimentId: "exp_wrong",
      body: { kind: "event", type: "PAGE_VIEW", synthetic: true },
    });
    expect(rejected.status).toBe(404);
    expect(rejected.json.error).toBe("unknown_experiment");
    const blob = files.map((file) => file.content).join("\n");
    expect(blob).not.toMatch(/SUPABASE_SERVICE_ROLE|sk_live_|VERCEL_TOKEN/);
    expect(blob).not.toContain("localhost");
  });

  it("does not regenerate the successor artifact or revoke the proven write capability", () => {
    const verified = lastReadySourceBundleRemainsVerified();
    expect(verified.deploymentId).toBe(LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID);
    expect(verified.status).toBe("LIVE_WRITE_VERIFIED");
    expect(verified.capabilityChanged).toBe(false);
    expect(verified.artifactId).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(verified.digest).toBe(SUCCESSOR_CRE_SOURCE_DIGEST);
    const decision = liveValidationRepairDecision();
    expect(decision.sourceChangeRequired).toBe(false);
    expect(decision.newArtifactRequired).toBe(false);
    expect(decision.environmentConfigurationRequired).toBe(true);
    expect(decision.newProviderCapabilityRequired).toBe(true);
    expect(decision.capability).toBe(HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE);
    expect(decision.newFounderAuthorizationRequired).toBe(true);
    expect(lastConsumedSuccessorFounderAuthorization().executionsConsumed).toBe(1);
    expect(getLastSuccessorAttemptGovernance().fiveDollarsRecordedAsActualSpend).toBe(false);
    expect(evaluateRuntimeAuthorizationState().activated).toBe(false);
  });

  it("does not regress HQ performance or Money surfaces", () => {
    const dashboard = readFileSync(join(process.cwd(), "app/dashboard/page.tsx"), "utf8");
    const consoleSource = readFileSync(
      join(process.cwd(), "components/dashboard/operator-console/venture-operator-console.tsx"),
      "utf8",
    );
    const load = readFileSync(join(process.cwd(), "lib/infinity/operator-console/load-hq-dashboard.ts"), "utf8");
    expect(dashboard).toContain("InfinityHqExperience");
    expect(consoleSource).toContain("<VentureIntelligencePanel");
    expect(consoleSource).toContain("<CommandChamber");
    expect(load).not.toContain("SNAPSHOT_PREFETCH_LIMIT");
    expect(CRE_CANDIDATE_ID).toBe("7e7e924e-0741-4155-a729-8d529da77ea9");
  });
});
