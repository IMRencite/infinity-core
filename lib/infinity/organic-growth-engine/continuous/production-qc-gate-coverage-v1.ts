import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const PRODUCTION_QC_GATE_COVERAGE_V1 = "PRODUCTION_QC_GATE_COVERAGE_V1" as const;
export const PRODUCTION_QC_GATE_WIRING_QC = "PRODUCTION_QC_GATE_WIRING_QC" as const;
export const REQUIRED_PRODUCTION_GATE_NOT_WIRED = "REQUIRED_PRODUCTION_GATE_NOT_WIRED" as const;
export const UNREGISTERED_PRODUCTION_PATH_QC = "UNREGISTERED_PRODUCTION_PATH_QC" as const;

export const PRODUCTION_QC_GATE_FAMILIES = [
  "SOURCE",
  "BUILD",
  "CONTENT",
  "EDITORIAL",
  "MEDIA",
  "SCHEMA",
  "CANONICAL",
  "INTERNAL_LINK",
  "TAXONOMY",
  "PUBLIC_UI_CAPABILITY",
  "RENDER",
  "RESPONSIVE_RENDER",
  "INTERACTION",
  "COMMERCE",
  "FULFILLMENT",
  "PRODUCTION_VERIFY",
  "REGISTRY_ALIGNMENT",
  /** Source trace + built-artifact observability + remote module-init probe + natural production cycles. */
  "SERVERLESS_RUNTIME_TRACE",
] as const;

export type ProductionQcGateFamily = (typeof PRODUCTION_QC_GATE_FAMILIES)[number];

export type ProductionMutationPathSpec = {
  path_id: string;
  source_file: string;
  entry_function: string;
  venture_scope: string;
  mutation_type: string;
  required_qc_set: ProductionQcGateFamily[];
  enforcement_markers: string[];
  mutation_markers: string[];
  /** When set, path is documented bypass — must not be used for autonomous production without hardening. */
  bypass_documented?: boolean;
};

