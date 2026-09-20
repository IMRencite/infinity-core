export const GROWTH_DEPLOYMENT_SOURCE_INTEGRITY_GATE = "GrowthDeploymentSourceIntegrityGate" as const;
export const GROWTH_RUNTIME_DEPLOYMENT_TARGET_GATE = "GrowthRuntimeDeploymentTargetGate" as const;
export const PRODUCTION_GROWTH_CRON_AUTHENTICATION_GATE = "ProductionGrowthCronAuthenticationGate" as const;
export const PRODUCTION_ARTIFACT_IDENTITY_GATE = "ProductionArtifactIdentityGate" as const;

export const VERIFIED_ISOLATED_GROWTH_ARTIFACT_WORKSPACE =
  "C:\\Users\\Antivist\\AppData\\Local\\Temp\\infinity-occupancynpv-growth-artifact-v1" as const;
export const FOUNDER_DIRTY_WORKSPACE = "C:\\Users\\Antivist\\Desktop\\Infinity\\infinity-core" as const;
export const OFFICIAL_GROWTH_ARTIFACT_DIGEST =
  "bc4df75949dc80859df92ecec583d258da016d895f7c4d08cec50101e0d2f433" as const;
export const OCCUPANCYNPV_CUSTOMER_VERCEL_PROJECT_ID = "prj_vSCXLOYDoExYUAR8ypnYz2W1Lu7d" as const;
export const HISTORICAL_VERCEL_TEST_PROJECT_ID = "prj_188YspuXKKVurXCf2lxnP4ywyggg" as const;
export const ASKREVIEW_PREVIEW_VERCEL_PROJECT_ID = "prj_O2rAkJ7F0DENcm2sFyhAluK7PiXg" as const;

function normalizePath(value: string): string {
  return value.replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
}

export function evaluateGrowthDeploymentSourceIntegrityGate(input: {
  sourcePath: string;
  founderPath?: string;
}): {
  gate: typeof GROWTH_DEPLOYMENT_SOURCE_INTEGRITY_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const source = normalizePath(input.sourcePath);
  const founder = normalizePath(input.founderPath ?? FOUNDER_DIRTY_WORKSPACE);
  const isolated = normalizePath(VERIFIED_ISOLATED_GROWTH_ARTIFACT_WORKSPACE);
  const reasons: string[] = [];
  if (source === founder) reasons.push("FOUNDER_DIRTY_TREE_USED_AS_DEPLOY_SOURCE");
  if (source !== isolated) reasons.push("SOURCE_NOT_VERIFIED_ISOLATED_ARTIFACT");
  return {
    gate: GROWTH_DEPLOYMENT_SOURCE_INTEGRITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateGrowthRuntimeDeploymentTargetGate(input: {
  projectId?: string | null;
  projectName?: string | null;
  ownsRuntimeTick?: boolean;
  isOccupancyNpvCustomer?: boolean;
  isAskReview?: boolean;
  isDisposableTest?: boolean;
}): {
  gate: typeof GROWTH_RUNTIME_DEPLOYMENT_TARGET_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!input.projectId) reasons.push("NO_VERIFIED_INFINITY_RUNTIME_PROJECT");
  if (input.projectId === OCCUPANCYNPV_CUSTOMER_VERCEL_PROJECT_ID || input.isOccupancyNpvCustomer) {
    reasons.push("CUSTOMER_PRODUCT_MUST_NOT_BE_TARGET");
  }
  if (input.projectId === ASKREVIEW_PREVIEW_VERCEL_PROJECT_ID || input.isAskReview) {
    reasons.push("ASKREVIEW_PROJECT_EXCLUDED");
  }
  if (input.projectId === HISTORICAL_VERCEL_TEST_PROJECT_ID || input.isDisposableTest || /^infinity-test-/i.test(input.projectName ?? "")) {
    reasons.push("DISPOSABLE_TEST_PROJECT_IS_NOT_PRODUCTION_RUNTIME");
  }
  if (input.ownsRuntimeTick === false) reasons.push("PROJECT_DOES_NOT_OWN_RUNTIME_TICK");
  return {
    gate: GROWTH_RUNTIME_DEPLOYMENT_TARGET_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateProductionGrowthCronAuthenticationGate(input: {
  cronSecretPresent?: boolean;
  runtimeTickSecretPresent?: boolean;
}): {
  gate: typeof PRODUCTION_GROWTH_CRON_AUTHENTICATION_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const ok = Boolean(input.cronSecretPresent || input.runtimeTickSecretPresent);
  return {
    gate: PRODUCTION_GROWTH_CRON_AUTHENTICATION_GATE,
    result: ok ? "PASS" : "FAIL",
    reasons: ok ? [] : ["RUNTIME_TICK_SECRET_REQUIRED"],
  };
}

export function evaluateProductionArtifactIdentityGate(input: {
  deployedDigest?: string | null;
  expectedDigest?: string;
}): {
  gate: typeof PRODUCTION_ARTIFACT_IDENTITY_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  if (!input.deployedDigest) {
    return { gate: PRODUCTION_ARTIFACT_IDENTITY_GATE, result: "FAIL", reasons: ["DEPLOYMENT_NOT_PERFORMED"] };
  }
  const expected = input.expectedDigest ?? OFFICIAL_GROWTH_ARTIFACT_DIGEST;
  return {
    gate: PRODUCTION_ARTIFACT_IDENTITY_GATE,
    result: input.deployedDigest === expected ? "PASS" : "FAIL",
    reasons: input.deployedDigest === expected ? [] : ["DIGEST_MISMATCH"],
  };
}
