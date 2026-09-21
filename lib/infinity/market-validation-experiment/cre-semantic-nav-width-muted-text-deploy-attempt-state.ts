import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
} from "./constants";

export const SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_ATTEMPT_STATE_PATH =
  ".infinity/semantic-nav-width-muted-text-deploy-attempts.json" as const;

export type SemanticNavWidthMutedTextDeployAttemptState = {
  mission: "GOVERNED_CRE_SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOYMENT_V1";
  authorization: "GOVERNED_CRE_SEMANTIC_NAV_WIDTH_REPAIR_DEPLOYMENT_REQUIRED";
  artifactId: typeof CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID;
  digest: typeof CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST;
  deployments: number;
  activations: number;
  maximumDeployments: 1;
  maximumActivations: 1;
  deploymentId: string | null;
  publicUrl: string | null;
  providerState: string | null;
  authorizationConsumed: boolean;
  terminalState:
    | "CRE_SEMANTIC_NAV_WIDTH_MUTED_TEXT_ACTIVE"
    | "CRE_SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOYED_NOT_ACTIVATED"
    | "CRE_SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOYMENT_FAILED"
    | null;
};

const EMPTY: SemanticNavWidthMutedTextDeployAttemptState = {
  mission: "GOVERNED_CRE_SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOYMENT_V1",
  authorization: "GOVERNED_CRE_SEMANTIC_NAV_WIDTH_REPAIR_DEPLOYMENT_REQUIRED",
  artifactId: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  deployments: 0,
  activations: 0,
  maximumDeployments: 1,
  maximumActivations: 1,
  deploymentId: null,
  publicUrl: null,
  providerState: null,
  authorizationConsumed: false,
  terminalState: null,
};

export function readSemanticNavWidthMutedTextDeployAttemptState(): SemanticNavWidthMutedTextDeployAttemptState {
  if (!existsSync(SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_ATTEMPT_STATE_PATH)) {
    return { ...EMPTY };
  }
  const raw = JSON.parse(
    readFileSync(SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_ATTEMPT_STATE_PATH, "utf8"),
  ) as Partial<SemanticNavWidthMutedTextDeployAttemptState>;
  const deployments = Number(raw.deployments ?? 0);
  const activations = Number(raw.activations ?? 0);
  return {
    ...EMPTY,
    ...raw,
    deployments: Number.isFinite(deployments) ? deployments : 0,
    activations: Number.isFinite(activations) ? activations : 0,
    maximumDeployments: 1,
    maximumActivations: 1,
    artifactId: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
    authorizationConsumed: Boolean(raw.authorizationConsumed) || deployments >= 1,
  };
}

export function persistSemanticNavWidthMutedTextDeployAttemptState(
  patch: Partial<SemanticNavWidthMutedTextDeployAttemptState>,
): SemanticNavWidthMutedTextDeployAttemptState {
  const next: SemanticNavWidthMutedTextDeployAttemptState = {
    ...readSemanticNavWidthMutedTextDeployAttemptState(),
    ...patch,
    maximumDeployments: 1,
    maximumActivations: 1,
    artifactId: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
    mission: "GOVERNED_CRE_SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOYMENT_V1",
    authorization: "GOVERNED_CRE_SEMANTIC_NAV_WIDTH_REPAIR_DEPLOYMENT_REQUIRED",
  };
  next.authorizationConsumed = next.deployments >= 1 || next.authorizationConsumed;
  mkdirSync(dirname(SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_ATTEMPT_STATE_PATH), { recursive: true });
  writeFileSync(SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_ATTEMPT_STATE_PATH, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

export function semanticNavWidthMutedTextProviderWriteAlreadyConsumed(): boolean {
  const state = readSemanticNavWidthMutedTextDeployAttemptState();
  return state.deployments >= state.maximumDeployments;
}