export const PRODUCTION_QC_GATE_COVERAGE_REGISTRY: ProductionMutationPathSpec[] = [
  {
    path_id: "CT_STOREFRONT_DEPLOY",
    source_file: "lib/infinity/commerce/club-throttle-production-deployment-runner.ts",
    entry_function: "executeClubThrottleProductionDeployment",
    venture_scope: "club-throttle",
    mutation_type: "STOREFRONT_PRODUCTION_DEPLOY_ALIAS_PROMOTE",
    required_qc_set: [
      "SOURCE",
      "CONTENT",
      "MEDIA",
      "SCHEMA",
      "PUBLIC_UI_CAPABILITY",
      "RENDER",
      "RESPONSIVE_RENDER",
      "PRODUCTION_VERIFY",
    ],
    enforcement_markers: [
      "evaluateClubThrottleProductionDeployGates",
      "evaluateBlogBacklogDeployGuard",
    ],
    mutation_markers: ["vercel.createProject", "createSourceBundleDeployment"],
  },
  {
    path_id: "AUTONOMOUS_VENTURE_PRODUCTION_DEPLOY",
    source_file: "lib/infinity/autonomous-portfolio-operations/autonomous-venture-production-deployer-v1.ts",
    entry_function: "deployApprovedVentureProductionBundle",
    venture_scope: "portfolio",
    mutation_type: "VENTURE_FRONTEND_PRODUCTION_DEPLOY",
    required_qc_set: ["CONTENT", "RENDER", "PRODUCTION_VERIFY", "REGISTRY_ALIGNMENT"],
    enforcement_markers: ["executeClubThrottleProductionDeployment", "deployOccupancyNpvOrganicLivePage"],
    mutation_markers: ["deploy: true"],
  },
  {
    path_id: "ONPV_ORGANIC_LIVE_PUBLISH",
    source_file: "lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher.ts",
    entry_function: "deployOccupancyNpvOrganicLivePage",
    venture_scope: "occupancynpv",
    mutation_type: "ORGANIC_PAGE_PRODUCTION_DEPLOY",
    required_qc_set: ["SOURCE", "CONTENT", "RENDER", "PRODUCTION_VERIFY"],
    enforcement_markers: ["ORGANIC_LIVE_PAGE_NOT_IN_BUNDLE"],
    mutation_markers: ["createSourceBundleDeployment"],
  },
  {
    path_id: "AUTONOMOUS_BLOG_PUBLICATION_VNEXT",
    source_file: "lib/infinity/organic-growth-engine/continuous/infinity-blog-publication-gate-vnext.ts",
    entry_function: "evaluateInfinityBlogPublicationGateVNext",
    venture_scope: "all-ventures",
    mutation_type: "AUTONOMOUS_BLOG_PUBLICATION_APPROVAL",
    required_qc_set: ["CONTENT", "EDITORIAL", "MEDIA", "SCHEMA", "RENDER", "RESPONSIVE_RENDER"],
    enforcement_markers: ["evaluateRenderedPageQualityQc", 'boundary: "AUTONOMOUS_PUBLICATION_APPROVAL"'],
    mutation_markers: ["publish_allowed"],
  },
  {
    path_id: "VENTURE_CONTENT_PUBLICATION_DECISION",
    source_file: "lib/infinity/organic-growth-engine/continuous/venture-content-publication-decision.ts",
    entry_function: "evaluateVentureContentPublicationDecision",
    venture_scope: "all-ventures",
    mutation_type: "AUTONOMOUS_BLOG_PUBLICATION_APPROVAL",
    required_qc_set: ["CONTENT", "EDITORIAL", "SCHEMA", "RENDER", "RESPONSIVE_RENDER"],
    enforcement_markers: ["evaluateRenderedPageQualityQc", 'boundary: "AUTONOMOUS_PUBLICATION_APPROVAL"'],
    mutation_markers: ["publish_allowed"],
  },
  {
    path_id: "BLOG_BACKLOG_DEPLOY_GUARD",
    source_file: "lib/infinity/organic-growth-engine/continuous/blog-backlog-deploy-guard.ts",
    entry_function: "evaluateBlogBacklogDeployGuard",
    venture_scope: "club-throttle",
    mutation_type: "SCOPED_BLOG_BUNDLE_PREDEPLOY",
    required_qc_set: ["CONTENT", "RENDER", "RESPONSIVE_RENDER", "SCHEMA"],
    enforcement_markers: ["evaluateBacklogSourceVNext", "evaluateRenderedPageQualityQc"],
    mutation_markers: ["bundle_deploy_allowed"],
  },
  {
    path_id: "NEW_VENTURE_BLOG_LAUNCH",
    source_file: "lib/infinity/organic-growth-engine/continuous/venture-content-launch-gates.ts",
    entry_function: "evaluateVentureBlogLaunchGates",
    venture_scope: "new-ventures",
    mutation_type: "NEW_VENTURE_BLOG_LAUNCH",
    required_qc_set: ["CONTENT", "SCHEMA", "RENDER", "RESPONSIVE_RENDER", "MEDIA"],
    enforcement_markers: ["evaluateRenderedPageQualityQc", 'boundary: "NEW_VENTURE_BLOG_LAUNCH"'],
    mutation_markers: ["return { content, schema, visual, image: imageLaunch, venture_launch_ready }"],
  },
  {
    path_id: "BUILD_FACTORY_WEBSITE_LIVE",
    source_file: "lib/infinity/build-factory/build-factory-website-live-gates-v1.ts",
    entry_function: "evaluateBuildFactoryWebsiteLiveGates",
    venture_scope: "build-factory",
    mutation_type: "WEBSITE_LIVE_ALLOWED",
    required_qc_set: [
      "PUBLIC_UI_CAPABILITY",
      "RENDER",
      "RESPONSIVE_RENDER",
      "PRODUCTION_VERIFY",
      "CONTENT",
    ],
    enforcement_markers: [
      "evaluateVentureReleasePipelineComplete",
      "evaluateBuildFactoryRenderBlocking",
      "evaluateBuildFactoryCapabilityRegressionBlocking",
    ],
    mutation_markers: ["WEBSITE_LIVE_ALLOWED"],
  },
  {
    path_id: "INFINITY_RUNTIME_ISOLATED_PRODUCTION_PROMOTE",
    source_file: "scripts/infinity-runtime-isolated-deploy.mjs",
    entry_function: "INFINITY_RUNTIME_ISOLATED_DEPLOY",
    venture_scope: "infinity-runtime",
    mutation_type: "RUNTIME_SERVERLESS_PRODUCTION_PROMOTE",
    required_qc_set: ["SERVERLESS_RUNTIME_TRACE", "PRODUCTION_VERIFY"],
    enforcement_markers: [
      "portfolioModuleInitProbePass",
      "STAGED_REMOTE_MODULE_INIT_PROBE_QC",
      "REMOTE_FUNCTION_MODULE_INIT_QC",
      "verify-serverless-built-artifact-pre-promote.ts",
    ],
    mutation_markers: ["/promote/${encodeURIComponent(candidateId)}"],
  },
];

