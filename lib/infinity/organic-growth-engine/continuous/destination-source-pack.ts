import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  frozenSemanticNavWidthMutedTextDeploySuccessorMaterialized,
  SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_SUCCESSOR_BUNDLED_PATH,
} from "@/lib/infinity/market-validation-experiment/read-frozen-semantic-nav-width-muted-text-deploy-successor-snapshot";
import { FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SNAPSHOT_PATH } from "@/lib/infinity/market-validation-experiment/resolve-frozen-semantic-nav-width-muted-text-bundle";
import { CRE_VERCEL_PROJECT_LIVE_NAME, OCCUPANCYNPV_DOMAIN } from "@/lib/infinity/venture-operating-scale/constants";

export const OCCUPANCYNPV_DESTINATION_PREDECESSOR_BUNDLE =
  "lib/infinity/organic-growth-engine/continuous/destination/occupancynpv-predecessor.json" as const;

export const OCCUPANCYNPV_PAID_PRODUCT_SOURCE_PATHS = [
  "lib/infinity/occupancynpv-product/npv.ts",
  "app/occupancynpv/app/layout.tsx",
  "app/occupancynpv/app/occupancynpv-improvement-chrome.tsx",
  "app/occupancynpv/app/page.tsx",
  "app/occupancynpv/app/login/page.tsx",
  "app/occupancynpv/app/checkout/complete/page.tsx",
  "app/occupancynpv/app/workspaces/[id]/page.tsx",
  "app/occupancynpv/app/workspaces/[id]/comparison-result-presentation.ts",
  "app/occupancynpv/app/workspaces/[id]/comparison-result-dialog.tsx",
  "app/occupancynpv/app/workspaces/[id]/comparison-summary-card.tsx",
  "app/occupancynpv/app/workspaces/[id]/result-metric.tsx",
  "app/occupancynpv/app/workspaces/[id]/sensitivity-table.tsx",
] as const;

export const OCCUPANCYNPV_DESTINATION_SOURCE_PATHS = [
  FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SNAPSHOT_PATH,
  OCCUPANCYNPV_DESTINATION_PREDECESSOR_BUNDLE,
  ...OCCUPANCYNPV_PAID_PRODUCT_SOURCE_PATHS,
] as const;

export class DestinationSourceMissingError extends Error {
  readonly error_class = "DESTINATION_SOURCE_MISSING" as const;
  readonly path: string;
  constructor(path: string) {
    super(`DESTINATION_SOURCE_MISSING:${path}`);
    this.name = "DestinationSourceMissingError";
    this.path = path;
  }
}

export type ClassifiedPublishThrow = {
  reason: string;
  stage:
    | "DEPLOY_PREPARATION"
    | "DESTINATION_RESOLUTION"
    | "FILE_WRITE"
    | "DEPLOY_INVOCATION"
    | "OTHER";
  exception: {
    type: string;
    message: string;
    file: string;
    function: string;
    line: number;
    stack: string;
  };
};

export function destinationPredecessorCandidates(cwd = process.cwd()): string[] {
  return [
    FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SNAPSHOT_PATH,
    join(cwd, FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SNAPSHOT_PATH),
    SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_SUCCESSOR_BUNDLED_PATH,
    OCCUPANCYNPV_DESTINATION_PREDECESSOR_BUNDLE,
    join(cwd, OCCUPANCYNPV_DESTINATION_PREDECESSOR_BUNDLE),
  ];
}

export function resolveDestinationPredecessorPath(cwd = process.cwd()): string | null {
  const file = destinationPredecessorCandidates(cwd).find((path) => existsSync(path));
  if (file) return file;
  return frozenSemanticNavWidthMutedTextDeploySuccessorMaterialized(cwd)
    ? SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_SUCCESSOR_BUNDLED_PATH
    : null;
}

