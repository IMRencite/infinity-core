import type { GovernedDeploymentReadiness } from "@/lib/infinity/governed-deployment-readiness";
import type { AuthorityGrant } from "@/lib/infinity/governed-deployment-readiness/types";
import type { ProductionArtifactHandoff } from "@/lib/infinity/production-artifact/handoff";
import { evaluateGovernedDeploymentReadiness } from "@/lib/infinity/governed-deployment-readiness";
import { buildGovernedDeploymentExecutionRequest } from "./build-request";
import type {
  ActionAuthorityGrant,
  GovernedDeploymentExecutionRequest,
  ProviderWriteEvidence,
  TreasuryActionGrant,
} from "./types";
import type { GovernedExecutionActionType } from "./constants";

export const VERCEL_LIVE_GOVERNANCE_REF_ENV = {
  organizationId: "INFINITY_VERCEL_ORGANIZATION_ID",
  ventureId: "INFINITY_VERCEL_VENTURE_ID",
  handoffId: "INFINITY_VERCEL_HANDOFF_ID",
  readinessId: "INFINITY_VERCEL_READINESS_ID",
  executionRequestId: "INFINITY_VERCEL_EXECUTION_REQUEST_ID",
  deploymentAuthorizationId: "INFINITY_VERCEL_DEPLOYMENT_AUTHORIZATION_ID",
  eagAuthorizationIds: "INFINITY_VERCEL_EAG_AUTHORIZATION_IDS",
  treasuryAuthorizationIds: "INFINITY_VERCEL_TREASURY_AUTHORIZATION_IDS",
} as const;

const REQUIRED_EAG_ACTIONS = ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION", "VERIFY_HEALTH"] as const;
const REQUIRED_TREASURY_ACTIONS = ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"] as const;
const FORBIDDEN_EAG_ACTIONS = new Set<GovernedExecutionActionType>([
  "UPSERT_DNS_RECORD",
  "BIND_DOMAIN",
  "PURCHASE_DOMAIN",
  "CONFIGURE_PAYMENT_RESOURCE",
  "CREATE_WEBHOOK",
  "RUN_PRODUCTION_MIGRATION",
]);

export type VercelLiveVerificationGovernanceRefs = {
  organizationId: string | null;
  ventureId: string | null;
  handoffId: string | null;
  readinessId: string | null;
  executionRequestId: string | null;
  deploymentAuthorizationId: string | null;
  eagAuthorizationIds: string[];
  treasuryAuthorizationIds: string[];
};

export type CanonicalGovernanceGrantMeta = {
  organizationId?: string | null;
  ventureId?: string | null;
  handoffId?: string | null;
  readinessId?: string | null;
};

export type CanonicalDeploymentAuthorityRecord = AuthorityGrant & CanonicalGovernanceGrantMeta;

export type CanonicalEagRecord = ActionAuthorityGrant & CanonicalGovernanceGrantMeta;

export type CanonicalTreasuryRecord = TreasuryActionGrant & CanonicalGovernanceGrantMeta;

export type VercelLiveGovernanceRecordCatalog = {
  organizationId?: string | null;
  readinessById?: Record<string, GovernedDeploymentReadiness>;
  handoffById?: Record<string, ProductionArtifactHandoff>;
  deploymentAuthorityById?: Record<string, CanonicalDeploymentAuthorityRecord>;
  eagById?: Record<string, CanonicalEagRecord>;
  treasuryById?: Record<string, CanonicalTreasuryRecord>;
  providerWrites?: ProviderWriteEvidence[];
  readinessEvaluationInput?: Parameters<typeof evaluateGovernedDeploymentReadiness>[0];
};

export type VercelLiveVerificationGovernanceInput = {
  refs: VercelLiveVerificationGovernanceRefs;
  readiness: GovernedDeploymentReadiness | null;
  request: GovernedDeploymentExecutionRequest | null;
  deploymentAuthority: CanonicalDeploymentAuthorityRecord | null;
  eagAuthorizations: CanonicalEagRecord[];
  treasuryAuthorizations: CanonicalTreasuryRecord[];
  providerWrites: ProviderWriteEvidence[];
  lineage: {
    organizationId: string | null;
    ventureId: string | null;
    handoffId: string | null;
    readinessId: string | null;
    executionRequestId: string | null;
    buildContractId: string | null;
    ventureSystemsBuildContractId: string | null;
  };
  recordsResolved: boolean;
  fabricated: false;
  envBooleansUsedAsAuthority: false;
  blockers: string[];
};

function envText(name: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const value = env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function splitIds(raw: string | null): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((item) => item.trim()).filter(Boolean))];
}