export type ProductionQcBypassDisposition =
  | "WIRE_TO_ENFORCED_PATH"
  | "RETIRE"
  | "TEST_ONLY_STRUCTURAL_ISOLATION"
  | "REMOVE_BOOLEAN_ESCAPE"
  | "NON_PRODUCTION_ONLY_WITH_RUNTIME_GUARD";

export type ProductionQcKnownBypassRecord = {
  bypass_id: string;
  source_file: string;
  callsite: string;
  can_mutate_production: boolean;
  full_required_gate_set_wired: boolean;
  disposition: ProductionQcBypassDisposition;
  resolution: "RESOLVED" | "UNRESOLVED";
};

export const PRODUCTION_QC_KNOWN_BYPASS_REGISTRY: ProductionQcKnownBypassRecord[] = [
  {
    bypass_id: "CT_DEPLOY_ENFORCE_BACKLOG_GUARD_FALSE",
    source_file: "lib/infinity/autonomous-portfolio-operations/autonomous-venture-production-deployer-v1.ts",
    callsite: "deployApprovedVentureProductionBundle",
    can_mutate_production: false,
    full_required_gate_set_wired: true,
    disposition: "REMOVE_BOOLEAN_ESCAPE",
    resolution: "RESOLVED",
  },
  {
    bypass_id: "CT_DEPLOY_CAPABILITY_QC_FALSE",
    source_file: "lib/infinity/commerce/club-throttle-deployment.ts",
    callsite: "executeClubThrottleProductionDeployment",
    can_mutate_production: false,
    full_required_gate_set_wired: true,
    disposition: "TEST_ONLY_STRUCTURAL_ISOLATION",
    resolution: "RESOLVED",
  },
  {
    bypass_id: "LEGACY_PROMOTE_SCRIPT",
    source_file: "scripts/promote-club-throttle-deployment-v35.mjs",
    callsite: "main",
    can_mutate_production: false,
    full_required_gate_set_wired: true,
    disposition: "RETIRE",
    resolution: "RESOLVED",
  },
  {
    bypass_id: "ONPV_REPAIR_DEPLOYMENTS",
    source_file: "lib/infinity/venture-operating-scale/occupancynpv-legacy-deployment-retired-v1.ts",
    callsite: "applyOccupancynpvLegacyDeployBlock",
    can_mutate_production: false,
    full_required_gate_set_wired: true,
    disposition: "NON_PRODUCTION_ONLY_WITH_RUNTIME_GUARD",
    resolution: "RESOLVED",
  },
  {
    bypass_id: "ONPV_PAYMENT_REACTIVATION_LEGACY_DEPLOY",
    source_file: "lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation.ts",
    callsite: "executeOccupancynpvPaymentReactivation",
    can_mutate_production: false,
    full_required_gate_set_wired: true,
    disposition: "NON_PRODUCTION_ONLY_WITH_RUNTIME_GUARD",
    resolution: "RESOLVED",
  },
];

/** @deprecated use PRODUCTION_QC_KNOWN_BYPASS_REGISTRY */
export const PRODUCTION_GATE_BYPASS_PATHS_FOUND = PRODUCTION_QC_KNOWN_BYPASS_REGISTRY.map((row) => ({
  path_id: row.bypass_id,
  source_file: row.source_file,
  reason: row.disposition,
  mitigation: row.resolution,
}));

export type ProductionPathCoverageRow = ProductionMutationPathSpec & {
  actual_qc_set: ProductionQcGateFamily[];
  missing_qc_set: ProductionQcGateFamily[];
  wiring: "PASS" | "FAIL";
  wiring_reasons: string[];
};

