import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import { VERCEL_LIVE_ALLOWED_ACTIONS } from "@/lib/infinity/governed-deployment-execution/vercel-live";
import { classifyVercelLiveCost } from "@/lib/infinity/governed-deployment-execution/vercel-live-config";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { CANONICAL_FOOTER_COPY } from "@/lib/infinity/venture-build-orchestration/constants";
import { evaluateValidationArtifactDeploymentAuthorization } from "../artifact-authorization";
import { classifyValidationDeploymentCost } from "../cost";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  LOCKED_SUCCESS_CRITERIA,
  MARKET_VALIDATION_PURPOSE,
  VERIFIED_HOSTING_CAPABILITIES,
  WRITE_BOUNDARY,
} from "../constants";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { eagAllowsClassification, eagAllowsUnknownCostWithExplicitHumanCeiling, inspectEagEconomicPolicy } from "../eag-economics";
import { evaluateValidationExperimentEag } from "../eag-policy";
import { evaluateEconomicEligibility } from "../economic-read-live";
import { persistEconomicReadVerification, resetEconomicReadVerification, getEconomicReadVerification } from "../economic-read-verification";
import { executeMarketValidationExperiment, rememberValidationDeployment, resetExperimentRuntime } from "../execute";
import { evaluateThisRequestFounderAuthorizedDeploy } from "../founder-authorized-deploy";
import {
  buildFounderExternalCostAuthorization,
  evaluateFounderAuthorization,
  evaluateThisRequestFounderAuthorization,
  FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD,
  FOUNDER_APPROVED_RUNTIME_CEILING_USD,
  FOUNDER_AUTHORIZATION_ID,
  lockedCreFounderScope,
  parseFounderCeilingAmount,
  persistFounderAuthorization,
  PLACEHOLDER_CEILING_TOKEN,
  THIS_REQUEST_FOUNDER_CEILINGS,
} from "../founder-authorization";
import { handlePublicValidationIngest, PUBLIC_INGEST_ROUTE_FILE, resetPublicIngestRuntime } from "../ingest";
import { inspectFreshPlanEligibility } from "../plan-eligibility";
import { evaluateSourceBundlePreLiveGate } from "../pre-live-gate";
import { inspectRuntimeCostObservability } from "../runtime-cost-observability";
import { evaluateSourceIntegrity, LOCKED_CRE_SOURCE_DIGEST } from "../source-bundle-request";
import { buildDeployableSourcePackage } from "../deployable-package";
import { evaluateSourceBundleLiveWriteGate, getSourceBundleVerification } from "../source-bundle-verification";

const ROOT = join(process.cwd());

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

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

function wiredFiles(): Array<{ path: string; content: string }> {
  return [
    {
      path: "app/ingest-client.ts",
      content: `export const VALIDATION_INGEST_PATH = "/api/public/market-validation/${LOCKED_CRE_EXPERIMENT_ID}/ingest";
export async function postValidationIngest(payload: Record<string, unknown>) {
  return fetch(VALIDATION_INGEST_PATH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
}`,
    },
    {
      path: PUBLIC_INGEST_ROUTE_FILE,
      content: `export async function POST() { return Response.json({ accepted: 1 }, { status: 202 }); }`,
    },
    { path: "app/page.tsx", content: "Request Pilot Access $290/year $149/deal An Infinity OS Venture" },
  ];
}

function validAuth(overrides: Partial<Parameters<typeof buildFounderExternalCostAuthorization>[0]> = {}) {
  const built = buildFounderExternalCostAuthorization({
    authorizationId: "founder_test_ceiling",
    deploymentCeiling: 25,
    runtimeCeiling: 40,
    scope: lockedCreFounderScope(),
    reason: "Test-only explicit numeric ceiling for architecture proof.",
    ...overrides,
  });
  if (!built.ok) throw new Error(built.reason);
  return built.authorization;
}

