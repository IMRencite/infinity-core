import type { BuildGraph, BuildPhase, BuildTask, ProductArchitecture, TechnicalArchitecture } from "../types";

function complexityCost(complexity: BuildTask["estimatedComplexity"]): number {
  if (complexity === "high") return 12000;
  if (complexity === "medium") return 6000;
  return 2500;
}

function complexityDays(complexity: BuildTask["estimatedComplexity"]): number {
  if (complexity === "high") return 21;
  if (complexity === "medium") return 10;
  return 4;
}

export function generateBuildGraph(input: {
  productArchitecture: ProductArchitecture;
  technicalArchitecture: TechnicalArchitecture;
}): BuildGraph {
  const tasks: BuildTask[] = [
    {
      taskId: "foundation_schema",
      name: "Conceptual schema & migrations plan",
      description: "Define entities, relationships, and migration strategy aligned to data model",
      category: "foundation",
      dependencies: [],
      requiredCapabilities: ["database_design"],
      estimatedComplexity: "medium",
      estimatedCost: 5000,
      estimatedDurationDays: 7,
      parallelizable: false,
      blocking: true,
      deliverables: ["Entity diagram", "Migration plan", "Index plan"],
      verificationCriteria: ["All MVP entities represented", "Ownership and retention documented"],
    },
    {
      taskId: "auth_rbac",
      name: "Authentication & RBAC",
      description: "Implement auth flows and role-based permissions",
      category: "foundation",
      dependencies: ["foundation_schema"],
      requiredCapabilities: ["authentication", "authorization"],
      estimatedComplexity: "medium",
      estimatedCost: 6000,
      estimatedDurationDays: 8,
      parallelizable: false,
      blocking: true,
      deliverables: ["Login/signup", "Session handling", "Role guards"],
      verificationCriteria: ["Protected routes enforced", "Role tests pass"],
    },
    {
      taskId: "analytics_events",
      name: "Analytics event contract",
      description: "Implement core event schema and instrumentation hooks",
      category: "analytics",
      dependencies: ["auth_rbac"],
      requiredCapabilities: ["analytics"],
      estimatedComplexity: "low",
      estimatedCost: 2500,
      estimatedDurationDays: 4,
      parallelizable: true,
      blocking: true,
      deliverables: ["Event catalog wiring", "Revenue/funnel events"],
      verificationCriteria: ["North star + revenue events emitted in staging"],
    },
  ];

  for (const feature of input.productArchitecture.features.filter((f) => f.mvpRequired)) {
    const taskId = `feature_${feature.featureName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40)}`;
    const deps = ["auth_rbac"];
    tasks.push({
      taskId,
      name: feature.featureName,
      description: feature.description,
      category: "core_product",
      dependencies: deps,
      requiredCapabilities: [feature.userRole, "software_development"],
      estimatedComplexity: feature.complexity,
      estimatedCost: complexityCost(feature.complexity),
      estimatedDurationDays: complexityDays(feature.complexity),
      parallelizable: true,
      blocking: feature.priority === "MUST_HAVE",
      deliverables: [`${feature.featureName} MVP surface`],
      verificationCriteria: [feature.successMetric, "Role permissions validated"],
    });
  }

  if (/payment|stripe|billing|subscription|transaction/i.test(input.technicalArchitecture.paymentRequirements.join(" "))) {
    tasks.push({
      taskId: "monetization_billing",
      name: "Monetization & billing integration",
      description: "Implement primary revenue mechanism with provider abstraction (no live account creation in V1)",
      category: "monetization",
      dependencies: tasks.filter((t) => t.category === "core_product" && t.blocking).map((t) => t.taskId).slice(0, 1).concat(["auth_rbac"]),
      requiredCapabilities: ["billing_integration"],
      estimatedComplexity: "high",
      estimatedCost: 9000,
      estimatedDurationDays: 14,
      parallelizable: false,
      blocking: true,
      deliverables: ["Checkout/subscription flow", "Webhook handlers", "Entitlement sync"],
      verificationCriteria: ["Test-mode revenue path validated", "Refund/cancel flows documented"],
    });
  }

  tasks.push({
    taskId: "launch_readiness",
    name: "Launch readiness verification",
    description: "QA, observability checks, failure criteria wiring, staging verification",
    category: "launch",
    dependencies: [...new Set(tasks.filter((t) => t.blocking).map((t) => t.taskId))],
    requiredCapabilities: ["qa", "observability"],
    estimatedComplexity: "medium",
    estimatedCost: 4000,
    estimatedDurationDays: 7,
    parallelizable: false,
    blocking: true,
    deliverables: ["Launch checklist", "Monitoring dashboards", "Failure signal alerts"],
    verificationCriteria: ["MVP journey passes in staging", "Analytics events verified"],
  });

  const estimatedTotalCost = tasks.reduce((sum, task) => sum + task.estimatedCost, 0);
  const estimatedTotalDurationDays = tasks.reduce((sum, task) => sum + task.estimatedDurationDays, 0);

  return {
    tasks,
    criticalPath: ["foundation_schema", "auth_rbac", "monetization_billing", "launch_readiness"].filter((id) =>
      tasks.some((t) => t.taskId === id),
    ),
    estimatedTotalCost,
    estimatedTotalDurationDays,
  };
}