function repoRoot(): string {
  return process.cwd();
}

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot(), relativePath), "utf8");
}

function firstIndex(source: string, needle: string): number {
  const idx = source.indexOf(needle);
  return idx < 0 ? Number.POSITIVE_INFINITY : idx;
}

export function evaluateProductionPathWiring(spec: ProductionMutationPathSpec): {
  wiring: "PASS" | "FAIL";
  reasons: string[];
} {
  let source: string;
  try {
    source = readRepoFile(spec.source_file);
  } catch {
    return { wiring: "FAIL", reasons: [`SOURCE_FILE_MISSING:${spec.source_file}`] };
  }

  const reasons: string[] = [];
  for (const marker of spec.enforcement_markers) {
    if (!source.includes(marker)) reasons.push(`MISSING_ENFORCEMENT_MARKER:${marker}`);
  }

  const enforcementIdx = Math.min(...spec.enforcement_markers.map((m) => firstIndex(source, m)));
  const mutationIdx = Math.min(...spec.mutation_markers.map((m) => firstIndex(source, m)));
  if (enforcementIdx >= mutationIdx) {
    reasons.push(REQUIRED_PRODUCTION_GATE_NOT_WIRED, "GATE_AFTER_MUTATION_OR_MISSING");
  }

  return { wiring: reasons.length ? "FAIL" : "PASS", reasons };
}

export function buildProductionMutationPathInventory(): ProductionPathCoverageRow[] {
  return PRODUCTION_QC_GATE_COVERAGE_REGISTRY.map((spec) => {
    const wiringResult = evaluateProductionPathWiring(spec);
    const actual = spec.enforcement_markers.length > 0 && wiringResult.wiring === "PASS" ? spec.required_qc_set : [];
    const missing = spec.required_qc_set.filter((family) => !actual.includes(family));
    return {
      ...spec,
      actual_qc_set: actual,
      missing_qc_set: missing,
      wiring: wiringResult.wiring,
      wiring_reasons: wiringResult.reasons,
    };
  });
}

export const PRODUCTION_MUTATION_PATH_INVENTORY = buildProductionMutationPathInventory;

export function evaluateProductionQcGateWiringQc(): {
  gate: typeof PRODUCTION_QC_GATE_WIRING_QC;
  result: "PASS" | "FAIL";
  reasons: string[];
  paths: ProductionPathCoverageRow[];
} {
  const paths = buildProductionMutationPathInventory();
  const reasons: string[] = [];
  for (const row of paths) {
    if (row.wiring !== "PASS") {
      reasons.push(
        `${REQUIRED_PRODUCTION_GATE_NOT_WIRED}:${row.path_id}:${row.wiring_reasons.join("|")}`,
      );
    }
  }
  return {
    gate: PRODUCTION_QC_GATE_WIRING_QC,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
    paths,
  };
}

/** Known production entrypoints that must appear in the coverage registry. */
export const PRODUCTION_ENTRYPOINT_SIGNATURES: Array<{ file: string; exportName: string; expected_path_id: string }> = [
  {
    file: "lib/infinity/commerce/club-throttle-deployment.ts",
    exportName: "executeClubThrottleProductionDeployment",
    expected_path_id: "CT_STOREFRONT_DEPLOY",
  },
  {
    file: "lib/infinity/autonomous-portfolio-operations/autonomous-venture-production-deployer-v1.ts",
    exportName: "deployApprovedVentureProductionBundle",
    expected_path_id: "AUTONOMOUS_VENTURE_PRODUCTION_DEPLOY",
  },
  {
    file: "lib/infinity/build-factory/build-factory-website-live-gates-v1.ts",
    exportName: "evaluateBuildFactoryWebsiteLiveGates",
    expected_path_id: "BUILD_FACTORY_WEBSITE_LIVE",
  },
];

