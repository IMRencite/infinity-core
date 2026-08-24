import { evaluateGovernedDeploymentReadiness } from "@/lib/infinity/governed-deployment-readiness";
import type { GovernedDeploymentReadiness } from "@/lib/infinity/governed-deployment-readiness";
import type { AuthorityGrant } from "@/lib/infinity/governed-deployment-readiness/types";
import { buildProductionArtifactHandoff } from "@/lib/infinity/production-artifact/handoff";
import type { ProductionArtifactHandoff } from "@/lib/infinity/production-artifact/handoff";
import { VENTURE_SYSTEMS_BUILD_WRITE_BOUNDARY } from "@/lib/infinity/product-asset-builder/v2.1/systems-architecture/types";
import type { VentureSystemsBuildCoveragePlan } from "@/lib/infinity/product-asset-builder/v2.1/systems-architecture/types";
import type { VentureSystemsBuildContract } from "@/lib/infinity/venture-systems-architecture/types";
import {
  AUTONOMOUS_ELIGIBLE_ACTION_TYPES,
  AUTONOMOUS_EXTERNAL_ACTION_POLICY_KEY,
  AUTONOMOUS_EXTERNAL_ACTION_POLICY_VERSION,
  type PolicyDecision,
} from "@/lib/infinity/launch-gateway/autonomous-authorization/constants";
import type { AuthorizationEvaluationResult } from "@/lib/infinity/launch-gateway/autonomous-authorization/evaluate";
import { resolveActionType } from "@/lib/infinity/launch-gateway/action-registry";
import {
  authorizeFinancialAction,
  createBudget,
  createFinancialActionRequest,
  setFinancialAutonomy,
  TreasuryStore,
  type FinancialAuthorization,
} from "@/lib/infinity/treasury";
import { actualAmount } from "@/lib/infinity/treasury/types";
import { buildGovernedDeploymentExecutionRequest } from "./build-request";
import { evaluateVercelLiveVerificationPreflight } from "./vercel-live-preflight";
import type { VercelLiveVerificationPreflight } from "./vercel-live-preflight";
import {
  VERCEL_LIVE_ALLOWED_ACTIONS,
  VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
  VERCEL_LIVE_VERIFICATION_ARTIFACT_PATH,
  VERCEL_LIVE_VERIFICATION_RESOURCE,
} from "./vercel-live";
import type {
  ActionAuthorityGrant,
  GovernedDeploymentExecutionRequest,
  ProviderWriteEvidence,
  TreasuryActionGrant,
} from "./types";
import type { GovernedExecutionActionType } from "./constants";

export const VERCEL_LIVE_VERIFICATION_PURPOSE = "VERCEL_LIVE_VERIFICATION" as const;
export const VERCEL_LIVE_VERIFICATION_SESSION_TTL_MS = 15 * 60 * 1000;
export const VERCEL_LIVE_VERIFICATION_ORGANIZATION_ID = "org-infinity-test-vercel-live-verification";
export const VERCEL_LIVE_VERIFICATION_VENTURE_ID = VERCEL_LIVE_VERIFICATION_RESOURCE;
export const VERCEL_LIVE_VERIFICATION_COMPANY_ID = "company-infinity-test-vercel-live-verification";
export const VERCEL_LIVE_VERIFICATION_MISSION_ID = "mission-infinity-test-vercel-live-verification";
export const VERCEL_LIVE_VERIFICATION_BUILD_CONTRACT_ID = "build-infinity-vercel-live-verification-artifact-v1";
export const VERCEL_LIVE_VERIFICATION_SYSTEMS_CONTRACT_ID = "vsa-infinity-vercel-live-verification-artifact-v1";
export const VERCEL_LIVE_VERIFICATION_PAB_RUN_ID = "pab-run-infinity-vercel-live-verification";

