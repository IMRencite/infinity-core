import { createHash } from "node:crypto";
import type { VentureSandbox } from "../../workspace/sandbox";
import type { FeatureContract, RepositoryMapEntry } from "../types";

export async function buildRepositoryMap(
  sandbox: VentureSandbox,
  contracts: FeatureContract[],
): Promise<RepositoryMapEntry[]> {
  const files = await sandbox.listFiles();
  const entries: RepositoryMapEntry[] = [];
  for (const file of files) {
    if (file.includes("node_modules") || file.includes(".next")) continue;
    const content = await sandbox.readTextFile(file).catch(() => "");
    const hash = createHash("sha256").update(content).digest("hex");
    const featureIds = contracts
      .filter(
        (c) =>
          c.requiredRoutes.some((r) => routeMatchesFile(r, file)) ||
          c.requiredTests.some((t) => file.includes(t.replace(".test.ts", ""))),
      )
      .map((c) => c.featureId);
    entries.push({
      relativePath: file,
      moduleKind: inferModuleKind(file),
      exports: extractExports(content),
      routes: extractRoutes(file),
      entities: extractEntities(content),
      featureIds,
      dependencies: extractImports(content),
      contentHash: hash,
    });
  }
  return entries;
}

function inferModuleKind(file: string): string {
  if (file.startsWith("app/api/")) return "api";
  if (file.startsWith("app/")) return "page";
  if (file.startsWith("lib/db/")) return "database";
  if (file.startsWith("lib/auth/")) return "auth";
  if (file.startsWith("lib/marketplace/")) return "domain";
  if (file.startsWith("__tests__/")) return "test";
  return "module";
}

function extractExports(content: string): string[] {
  return [...content.matchAll(/export (?:async )?(?:function|const|class|type) (\w+)/g)].map((m) => m[1]!);
}

function extractRoutes(file: string): string[] {
  if (!file.startsWith("app/") || file.endsWith("page.tsx")) {
    return [file.replace(/^app/, "").replace(/\/page\.tsx$/, "").replace(/page\.tsx$/, "/") || "/"];
  }
  if (file.includes("/api/") && file.endsWith("/route.ts")) {
    return [file.replace(/^app/, "").replace(/\/route\.ts$/, "")];
  }
  return [];
}

function extractEntities(content: string): string[] {
  const entities = new Set<string>();
  for (const m of content.matchAll(/type (\w+) = \{/g)) entities.add(m[1]!.toLowerCase());
  for (const m of content.matchAll(/interface (\w+)/g)) entities.add(m[1]!.toLowerCase());
  return [...entities];
}

function extractImports(content: string): string[] {
  return [...content.matchAll(/from ["']([@./][^"']+)["']/g)].map((m) => m[1]!);
}

function routeMatchesFile(route: string, file: string): boolean {
  const candidates = route.startsWith("/api/")
    ? [`app/api${route.replace(/^\/api/, "")}/route.ts`.replace(/\[id\]/g, "[id]")]
    : [`app${route === "/" ? "/page.tsx" : `${route}/page.tsx`}`.replace(/\[id\]/g, "[id]")];
  return candidates.some((c) => file === c || file.startsWith(c.replace("/page.tsx", "")));
}

export function queryTraceabilityForRevenuePath(
  map: RepositoryMapEntry[],
  featureId: string,
): string[] {
  return map.filter((e) => e.featureIds.includes(featureId)).map((e) => e.relativePath);
}
