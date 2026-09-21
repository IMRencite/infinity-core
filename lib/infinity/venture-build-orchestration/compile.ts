import { createHash } from "node:crypto";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import { evaluateBuildAuthorization, evaluateValidationArtifactAuthorization } from "./authorization";
import {
  BUILD_PACKAGE_VERSION,
  EXECUTABLE_VENTURE_PLAN_SCHEMA,
  PLAN_VERSION,
  VALIDATION_PHASES,
} from "./constants";
import { canonicalFooterRequirement } from "./footer";
import type {
  ArtifactContract,
  CapabilityRoute,
  CompileInput,
  ExecutablePhase,
  ExecutableTask,
  ExecutableVenturePlan,
  TraceabilityRef,
  VentureBuildPackage,
} from "./types";

function stableId(prefix: string, parts: string[]): string {
  const digest = createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 20);
  return `${prefix}_${digest}`;
}

function routeFor(capability: string, roomId: DepartmentId, key: string): CapabilityRoute {
  return {
    capability,
    requiredCapabilityKey: key,
    roomId,
    providerNeutral: true,
  };
}

function artifactContract(productName: string, role: ArtifactContract["role"] = "full_product"): ArtifactContract {
  const landingFiles =
    role === "validation_landing"
      ? [
          "lib/events.ts",
          "lib/form.ts",
          "app/early-access/page.tsx",
          "app/ingest-client.ts",
          "app/api/public/market-validation/[experimentId]/ingest/route.ts",
        ]
      : [];
  return {
    artifactType: "nextjs_web_product",
    role,
    requiredFiles: [
      "package.json",
      "package-lock.json",
      "app/page.tsx",
      "app/layout.tsx",
      "components/venture-footer.tsx",
      "components/validation-grade.tsx",
      "lib/domain.ts",
      "styles/globals.css",
      "tests/domain.test.ts",
      "artifact-manifest.json",
      "app/privacy-policy/page.tsx",
      "app/terms-of-service/page.tsx",
      "app/sitemap.ts",
      ...landingFiles,
    ],
    requiredCapabilities: ["coding", "product_asset_builder", "validation"],
    functionalRequirements:
      role === "validation_landing"
        ? [
            `${productName} explains the offer, pricing hypothesis, and what the visitor can do next`,
            "Landing page is a validation experiment, not the full CRE product",
          ]
        : [
            `${productName} implements the evidenced MVP workflow`,
            "Domain logic is present as source, not a requirements JSON alone",
          ],
    brandRequirements: ["Venture brand remains primary"],
    footerRequirements: canonicalFooterRequirement(),
    validationCriteria: [
      "required_files",
      "footer_attribution",
      "public_legal_completeness",
      "validation_grade_structural_quality",
      "secret_scan",
      "domain_tests",
      "package_json",
      "BUILD_COMPLETE_DEPENDENCY_SET",
    ],
    securityCriteria: ["no_provider_secrets", "no_treasury_credentials"],
    buildCommand: "next build",
    expectedRuntime: "nextjs",
  };
}

function buildTask(input: {
  planId: string;
  ventureId: string;
  candidateId: string | null;
  phase: ExecutablePhase;
  slug: string;
  purpose: string;
  inputs: string[];
  capability: string;
  capabilityKey: string;
  roomId: DepartmentId;
  dependencies: string[];
  expectedArtifact: string;
  validation: string;
  external: boolean;
}): ExecutableTask {
  const taskId = stableId("task", [input.planId, input.phase, input.slug]);
  return {
    taskId,
    phase: input.phase,
    purpose: input.purpose,
    inputs: input.inputs,
    requiredCapability: input.capability,
    capabilityRoute: routeFor(input.capability, input.roomId, input.capabilityKey),
    dependencies: input.dependencies,
    expectedArtifact: input.expectedArtifact,
    validation: input.validation,
    status: input.dependencies.length ? "PENDING" : "READY",
    economicBoundary: {
      estimatedCostUsd: null,
      costKnown: false,
      unknownCostTreatedAsZero: false,
      externalSpendAuthorized: false,
    },
    externalAuthorityRequired: input.external,
    traceability: {
      planId: input.planId,
      ventureId: input.ventureId,
      candidateId: input.candidateId,
    },
  };
}