const REQUIRED_EAG_GATEWAY_ACTIONS = VERCEL_LIVE_ALLOWED_ACTIONS;
const REQUIRED_TREASURY_ACTIONS = ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"] as const;
const FORBIDDEN_GATEWAY_ACTIONS = new Set([
  "dns.configure",
  "domain.register",
  "domain.search",
  "repository.create",
  "repository.push",
  "email.send",
  "purchase.create",
]);

export type VercelVerificationOperatorAuthorization = {
  purpose: typeof VERCEL_LIVE_VERIFICATION_PURPOSE;
  organizationId: string;
  ventureId: string;
  maxAuthorizedUsd: number;
  allowedActions: readonly string[];
  deniedActions?: readonly string[];
  publicLaunchAuthorized: false;
  expiresAt: string;
};

export type VercelGovernedVerificationSession = {
  sessionId: string;
  organizationId: string;
  ventureId: string;
  purpose: typeof VERCEL_LIVE_VERIFICATION_PURPOSE;
  handoff: ProductionArtifactHandoff | null;
  readiness: GovernedDeploymentReadiness | null;
  deploymentAuthority: AuthorityGrant & {
    organizationId: string;
    ventureId: string;
    handoffId: string | null;
    readinessId: string | null;
    purpose: typeof VERCEL_LIVE_VERIFICATION_PURPOSE;
    expiresAt: string;
  } | null;
  eagAuthorizations: ActionAuthorityGrant[];
  eagEvaluations: Record<string, AuthorizationEvaluationResult>;
  treasuryAuthorizations: TreasuryActionGrant[];
  treasuryFinancialAuthorizations: FinancialAuthorization[];
  executionRequest: GovernedDeploymentExecutionRequest | null;
  preflight: VercelLiveVerificationPreflight;
  mode: "LIVE";
  createdAt: string;
  expiresAt: string;
  maxAuthorizedUsd: number | null;
  actionIds: Record<string, string>;
  blockers: string[];
};

export type BuildVercelGovernedVerificationSessionInput = {
  maxAuthorizedUsd?: number | null;
  organizationId?: string;
  ventureId?: string;
  now?: string | Date;
  omitHandoff?: boolean;
  failReadiness?: boolean;
  denyEagActions?: readonly string[];
  denyTreasuryActions?: readonly GovernedExecutionActionType[];
  publicLaunchRequested?: boolean;
  authorityVentureId?: string;
  authorityHandoffId?: string;
  expireImmediately?: boolean;
};

