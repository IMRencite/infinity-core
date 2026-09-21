import {
  CLIENT_SAFE_BARREL_EXPORT_GATE,
  CLIENT_SAFE_BARRELS,
  HQ_RUNTIME_GRAPH_ENTRIES,
  HQ_RUNTIME_MODULE_GRAPH_INTEGRITY_GATE,
  SERVER_CLIENT_BOUNDARY_INTEGRITY_GATE,
  type NamedGateResult,
} from "./contract";
import {
  findImportCycles,
  isHeavyCanonicalEngine,
  listClientComponentFiles,
  relativeToRoot,
  resolveWorkspaceFile,
  walkRuntimeGraph,
} from "./graph";

export function evaluateClientSafeBarrelExportGate(
  barrels: readonly string[] = CLIENT_SAFE_BARRELS,
): NamedGateResult {
  const reasons: string[] = [];
  for (const barrel of barrels) {
    const graph = walkRuntimeGraph([resolveWorkspaceFile(barrel)], { relativeOnly: true });
    for (const hit of graph.prohibited) {
      reasons.push(`${barrel} -> ${hit.specifier}`);
    }
  }
  return {
    gate: CLIENT_SAFE_BARREL_EXPORT_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateServerClientBoundaryIntegrityGate(): NamedGateResult & {
  clientComponentCount: number;
  playwrightReach: number;
  asyncHooksReach: number;
  heavyEngineClients: number;
} {
  const clients = listClientComponentFiles();
  const graph = walkRuntimeGraph(clients);
  const reasons = graph.prohibited.map((hit) => `${hit.from} -> ${hit.specifier}`);
  const playwrightReach = graph.prohibited.filter((hit) => /playwright/i.test(hit.specifier) || /served-production-browser/.test(hit.resolved)).length;
  const asyncHooksReach = graph.prohibited.filter((hit) => /async_hooks/.test(hit.specifier)).length;
  const heavyEngineClients = clients.filter((file) => {
    const local = walkRuntimeGraph([file]);
    return local.files.some((reached) => isHeavyCanonicalEngine(reached)) || local.heavyEngineEntries.length > 0;
  }).length;
  return {
    gate: SERVER_CLIENT_BOUNDARY_INTEGRITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    clientComponentCount: clients.length,
    playwrightReach,
    asyncHooksReach,
    heavyEngineClients,
  };
}

export function evaluateHQRuntimeModuleGraphIntegrityGate(): NamedGateResult & {
  cycles: string[][];
  playwrightReach: number;
  asyncHooksReach: number;
  serverOnlyReach: number;
  resolveReach: number;
} {
  const clients = listClientComponentFiles();
  const graph = walkRuntimeGraph(clients);
  const cycles = findImportCycles(
    HQ_RUNTIME_GRAPH_ENTRIES.map((entry) => resolveWorkspaceFile(entry)),
    { boundedToHqRuntime: true },
  );
  const playwrightReach = graph.prohibited.filter(
    (hit) => /playwright/i.test(hit.specifier) || /served-production-browser/.test(hit.resolved),
  ).length;
  const asyncHooksReach = graph.prohibited.filter((hit) => /async_hooks/.test(hit.specifier)).length;
  const serverOnlyReach = graph.prohibited.filter((hit) => hit.specifier === "server-only" || /server-only/.test(hit.resolved)).length;
  const resolveReach = graph.files.filter((file) => /hq-inspection-identity\/resolve\.ts$/.test(file.replace(/\\/g, "/"))).length
    + graph.prohibited.filter((hit) => /hq-inspection-identity\/resolve\.ts$/.test(hit.resolved.replace(/\\/g, "/"))).length;
  const reasons = [
    ...cycles.map((cycle) => `CYCLE:${cycle.join(" -> ")}`),
    ...graph.prohibited.map((hit) => `${hit.from} -> ${hit.specifier}`),
  ];
  if (resolveReach > 0) reasons.push("CLIENT_REACHES_HQ_INSPECTION_RESOLVE");
  return {
    gate: HQ_RUNTIME_MODULE_GRAPH_INTEGRITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    cycles,
    playwrightReach,
    asyncHooksReach,
    serverOnlyReach,
    resolveReach,
  };
}

export function clientGraphSummary() {
  const clients = listClientComponentFiles();
  const graph = walkRuntimeGraph(clients);
  return {
    clientFiles: clients.map(relativeToRoot),
    playwright: graph.prohibited.filter((hit) => /playwright/i.test(hit.specifier) || /served-production-browser/.test(hit.resolved)).length,
    asyncHooks: graph.prohibited.filter((hit) => /async_hooks/.test(hit.specifier)).length,
    heavyEngineClients: clients.filter((file) => walkRuntimeGraph([file]).files.some((reached) => isHeavyCanonicalEngine(reached))).length,
  };
}