function orderTasks(tasks: ExecutableTask[]): ExecutableTask[] {
  const byId = new Map(tasks.map((task) => [task.taskId, task]));
  const incoming = new Map(tasks.map((task) => [task.taskId, task.dependencies.filter((id) => byId.has(id))]));
  const ready = tasks.filter((task) => (incoming.get(task.taskId) ?? []).length === 0).map((task) => task.taskId);
  const ordered: ExecutableTask[] = [];
  const seen = new Set<string>();
  while (ready.length) {
    const id = ready.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const task = byId.get(id);
    if (task) ordered.push(task);
    for (const next of tasks) {
      if (seen.has(next.taskId)) continue;
      const deps = incoming.get(next.taskId) ?? [];
      if (deps.every((dep) => seen.has(dep))) ready.push(next.taskId);
    }
  }
  if (ordered.length !== tasks.length) {
    throw new Error("task_dependency_cycle");
  }
  return ordered;
}

export function executablePlanIdempotencyKey(input: {
  organizationId: string;
  ventureId: string;
  planVersion: number;
  authorization: string;
}): string {
  return ["executable_venture_plan", input.organizationId, input.ventureId, String(input.planVersion), input.authorization].join(":");
}

export function compileExecutableVenturePlan(input: CompileInput): {
  plan: ExecutableVenturePlan;
  buildPackage: VentureBuildPackage | null;
} {
  if ((input.purpose ?? "FULL_PRODUCT") === "VALIDATION_ARTIFACT") {
    return compileValidationArtifactPlan(input);
  }
  const authorization = evaluateBuildAuthorization(input);
  const planId = stableId("plan", [
    input.organizationId,
    input.ventureId,
    String(PLAN_VERSION),
    authorization.result,
  ]);
  const footer = canonicalFooterRequirement();
  const contract = artifactContract(input.name);
  const traceability: TraceabilityRef = {
    candidateId: input.candidateId,
    researchIds: input.researchIds,
    monetizationPlanId: input.monetizationPlanId,
    selectionId: input.selectionId,
    assemblyId: input.ventureId,
    planId,
    missionId: null,
    taskIds: [],
    artifactId: null,
    validationId: null,
    handoffId: null,
  };

  if (authorization.result === "EVIDENCE_BLOCKED" || authorization.result === "POLICY_BLOCKED" || authorization.result === "ECONOMICS_BLOCKED") {
    const plan: ExecutableVenturePlan = {
      schemaVersion: EXECUTABLE_VENTURE_PLAN_SCHEMA,
      planId,
      planVersion: PLAN_VERSION,
      kind: "BLOCKED",
      ventureId: input.ventureId,
      candidateId: input.candidateId,
      selectionId: input.selectionId,
      organizationId: input.organizationId,
      buildAuthorization: authorization,
      ventureRequirements: {
        name: input.name,
        customer: input.product.targetCustomer,
        problem: input.product.problem,
        promise: input.product.corePromise,
      },
      productRequirements: input.product,
      systemsRequirements: input.systems,
      monetizationRequirements: input.monetization,
      growthRequirements: {
        organicRequired: false,
        creativeMediaRequired: false,
        qualityOverUrlCount: true,
      },
      footerRequirements: footer,
      phases: [],
      tasks: [],
      dependencies: [],
      capabilityRoutes: [],
      validationGates: [],
      artifactRequirements: contract,
      deploymentPrerequisites: ["Build is blocked. No artifact. No deployment."],
      traceability,
      status: "BLOCKED",
      publicLaunch: false,
    };
    return { plan, buildPackage: null };
  }

  if (authorization.result !== "AUTHORIZED_BUILD") {
    const base = {
      planId,
      ventureId: input.ventureId,
      candidateId: input.candidateId,
    };
    const define = buildTask({
      ...base,
      phase: "VENTURE_DEFINITION",
      slug: "validation-scope",
      purpose: "Define the exact validation work required before BUILD is authorized.",
      inputs: [authorization.blocker ?? "VALIDATION_REQUIRED"],
      capability: "research",
      capabilityKey: "research.summarize_internal_evidence",
      roomId: "research_department",
      dependencies: [],
      expectedArtifact: "validation_work_brief",
      validation: "Brief names the blocker and the next test.",
      external: false,
    });
    const pricing = buildTask({
      ...base,
      phase: "MONETIZATION_CONFIGURATION",
      slug: "pricing-validation",
      purpose: "Validate willingness to pay. This is not product BUILD.",
      inputs: [input.monetization.pricing, input.monetization.model],
      capability: "validation",
      capabilityKey: "qa.verify_plan_step_output",
      roomId: "quality_control",
      dependencies: [define.taskId],
      expectedArtifact: "pricing_validation_plan",
      validation: "A measurable pricing test exists.",
      external: false,
    });
    const customer = buildTask({
      ...base,
      phase: "PRODUCT_SPECIFICATION",
      slug: "customer-validation",
      purpose: "Validate the named customer problem before implementation.",
      inputs: [input.product.problem, input.product.targetCustomer],
      capability: "research",
      capabilityKey: "research.summarize_internal_evidence",
      roomId: "research_department",
      dependencies: [define.taskId],
      expectedArtifact: "customer_validation_plan",
      validation: "Customer interview or complaint test is specified.",
      external: false,
    });
    const tasks = orderTasks([define, pricing, customer]);
    const plan: ExecutableVenturePlan = {
      schemaVersion: EXECUTABLE_VENTURE_PLAN_SCHEMA,
      planId,
      planVersion: PLAN_VERSION,
      kind: "VALIDATION_WORK",
      ventureId: input.ventureId,
      candidateId: input.candidateId,
      selectionId: input.selectionId,
      organizationId: input.organizationId,
      buildAuthorization: authorization,
      ventureRequirements: {
        name: input.name,
        customer: input.product.targetCustomer,
        problem: input.product.problem,
        promise: input.product.corePromise,
      },
      productRequirements: input.product,
      systemsRequirements: input.systems,
      monetizationRequirements: input.monetization,
      growthRequirements: {
        organicRequired: input.organicRequired,
        creativeMediaRequired: input.creativeMediaRequired,
        qualityOverUrlCount: true,
      },
      footerRequirements: footer,
      phases: VALIDATION_PHASES.map((phase) => ({
        phase,
        purpose: phase === "VENTURE_DEFINITION" ? "Scope validation" : "Governed validation work",
        taskIds: tasks.filter((task) => task.phase === phase).map((task) => task.taskId),
      })).filter((phase) => phase.taskIds.length > 0),
      tasks,
      dependencies: tasks.flatMap((task) => task.dependencies.map((from) => ({ from, to: task.taskId }))),
      capabilityRoutes: tasks.map((task) => task.capabilityRoute),
      validationGates: ["Do not execute PRODUCT_BUILD", "Do not produce a production artifact"],
      artifactRequirements: contract,
      deploymentPrerequisites: ["Validation must complete before BUILD."],
      traceability: { ...traceability, taskIds: tasks.map((task) => task.taskId) },
      status: "PLANNED",
      publicLaunch: false,
    };
    return { plan, buildPackage: null };
  }

  const base = { planId, ventureId: input.ventureId, candidateId: input.candidateId };
  const definition = buildTask({
    ...base,
    phase: "VENTURE_DEFINITION",
    slug: "define",
    purpose: "Lock the evidenced customer, problem, and MVP promise.",
    inputs: [input.product.targetCustomer, input.product.problem, input.product.corePromise],
    capability: "architecture",
    capabilityKey: "blueprint.validate",
    roomId: "company_operations",
    dependencies: [],
    expectedArtifact: "venture_definition",
    validation: "Customer, problem, and promise are named from evidence.",
    external: false,
  });
  const spec = buildTask({
    ...base,
    phase: "PRODUCT_SPECIFICATION",
    slug: "spec",
    purpose: "Compile venture-specific product requirements for MVP only.",
    inputs: input.product.mvpScope,
    capability: "architecture",
    capabilityKey: "blueprint.validate",
    roomId: "company_operations",
    dependencies: [definition.taskId],
    expectedArtifact: "product_requirements",
    validation: "MVP features are evidenced and not generic.",
    external: false,
  });
  const systems = buildTask({
    ...base,
    phase: "SYSTEMS_CONFIGURATION",
    slug: "systems",
    purpose: "Configure venture-specific systems from Venture Systems Architecture.",
    inputs: input.systems.items.map((item) => item.family),
    capability: "architecture",
    capabilityKey: "blueprint.validate",
    roomId: "systems_architect",
    dependencies: [spec.taskId],
    expectedArtifact: "systems_requirements",
    validation: "Only relevant systems are configured. Platform ≠ product.",
    external: false,
  });
  const money = buildTask({
    ...base,
    phase: "MONETIZATION_CONFIGURATION",
    slug: "monetization",
    purpose: "Carry canonical monetization into build configuration. Do not activate live payments.",
    inputs: [input.monetization.model, input.monetization.pricing],
    capability: "architecture",
    capabilityKey: "blueprint.validate",
    roomId: "strategy_finance",
    dependencies: [spec.taskId],
    expectedArtifact: "monetization_requirements",
    validation: "Pricing is copied from intelligence. Live Stripe writes remain forbidden.",
    external: false,
  });
  const pageDepth = buildTask({
    ...base,
    phase: "CONTENT_ASSET_BUILD",
    slug: "page-depth",
    purpose: "Create PageInformationDepthContract, material-question plan, buyer-question map, and product-capability map before page generation. Depth follows user intent, not word count. Do not copy OccupancyNPV layout.",
    inputs: ["page_information_depth", spec.taskId],
    capability: "architecture",
    capabilityKey: "blueprint.validate",
    roomId: "product_lab",
    dependencies: [spec.taskId],
    expectedArtifact: "page_depth_plan",
    validation: "Every customer-facing page has a depth contract before website.generate_pages.",
    external: false,
  });
  const build = buildTask({
    ...base,
    phase: "PRODUCT_BUILD",
    slug: "pab",
    purpose: "Generate the venture product artifact through Product / Asset Builder and coding capability.",
    inputs: [spec.taskId, systems.taskId, money.taskId, pageDepth.taskId],
    capability: "coding",
    capabilityKey: "website.generate_pages",
    roomId: "product_lab",
    dependencies: [spec.taskId, systems.taskId, money.taskId, pageDepth.taskId],
    expectedArtifact: "application_source",
    validation: "Working source, pages, domain logic, and footer exist. Pages are generated against a PageInformationDepthContract, not word count.",
    external: false,
  });
  const qa = buildTask({
    ...base,
    phase: "QUALITY_VALIDATION",
    slug: "qa",
    purpose: "Validate the artifact against the contract, footer, secrets, and domain tests.",
    inputs: [build.taskId],
    capability: "validation",
    capabilityKey: "qa.verify_internal_website",
    roomId: "quality_control",
    dependencies: [build.taskId],
    expectedArtifact: "qa_report",
    validation: "All validation gates pass before BUILT.",
    external: false,
  });
  const production = buildTask({
    ...base,
    phase: "PRODUCTION_ARTIFACT",
    slug: "handoff",
    purpose: "Collect the Production Artifact Handoff after validation.",
    inputs: [qa.taskId],
    capability: "validation",
    capabilityKey: "qa.verify_internal_build",
    roomId: "quality_control",
    dependencies: [qa.taskId],
    expectedArtifact: "production_artifact_handoff",
    validation: "Handoff is present and deployment is not executed.",
    external: false,
  });
  const deployPrep = buildTask({
    ...base,
    phase: "DEPLOYMENT_PREPARATION",
    slug: "readiness",
    purpose: "Evaluate deployment readiness and stop before public deployment.",
    inputs: [production.taskId],
    capability: "deployment_preparation",
    capabilityKey: "launch.evaluate_external_authorization",
    roomId: "launch_operations",
    dependencies: [production.taskId],
    expectedArtifact: "deployment_readiness",
    validation: "READY is not PUBLICLY_LAUNCHED. No Vercel write.",
    external: true,
  });

  const extra: ExecutableTask[] = [pageDepth];
  if (input.organicRequired) {
    extra.push(
      buildTask({
        ...base,
        phase: "CONTENT_ASSET_BUILD",
        slug: "organic",
        purpose: "Route organic/content architecture requirements. Do not generate hundreds of pages.",
        inputs: ["organic_growth"],
        capability: "organic_growth",
        capabilityKey: "website.generate_metadata",
        roomId: "growth_department",
        dependencies: [spec.taskId],
        expectedArtifact: "organic_requirements",
        validation: "Quality over URL count.",
        external: false,
      }),
    );
  }
  if (input.creativeMediaRequired) {
    extra.push(
      buildTask({
        ...base,
        phase: "CONTENT_ASSET_BUILD",
        slug: "creative",
        purpose: "Route creative media requirements. Provider-neutral and economically gated.",
        inputs: ["creative_media"],
        capability: "creative_media",
        capabilityKey: "website.generate_styles",
        roomId: "creative_studio",
        dependencies: [spec.taskId],
        expectedArtifact: "creative_requirements",
        validation: "No ungoverned media spend.",
        external: false,
      }),
    );
  }

  const tasks = orderTasks([definition, spec, systems, money, ...extra, build, qa, production, deployPrep]);
  const phases: ExecutablePhase[] = [
    "VENTURE_DEFINITION",
    "PRODUCT_SPECIFICATION",
    "SYSTEMS_CONFIGURATION",
    "MONETIZATION_CONFIGURATION",
    "CONTENT_ASSET_BUILD",
    "PRODUCT_BUILD",
    "QUALITY_VALIDATION",
    "PRODUCTION_ARTIFACT",
    "DEPLOYMENT_PREPARATION",
  ];

  const packageId = stableId("pkg", [planId, String(BUILD_PACKAGE_VERSION)]);
  const plan: ExecutableVenturePlan = {
    schemaVersion: EXECUTABLE_VENTURE_PLAN_SCHEMA,
    planId,
    planVersion: PLAN_VERSION,
    kind: "BUILD_WORK",
    ventureId: input.ventureId,
    candidateId: input.candidateId,
    selectionId: input.selectionId,
    organizationId: input.organizationId,
    buildAuthorization: authorization,
    ventureRequirements: {
      name: input.name,
      customer: input.product.targetCustomer,
      problem: input.product.problem,
      promise: input.product.corePromise,
    },
    productRequirements: input.product,
    systemsRequirements: input.systems,
    monetizationRequirements: input.monetization,
    growthRequirements: {
      organicRequired: input.organicRequired,
      creativeMediaRequired: input.creativeMediaRequired,
      qualityOverUrlCount: true,
    },
    footerRequirements: footer,
    phases: phases.map((phase) => ({
      phase,
      purpose: phase,
      taskIds: tasks.filter((task) => task.phase === phase).map((task) => task.taskId),
    })),
    tasks,
    dependencies: tasks.flatMap((task) => task.dependencies.map((from) => ({ from, to: task.taskId }))),
    capabilityRoutes: tasks.map((task) => task.capabilityRoute),
    validationGates: contract.validationCriteria,
    artifactRequirements: contract,
    deploymentPrerequisites: [
      "Production Artifact Handoff must exist",
      "Deployment readiness may be evaluated",
      "Public deployment remains unauthorized",
    ],
    traceability: { ...traceability, taskIds: tasks.map((task) => task.taskId) },
    status: "READY_TO_EXECUTE",
    publicLaunch: false,
  };

  const buildPackage: VentureBuildPackage = {
    schemaVersion: "venture_build_package_v1",
    packageId,
    packageVersion: BUILD_PACKAGE_VERSION,
    identity: {
      ventureId: input.ventureId,
      candidateId: input.candidateId,
      name: input.name,
    },
    requirements: input.product,
    mvpScope: input.product.mvpScope,
    systemsArchitecture: input.systems,
    monetization: input.monetization,
    designRequirements: ["Venture brand remains primary", "Footer attribution is typed, not prompt prose"],
    contentGrowthRequirements: input.organicRequired ? ["Organic architecture only; quality over URL count"] : [],
    publicWebsite: { footerAttribution: footer },
    taskGraph: tasks.map((task) => ({
      taskId: task.taskId,
      phase: task.phase,
      dependencies: task.dependencies,
    })),
    validationRules: contract.validationCriteria,
    artifactContract: contract,
    traceability: { ...traceability, taskIds: tasks.map((task) => task.taskId) },
  };

  return { plan, buildPackage };
}