export function emptyVercelLiveVerificationGovernanceRefs(): VercelLiveVerificationGovernanceRefs {
  return {
    organizationId: null,
    ventureId: null,
    handoffId: null,
    readinessId: null,
    executionRequestId: null,
    deploymentAuthorizationId: null,
    eagAuthorizationIds: [],
    treasuryAuthorizationIds: [],
  };
}

export function loadVercelLiveVerificationGovernanceRefs(
  env: NodeJS.ProcessEnv = process.env,
): VercelLiveVerificationGovernanceRefs {
  return {
    organizationId: envText(VERCEL_LIVE_GOVERNANCE_REF_ENV.organizationId, env),
    ventureId: envText(VERCEL_LIVE_GOVERNANCE_REF_ENV.ventureId, env),
    handoffId: envText(VERCEL_LIVE_GOVERNANCE_REF_ENV.handoffId, env),
    readinessId: envText(VERCEL_LIVE_GOVERNANCE_REF_ENV.readinessId, env),
    executionRequestId: envText(VERCEL_LIVE_GOVERNANCE_REF_ENV.executionRequestId, env),
    deploymentAuthorizationId: envText(VERCEL_LIVE_GOVERNANCE_REF_ENV.deploymentAuthorizationId, env),
    eagAuthorizationIds: splitIds(envText(VERCEL_LIVE_GOVERNANCE_REF_ENV.eagAuthorizationIds, env)),
    treasuryAuthorizationIds: splitIds(envText(VERCEL_LIVE_GOVERNANCE_REF_ENV.treasuryAuthorizationIds, env)),
  };
}

export function derivedGovernedReadinessId(ventureId: string, handoffId: string | null | undefined): string {
  return `gdr:${ventureId}:${handoffId ?? "none"}`;
}

export function governedExecutionActionId(
  executionRequestId: string,
  actionType: GovernedExecutionActionType,
): string {
  return `gde-action:${executionRequestId}:${actionType}`;
}

export function governedExecutionActionIdempotencyKey(
  executionRequestId: string,
  actionType: GovernedExecutionActionType,
  target: string,
): string {
  return `${executionRequestId}:${actionType}:${target}`;
}

function lookup<T>(table: Record<string, T> | undefined, id: string | null): T | null {
  if (!id || !table) return null;
  return table[id] ?? null;
}

function lineageConflict(
  expected: string | null | undefined,
  actual: string | null | undefined,
  label: string,
): string | null {
  if (!expected || !actual) return null;
  if (expected === actual) return null;
  return `${label} lineage does not match`;
}

