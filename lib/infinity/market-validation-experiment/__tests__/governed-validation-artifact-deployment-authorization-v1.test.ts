import { describe, expect, it, beforeEach } from "vitest";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  LOCKED_SUCCESS_CRITERIA,
  MARKET_VALIDATION_PURPOSE,
  marketValidationExperimentId,
  UNVERIFIED_HOSTING_CAPABILITIES,
  VERIFIED_HOSTING_CAPABILITIES,
} from "../constants";
import { evaluateValidationArtifactDeploymentAuthorization } from "../artifact-authorization";
import {
  evaluateExperimentPreDeployGate,
} from "../deploy";
import {
  evaluateAnalyticsBackendReadiness,
  evaluateFormBackendReadiness,
  handlePublicValidationIngest,
  publicValidationIngestOrigin,
  resetPublicIngestRuntime,
} from "../ingest";
import { inspectHostingProviderCapability, purposeAllowsCustomDomain, purposeAllowsTemporaryProviderUrl } from "../provider-capability";
import { evaluateSecretSafety } from "../secret-safety";
import { currentCreValidationArtifactId } from "../current-cre-artifact";
import { executeMarketValidationExperiment, rememberValidationDeployment, resetExperimentRuntime } from "../execute";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import type { HostingProviderCapabilityInspection } from "../provider-capability";
import type { ActionAuthorityGrant, TreasuryActionGrant } from "@/lib/infinity/governed-deployment-execution/types";
import { PUBLIC_INGEST_ROUTE_FILE } from "../ingest";
import { setExperimentRuntimeState } from "../runtime-state";

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

function provider(overrides: Partial<HostingProviderCapabilityInspection> = {}): HostingProviderCapabilityInspection {
  const base = inspectHostingProviderCapability();
  return {
    ...base,
    verificationStatus: "LIVE_WRITE_VERIFIED",
    verifiedCapabilities: [...VERIFIED_HOSTING_CAPABILITIES],
    reusableCapabilityVerification: true,
    unverifiedCapabilitiesGranted: false,
    costClassification: "UNKNOWN",
    deployInputCompatible: false,
    unlimitedDeployAuthority: false,
    ...overrides,
  };
}

function compatibleProvider(overrides: Partial<HostingProviderCapabilityInspection> = {}): HostingProviderCapabilityInspection {
  return provider({
    costClassification: "KNOWN_COST",
    deployInputCompatible: true,
    newCapabilityRequired: false,
    newCapabilityVerified: true,
    ...overrides,
  });
}

function eagGrant(): ActionAuthorityGrant {
  return { actionType: "DEPLOY_APPLICATION", authorizationId: "eag_validation", decision: "AUTO_AUTHORIZE" };
}

function treasuryGrant(): TreasuryActionGrant {
  return {
    actionType: "DEPLOY_APPLICATION",
    authorizationId: "tr_validation",
    decision: "AUTO_AUTHORIZE",
    authorizedAmountUsd: 5,
    costActuality: "ESTIMATE",
    reservationId: null,
  };
}

function eligible(overrides: Partial<Parameters<typeof evaluateValidationArtifactDeploymentAuthorization>[0]> = {}) {
  return evaluateValidationArtifactDeploymentAuthorization({
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    artifactId: LOCKED_CRE_ARTIFACT_ID,
    artifactValid: true,
    validationPassed: true,
    fullProduct: false,
    purpose: MARKET_VALIDATION_PURPOSE,
    artifactFiles: wiredFiles(),
    providerCapability: provider(),
    ...overrides,
  });
}

