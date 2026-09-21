import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_URL,
} from "./constants";

export const HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_ATTEMPT_STATE_PATH =
  ".infinity/homepage-hero-link-contrast-deploy-attempts.json" as const;

export type HomepageHeroLinkContrastDeployAttemptState = {
  mission: "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1";
  authorization: "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED";
  artifactId: typeof CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID;
  digest: typeof CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST;
  deployments: number;
  activations: number;
  maximumDeployments: 1;
  maximumActivations: 1;
  deploymentId: string | null;
  publicUrl: string | null;
  providerState: string | null;
  authorizationConsumed: boolean;
  terminalState:
    | "CRE_HOMEPAGE_LINK_CONTRAST_ACTIVE"
    | "CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYED_NOT_ACTIVATED"
    | "CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_FAILED"
    | null;
};

const EMPTY: HomepageHeroLinkContrastDeployAttemptState = {
  mission: "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1",
  authorization: "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED",
  artifactId: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  digest: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
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

export function readHomepageHeroLinkContrastDeployAttemptState(): HomepageHeroLinkContrastDeployAttemptState {
  if (!existsSync(HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_ATTEMPT_STATE_PATH)) {
    return { ...EMPTY };
  }
  const raw = JSON.parse(
    readFileSync(HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_ATTEMPT_STATE_PATH, "utf8"),
  ) as Partial<HomepageHeroLinkContrastDeployAttemptState>;
  const deployments = Number(raw.deployments ?? 0);
  const activations = Number(raw.activations ?? 0);
  return {
    ...EMPTY,
    ...raw,
    deployments: Number.isFinite(deployments) ? deployments : 0,
    activations: Number.isFinite(activations) ? activations : 0,
    maximumDeployments: 1,
    maximumActivations: 1,
    artifactId: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
    digest: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
    authorizationConsumed: Boolean(raw.authorizationConsumed) || deployments >= 1,
  };
}

export function persistHomepageHeroLinkContrastDeployAttemptState(
  patch: Partial<HomepageHeroLinkContrastDeployAttemptState>,
): HomepageHeroLinkContrastDeployAttemptState {
  const next: HomepageHeroLinkContrastDeployAttemptState = {
    ...readHomepageHeroLinkContrastDeployAttemptState(),
    ...patch,
    maximumDeployments: 1,
    maximumActivations: 1,
    artifactId: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
    digest: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
    mission: "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1",
    authorization: "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED",
  };
  next.authorizationConsumed = next.deployments >= 1 || next.authorizationConsumed;
  mkdirSync(dirname(HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_ATTEMPT_STATE_PATH), { recursive: true });
  writeFileSync(HOMEPAGE_HERO_LINK_CONTRAST_DEPLOY_ATTEMPT_STATE_PATH, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

export function homepageHeroLinkContrastProviderWriteAlreadyConsumed(): boolean {
  const state = readHomepageHeroLinkContrastDeployAttemptState();
  return state.deployments >= state.maximumDeployments;
}

export function seedCompletedHomepageHeroLinkContrastDeployAttemptState(): HomepageHeroLinkContrastDeployAttemptState {
  return persistHomepageHeroLinkContrastDeployAttemptState({
    deployments: 1,
    activations: 1,
    deploymentId: DEPLOYED_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_DEPLOYMENT_ID,
    publicUrl: DEPLOYED_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_URL,
    providerState: "READY",
    authorizationConsumed: true,
    terminalState: "CRE_HOMEPAGE_LINK_CONTRAST_ACTIVE",
  });
}