export function loadVercelLiveVerificationGovernance(input?: {
  refs?: VercelLiveVerificationGovernanceRefs;
  catalog?: VercelLiveGovernanceRecordCatalog | null;
}): VercelLiveVerificationGovernanceInput {
  const refs = input?.refs ?? loadVercelLiveVerificationGovernanceRefs();
  const catalog = input?.catalog ?? null;
  const blockers: string[] = [];

  let readiness: GovernedDeploymentReadiness | null = lookup(catalog?.readinessById, refs.readinessId);
  const handoff = lookup(catalog?.handoffById, refs.handoffId);
  if (!readiness && refs.readinessId) {
    blockers.push("canonical readiness record ID was supplied but no matching GovernedDeploymentReadiness was resolved");
  } else if (!readiness) {
    blockers.push("canonical GovernedDeploymentReadiness is not supplied");
  }
  if (!handoff && refs.handoffId) {
    blockers.push("canonical handoff record ID was supplied but no matching ProductionArtifactHandoff was resolved");
  } else if (!handoff) {
    blockers.push("canonical production artifact handoff is not supplied");
  }

  if (!readiness && handoff && catalog?.readinessEvaluationInput) {
    const evaluated = evaluateGovernedDeploymentReadiness({
      ...catalog.readinessEvaluationInput,
      handoff,
      expectedVentureId: refs.ventureId ?? catalog.readinessEvaluationInput.expectedVentureId ?? handoff.ventureId,
      expectedHandoffId: refs.handoffId ?? catalog.readinessEvaluationInput.expectedHandoffId ?? handoff.handoffId,
      companyId: catalog.readinessEvaluationInput.companyId ?? handoff.companyId,
    });
    if (refs.readinessId && evaluated.readinessId !== refs.readinessId) {
      blockers.push("evaluated readinessId does not match the supplied canonical readiness ID");
    } else {
      readiness = evaluated;
    }
  }

  if (readiness && readiness.schemaVersion !== "governed_deployment_readiness_v1") {
    blockers.push("readiness is not a governed_deployment_readiness_v1 record");
    readiness = null;
  }

  const expectedReadinessId =
    readiness && readiness.ventureId
      ? derivedGovernedReadinessId(readiness.ventureId, readiness.productionArtifactHandoffId)
      : handoff
        ? derivedGovernedReadinessId(handoff.ventureId, handoff.handoffId)
        : null;
  if (readiness && expectedReadinessId && readiness.readinessId !== expectedReadinessId) {
    blockers.push("readinessId does not match venture/handoff lineage");
  }
  if (refs.readinessId && readiness && refs.readinessId !== readiness.readinessId) {
    blockers.push("wrong readiness lineage");
  }
  if (refs.ventureId && readiness && refs.ventureId !== readiness.ventureId) {
    blockers.push("wrong venture lineage");
  }
  if (refs.handoffId && readiness?.productionArtifactHandoffId && refs.handoffId !== readiness.productionArtifactHandoffId) {
    blockers.push("wrong handoff lineage");
  }
  if (handoff && readiness) {
    const handoffMismatch = lineageConflict(handoff.handoffId, readiness.productionArtifactHandoffId, "handoff");
    const ventureMismatch = lineageConflict(handoff.ventureId, readiness.ventureId, "venture");
    if (handoffMismatch) blockers.push("wrong handoff lineage");
    if (ventureMismatch) blockers.push("wrong venture lineage");
  }

  const catalogOrg = catalog?.organizationId ?? refs.organizationId;
  const deploymentAuthority = lookup(catalog?.deploymentAuthorityById, refs.deploymentAuthorizationId);
  if (refs.deploymentAuthorizationId && !deploymentAuthority) {
    blockers.push("canonical deployment authority ID was supplied but no matching grant was resolved");
  }
  if (!refs.deploymentAuthorizationId) {
    blockers.push("canonical deployment authority is not supplied");
  }
  if (deploymentAuthority && (!deploymentAuthority.granted || deploymentAuthority.authorizationId !== refs.deploymentAuthorizationId)) {
    blockers.push("canonical deployment authority grant is not valid for the supplied ID");
  }
  if (deploymentAuthority) {
    const orgMismatch = lineageConflict(catalogOrg, deploymentAuthority.organizationId, "organization");
    const ventureMismatch = lineageConflict(refs.ventureId ?? readiness?.ventureId, deploymentAuthority.ventureId, "venture");
    const readinessMismatch = lineageConflict(refs.readinessId ?? readiness?.readinessId, deploymentAuthority.readinessId, "readiness");
    if (orgMismatch) blockers.push("cross-org record");
    if (ventureMismatch) blockers.push("wrong venture lineage");
    if (readinessMismatch) blockers.push("wrong readiness lineage");
  }

  const eagAuthorizations: CanonicalEagRecord[] = [];
  if (refs.eagAuthorizationIds.length === 0) {
    blockers.push("canonical EAG authorization IDs are not supplied");
  }
  for (const id of refs.eagAuthorizationIds) {
    const grant = lookup(catalog?.eagById, id);
    if (!grant) {
      blockers.push(`orphan EAG authorization: ${id}`);
      continue;
    }
    if (grant.authorizationId !== id) {
      blockers.push(`orphan EAG authorization: ${id}`);
      continue;
    }
    if (FORBIDDEN_EAG_ACTIONS.has(grant.actionType)) {
      blockers.push(`EAG grant ${id} authorizes a forbidden action`);
      continue;
    }
    const orgMismatch = lineageConflict(catalogOrg, grant.organizationId, "organization");
    const ventureMismatch = lineageConflict(refs.ventureId ?? readiness?.ventureId, grant.ventureId, "venture");
    if (orgMismatch) blockers.push("cross-org record");
    if (ventureMismatch) blockers.push("wrong venture lineage");
    eagAuthorizations.push(grant);
  }
  const authorizedEagActions = new Set(
    eagAuthorizations.filter((row) => row.decision === "AUTO_AUTHORIZE").map((row) => row.actionType),
  );
  for (const action of REQUIRED_EAG_ACTIONS) {
    if (!authorizedEagActions.has(action)) blockers.push(`EAG AUTO_AUTHORIZE missing for ${action}`);
  }
  const reused = REQUIRED_EAG_ACTIONS.some((action) => {
    const matches = eagAuthorizations.filter((row) => row.decision === "AUTO_AUTHORIZE" && row.actionType === action);
    return matches.length === 0 && eagAuthorizations.some((row) => row.decision === "AUTO_AUTHORIZE" && row.actionType !== action);
  });
  if (reused && REQUIRED_EAG_ACTIONS.some((action) => !authorizedEagActions.has(action))) {
    blockers.push("EAG grant cannot authorize a different action");
  }

  const treasuryAuthorizations: CanonicalTreasuryRecord[] = [];
  if (refs.treasuryAuthorizationIds.length === 0) {
    blockers.push("canonical Treasury authorization IDs are not supplied");
  }
  for (const id of refs.treasuryAuthorizationIds) {
    const grant = lookup(catalog?.treasuryById, id);
    if (!grant) {
      blockers.push(`orphan Treasury authorization: ${id}`);
      continue;
    }
    if (grant.authorizationId !== id) {
      blockers.push(`orphan Treasury authorization: ${id}`);
      continue;
    }
    const orgMismatch = lineageConflict(catalogOrg, grant.organizationId, "organization");
    const ventureMismatch = lineageConflict(refs.ventureId ?? readiness?.ventureId, grant.ventureId, "venture");
    if (orgMismatch) blockers.push("cross-org record");
    if (ventureMismatch) blockers.push("Treasury authorization is for the wrong venture");
    treasuryAuthorizations.push(grant);
  }
  for (const action of REQUIRED_TREASURY_ACTIONS) {
    const grant = treasuryAuthorizations.find((row) => row.actionType === action);
    if (!grant) blockers.push(`treasury authorization missing for ${action}`);
  }

  const providerWrites = catalog?.providerWrites ?? [];

  let request: GovernedDeploymentExecutionRequest | null = null;
  if (readiness && deploymentAuthority?.granted && deploymentAuthority.authorizationId) {
    request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      expectedVentureId: refs.ventureId,
      expectedReadinessId: refs.readinessId ?? readiness.readinessId,
      expectedHandoffId: refs.handoffId ?? readiness.productionArtifactHandoffId,
      deploymentAuthority: {
        granted: deploymentAuthority.granted,
        authorizationId: deploymentAuthority.authorizationId,
        source: deploymentAuthority.source,
      },
      publicLaunchAuthority: { granted: false, authorizationId: null, source: null },
      eagAuthorizations,
      treasuryAuthorizations,
      providerWrites,
      requestedActions: [...REQUIRED_EAG_ACTIONS],
    });
    if (refs.executionRequestId && request.executionRequestId !== refs.executionRequestId) {
      blockers.push("supplied executionRequestId does not match the stable governed execution identity");
    }
    if (request.idempotencyKey !== request.executionRequestId) {
      blockers.push("idempotency key is missing or unstable");
    }
  } else if (refs.executionRequestId && !readiness) {
    blockers.push("idempotency context is missing because canonical readiness was not resolved");
  } else if (!refs.executionRequestId && !readiness) {
    blockers.push("idempotency context is missing");
  }

  const unique = [...new Set(blockers)];
  const recordsResolved = Boolean(
    readiness &&
      deploymentAuthority?.granted &&
      eagAuthorizations.length > 0 &&
      treasuryAuthorizations.length > 0 &&
      unique.length === 0,
  );

  return {
    refs,
    readiness,
    request,
    deploymentAuthority,
    eagAuthorizations,
    treasuryAuthorizations,
    providerWrites,
    lineage: {
      organizationId: catalogOrg ?? null,
      ventureId: readiness?.ventureId ?? refs.ventureId,
      handoffId: readiness?.productionArtifactHandoffId ?? refs.handoffId,
      readinessId: readiness?.readinessId ?? refs.readinessId,
      executionRequestId: request?.executionRequestId ?? refs.executionRequestId,
      buildContractId: readiness?.buildContractId ?? null,
      ventureSystemsBuildContractId: readiness?.ventureSystemsBuildContractId ?? null,
    },
    recordsResolved,
    fabricated: false,
    envBooleansUsedAsAuthority: false,
    blockers: unique,
  };
}

export function governanceInputToPreflightArgs(governance: VercelLiveVerificationGovernanceInput): {
  request: GovernedDeploymentExecutionRequest | null;
  readiness: GovernedDeploymentReadiness | null;
  eagAuthorizations: ActionAuthorityGrant[];
  treasuryAuthorizations: TreasuryActionGrant[];
  providerWrites: ProviderWriteEvidence[];
} {
  return {
    request: governance.request,
    readiness: governance.readiness,
    eagAuthorizations: governance.eagAuthorizations,
    treasuryAuthorizations: governance.treasuryAuthorizations,
    providerWrites: governance.providerWrites,
  };
}