export function generateBuildPhases(buildGraph: BuildGraph): BuildPhase[] {
  const byCategory = (category: string) => buildGraph.tasks.filter((t) => t.category === category);
  const phaseDefs = [
    { phaseName: "Foundation", category: "foundation", objective: "Establish data, auth, and platform skeleton" },
    { phaseName: "Core Product", category: "core_product", objective: "Deliver MVP features that create core value" },
    { phaseName: "Monetization", category: "monetization", objective: "Implement revenue mechanism and billing path" },
    { phaseName: "Analytics", category: "analytics", objective: "Instrument learning loop and KPIs" },
    { phaseName: "Launch Preparation", category: "launch", objective: "Verify readiness without production launch" },
  ];

  return phaseDefs
    .map((phase) => {
      const tasks = byCategory(phase.category);
      if (tasks.length === 0 && phase.category === "monetization") return null;
      const allTasks = phase.category === "core_product" ? buildGraph.tasks.filter((t) => t.category === "core_product") : tasks;
      if (allTasks.length === 0 && phase.category !== "launch") return null;
      const selected = phase.category === "launch" ? byCategory("launch") : allTasks;
      return {
        phaseName: phase.phaseName,
        objective: phase.objective,
        tasks: selected.map((t) => t.taskId),
        entryCriteria: phase.phaseName === "Foundation" ? ["Company Builder blueprint approved"] : [`Prior phase tasks complete`],
        exitCriteria: selected.map((t) => `${t.taskId} verification criteria met`),
        dependencies: selected.flatMap((t) => t.dependencies),
        estimatedCost: selected.reduce((s, t) => s + t.estimatedCost, 0),
        estimatedDurationDays: selected.reduce((s, t) => s + t.estimatedDurationDays, 0),
      };
    })
    .filter((phase): phase is BuildPhase => phase != null);
}

export function validateBuildGraphDag(buildGraph: BuildGraph): { valid: boolean; cycles: string[] } {
  const graph = new Map<string, string[]>();
  for (const task of buildGraph.tasks) graph.set(task.taskId, task.dependencies);

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycles: string[] = [];

  function dfs(node: string, path: string[]): boolean {
    if (visiting.has(node)) {
      cycles.push([...path, node].join(" -> "));
      return false;
    }
    if (visited.has(node)) return true;
    visiting.add(node);
    for (const dep of graph.get(node) ?? []) {
      if (!graph.has(dep)) continue;
      if (!dfs(dep, [...path, node])) return false;
    }
    visiting.delete(node);
    visited.add(node);
    return true;
  }

  let valid = true;
  for (const task of buildGraph.tasks) {
    if (!dfs(task.taskId, [])) valid = false;
  }
  return { valid, cycles };
}