function compileValidationArtifactPlan(input: CompileInput): {
  plan: ExecutableVenturePlan;
  buildPackage: VentureBuildPackage | null;
} {
  const authorization = evaluateValidationArtifactAuthorization(input);
  const planId = stableId("vplan", [
    input.organizationId,
    input.ventureId,
    String(PLAN_VERSION),
    authorization.result,
    "validation_artifact",
  ]);
  const footer = canonicalFooterRequirement();
  const contract = artifactContract(input.name, "validation_landing");
  const traceability: TraceabilityRef = {
    candidateId: input.candidateId,
    researchIds: input.researchIds,
    monetizationPlanId: input.monetizationPlanId,
    selectionId: input.selectionId,
    assemblyId: input.ventureId,
    planId,
    missionId: null,
    taskIds: [],
    artifactId: null,
    validationId: null,
    handoffId: null,
  };

  if (authorization.result !== "AUTHORIZED_VALIDATION_ARTIFACT") {
    const plan: ExecutableVenturePlan = {
      schemaVersion: EXECUTABLE_VENTURE_PLAN_SCHEMA,
      planId,
      planVersion: PLAN_VERSION,
      kind: "BLOCKED",
      ventureId: input.ventureId,
      candidateId: input.candidateId,
      selectionId: input.selectionId,
      organizationId: input.organizationId,
      buildAuthorization: authorization,
      ventureRequirements: {
        name: input.name,
        customer: input.product.targetCustomer,
        problem: input.product.problem,
        promise: input.product.corePromise,
      },
      productRequirements: input.product,
      systemsRequirements: input.systems,
      monetizationRequirements: input.monetization,
      growthRequirements: {
        organicRequired: false,
        creativeMediaRequired: false,
        qualityOverUrlCount: true,
      },
      footerRequirements: footer,
      phases: [],
      tasks: [],
      dependencies: [],
      capabilityRoutes: [],
      validationGates: ["Validation artifact is not authorized"],
      artifactRequirements: contract,
      deploymentPrerequisites: ["Do not deploy a blocked validation experiment."],
      traceability,
      status: "BLOCKED",
      publicLaunch: false,
    };
    return { plan, buildPackage: null };
  }

  const base = { planId, ventureId: input.ventureId, candidateId: input.candidateId };
  const definition = buildTask({
    ...base,
    phase: "VENTURE_DEFINITION",
    slug: "experiment-scope",
    purpose: "Lock the validation offer: customer, problem, leave-outs, and early-access disclosure.",
    inputs: [input.product.targetCustomer, input.product.problem],
    capability: "architecture",
    capabilityKey: "blueprint.validate",
    roomId: "company_operations",
    dependencies: [],
    expectedArtifact: "experiment_definition",
    validation: "Offer copy is evidence-backed and not a full product spec.",
    external: false,
  });
  const spec = buildTask({
    ...base,
    phase: "PRODUCT_SPECIFICATION",
    slug: "landing-spec",
    purpose: "Specify the validation landing page, intent form, and pricing hypotheses.",
    inputs: input.product.mvpScope,
    capability: "architecture",
    capabilityKey: "blueprint.validate",
    roomId: "company_operations",
    dependencies: [definition.taskId],
    expectedArtifact: "landing_requirements",
    validation: "Landing explains the offer without claiming the full CRE product exists.",
    external: false,
  });
  const money = buildTask({
    ...base,
    phase: "MONETIZATION_CONFIGURATION",
    slug: "pricing-hypotheses",
    purpose: "Expose pricing hypotheses as an experiment, not proven WTP. Payments stay disabled.",
    inputs: [input.monetization.model, input.monetization.pricing],
    capability: "architecture",
    capabilityKey: "blueprint.validate",
    roomId: "strategy_finance",
    dependencies: [spec.taskId],
    expectedArtifact: "pricing_hypotheses",
    validation: "No checkout. No fake purchase success. No proven-price claim.",
    external: false,
  });
  const build = buildTask({
    ...base,
    phase: "PRODUCT_BUILD",
    slug: "landing-pab",
    purpose: "Generate the validation landing artifact through Product / Asset Builder.",
    inputs: [spec.taskId, money.taskId],
    capability: "coding",
    capabilityKey: "website.generate_pages",
    roomId: "product_lab",
    dependencies: [spec.taskId, money.taskId],
    expectedArtifact: "validation_landing_source",
    validation: "Landing, form, events, footer, and disclosure exist.",
    external: false,
  });
  const qa = buildTask({
    ...base,
    phase: "QUALITY_VALIDATION",
    slug: "landing-qa",
    purpose: "Validate the landing contract, footer, form schema, and secret scan.",
    inputs: [build.taskId],
    capability: "validation",
    capabilityKey: "qa.verify_internal_website",
    roomId: "quality_control",
    dependencies: [build.taskId],
    expectedArtifact: "qa_report",
    validation: "Artifact contract passes before any deployment authorization.",
    external: false,
  });
  const production = buildTask({
    ...base,
    phase: "PRODUCTION_ARTIFACT",
    slug: "landing-handoff",
    purpose: "Collect Production Artifact Handoff for the validation landing only.",
    inputs: [qa.taskId],
    capability: "validation",
    capabilityKey: "qa.verify_internal_build",
    roomId: "quality_control",
    dependencies: [qa.taskId],
    expectedArtifact: "production_artifact_handoff",
    validation: "Handoff exists. Full product BUILD remains unauthorized.",
    external: false,
  });
  const deployPrep = buildTask({
    ...base,
    phase: "DEPLOYMENT_PREPARATION",
    slug: "experiment-readiness",
    purpose: "Evaluate hosting-only deployment readiness. Domain, DNS, Stripe, and ads remain forbidden.",
    inputs: [production.taskId],
    capability: "deployment_preparation",
    capabilityKey: "launch.evaluate_external_authorization",
    roomId: "launch_operations",
    dependencies: [production.taskId],
    expectedArtifact: "deployment_readiness",
    validation: "READY is not MARKET VALIDATED. EAG still required for the one allowed deploy.",
    external: true,
  });
  const instrument = buildTask({
    ...base,
    phase: "QUALITY_VALIDATION",
    slug: "instrument",
    purpose: "Instrument Performance Intelligence events with experiment lineage. Synthetic stays isolated.",
    inputs: [qa.taskId],
    capability: "validation",
    capabilityKey: "qa.verify_plan_step_output",
    roomId: "intelligence_center",
    dependencies: [qa.taskId],
    expectedArtifact: "event_schema",
    validation: "Events carry candidate, experiment, artifact, and synthetic flags.",
    external: false,
  });

  const tasks = orderTasks([definition, spec, money, build, qa, instrument, production, deployPrep]);
  const packageId = stableId("pkg", [planId, String(BUILD_PACKAGE_VERSION), "validation_landing"]);
  const plan: ExecutableVenturePlan = {
    schemaVersion: EXECUTABLE_VENTURE_PLAN_SCHEMA,
    planId,
    planVersion: PLAN_VERSION,
    kind: "VALIDATION_ARTIFACT_WORK",
    ventureId: input.ventureId,
    candidateId: input.candidateId,
    selectionId: input.selectionId,
    organizationId: input.organizationId,
    buildAuthorization: authorization,
    ventureRequirements: {
      name: input.name,
      customer: input.product.targetCustomer,
      problem: input.product.problem,
      promise: input.product.corePromise,
    },
    productRequirements: input.product,
    systemsRequirements: input.systems,
    monetizationRequirements: { ...input.monetization, paymentsNeeded: false, livePaymentActivation: false },
    growthRequirements: {
      organicRequired: false,
      creativeMediaRequired: false,
      qualityOverUrlCount: true,
    },
    footerRequirements: footer,
    phases: (
      [
        "VENTURE_DEFINITION",
        "PRODUCT_SPECIFICATION",
        "MONETIZATION_CONFIGURATION",
        "PRODUCT_BUILD",
        "QUALITY_VALIDATION",
        "PRODUCTION_ARTIFACT",
        "DEPLOYMENT_PREPARATION",
      ] as const satisfies readonly ExecutablePhase[]
    ).map((phase) => ({
      phase,
      purpose: phase,
      taskIds: tasks.filter((task) => task.phase === phase).map((task) => task.taskId),
    })),
    tasks,
    dependencies: tasks.flatMap((task) => task.dependencies.map((from) => ({ from, to: task.taskId }))),
    capabilityRoutes: tasks.map((task) => task.capabilityRoute),
    validationGates: [
      ...contract.validationCriteria,
      "Do not execute full product BUILD",
      "Do not activate payments",
    ],
    artifactRequirements: contract,
    deploymentPrerequisites: [
      "Validation landing handoff must exist",
      "Domain purchase is not required",
      "DNS writes are not required",
      "EAG is required before the one allowed hosting deployment",
    ],
    traceability: { ...traceability, taskIds: tasks.map((task) => task.taskId) },
    status: "READY_TO_EXECUTE",
    publicLaunch: false,
  };

  const buildPackage: VentureBuildPackage = {
    schemaVersion: "venture_build_package_v1",
    packageId,
    packageVersion: BUILD_PACKAGE_VERSION,
    identity: {
      ventureId: input.ventureId,
      candidateId: input.candidateId,
      name: input.name,
    },
    requirements: input.product,
    mvpScope: input.product.mvpScope,
    systemsArchitecture: input.systems,
    monetization: plan.monetizationRequirements,
    designRequirements: [
      "Validation disclosure is visible",
      "No fake scarcity, countdown, or customer count",
      "Footer attribution is typed, not prompt prose",
    ],
    contentGrowthRequirements: [],
    publicWebsite: { footerAttribution: footer },
    taskGraph: tasks.map((task) => ({
      taskId: task.taskId,
      phase: task.phase,
      dependencies: task.dependencies,
    })),
    validationRules: plan.validationGates,
    artifactContract: contract,
    traceability: { ...traceability, taskIds: tasks.map((task) => task.taskId) },
  };

  return { plan, buildPackage };
}
