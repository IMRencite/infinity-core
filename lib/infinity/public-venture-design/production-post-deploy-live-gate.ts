import { PUBLIC_IMROS_ORIGIN, PUBLIC_IMROS_PROJECT } from "@/lib/infinity/hq-production-deployment/contract";

export const LIVE_DEPLOYMENT_PARITY_GATE = "LiveDeploymentParityGate" as const;
export const IMROS_PUBLIC_OPERATIONS_LIVE_GATE = "ImrosPublicOperationsLiveGate" as const;

export type LiveImrProbe = {
  position: string;
  widthPx: number;
  heightPx: number;
  fixedOrSticky: boolean;
  visibleAfterHeroScroll: boolean;
  overlapWithProtectedPx: number;
};

export type LiveHeroProbe = {
  src: string;
  liveAssetHashPrefix: string | null;
  sourceAssetHashPrefix: string | null;
  assetParity: "PASS" | "FAIL";
  mixBlendMode: string;
};

export function evaluateLiveDeploymentParityGate(input: {
  expectedGitSha: string;
  observedGitSha: string | null;
  expectedProject: string;
  observedProject: string | null;
  domain: string;
}): {
  gate: typeof LIVE_DEPLOYMENT_PARITY_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!input.observedGitSha) reasons.push("PRODUCTION_GIT_SHA_UNKNOWN");
  else if (!input.expectedGitSha.startsWith(input.observedGitSha.slice(0, 7)) && input.expectedGitSha !== input.observedGitSha) {
    reasons.push(`SHA_MISMATCH:${input.observedGitSha}`);
  }
  if (input.observedProject && input.observedProject !== input.expectedProject) {
    reasons.push(`PROJECT_MISMATCH:${input.observedProject}`);
  }
  if (!input.domain.includes("imros.io")) reasons.push("DOMAIN_NOT_IMROS");
  return {
    gate: LIVE_DEPLOYMENT_PARITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateImrosPublicOperationsLiveGate(input: {
  imr: LiveImrProbe;
  hero: LiveHeroProbe;
  origin?: string;
}): {
  gate: typeof IMROS_PUBLIC_OPERATIONS_LIVE_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  const origin = input.origin ?? PUBLIC_IMROS_ORIGIN;
  if (!input.hero.src.startsWith(origin)) reasons.push("HERO_ASSET_NOT_ON_IMROS_ORIGIN");
  if (input.hero.mixBlendMode !== "normal") reasons.push("HERO_BLEND_MODE_WORKAROUND");
  if (input.hero.assetParity === "FAIL") reasons.push("HERO_ASSET_NOT_CANONICAL_SOURCE");
  if (input.imr.fixedOrSticky) reasons.push("IMR_FIXED_OR_STICKY");
  if (input.imr.widthPx > 32 || input.imr.heightPx > 32) reasons.push(`IMR_TOO_LARGE:${input.imr.widthPx}x${input.imr.heightPx}`);
  if (input.imr.visibleAfterHeroScroll) reasons.push("IMR_VISIBLE_AFTER_HERO_EXIT");
  if (input.imr.overlapWithProtectedPx > 0) reasons.push(`IMR_OVERLAP:${input.imr.overlapWithProtectedPx}px`);
  return {
    gate: IMROS_PUBLIC_OPERATIONS_LIVE_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export const IMROS_LIVE_OPERATIONS_URL = `${PUBLIC_IMROS_ORIGIN}/public/operations-room` as const;
export const IMROS_LIVE_EXPECTED_VERCEL_PROJECT = PUBLIC_IMROS_PROJECT;