describe("FOUNDER ECONOMIC CEILING + FIRST SOURCE-BUNDLE LIVE VALIDATION DEPLOY V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetPublicIngestRuntime();
    resetEconomicReadVerification();
  });

  it("rejects placeholder, missing, zero, and negative founder ceilings and accepts the explicit $5/$10 approval", () => {
    expect(THIS_REQUEST_FOUNDER_CEILINGS.deploymentCeilingUsd).toBe(FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD);
    expect(THIS_REQUEST_FOUNDER_CEILINGS.runtimeCeilingUsd).toBe(FOUNDER_APPROVED_RUNTIME_CEILING_USD);
    expect(FOUNDER_APPROVED_DEPLOYMENT_CEILING_USD).toBe(5);
    expect(FOUNDER_APPROVED_RUNTIME_CEILING_USD).toBe(10);
    expect(parseFounderCeilingAmount(PLACEHOLDER_CEILING_TOKEN).ok).toBe(false);
    expect(parseFounderCeilingAmount("[INSERT_EXPLICIT_FOUNDER_AMOUNT]")).toEqual({
      ok: false,
      reason: "PLACEHOLDER_CEILING_FORBIDDEN",
    });
    const missing = parseFounderCeilingAmount(undefined);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toBe("MISSING_EXPLICIT_CEILING");
    const zero = parseFounderCeilingAmount(0);
    expect(zero.ok).toBe(false);
    if (!zero.ok) expect(zero.reason).toBe("ZERO_OR_NEGATIVE_CEILING_FORBIDDEN");
    const negative = parseFounderCeilingAmount(-5);
    expect(negative.ok).toBe(false);
    if (!negative.ok) expect(negative.reason).toBe("ZERO_OR_NEGATIVE_CEILING_FORBIDDEN");
    const nonNumeric = parseFounderCeilingAmount("abc");
    expect(nonNumeric.ok).toBe(false);
    if (!nonNumeric.ok) expect(nonNumeric.reason).toBe("NON_NUMERIC_CEILING");
    const thisRequest = evaluateThisRequestFounderAuthorization();
    expect(thisRequest.present).toBe(true);
    expect(thisRequest.recognized).toBe(true);
    expect(thisRequest.authorization?.authorizationId).toBe(FOUNDER_AUTHORIZATION_ID);
    expect(thisRequest.authorization?.deploymentCeilingUsd).toBe(5);
    expect(thisRequest.authorization?.runtimeCeilingUsd).toBe(10);
    expect(thisRequest.authorization?.singleUse).toBe(true);
    expect(thisRequest.authorization?.maximumExecutions).toBe(1);
    expect(thisRequest.providerCostClassification).toBe("UNKNOWN");
    expect(thisRequest.founderCeilingTreatedAsProviderCost).toBe(false);
  });

  it("keeps provider cost UNKNOWN and treats a valid founder ceiling as authorization only", () => {
    const authorization = validAuth();
    const evaluation = evaluateFounderAuthorization({
      authorization,
      requestedScope: lockedCreFounderScope(),
    });
    expect(evaluation.recognized).toBe(true);
    expect(evaluation.economicAuthorization).toBe("BOUNDED_BY_FOUNDER_AUTHORIZATION");
    expect(evaluation.providerCostClassification).toBe("UNKNOWN");
    expect(evaluation.founderCeilingTreatedAsProviderCost).toBe(false);
    expect(evaluation.treasuryMovement).toBe(0);
    expect(evaluation.globalHostingAuthority).toBe(false);
    expect(evaluation.singleUse).toBe(true);
    expect(authorization.maximumExecutions).toBe(1);
    expect(authorization.currency).toBe("USD");
    expect(classifyValidationDeploymentCost().finalClassification).toBe("UNKNOWN");
    expect(classifyVercelLiveCost()).toBe("UNKNOWN");
    expect(evaluateEconomicEligibility("UNKNOWN").economicallyEligible).toBe(false);
    expect(evaluateEconomicEligibility("UNKNOWN", { recognized: true }).economicallyEligible).toBe(true);
    expect(evaluateEconomicEligibility("UNKNOWN", { recognized: true }).treasuryMutated).toBe(false);
  });

  it("scopes founder authorization to one experiment and artifact and expires in 14 days", () => {
    const authorization = validAuth();
    const other = evaluateFounderAuthorization({
      authorization,
      requestedScope: { ...lockedCreFounderScope(), artifactId: "art_other" },
    });
    expect(other.recognized).toBe(false);
    expect(other.scopeMatches).toBe(false);
    const otherVenture = evaluateFounderAuthorization({
      authorization,
      requestedScope: { ...lockedCreFounderScope(), candidateId: "other-venture" },
    });
    expect(otherVenture.recognized).toBe(false);
    const otherDigest = evaluateFounderAuthorization({
      authorization,
      requestedScope: { ...lockedCreFounderScope(), artifactDigest: "0".repeat(64) },
    });
    expect(otherDigest.recognized).toBe(false);
    const expired = evaluateFounderAuthorization({
      authorization,
      requestedScope: lockedCreFounderScope(),
      now: new Date(Date.parse(authorization.expiresAt) + 1),
    });
    expect(expired.recognized).toBe(false);
    expect(expired.expired).toBe(true);
    const consumed = evaluateFounderAuthorization({
      authorization: { ...authorization, executionsConsumed: 1 },
      requestedScope: lockedCreFounderScope(),
    });
    expect(consumed.recognized).toBe(false);
    expect(consumed.consumed).toBe(true);
    const lifetimeMs = Date.parse(authorization.expiresAt) - Date.parse(authorization.effectiveAt);
    expect(lifetimeMs).toBe(LOCKED_SUCCESS_CRITERIA.maxDurationDays * 24 * 60 * 60 * 1000);
  });

  it("lets EAG express UNKNOWN_COST_WITH_EXPLICIT_HUMAN_CEILING without weakening global UNKNOWN policy", () => {
    const policy = inspectEagEconomicPolicy();
    expect(policy.unknownAllowed).toBe(false);
    expect(policy.policyChanged).toBe(false);
    expect(policy.unknownCostWithExplicitHumanCeiling).toBe(true);
    expect(eagAllowsClassification("UNKNOWN")).toBe(false);
    expect(eagAllowsUnknownCostWithExplicitHumanCeiling({
      founderAuthorizationRecognized: true,
      singleUse: true,
      providerCostState: "UNKNOWN",
    })).toBe(true);
    expect(eagAllowsUnknownCostWithExplicitHumanCeiling({
      founderAuthorizationRecognized: false,
      singleUse: true,
      providerCostState: "UNKNOWN",
    })).toBe(false);
    const blocked = evaluateValidationExperimentEag({
      artifactEligible: true,
      purpose: MARKET_VALIDATION_PURPOSE,
      providerCapabilityVerified: false,
      deployInputCompatible: false,
      newCapabilityRequired: true,
      newCapabilityVerified: false,
      formReady: true,
      analyticsReady: true,
      secretSafety: "PASS",
      costClassification: "UNKNOWN",
      unknownCost: true,
      treasuryAuthorized: false,
      customDomainRequested: false,
      dnsRequested: false,
      paymentsRequested: false,
      treasuryRequested: false,
      adsRequested: false,
      existingDeploymentCount: 0,
      eagGrants: [],
      treasuryGrants: [],
    });
    expect(blocked.decision).not.toBe("APPROVED");
    expect(blocked.blockers).toContain("UNKNOWN_COST");
    const approved = evaluateValidationExperimentEag({
      artifactEligible: true,
      purpose: MARKET_VALIDATION_PURPOSE,
      providerCapabilityVerified: false,
      deployInputCompatible: false,
      newCapabilityRequired: true,
      newCapabilityVerified: false,
      formReady: true,
      analyticsReady: true,
      secretSafety: "PASS",
      costClassification: "UNKNOWN",
      unknownCost: true,
      treasuryAuthorized: false,
      customDomainRequested: false,
      dnsRequested: false,
      paymentsRequested: false,
      treasuryRequested: false,
      adsRequested: false,
      existingDeploymentCount: 0,
      eagGrants: [],
      treasuryGrants: [],
      founderAuthorizationRecognized: true,
      firstCapabilityVerificationWrite: true,
      founderAuthorizationSingleUse: true,
    });
    expect(approved.decision).toBe("APPROVED");
    expect(approved.bypassed).toBe(false);
    expect(approved.hardcodedDenied).toBe(false);
    expect(approved.reason).toContain("UNKNOWN_COST_WITH_EXPLICIT_HUMAN_CEILING");
  });

  it("requires plan PRO, locked digest, and keeps this request fail-closed before any provider write", async () => {
    persistPro();
    expect(inspectFreshPlanEligibility().marketValidationExperiment).toBe("PASS");
    expect(inspectFreshPlanEligibility().commercialUse).toBe("YES");
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const files = result.artifact?.files ?? [];
    const pkg = buildDeployableSourcePackage({
      artifactId: result.artifact!.artifactId,
      ventureId: result.experiment.ventureId,
      experimentId: result.experiment.experimentId,
      candidateId: CRE_CANDIDATE_ID,
      files,
    });
    const integrity = evaluateSourceIntegrity({
      pkg,
      files,
      expectedArtifactId: pkg.artifactId,
      expectedDigest: pkg.sourceDigest,
    });
    expect(integrity.status).toBe("PASS");
    expect(integrity.digest).toBe(pkg.sourceDigest);
    expect(pkg.artifactId).not.toBe(LOCKED_CRE_ARTIFACT_ID);
    expect(pkg.sourceDigest).not.toBe(LOCKED_CRE_SOURCE_DIGEST);
    expect(LOCKED_CRE_SOURCE_DIGEST).toBe("5d60bac77fb032bd4daaf9046eb7ecdb1588f6d36c703ea91a90fe568b51b608");
    expect(result.authorization.artifactValidation).toBe("PASS");
    expect(result.authorization.formBackendReady).toBe(true);
    expect(result.authorization.analyticsBackendReady).toBe(true);
    expect(result.authorization.secretSafety).toBe("PASS");
    expect(files.map((file) => file.content).join("\n")).toContain(CANONICAL_FOOTER_COPY);
    expect(result.experiment.minimumEvidence).toEqual(LOCKED_SUCCESS_CRITERIA);
    const thisRequest = evaluateThisRequestFounderAuthorizedDeploy();
    expect(thisRequest.founder.recognized).toBe(true);
    expect(thisRequest.eagDecision).toBe("APPROVED");
    expect(thisRequest.preLive.readyForLiveProviderCall).toBe(true);
    expect(thisRequest.liveWrite.allowed).toBe(true);
    expect(thisRequest.liveWrite.state).toBe("AUTHORIZED_FIRST_WRITE");
    expect(thisRequest.attempted).toBe(false);
    expect(thisRequest.sourceBundleWrites).toBe(0);
    expect(thisRequest.validationDeployments).toBe(0);
    expect(thisRequest.unknownCostGlobalPolicyWeakened).toBe(false);
    expect(thisRequest.providerCostClassification).toBe("UNKNOWN");
    expect(getSourceBundleVerification().status).toBe("UNVERIFIED");
    expect(result.deployed).toBe(false);
    expect(result.decision).toBe("VALIDATE");
    expect(result.buildReady).toBe(false);
    expect(result.fullProductBuildExecuted).toBe(false);
    expect(result.writeBoundary).toEqual(WRITE_BOUNDARY);
    expect(getSourceBundleVerification().status).toBe("UNVERIFIED");
    expect((VERIFIED_HOSTING_CAPABILITIES as readonly string[]).includes(SOURCE_BUNDLE_CAPABILITY)).toBe(false);
    expect((VERCEL_LIVE_ALLOWED_ACTIONS as readonly string[]).includes(SOURCE_BUNDLE_CAPABILITY)).toBe(false);
  });

  it("authorizes a scoped founder ceiling through artifact EAG without treating it as known cost", () => {
    persistPro();
    const authorization = persistFounderAuthorization(validAuth());
    const auth = evaluateValidationArtifactDeploymentAuthorization({
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      artifactId: LOCKED_CRE_ARTIFACT_ID,
      artifactValid: true,
      validationPassed: true,
      fullProduct: false,
      purpose: MARKET_VALIDATION_PURPOSE,
      artifactFiles: wiredFiles(),
      founderAuthorization: authorization,
    });
    expect(auth.costClassification).toBe("UNKNOWN");
    expect(auth.unknownCostTreatedAsZero).toBe(false);
    expect(auth.founderAuthorizationRecognized).toBe(true);
    expect(auth.economicAuthorizationKind).toBe("BOUNDED_BY_FOUNDER_AUTHORIZATION");
    expect(auth.eag).toBe("APPROVED");
    expect(auth.eagBypassed).toBe(false);
    expect(auth.authorizedCeiling).toBe(25);
    const gate = evaluateSourceBundlePreLiveGate({
      adapterPass: true,
      artifactPass: true,
      formPass: true,
      analyticsPass: true,
      secretSafety: "PASS",
      planPass: true,
      commercialEligibilityPass: true,
      deployPackagePass: true,
      costClassification: "UNKNOWN",
      unknownCost: true,
      economicAuthorizationPass: true,
      eagApproved: true,
      eagPermitsBoundedVerification: true,
      founderCeilingRecognized: true,
    });
    expect(gate.cost).toBe("FAIL");
    expect(gate.economicAuthorization).toBe("PASS");
    expect(gate.unknownCostBlocksLive).toBe(false);
    expect(gate.readyForLiveProviderCall).toBe(true);
    expect(evaluateSourceBundleLiveWriteGate({
      adapterImplemented: true,
      capabilityVerified: false,
      unknownCost: true,
      eagApproved: true,
      sourceIntegrity: "PASS",
      secretSafety: "PASS",
      founderCeilingRecognized: true,
    }).allowed).toBe(true);
  });

  it("isolates synthetic form and analytics and keeps production counts at zero", () => {
    const form = handlePublicValidationIngest({
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      body: {
        kind: "form",
        synthetic: true,
        form: {
          name: "Synthetic Broker",
          workEmail: "founder-ceiling-synthetic@broker.example",
          role: "CRE broker",
          company: "Boutique",
          teamSize: "3",
          dealFrequency: "Monthly",
          preferredPricing: "professional_annual",
          leaseWorkflow: true,
          pilotInterest: true,
        },
      },
      byteLength: 240,
      clientKey: "founder-ceiling-form",
    });
    expect(form.ok).toBe(true);
    expect(form.productionAccepted).toBe(0);
    const analytics = handlePublicValidationIngest({
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      body: { kind: "event", type: "PAGE_VIEW", synthetic: true },
      byteLength: 64,
      clientKey: "founder-ceiling-analytics",
    });
    expect(analytics.ok).toBe(true);
    expect(analytics.productionAccepted).toBe(0);
    const observability = inspectRuntimeCostObservability({ founderRuntimeCeilingUsd: null });
    expect(observability.runtimeCostObservabilityLimited).toBe(true);
    expect(observability.providerNativeCostTelemetryAvailable).toBe(false);
    expect(observability.automaticDollarThresholdEnforcementPossible).toBe(false);
    const first = rememberValidationDeployment({
      provider: "vercel",
      project: "infinity-validation-cre-lease-npv-e72beb7b",
      deploymentId: "dpl_founder_replay",
      url: "https://infinity-validation-cre-lease-npv-e72beb7b.vercel.app",
      artifactId: LOCKED_CRE_ARTIFACT_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
    });
    expect(rememberValidationDeployment({ ...first, deploymentId: "dpl_other" }).deploymentId).toBe("dpl_founder_replay");
  });

  it("does not regress HQ frontend surfaces or invent activity", async () => {
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    expect(result.state).toBe("EXPERIMENT_READY_BUT_EXTERNAL_ACTION_BLOCKED");
    expect(result.rooms.every((room) => room.state !== "ACTIVE_WORK")).toBe(true);
    const dashboard = read("app/dashboard/page.tsx");
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    const experience = read("components/dashboard/operator-console/infinity-hq-experience.tsx");
    expect(dashboard.length).toBeGreaterThan(0);
    expect(consoleSource).toContain(">HQ Command<");
    expect(consoleSource).toContain('id="hq-command"');
    expect(consoleSource).toContain("<HqSpatialFloor");
    expect(consoleSource).toContain("<InspectionContextBar");
    expect(consoleSource).toContain("<VentureIntelligencePanel");
    expect(consoleSource).toContain("<CommandChamber");
    expect(experience).toContain("InfinityHqExperience");
    expect(vercelAdapter.capabilities.supportedActions.includes(SOURCE_BUNDLE_CAPABILITY)).toBe(true);
  });
});
