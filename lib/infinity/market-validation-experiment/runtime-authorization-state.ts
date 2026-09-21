import { LOCKED_CRE_ARTIFACT_ID } from "./constants";
import { LOCKED_CRE_SOURCE_DIGEST } from "./source-bundle-request";
import { getFounderAuthorization } from "./founder-authorization";

export const RUNTIME_AUTHORIZATION_NEVER_ACTIVATED =
  "NEVER_ACTIVATED_BOUND_TO_PREVIOUS_ARTIFACT" as const;

export type RuntimeAuthorizationState = {
  state: typeof RUNTIME_AUTHORIZATION_NEVER_ACTIVATED;
  activated: false;
  transferredToNewArtifact: false;
  boundArtifactId: string;
  boundArtifactDigest: string;
  reason: string;
};

export function evaluateRuntimeAuthorizationState(): RuntimeAuthorizationState {
  void getFounderAuthorization();
  return {
    state: RUNTIME_AUTHORIZATION_NEVER_ACTIVATED,
    activated: false,
    transferredToNewArtifact: false,
    boundArtifactId: LOCKED_CRE_ARTIFACT_ID,
    boundArtifactDigest: LOCKED_CRE_SOURCE_DIGEST,
    reason:
      "The $10 runtime ceiling never activated because the experiment never reached a READY evidence-collection state. It remains bound to the failed predecessor artifact digest and is not transferred to a repaired successor.",
  };
}
