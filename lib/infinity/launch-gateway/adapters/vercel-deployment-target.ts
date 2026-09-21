export const VERCEL_V13_NAMED_TARGETS = ["production", "staging"] as const;
export const VERCEL_V13_FORBIDDEN_TARGETS = ["preview"] as const;

export type VercelNamedDeploymentTarget = (typeof VERCEL_V13_NAMED_TARGETS)[number];

export type VercelDeploymentTargetEvaluation = {
  target: string;
  valid: boolean;
  named: boolean;
  customEnvironmentIdentifier: boolean;
  forbiddenPreview: boolean;
  reason: string;
};

const CUSTOM_ENVIRONMENT = /^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/;

export function evaluateVercelDeploymentTarget(target: unknown): VercelDeploymentTargetEvaluation {
  const value = typeof target === "string" ? target.trim() : "";
  if (!value) {
    return {
      target: value,
      valid: false,
      named: false,
      customEnvironmentIdentifier: false,
      forbiddenPreview: false,
      reason: "VERCEL_TARGET_MISSING",
    };
  }
  if (value === "preview") {
    return {
      target: value,
      valid: false,
      named: false,
      customEnvironmentIdentifier: false,
      forbiddenPreview: true,
      reason: "VERCEL_TARGET_PREVIEW_FORBIDDEN",
    };
  }
  if (value === "production" || value === "staging") {
    return {
      target: value,
      valid: true,
      named: true,
      customEnvironmentIdentifier: false,
      forbiddenPreview: false,
      reason: `VERCEL_TARGET_${value.toUpperCase()}_ACCEPTED`,
    };
  }
  if (CUSTOM_ENVIRONMENT.test(value)) {
    return {
      target: value,
      valid: true,
      named: false,
      customEnvironmentIdentifier: true,
      forbiddenPreview: false,
      reason: "VERCEL_TARGET_CUSTOM_ENVIRONMENT_ACCEPTED",
    };
  }
  return {
    target: value,
    valid: false,
    named: false,
    customEnvironmentIdentifier: false,
    forbiddenPreview: false,
    reason: "VERCEL_TARGET_INVALID",
  };
}

export function assertVercelDeploymentTargetWriteSafe(target: unknown): string[] {
  const evaluation = evaluateVercelDeploymentTarget(target);
  return evaluation.valid ? [] : [evaluation.reason];
}