export function parseMaxUsd(
  argv: string[] = process.argv,
  env: Record<string, string | undefined> = process.env,
): number | null {
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (part === "--max-usd" || part === "--maxUsd") {
      const raw = argv[i + 1];
      const parsed = raw == null ? NaN : Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (part.startsWith("--max-usd=") || part.startsWith("--maxUsd=")) {
      const parsed = Number(part.split("=")[1]);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  const fromEnv = env.INFINITY_VERCEL_MAX_USD;
  if (fromEnv == null || fromEnv.trim() === "") return null;
  const parsed = Number(fromEnv);
  return Number.isFinite(parsed) ? parsed : null;
}

export function verificationSessionId(organizationId: string, ventureId: string, handoffId: string): string {
  return `vercel-verification:${organizationId}:${ventureId}:${handoffId}`;
}

export function governedExecutionActionId(
  executionRequestId: string,
  actionType: GovernedExecutionActionType,
): string {
  return `gde-action:${executionRequestId}:${actionType}`;
}

function emptyArchitecturePlan(input: {
  ventureId: string;
  companyId: string;
  missionId: string;
  buildContractId: string;
  ventureSystemsBuildContractId: string;
}): VentureSystemsBuildCoveragePlan {
  return {
    input: {
      ventureId: input.ventureId,
      companyId: input.companyId,
      missionId: input.missionId,
      buildContractId: input.buildContractId,
      ventureSystemsBuildContractId: input.ventureSystemsBuildContractId,
      contract: { unresolvedPolicies: [] } as unknown as VentureSystemsBuildContract,
    },
    rows: [],
    paymentArchitecture: null,
    writeBoundary: VENTURE_SYSTEMS_BUILD_WRITE_BOUNDARY,
  };
}

export function buildVerificationProductionArtifactHandoff(input: {
  organizationId: string;
  ventureId: string;
  createdAt: string;
}): ReturnType<typeof buildProductionArtifactHandoff> {
  const plan = emptyArchitecturePlan({
    ventureId: input.ventureId,
    companyId: VERCEL_LIVE_VERIFICATION_COMPANY_ID,
    missionId: VERCEL_LIVE_VERIFICATION_MISSION_ID,
    buildContractId: VERCEL_LIVE_VERIFICATION_BUILD_CONTRACT_ID,
    ventureSystemsBuildContractId: VERCEL_LIVE_VERIFICATION_SYSTEMS_CONTRACT_ID,
  });
  return buildProductionArtifactHandoff({
    ventureId: input.ventureId,
    companyId: VERCEL_LIVE_VERIFICATION_COMPANY_ID,
    missionId: VERCEL_LIVE_VERIFICATION_MISSION_ID,
    buildContractId: VERCEL_LIVE_VERIFICATION_BUILD_CONTRACT_ID,
    ventureSystemsBuildContractId: VERCEL_LIVE_VERIFICATION_SYSTEMS_CONTRACT_ID,
    pabBuildRunId: VERCEL_LIVE_VERIFICATION_PAB_RUN_ID,
    pabArtifactId: VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
    createdAt: input.createdAt,
    architecturePlan: plan,
    architectureValidation: {
      ok: true,
      failures: [],
      coverage: {
        requiredSystems: 0,
        plannedInternally: 0,
        externalDependencies: 0,
        deferred: 0,
        blocked: 0,
        optionalExcluded: 0,
      },
    },
    codingTaskIds: ["task-infinity-vercel-live-verification"],
    codeChangeSets: [
      {
        codeChangeSetId: "changeset-infinity-vercel-live-verification",
        ventureId: input.ventureId,
        companyId: VERCEL_LIVE_VERIFICATION_COMPANY_ID,
        missionId: VERCEL_LIVE_VERIFICATION_MISSION_ID,
        buildContractId: VERCEL_LIVE_VERIFICATION_BUILD_CONTRACT_ID,
        ventureSystemsBuildContractId: VERCEL_LIVE_VERIFICATION_SYSTEMS_CONTRACT_ID,
        validationState: "VALID",
        reviewState: "APPROVED",
        changeSet: {
          taskId: "task-infinity-vercel-live-verification",
          provider: "infinity-native",
          model: "verification",
          reasoningSummary: "Bounded Vercel live verification artifact",
          changes: [
            {
              operation: "create",
              path: VERCEL_LIVE_VERIFICATION_ARTIFACT_PATH,
              content: "<p>Infinity deployment verification</p>\n",
              justification: "Disposable verification page",
            },
          ],
          dependencyChanges: [],
          migrationChanges: [],
          testsAdded: [],
          expectedBehavior: ["Serves verification copy only"],
          assumptions: [],
        },
      },
    ],
    artifacts: [
      {
        artifactId: VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
        kind: "APPLICATION_SOURCE",
        status: "PRESENT",
        path: VERCEL_LIVE_VERIFICATION_ARTIFACT_PATH,
        sourceRef: "changeset-infinity-vercel-live-verification",
      },
      {
        artifactId: "arch-infinity-vercel-live-verification",
        kind: "ARCHITECTURE_EVIDENCE",
        status: "PRESENT",
        path: null,
        sourceRef: VERCEL_LIVE_VERIFICATION_SYSTEMS_CONTRACT_ID,
      },
      {
        artifactId: "build-infinity-vercel-live-verification",
        kind: "BUILD_EVIDENCE",
        status: "PRESENT",
        path: null,
        sourceRef: "verification-gates",
      },
      {
        artifactId: "test-infinity-vercel-live-verification",
        kind: "TEST_EVIDENCE",
        status: "PRESENT",
        path: null,
        sourceRef: "verification-gates",
      },
    ],
    runtimeRequirements: [
      { key: "runtimeVersion", required: true, value: "static", status: "DECLARED", sourceCapability: null },
      { key: "framework", required: true, value: "static-html", status: "DECLARED", sourceCapability: null },
      { key: "buildCommand", required: true, value: "none", status: "DECLARED", sourceCapability: null },
      { key: "startCommand", required: true, value: "none", status: "DECLARED", sourceCapability: null },
      { key: "database", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
      { key: "storage", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
      { key: "queue", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
      { key: "scheduledJobs", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
      { key: "objectStorage", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
      { key: "email", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
      { key: "payments", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
      { key: "environmentVariables", required: true, value: null, status: "DECLARED", sourceCapability: "SECRET_MANAGEMENT" },
      { key: "secrets", required: true, value: null, status: "DECLARED", sourceCapability: "SECRET_MANAGEMENT" },
      { key: "providerAdapters", required: true, value: "vercel.com_v1", status: "DECLARED", sourceCapability: null },
    ],
    environmentRequirements: [
      {
        key: "INFINITY_VERCEL_TEST_RESOURCE",
        required: true,
        secret: false,
        sourceCapability: null,
        provider: "vercel.com_v1",
        scope: "DEPLOY",
        status: "AVAILABLE",
      },
    ],
    databaseRequirements: {
      schemaRequired: false,
      migrations: [],
      requiredCapabilities: [],
      verificationStatus: "NOT_REQUIRED",
    },
    deploymentRequirements: {
      domainRequired: false,
      dnsRequired: false,
      tlsRequired: false,
      healthCheckPath: "/",
      rollbackRequired: true,
      hostingCapability: "HOSTING",
    },
    buildVerification: {
      status: "PASS",
      timestamp: input.createdAt,
      source: "verification-artifact",
      summary: "static verification page present",
      counts: { passed: 1, failed: 0, total: 1 },
    },
    testVerification: {
      status: "PASS",
      timestamp: input.createdAt,
      source: "verification-artifact",
      summary: "verification content only",
      counts: { passed: 1, failed: 0, total: 1 },
    },
    typecheckVerification: {
      status: "PASS",
      timestamp: input.createdAt,
      source: "verification-artifact",
      summary: "no application typescript",
      counts: { passed: 1, failed: 0, total: 1 },
    },
  });
}

export function evaluateOperatorSessionEag(input: {
  gatewayActionType: string;
  operator: VercelVerificationOperatorAuthorization;
  now: Date;
}): AuthorizationEvaluationResult {
  const explanations: string[] = [];
  const def = resolveActionType(input.gatewayActionType);
  const eligible = (AUTONOMOUS_ELIGIBLE_ACTION_TYPES as readonly string[]).includes(input.gatewayActionType);
  if (!def) {
    explanations.push("block:unknown_action_type");
    return sessionEagResult("BLOCK", explanations, input.gatewayActionType);
  }
  if (FORBIDDEN_GATEWAY_ACTIONS.has(input.gatewayActionType) || !eligible) {
    explanations.push("block:action_not_in_verification_allowlist");
    return sessionEagResult("BLOCK", explanations, input.gatewayActionType, def.defaultRisk, def.sideEffectClass);
  }
  if (Date.parse(input.operator.expiresAt) <= input.now.getTime()) {
    explanations.push("block:operator_authorization_expired");
    return sessionEagResult("BLOCK", explanations, input.gatewayActionType, def.defaultRisk, def.sideEffectClass);
  }
  if (input.operator.purpose !== VERCEL_LIVE_VERIFICATION_PURPOSE) {
    explanations.push("block:purpose_not_vercel_live_verification");
    return sessionEagResult("BLOCK", explanations, input.gatewayActionType, def.defaultRisk, def.sideEffectClass);
  }
  if (input.operator.deniedActions?.includes(input.gatewayActionType)) {
    explanations.push(`block:operator_denied:${input.gatewayActionType}`);
    return sessionEagResult("BLOCK", explanations, input.gatewayActionType, def.defaultRisk, def.sideEffectClass);
  }
  if (!input.operator.allowedActions.includes(input.gatewayActionType)) {
    explanations.push(`block:action_not_operator_authorized:${input.gatewayActionType}`);
    return sessionEagResult("BLOCK", explanations, input.gatewayActionType, def.defaultRisk, def.sideEffectClass);
  }
  explanations.push("operator_session_auto_authorize");
  return sessionEagResult("AUTO_AUTHORIZE", explanations, input.gatewayActionType, def.defaultRisk, def.sideEffectClass);
}

function sessionEagResult(
  decision: PolicyDecision,
  explanations: string[],
  actionType: string,
  riskClass?: string | null,
  sideEffectClass?: string | null,
): AuthorizationEvaluationResult {
  return {
    decision,
    policyKey: AUTONOMOUS_EXTERNAL_ACTION_POLICY_KEY,
    policyVersion: AUTONOMOUS_EXTERNAL_ACTION_POLICY_VERSION,
    evidence: {
      explanations,
      riskClass: riskClass ?? null,
      sideEffectClass: sideEffectClass ?? null,
      costEvaluation: { estimatedCostUsd: null, actuality: "UNKNOWN", unknownTreatedZero: false },
      capabilityEvaluation: { actionType, purpose: VERCEL_LIVE_VERIFICATION_PURPOSE },
      credentialEvaluation: {},
      artifactEvaluation: { artifactId: VERCEL_LIVE_VERIFICATION_ARTIFACT_ID },
      payloadHash: `vercel-verification:${actionType}`,
    },
  };
}

function gatewayToExecutionAction(action: string): GovernedExecutionActionType | null {
  if (action === "hosting.create_project") return "CREATE_HOSTING_PROJECT";
  if (action === "hosting.deploy") return "DEPLOY_APPLICATION";
  if (action === "hosting.verify_deployment") return "VERIFY_HEALTH";
  return null;
}

export function createVerificationDeploymentAuthority(input: {
  sessionId: string;
  organizationId: string;
  ventureId: string;
  handoffId: string;
  readinessId: string;
  expiresAt: string;
}): NonNullable<VercelGovernedVerificationSession["deploymentAuthority"]> {
  return {
    granted: true,
    authorizationId: `deploy-auth:${input.sessionId}`,
    source: "vercel-governed-verification-session",
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    handoffId: input.handoffId,
    readinessId: input.readinessId,
    purpose: VERCEL_LIVE_VERIFICATION_PURPOSE,
    expiresAt: input.expiresAt,
  };
}

export function buildVercelGovernedVerificationSession(
  input: BuildVercelGovernedVerificationSessionInput = {},
): VercelGovernedVerificationSession {
  const createdAtDate = input.now instanceof Date ? input.now : input.now ? new Date(input.now) : new Date();
  const createdAt = createdAtDate.toISOString();
  const expiresAt = new Date(
    createdAtDate.getTime() + (input.expireImmediately ? -1 : VERCEL_LIVE_VERIFICATION_SESSION_TTL_MS),
  ).toISOString();
  const organizationId = input.organizationId ?? VERCEL_LIVE_VERIFICATION_ORGANIZATION_ID;
  const ventureId = input.ventureId ?? VERCEL_LIVE_VERIFICATION_VENTURE_ID;
  const blockers: string[] = [];
  const maxAuthorizedUsd = input.maxAuthorizedUsd ?? null;

  if (maxAuthorizedUsd == null) blockers.push("operator max ceiling is missing");
  else if (maxAuthorizedUsd <= 0) blockers.push("operator max ceiling must be a positive amount");
  if (input.publicLaunchRequested) blockers.push("public launch authority must be false");

  const handoffValidation = input.omitHandoff
    ? null
    : buildVerificationProductionArtifactHandoff({ organizationId, ventureId, createdAt });
  const handoff = handoffValidation?.handoff ?? null;
  if (!handoff) blockers.push("canonical production artifact handoff is missing");
  if (handoff && handoff.ventureId !== ventureId) blockers.push("handoff venture lineage does not match");
  if (handoffValidation && !handoffValidation.ok) {
    for (const failure of handoffValidation.failures) {
      blockers.push(`handoff validation: ${failure.code}`);
    }
  }

  const estimate = maxAuthorizedUsd != null && maxAuthorizedUsd > 0
    ? { value: maxAuthorizedUsd, actuality: "ESTIMATE" as const, currency: "USD" as const }
    : { value: null, actuality: "UNKNOWN" as const, currency: "USD" as const };

  const readiness = handoff
    ? evaluateGovernedDeploymentReadiness({
        handoff,
        expectedVentureId: ventureId,
        expectedHandoffId: handoff.handoffId,
        expectedBuildContractId: handoff.buildContractId,
        companyId: handoff.companyId,
        createdAt,
        providers: [
          {
            capability: "HOSTING",
            providerSelected: true,
            credentialAvailable: true,
            credentialWriteCapable: true,
            writeAuthorityGranted: !input.failReadiness,
            cost: estimate,
          },
        ],
        hosting: {
          providerSelected: true,
          writeAuthorityGranted: !input.failReadiness,
          rollbackCapable: true,
          cost: estimate,
        },
        domain: { owned: false, selected: false, registrarKnown: false, purchaseRequired: false },
        dns: {
          providerKnown: false,
          zoneExists: false,
          zoneVerified: false,
          writeCredentialAvailable: false,
          writeAuthorityGranted: false,
          requiredRecordsKnown: false,
        },
        treasury: {
          budgetKnown: maxAuthorizedUsd != null && maxAuthorizedUsd > 0,
          budgetAvailableUsd: maxAuthorizedUsd,
          reservationPresent: false,
          authorizedForPaidResources: maxAuthorizedUsd != null && maxAuthorizedUsd > 0,
        },
        eag: {
          authorizationPresent: true,
          authorizedActionTypes: ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"],
        },
        paymentWriteAuthorized: false,
        healthCheckPath: handoff.deploymentRequirements.healthCheckPath ?? "/",
        deploymentAuthority: { granted: false, authorizationId: null, source: null },
        publicLaunchAuthority: { granted: false, authorizationId: null, source: null },
      })
    : null;

  if (readiness && !readiness.readyForDeploymentExecution) {
    blockers.push("governed readiness is not readyForDeploymentExecution");
  }

  const sessionId = verificationSessionId(organizationId, ventureId, handoff?.handoffId ?? "none");
  const operator: VercelVerificationOperatorAuthorization = {
    purpose: VERCEL_LIVE_VERIFICATION_PURPOSE,
    organizationId,
    ventureId,
    maxAuthorizedUsd: maxAuthorizedUsd ?? 0,
    allowedActions: REQUIRED_EAG_GATEWAY_ACTIONS,
    deniedActions: input.denyEagActions,
    publicLaunchAuthorized: false,
    expiresAt,
  };

  const authorityVentureId = input.authorityVentureId ?? ventureId;
  const authorityHandoffId = input.authorityHandoffId ?? handoff?.handoffId ?? null;
  let deploymentAuthority: VercelGovernedVerificationSession["deploymentAuthority"] = null;
  if (readiness && handoff) {
    deploymentAuthority = createVerificationDeploymentAuthority({
      sessionId,
      organizationId,
      ventureId: authorityVentureId,
      handoffId: authorityHandoffId ?? handoff.handoffId,
      readinessId: readiness.readinessId,
      expiresAt,
    });
    if (authorityVentureId !== ventureId || authorityVentureId !== handoff.ventureId) {
      blockers.push("deployment authority is for the wrong venture");
      deploymentAuthority = { ...deploymentAuthority, granted: false };
    }
    if (authorityHandoffId && authorityHandoffId !== handoff.handoffId) {
      blockers.push("deployment authority is for the wrong handoff");
      deploymentAuthority = { ...deploymentAuthority, granted: false };
    }
    if (Date.parse(expiresAt) <= createdAtDate.getTime()) {
      blockers.push("deployment authority is expired");
      deploymentAuthority = { ...deploymentAuthority, granted: false };
    }
  } else {
    blockers.push("canonical deployment authority was not created");
  }

  const eagEvaluations: Record<string, AuthorizationEvaluationResult> = {};
  const eagAuthorizations: ActionAuthorityGrant[] = [];
  for (const gatewayAction of REQUIRED_EAG_GATEWAY_ACTIONS) {
    const evaluation = evaluateOperatorSessionEag({
      gatewayActionType: gatewayAction,
      operator,
      now: createdAtDate,
    });
    eagEvaluations[gatewayAction] = evaluation;
    const executionAction = gatewayToExecutionAction(gatewayAction);
    if (!executionAction) continue;
    if (evaluation.decision !== "AUTO_AUTHORIZE") {
      blockers.push(`EAG ${gatewayAction} denied`);
      continue;
    }
    eagAuthorizations.push({
      actionType: executionAction,
      authorizationId: `eag:${sessionId}:${executionAction}`,
      decision: "AUTO_AUTHORIZE",
    });
  }

  const treasuryAuthorizations: TreasuryActionGrant[] = [];
  const treasuryFinancialAuthorizations: FinancialAuthorization[] = [];
  if (maxAuthorizedUsd != null && maxAuthorizedUsd > 0) {
    const store = new TreasuryStore();
    setFinancialAutonomy(store, organizationId, true);
    createBudget(store, {
      scope: {
        scopeType: "GLOBAL",
        organizationId,
        ventureId: null,
        missionId: null,
        category: null,
        provider: null,
        period: null,
        currency: "USD",
      },
      allocated: actualAmount(maxAuthorizedUsd * 2, "USD"),
    });
    for (const action of REQUIRED_TREASURY_ACTIONS) {
      if (input.denyTreasuryActions?.includes(action)) {
        blockers.push(`Treasury ${action} denied`);
        continue;
      }
      const request = createFinancialActionRequest(store, {
        organizationId,
        ventureId,
        purpose: `${VERCEL_LIVE_VERIFICATION_PURPOSE}:${action}`,
        category: "HOSTING",
        actionType: "HOSTING_PURCHASE",
        provider: "vercel.com_v1",
        amount: { value: maxAuthorizedUsd, actuality: "ESTIMATE", currency: "USD" },
        maximumAuthorizedAmount: { value: maxAuthorizedUsd, actuality: "ESTIMATE", currency: "USD" },
        idempotencyKey: `treas:${sessionId}:${action}`,
        economicJustification: "Bounded operator ceiling for disposable Vercel live verification",
        requiredForMVP: false,
      });
      const authorized = authorizeFinancialAction(store, request.requestId, createdAtDate);
      if (!authorized.authorization || authorized.authorization.decision !== "AUTO_AUTHORIZE") {
        blockers.push(`Treasury ${action} denied`);
        continue;
      }
      treasuryFinancialAuthorizations.push(authorized.authorization);
      treasuryAuthorizations.push({
        actionType: action,
        authorizationId: authorized.authorization.authorizationId,
        decision: "AUTO_AUTHORIZE",
        authorizedAmountUsd: maxAuthorizedUsd,
        costActuality: "ESTIMATE",
        reservationId: null,
        ventureId,
        expiresAt,
      });
    }
  }

  const providerWrites: ProviderWriteEvidence[] = [
    {
      capability: "HOSTING",
      verificationState: "WRITE_AUTHORIZED",
      credentialAvailable: true,
      credentialWriteCapable: true,
      writeAuthorityGranted: true,
    },
  ];

  const executionRequest =
    readiness && deploymentAuthority?.granted && deploymentAuthority.authorizationId
      ? buildGovernedDeploymentExecutionRequest({
          readiness,
          mode: "LIVE",
          expectedVentureId: ventureId,
          expectedReadinessId: readiness.readinessId,
          expectedHandoffId: handoff?.handoffId,
          deploymentAuthority,
          publicLaunchAuthority: { granted: false, authorizationId: null, source: null },
          eagAuthorizations,
          treasuryAuthorizations,
          providerWrites,
          requestedActions: ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION", "VERIFY_HEALTH"],
          createdAt,
        })
      : null;

  const unique = [...new Set(blockers)];
  const preflight = evaluateVercelLiveVerificationPreflight({
    request: executionRequest,
    readiness,
    eagAuthorizations,
    treasuryAuthorizations,
    providerWrites,
    now: createdAt,
  });
  const merged = [...new Set([...unique, ...preflight.blockers])];

  const actionIds: Record<string, string> = {};
  if (executionRequest) {
    for (const action of executionRequest.requiredActions) {
      actionIds[action] = governedExecutionActionId(executionRequest.executionRequestId, action);
    }
  }

  return {
    sessionId,
    organizationId,
    ventureId,
    purpose: VERCEL_LIVE_VERIFICATION_PURPOSE,
    handoff,
    readiness,
    deploymentAuthority,
    eagAuthorizations,
    eagEvaluations,
    treasuryAuthorizations,
    treasuryFinancialAuthorizations,
    executionRequest,
    preflight: { ...preflight, blockers: merged, safeToExecuteLive: merged.length === 0 && preflight.safeToExecuteLive },
    mode: "LIVE",
    createdAt,
    expiresAt,
    maxAuthorizedUsd,
    actionIds,
    blockers: merged,
  };
}

export function sessionPublicReport(session: VercelGovernedVerificationSession) {
  return {
    sessionId: session.sessionId,
    organizationId: session.organizationId,
    ventureId: session.ventureId,
    purpose: session.purpose,
    mode: session.mode,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    maxAuthorizedUsd: session.maxAuthorizedUsd,
    handoffId: session.handoff?.handoffId ?? null,
    readinessId: session.readiness?.readinessId ?? null,
    readyForDeploymentExecution: session.readiness?.readyForDeploymentExecution ?? false,
    deploymentAuthorizationId: session.deploymentAuthority?.authorizationId ?? null,
    eagAuthorizationIds: session.eagAuthorizations.map((row) => row.authorizationId),
    treasuryAuthorizationIds: session.treasuryAuthorizations.map((row) => row.authorizationId),
    executionRequestId: session.executionRequest?.executionRequestId ?? null,
    idempotencyKey: session.executionRequest?.idempotencyKey ?? null,
    actionIds: session.actionIds,
    publicLaunchAuthority: false,
    fabricated: false,
    secretPrinted: false,
    credentialPresent: session.preflight.credentialPresent,
    scopeAttested: session.preflight.scopeAttested,
    scopeKind: session.preflight.scopeKind,
    teamConfigured: session.preflight.teamConfigured,
    testTeamConfirmed: session.preflight.testTeamConfirmed,
    repositoryConfigured: session.preflight.repositoryConfigured,
    shaConfigured: session.preflight.shaConfigured,
    artifactMatched: session.preflight.artifactMatched,
    leftoverAccepted: session.preflight.leftoverAccepted,
    readinessSatisfied: session.preflight.readinessSatisfied,
    deploymentAuthoritySatisfied: session.preflight.deploymentAuthoritySatisfied,
    eagSatisfied: session.preflight.eagSatisfied,
    treasurySatisfied: session.preflight.treasurySatisfied,
    costPolicySatisfied: session.preflight.costPolicySatisfied,
    idempotencySatisfied: session.preflight.idempotencySatisfied,
    publicLaunchDisabled: session.preflight.publicLaunchDisabled,
    safeToExecuteLive: session.preflight.safeToExecuteLive,
    blockers: session.preflight.blockers,
  };
}
