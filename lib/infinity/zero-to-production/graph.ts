import { validateBuildGraphDag } from "@/lib/infinity/company-builder/build-graph/generate";
import type { BuildGraph, VentureBlueprintDraft } from "@/lib/infinity/company-builder/types";
import type { GraphValidation } from "./types";

export type GraphTaskOwner = "coding" | "creative" | "organic" | "commercialization" | "launch" | "performance";

export function ownerForBuildTask(task: BuildGraph["tasks"][number]): GraphTaskOwner {
  if (task.category === "monetization") return "commercialization";
  if (task.category === "launch") return "launch";
  if (task.category === "analytics") return "performance";
  if (task.requiredCapabilities.some((cap) => /content|creative|media/i.test(cap))) return "creative";
  if (task.requiredCapabilities.some((cap) => /organic|seo|growth/i.test(cap))) return "organic";
  return "coding";
}

export function validateBuildGraphForZtp(blueprint: VentureBlueprintDraft): GraphValidation {
  const graph = blueprint.buildGraph;
  const dag = validateBuildGraphDag(graph);
  const ids = graph.tasks.map((t) => t.taskId);
  const uniqueTaskIds = new Set(ids).size === ids.length;
  const idSet = new Set(ids);
  const dependenciesResolvable = graph.tasks.every((task) => task.dependencies.every((dep) => idSet.has(dep)));
  const mvp = new Set(blueprint.mvpDefinition.includedFeatures.map((f) => f.toLowerCase()));
  const named = graph.tasks.map((t) => t.name.toLowerCase());
  const featureContractsRepresented =
    mvp.size === 0 || [...mvp].some((feature) => named.some((name) => name.includes(feature.slice(0, 12)) || feature.includes(name.slice(0, 12)))) ||
    graph.tasks.some((t) => t.category === "core_product");
  const needsBilling = /payment|stripe|billing|subscription/i.test(blueprint.technicalArchitecture.paymentRequirements.join(" "));
  const commercialRequirementsRepresented = !needsBilling || graph.tasks.some((t) => t.taskId === "monetization_billing" || t.category === "monetization");
  const reasons: string[] = [];
  if (!dag.valid) reasons.push(`cycles:${dag.cycles.join("|")}`);
  if (!uniqueTaskIds) reasons.push("duplicate_task_ids");
  if (!dependenciesResolvable) reasons.push("unresolved_dependencies");
  if (!featureContractsRepresented) reasons.push("missing_feature_contracts");
  if (!commercialRequirementsRepresented) reasons.push("missing_commercial_tasks");
  return {
    valid: dag.valid && uniqueTaskIds && dependenciesResolvable && featureContractsRepresented && commercialRequirementsRepresented,
    cycles: dag.cycles,
    uniqueTaskIds,
    dependenciesResolvable,
    featureContractsRepresented,
    commercialRequirementsRepresented,
    reasons,
  };
}