export function evaluateAutonomousDeployableDependencyCheck(cwd = process.cwd()): {
  gate: "AutonomousDeployableDependencyCheck";
  result: "PASS" | "FAIL";
  reasons: string[];
  packaged_or_durable_or_materializable: boolean;
} {
  const present = destinationSourcesPresent(cwd);
  return {
    gate: "AutonomousDeployableDependencyCheck",
    result: present.missing.length ? "FAIL" : "PASS",
    reasons: present.missing.map((path) => `UNDECLARED_OR_MISSING:${path}`),
    packaged_or_durable_or_materializable: present.missing.length === 0,
  };
}

export function destinationSourcesPresent(cwd = process.cwd()): {
  predecessor: boolean;
  paid_product: boolean;
  missing: string[];
} {
  const predecessor =
    resolveDestinationPredecessorPath(cwd) != null || frozenSemanticNavWidthMutedTextDeploySuccessorMaterialized(cwd);
  const missingPaid = OCCUPANCYNPV_PAID_PRODUCT_SOURCE_PATHS.filter((path) => !existsSync(join(cwd, path)));
  return {
    predecessor,
    paid_product: missingPaid.length === 0,
    missing: [
      ...(predecessor ? [] : [FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SNAPSHOT_PATH]),
      ...missingPaid,
    ],
  };
}

export function evaluatePublishDestinationContract(input: {
  venture_id?: string | null;
  expected_url?: string | null;
  project?: string | null;
  domain?: string | null;
}): { ok: boolean; reason: string | null } {
  if (input.venture_id && input.venture_id !== "occupancynpv") {
    return { ok: false, reason: "WRONG_VENTURE_DESTINATION" };
  }
  if (input.project && input.project !== CRE_VERCEL_PROJECT_LIVE_NAME) {
    return { ok: false, reason: "WRONG_VENTURE_DESTINATION" };
  }
  if (input.domain && input.domain !== OCCUPANCYNPV_DOMAIN) {
    return { ok: false, reason: "WRONG_VENTURE_DESTINATION" };
  }
  if (!input.expected_url) return { ok: true, reason: null };
  try {
    const url = new URL(input.expected_url);
    if (url.hostname !== OCCUPANCYNPV_DOMAIN) {
      return { ok: false, reason: "WRONG_VENTURE_DESTINATION" };
    }
    if (!/^\/blog\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(url.pathname)) {
      return { ok: false, reason: "INVALID_SLUG_CANONICAL" };
    }
    return { ok: true, reason: null };
  } catch {
    return { ok: false, reason: "INVALID_SLUG_CANONICAL" };
  }
}

export function classifyPublishThrow(error: unknown): ClassifiedPublishThrow {
  const err = error instanceof Error ? error : new Error(String(error));
  const stack = err.stack ?? "";
  const frame = stack.split("\n").find((line) => /occupancynpv|legal-surface|destination-source|scheduled-live/i.test(line))
    ?? stack.split("\n")[1]
    ?? "";
  const line = Number(frame.match(/:(\d+):\d+/)?.[1] ?? 0);
  const exception = {
    type: err.name || "Error",
    message: err.message,
    file: frame,
    function: "unknown",
    line,
    stack: stack.slice(0, 2000),
  };
  if (err.name === "FrozenBundleSnapshotMissingError" || /FROZEN_BUNDLE_SNAPSHOT_MISSING/.test(err.message)) {
    return {
      reason: "FROZEN_BUNDLE_SNAPSHOT_MISSING",
      stage: "DEPLOY_PREPARATION",
      exception: {
        ...exception,
        file: "lib/infinity/venture-website-architecture/cre-occupancynpv-legal-surface-successor.ts",
        function: "reconstructOccupancynpvLegalSurfaceSuccessor",
        line: line || 65,
      },
    };
  }
  if (
    err.name === "DestinationSourceMissingError" ||
    /DESTINATION_SOURCE_MISSING|REPO_SOURCE_MISSING|ENOENT/.test(err.message)
  ) {
    return {
      reason: "DESTINATION_SOURCE_MISSING",
      stage: "DEPLOY_PREPARATION",
      exception: {
        ...exception,
        file: "lib/infinity/venture-operating-scale/occupancynpv-paid-product-surface.ts",
        function: "repo",
        line: line || 12,
      },
    };
  }
  return { reason: "PUBLISH_THREW", stage: "OTHER", exception };
}