export function evaluateUnregisteredProductionPathQc(): {
  gate: typeof UNREGISTERED_PRODUCTION_PATH_QC;
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  const registeredIds = new Set(PRODUCTION_QC_GATE_COVERAGE_REGISTRY.map((row) => row.path_id));
  for (const entry of PRODUCTION_ENTRYPOINT_SIGNATURES) {
    if (!registeredIds.has(entry.expected_path_id)) {
      reasons.push(`UNREGISTERED:${entry.expected_path_id}`);
    }
    const source = readRepoFile(entry.file);
    if (!source.includes(`export async function ${entry.exportName}`) && !source.includes(`export function ${entry.exportName}`)) {
      reasons.push(`ENTRYPOINT_MISSING:${entry.exportName}`);
    }
  }
  return {
    gate: UNREGISTERED_PRODUCTION_PATH_QC,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

export function evaluateBuildFactoryQcWiringQc(): {
  gate: "BUILD_FACTORY_QC_WIRING_QC";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const spec = PRODUCTION_QC_GATE_COVERAGE_REGISTRY.find((row) => row.path_id === "BUILD_FACTORY_WEBSITE_LIVE");
  if (!spec) {
    return { gate: "BUILD_FACTORY_QC_WIRING_QC", result: "FAIL", reasons: ["BUILD_FACTORY_PATH_NOT_REGISTERED"] };
  }
  const wiring = evaluateProductionPathWiring(spec);
  return { gate: "BUILD_FACTORY_QC_WIRING_QC", result: wiring.wiring, reasons: wiring.reasons };
}

export function evaluateLegacyPublicationRenderEnforcementWiringQc(): {
  gate: "LEGACY_PUBLICATION_RENDER_ENFORCEMENT_QC";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const paths = ["AUTONOMOUS_BLOG_PUBLICATION_VNEXT", "VENTURE_CONTENT_PUBLICATION_DECISION"] as const;
  const reasons: string[] = [];
  for (const pathId of paths) {
    const spec = PRODUCTION_QC_GATE_COVERAGE_REGISTRY.find((row) => row.path_id === pathId);
    if (!spec) {
      reasons.push(`MISSING_REGISTRY:${pathId}`);
      continue;
    }
    const wiring = evaluateProductionPathWiring(spec);
    if (wiring.wiring !== "PASS") reasons.push(...wiring.reasons.map((r) => `${pathId}:${r}`));
  }
  return {
    gate: "LEGACY_PUBLICATION_RENDER_ENFORCEMENT_QC",
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

const PRODUCTION_QC_DISABLE_FLAG_PATTERNS = [
  "enforceBacklogDeployGuard",
  "enforceProductionCapabilityQc",
  "enforce_backlog_deploy_guard",
] as const;

const REGISTERED_VERCEL_MUTATION_LIB_FILES = new Set([
  "lib/infinity/commerce/club-throttle-production-deployment-runner.ts",
  "lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher.ts",
  "lib/infinity/commercialization/providers/vercel/domain-binding-adapter.ts",
  "lib/infinity/organic-growth-engine/continuous/production-qc-gate-coverage-v1.ts",
  "lib/infinity/venture-operating-scale/occupancynpv-legacy-deployment-retired-v1.ts",
  ...PRODUCTION_QC_KNOWN_BYPASS_REGISTRY.map((row) => row.source_file),
  ...PRODUCTION_QC_GATE_COVERAGE_REGISTRY.map((row) => row.source_file),
]);

export function evaluateProductionCallableQcDisableFlagsQc(): {
  gate: "PRODUCTION_QC_DISABLE_FLAGS_QC";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const files = [
    "lib/infinity/commerce/club-throttle-deployment.ts",
    "lib/infinity/autonomous-portfolio-operations/autonomous-venture-production-deployer-v1.ts",
  ];
  const reasons: string[] = [];
  for (const file of files) {
    const source = readRepoFile(file);
    for (const pattern of PRODUCTION_QC_DISABLE_FLAG_PATTERNS) {
      if (source.includes(pattern)) reasons.push(`PRODUCTION_CALLABLE_DISABLE_FLAG:${file}:${pattern}`);
    }
  }
  return { gate: "PRODUCTION_QC_DISABLE_FLAGS_QC", result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateTestOnlyCapabilityQcEscapeStructuralQc(): {
  gate: "TEST_ONLY_CAPABILITY_QC_ESCAPE_STRUCTURAL_QC";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const deployApi = readRepoFile("lib/infinity/commerce/club-throttle-deployment.ts");
  const reasons: string[] = [];
  if (deployApi.includes("composed_override")) reasons.push("PUBLIC_COMPOSED_OVERRIDE");
  if (deployApi.includes("runClubThrottleProductionDeploymentForTest")) reasons.push("PUBLIC_TEST_RUNNER");
  const runner = readRepoFile("lib/infinity/commerce/club-throttle-production-deployment-runner.ts");
  if (!runner.includes("runClubThrottleProductionDeploymentForTest")) {
    reasons.push("MISSING_INTERNAL_TEST_RUNNER");
  }
  return {
    gate: "TEST_ONLY_CAPABILITY_QC_ESCAPE_STRUCTURAL_QC",
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

export function evaluateCtStandalonePromotionBypassQc(): {
  gate: "CT_STANDALONE_PROMOTION_BYPASS_QC";
  CT_STANDALONE_PROMOTION_SCRIPT_PRODUCTION_CAPABLE: boolean;
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const source = readRepoFile("scripts/promote-club-throttle-deployment-v35.mjs");
  const productionCapable =
    source.includes("/promote/") || source.includes("/aliases") || source.includes("vercelApi(");
  const reasons: string[] = [];
  if (productionCapable) reasons.push("CT_PROMOTE_SCRIPT_STILL_MUTATES_PRODUCTION");
  if (!source.includes("CT_STANDALONE_PROMOTION_RETIRED")) reasons.push("CT_PROMOTE_SCRIPT_NOT_RETIRED");
  return {
    gate: "CT_STANDALONE_PROMOTION_BYPASS_QC",
    CT_STANDALONE_PROMOTION_SCRIPT_PRODUCTION_CAPABLE: productionCapable,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

export function evaluateOnpvLegacyDeployBypassQc(): {
  gate: "ONPV_LEGACY_DEPLOY_BYPASS_QC";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  const legacyGuard = readRepoFile("lib/infinity/venture-operating-scale/occupancynpv-legacy-deployment-retired-v1.ts");
  if (!legacyGuard.includes("ONPV_LEGACY_DEPLOY_PRODUCTION_MUTATION_FORBIDDEN")) {
    reasons.push("MISSING_LEGACY_GUARD_CONSTANT");
  }
  const legacyDeployFiles = [
    "occupancynpv-brand-identity-deployment.ts",
    "occupancynpv-pricing-ux-repair-deployment.ts",
    "occupancynpv-payment-reactivation.ts",
  ];
  for (const name of legacyDeployFiles) {
    const source = readRepoFile(`lib/infinity/venture-operating-scale/${name}`);
    if (!source.includes("applyOccupancynpvLegacyDeployBlock") && !source.includes("occupancynpvLegacyProductionDeployBlockedReason")) {
      reasons.push(`LEGACY_DEPLOY_UNGUARDED:${name}`);
    }
  }
  return { gate: "ONPV_LEGACY_DEPLOY_BYPASS_QC", result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateProductionGateOrderingQc(): {
  gate: "PRODUCTION_GATE_ORDERING_QC";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const source = readRepoFile("lib/infinity/commerce/club-throttle-production-deployment-runner.ts");
  const composeIdx = source.indexOf("writeIsolatedBundle(dest, composed.files)");
  const qcIdx = Math.min(
    source.indexOf("const guard = evaluateBlogBacklogDeployGuard"),
    source.indexOf("const capabilityGates = evaluateClubThrottleProductionDeployGates"),
  );
  const mutateIdx = source.indexOf("const project = await vercel.createProject");
  const reasons: string[] = [];
  if (composeIdx < 0 || qcIdx < 0 || mutateIdx < 0) reasons.push("ORDERING_MARKER_MISSING");
  if (!(composeIdx < qcIdx && qcIdx < mutateIdx)) reasons.push("GATE_ORDER_COMPOSE_QC_MUTATION_VIOLATION");
  return { gate: "PRODUCTION_GATE_ORDERING_QC", result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateNewProductionBypassDiscoveryQc(): {
  gate: "NEW_PRODUCTION_BYPASS_DISCOVERY_QC";
  NEW_PRODUCTION_BYPASS_PATHS_FOUND: string[];
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const root = join(repoRoot(), "lib/infinity");
  const found: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        const normalized = full.replace(/\\/g, "/");
        const rel = normalized.includes("lib/infinity") ? normalized.slice(normalized.indexOf("lib/infinity")) : normalized;
        const text = readFileSync(full, "utf8");
        if (!text.includes("createSourceBundleDeployment")) continue;
        if (REGISTERED_VERCEL_MUTATION_LIB_FILES.has(rel)) continue;
        if (text.includes('target: "staging"') || /staging|probe-staging/i.test(rel)) continue;
        if (text.includes("applyOccupancynpvLegacyDeployBlock") || text.includes("occupancynpvLegacyProductionDeployBlockedReason")) continue;
        found.push(rel);
      }
    }
  }
  walk(root);
  return {
    gate: "NEW_PRODUCTION_BYPASS_DISCOVERY_QC",
    NEW_PRODUCTION_BYPASS_PATHS_FOUND: found,
    result: found.length ? "FAIL" : "PASS",
    reasons: found.map((path) => `UNREGISTERED_VERCEL_MUTATION:${path}`),
  };
}

export function evaluateProductionQcBypassEliminationQc(): {
  gate: "PRODUCTION_QC_BYPASS_ELIMINATION_QC";
  PRODUCTION_QC_KNOWN_BYPASS_COUNT: number;
  PRODUCTION_QC_UNRESOLVED_BYPASS_COUNT: number;
  result: "PASS" | "FAIL";
  reasons: string[];
  bypasses: ProductionQcKnownBypassRecord[];
} {
  const unresolved = PRODUCTION_QC_KNOWN_BYPASS_REGISTRY.filter(
    (row) =>
      row.resolution !== "RESOLVED"
      || (row.can_mutate_production && !row.full_required_gate_set_wired),
  );
  const reasons = unresolved.map((row) => `UNRESOLVED_BYPASS:${row.bypass_id}`);
  return {
    gate: "PRODUCTION_QC_BYPASS_ELIMINATION_QC",
    PRODUCTION_QC_KNOWN_BYPASS_COUNT: PRODUCTION_QC_KNOWN_BYPASS_REGISTRY.length,
    PRODUCTION_QC_UNRESOLVED_BYPASS_COUNT: unresolved.length,
    result: unresolved.length ? "FAIL" : "PASS",
    reasons,
    bypasses: PRODUCTION_QC_KNOWN_BYPASS_REGISTRY,
  };
}

export function evaluateProductionQcBypassRegressionQc(): {
  PRODUCTION_QC_BYPASS_REGRESSION_QC: "PASS" | "FAIL";
  elimination: ReturnType<typeof evaluateProductionQcBypassEliminationQc>;
  disable_flags: ReturnType<typeof evaluateProductionCallableQcDisableFlagsQc>;
  test_escape: ReturnType<typeof evaluateTestOnlyCapabilityQcEscapeStructuralQc>;
  ct_promote: ReturnType<typeof evaluateCtStandalonePromotionBypassQc>;
  onpv_legacy: ReturnType<typeof evaluateOnpvLegacyDeployBypassQc>;
  ordering: ReturnType<typeof evaluateProductionGateOrderingQc>;
  discovery: ReturnType<typeof evaluateNewProductionBypassDiscoveryQc>;
} {
  const elimination = evaluateProductionQcBypassEliminationQc();
  const disable_flags = evaluateProductionCallableQcDisableFlagsQc();
  const test_escape = evaluateTestOnlyCapabilityQcEscapeStructuralQc();
  const ct_promote = evaluateCtStandalonePromotionBypassQc();
  const onpv_legacy = evaluateOnpvLegacyDeployBypassQc();
  const ordering = evaluateProductionGateOrderingQc();
  const discovery = evaluateNewProductionBypassDiscoveryQc();
  const pass =
    elimination.result === "PASS"
    && disable_flags.result === "PASS"
    && test_escape.result === "PASS"
    && ct_promote.result === "PASS"
    && onpv_legacy.result === "PASS"
    && ordering.result === "PASS"
    && discovery.result === "PASS";
  return {
    PRODUCTION_QC_BYPASS_REGRESSION_QC: pass ? "PASS" : "FAIL",
    elimination,
    disable_flags,
    test_escape,
    ct_promote,
    onpv_legacy,
    ordering,
    discovery,
  };
}

/** Applicable infinity-runtime production promote paths must declare SERVERLESS_RUNTIME_TRACE. */
export function evaluateServerlessRuntimeTraceCoverageQc(): {
  gate: "SERVERLESS_RUNTIME_TRACE_COVERAGE_QC";
  SERVERLESS_RUNTIME_TRACE_REGISTERED: boolean;
  SERVERLESS_RUNTIME_TRACE_REQUIRED_PATH_COUNT: number;
  SERVERLESS_RUNTIME_TRACE_COVERED_PATH_COUNT: number;
  SERVERLESS_RUNTIME_TRACE_UNCOVERED_PATH_COUNT: number;
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const requiredPathIds = ["INFINITY_RUNTIME_ISOLATED_PRODUCTION_PROMOTE"] as const;
  const registered = PRODUCTION_QC_GATE_COVERAGE_REGISTRY.filter((row) =>
    row.required_qc_set.includes("SERVERLESS_RUNTIME_TRACE"),
  );
  const wiring = buildProductionMutationPathInventory().filter((row) =>
    row.required_qc_set.includes("SERVERLESS_RUNTIME_TRACE"),
  );
  const covered = wiring.filter((row) => row.wiring === "PASS");
  const uncoveredIds = requiredPathIds.filter(
    (id) => !registered.some((row) => row.path_id === id && row.required_qc_set.includes("SERVERLESS_RUNTIME_TRACE")),
  );
  const wiringFails = wiring.filter((row) => row.wiring !== "PASS");
  const reasons: string[] = [
    ...uncoveredIds.map((id) => `UNREGISTERED_SERVERLESS_RUNTIME_TRACE_PATH:${id}`),
    ...wiringFails.flatMap((row) =>
      row.wiring_reasons.map((r) => `WIRING_FAIL:${row.path_id}:${r}`),
    ),
  ];
  const uncovered = uncoveredIds.length + wiringFails.length;
  return {
    gate: "SERVERLESS_RUNTIME_TRACE_COVERAGE_QC",
    SERVERLESS_RUNTIME_TRACE_REGISTERED: PRODUCTION_QC_GATE_FAMILIES.includes("SERVERLESS_RUNTIME_TRACE"),
    SERVERLESS_RUNTIME_TRACE_REQUIRED_PATH_COUNT: requiredPathIds.length,
    SERVERLESS_RUNTIME_TRACE_COVERED_PATH_COUNT: covered.length,
    SERVERLESS_RUNTIME_TRACE_UNCOVERED_PATH_COUNT: uncovered,
    result: uncovered === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateProductionQcGateCoverageRegressionQc(): {
  PRODUCTION_QC_GATE_COVERAGE_REGRESSION_QC: "PASS" | "FAIL";
  wiring: ReturnType<typeof evaluateProductionQcGateWiringQc>;
  unregistered: ReturnType<typeof evaluateUnregisteredProductionPathQc>;
  build_factory: ReturnType<typeof evaluateBuildFactoryQcWiringQc>;
  legacy_publication: ReturnType<typeof evaluateLegacyPublicationRenderEnforcementWiringQc>;
  bypass: ReturnType<typeof evaluateProductionQcBypassRegressionQc>;
} {
  const wiring = evaluateProductionQcGateWiringQc();
  const unregistered = evaluateUnregisteredProductionPathQc();
  const buildFactory = evaluateBuildFactoryQcWiringQc();
  const legacy = evaluateLegacyPublicationRenderEnforcementWiringQc();
  const bypass = evaluateProductionQcBypassRegressionQc();
  const serverlessRuntimeTrace = evaluateServerlessRuntimeTraceCoverageQc();
  const pass =
    wiring.result === "PASS"
    && unregistered.result === "PASS"
    && buildFactory.result === "PASS"
    && legacy.result === "PASS"
    && bypass.PRODUCTION_QC_BYPASS_REGRESSION_QC === "PASS"
    && serverlessRuntimeTrace.result === "PASS";
  return {
    PRODUCTION_QC_GATE_COVERAGE_REGRESSION_QC: pass ? "PASS" : "FAIL",
    wiring,
    unregistered,
    build_factory: buildFactory,
    legacy_publication: legacy,
    bypass,
    serverless_runtime_trace: serverlessRuntimeTrace,
  };
}