describe("GOVERNED VALIDATION ARTIFACT DEPLOYMENT AUTHORIZATION CLOSURE V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetPublicIngestRuntime();
  });

  it("keeps provider capability verification separate from artifact authorization", () => {
    const capability = inspectHostingProviderCapability();
    expect(capability.provider).toBe("vercel");
    expect(capability.unlimitedDeployAuthority).toBe(false);
    expect(capability.unverifiedCapabilitiesGranted).toBe(false);
    expect(capability.adapterEstimateAcceptedAsKnownZero).toBe(false);
    expect(UNVERIFIED_HOSTING_CAPABILITIES.every((item) => !capability.verifiedCapabilities.includes(item))).toBe(true);
    const auth = eligible();
    expect(auth.providerVerificationSeparated).toBe(true);
    expect(auth.artifactScoped).toBe(true);
    expect(auth.experimentPurposeModeled).toBe(true);
    expect(auth.generalUnlimitedDeployAuthority).toBe(false);
    expect(auth.executionScope.experimentId).toBe(LOCKED_CRE_EXPERIMENT_ID);
    expect(auth.executionScope.artifactId).toBe(LOCKED_CRE_ARTIFACT_ID);
    expect(auth.executionScope.candidateId).toBe(CRE_CANDIDATE_ID);
    expect(auth.executionScope.purpose).toBe(MARKET_VALIDATION_PURPOSE);
  });

  it("models MARKET_VALIDATION_EXPERIMENT purpose and allows only a temporary provider URL", () => {
    expect(purposeAllowsTemporaryProviderUrl(MARKET_VALIDATION_PURPOSE)).toBe(true);
    expect(purposeAllowsCustomDomain(MARKET_VALIDATION_PURPOSE)).toBe(false);
    expect(purposeAllowsTemporaryProviderUrl("PUBLIC_COMMERCIAL_LAUNCH")).toBe(false);
    const denied = eligible({ purpose: "PUBLIC_COMMERCIAL_LAUNCH" });
    expect(denied.approved).toBe(false);
    expect(denied.blockers).toContain("EAG_POLICY");
    const domain = eligible({ customDomainRequested: true });
    expect(domain.customDomainAllowed).toBe(false);
    expect(domain.approved).toBe(false);
  });

  it("fails closed on unknown cost and does not treat unknown as zero", () => {
    const auth = eligible();
    expect(auth.costClassification).toBe("UNKNOWN");
    expect(auth.unknownCost).toBe(true);
    expect(auth.unknownCostTreatedAsZero).toBe(false);
    expect(auth.withinAuthorization).toBe(false);
    expect(auth.eag).not.toBe("APPROVED");
    expect(auth.blockers).toContain("UNKNOWN_COST");
  });

  it("lets known authorized cost proceed only when every other gate also passes", () => {
    const blockedByScope = eligible({
      providerCapability: compatibleProvider({ deployInputCompatible: false }),
      eagGrants: [eagGrant()],
      treasuryGrants: [treasuryGrant()],
    });
    expect(blockedByScope.eag).toBe("BLOCKED_BY_PROVIDER_SCOPE");
    expect(blockedByScope.approved).toBe(false);

    const approved = eligible({
      providerCapability: compatibleProvider(),
      eagGrants: [eagGrant()],
      treasuryGrants: [treasuryGrant()],
    });
    expect(approved.eag).toBe("APPROVED");
    expect(approved.approved).toBe(true);
    expect(approved.unknownCost).toBe(false);
    expect(approved.withinAuthorization).toBe(true);
  });

  it("keeps EAG in control and does not grant unverified capabilities", () => {
    const unverified = eligible({
      requiredCapability: "hosting.deploy",
      providerCapability: compatibleProvider({
        verifiedCapabilities: [],
        verificationStatus: "UNVERIFIED",
        reusableCapabilityVerification: false,
      }),
      eagGrants: [eagGrant()],
      treasuryGrants: [treasuryGrant()],
    });
    expect(unverified.eag).toBe("BLOCKED_BY_PROVIDER_SCOPE");
    expect(unverified.unverifiedCapabilitiesGranted).toBe(false);

    const noEag = eligible({
      providerCapability: compatibleProvider(),
      treasuryGrants: [treasuryGrant()],
    });
    expect(noEag.eag).toBe("DENIED");
    expect(noEag.eagBypassed).toBe(false);
  });

  it("scopes authorization to the CRE experiment artifact and enforces one deployment", () => {
    expect(marketValidationExperimentId(CRE_CANDIDATE_ID)).toBe(LOCKED_CRE_EXPERIMENT_ID);
    const wrong = eligible({ artifactId: "art_other" });
    expect(wrong.artifactEligible).toBe(false);
    expect(wrong.eag).toBe("BLOCKED_BY_ARTIFACT");
    const second = eligible({
      existingDeploymentCount: 1,
      providerCapability: compatibleProvider(),
      eagGrants: [eagGrant()],
      treasuryGrants: [treasuryGrant()],
    });
    expect(second.approved).toBe(false);
    expect(second.blockers).toContain("EAG_POLICY");
  });

  it("requires secret safety, form backend, and analytics ingestion readiness", () => {
    const secrets = evaluateSecretSafety(wiredFiles());
    expect(secrets.status).toBe("PASS");
    expect(evaluateSecretSafety([{ path: "x.ts", content: "VERCEL_TOKEN=secret" }]).status).toBe("FAIL");
    expect(publicValidationIngestOrigin("http://localhost:3000")).toBeNull();
    expect(evaluateFormBackendReadiness({ artifactFiles: wiredFiles(), experimentId: LOCKED_CRE_EXPERIMENT_ID }).readyForLiveDeploy).toBe(true);
    expect(evaluateAnalyticsBackendReadiness({ artifactFiles: wiredFiles(), experimentId: LOCKED_CRE_EXPERIMENT_ID }).readyForLiveDeploy).toBe(true);
    const unwired = eligible({ artifactFiles: [{ path: "app/page.tsx", content: "landing" }] });
    expect(unwired.formBackendReady).toBe(false);
    expect(["BLOCKED_BY_FORM_BACKEND", "BLOCKED_BY_ANALYTICS_BACKEND"]).toContain(unwired.eag);
  });

  it("validates public ingest lineage, rejects arbitrary IDs, and ignores payment events", () => {
    const ok = handlePublicValidationIngest({
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      body: {
        kind: "form",
        synthetic: true,
        form: {
          name: "Alex Broker",
          workEmail: "alex@broker.example",
          role: "CRE broker",
          company: "Boutique",
          teamSize: "4",
          dealFrequency: "Monthly",
          preferredPricing: "professional_annual",
          leaseWorkflow: true,
          pilotInterest: true,
        },
      },
      byteLength: 200,
      clientKey: "test-a",
    });
    expect(ok.ok).toBe(true);
    expect(ok.productionAccepted).toBe(0);
    const extraLineageIgnored = handlePublicValidationIngest({
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      body: { kind: "event", type: "PAGE_VIEW", candidateId: "someone-else", synthetic: true },
      byteLength: 80,
      clientKey: "test-b",
    });
    expect(extraLineageIgnored.ok).toBe(true);
    expect(extraLineageIgnored.productionAccepted).toBe(0);
    const notCollecting = handlePublicValidationIngest({
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      body: { kind: "event", type: "PAGE_VIEW" },
      byteLength: 40,
      clientKey: "test-b2",
    });
    expect(notCollecting.ok).toBe(false);
    expect(notCollecting.error).toBe("experiment_not_collecting");
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    const collecting = handlePublicValidationIngest({
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      body: { kind: "event", type: "PAGE_VIEW" },
      byteLength: 40,
      clientKey: "test-b3",
    });
    expect(collecting.ok).toBe(true);
    expect(collecting.productionAccepted).toBe(1);
    const paid = handlePublicValidationIngest({
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      body: { kind: "event", type: "PAID_COMMITMENT" },
      byteLength: 40,
      clientKey: "test-c",
    });
    expect(paid.ok).toBe(false);
    const huge = handlePublicValidationIngest({
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      body: { kind: "event", type: "PAGE_VIEW" },
      byteLength: 20_000,
      clientKey: "test-d",
    });
    expect(huge.status).toBe(413);
  });

  it("does not invent a live URL, DNS, or a second deployment on replay", async () => {
    const first = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    expect(first.deployed).toBe(false);
    expect(first.customDomain).toBe(false);
    expect(first.url).toBeNull();
    expect(first.authorization.eagBypassed).toBe(false);
    expect(first.preDeployGate.ok).toBe(false);
    expect(first.state).toBe("EXPERIMENT_READY_BUT_EXTERNAL_ACTION_BLOCKED");
    expect(first.artifact?.artifactId).toBe(currentCreValidationArtifactId());
    expect(first.artifact?.artifactId).not.toBe(LOCKED_CRE_ARTIFACT_ID);
    expect(first.experiment.minimumEvidence).toEqual(LOCKED_SUCCESS_CRITERIA);
    expect(first.fullProductBuildExecuted).toBe(false);
    const replayed = rememberValidationDeployment({
      provider: "vercel",
      project: "infinity-validation-cre-lease-npv-e72beb7b",
      deploymentId: "dpl_existing",
      url: "https://infinity-validation.vercel.app",
      artifactId: first.artifact!.artifactId,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
    });
    const second = rememberValidationDeployment({
      ...replayed,
      deploymentId: "dpl_other",
    });
    expect(second.deploymentId).toBe("dpl_existing");
    const after = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    expect(after.deploymentCount).toBe(1);
    expect(after.deployed).toBe(true);
    expect(after.deploymentId).toBe("dpl_existing");
    expect(after.customDomain).toBe(false);
  });

  it("does not treat HQ persisted hosting rows as unbounded live-write authority", () => {
    const cap = inspectHostingProviderCapability({
      persistedHosting: {
        id: "verify-hosting",
        organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
        providerCategory: "HOSTING",
        providerKey: "vercel.com_v1",
        environment: "LIVE",
        mode: "READ_ONLY",
        status: "READ_ONLY_VERIFIED",
        capabilitiesChecked: ["hosting.list_projects"],
        startedAt: "2026-08-01T00:00:00.000Z",
        completedAt: "2026-08-01T00:00:00.000Z",
        freshness: "VERIFIED_STALE",
        failureCode: null,
        failureReason: null,
        metadata: {},
        mutationAuthority: "LOCKED",
      },
    });
    expect(cap.persistedHq.mode).toBe("READ_ONLY");
    expect(cap.persistedHq.mutationAuthority).toBe("LOCKED");
    expect(cap.unlimitedDeployAuthority).toBe(false);
    expect(cap.unverifiedCapabilitiesGranted).toBe(false);
  });

  it("live CRE authorization remains fail-closed without deploying", async () => {
    const { executeLiveCreMarketExperiment } = await import("../live");
    const result = await executeLiveCreMarketExperiment();
    expect(result.deployed).toBe(false);
    expect(result.url).toBeNull();
    expect(result.customDomain).toBe(false);
    expect(result.fullProductBuildExecuted).toBe(false);
    expect(result.authorization.eagBypassed).toBe(false);
    expect(result.authorization.unknownCostTreatedAsZero).toBe(false);
    expect(result.authorization.generalUnlimitedDeployAuthority).toBe(false);
    expect(result.authorization.unverifiedCapabilitiesGranted).toBe(false);
    expect(result.artifact?.artifactId).toBe(currentCreValidationArtifactId());
    expect(result.experiment.experimentId).toBe(LOCKED_CRE_EXPERIMENT_ID);
    expect(result.authorization.approved).toBe(false);
    expect(result.authorization.eag).not.toBe("APPROVED");
    expect(result.state).toBe("EXPERIMENT_READY_BUT_EXTERNAL_ACTION_BLOCKED");
  });

  it("keeps the pre-deploy gate fail-closed without verification-artifact hardcoding", () => {
    const gate = evaluateExperimentPreDeployGate({
      candidateDecision: "VALIDATE",
      validationArtifactAuthorized: true,
      fullProductAuthorized: false,
      artifactValid: true,
      artifactId: LOCKED_CRE_ARTIFACT_ID,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
    });
    expect(gate.ok).toBe(false);
    expect(gate.failed).not.toContain("verifiedHostingTargetMismatch");
    expect(gate.purpose).toBe(MARKET_VALIDATION_PURPOSE);
    expect(gate.unknownCostTreatedAsZero).toBe(false);
    expect(gate.generalUnlimitedDeployAuthority).toBe(false);
  });
});
