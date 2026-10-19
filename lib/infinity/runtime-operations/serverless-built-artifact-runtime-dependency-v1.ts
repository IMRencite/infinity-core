import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadRuntimeFileDependencyManifest,
  type RuntimeDependencySpec,
} from "./runtime-file-dependency-manifest-v1";
import { parseOutputFileTracingIncludes } from "./serverless-runtime-file-trace-closure-v1";

export const SERVERLESS_BUILT_ARTIFACT_RUNTIME_DEPENDENCY_QC =
  "SERVERLESS_BUILT_ARTIFACT_RUNTIME_DEPENDENCY_QC" as const;

export type BuiltArtifactRouteResult = {
  route: string;
  dependency_type: "RUNTIME_DISK_FILE" | "BUNDLED_MODULE";
  repo_relative_path?: string;
  present_in_nft: boolean | "not_applicable";
  listed_in_source_trace_config: boolean | "not_applicable";
};

function routeToNftRel(routeKey: string): string {
  const normalized = routeKey.replace(/^\//, "");
  return join("server", "app", normalized, "route.js.nft.json");
}

export function readRouteNftPaths(nextRoot: string, routeKey: string): string[] {
  const nftPath = join(nextRoot, ".next", routeToNftRel(routeKey));
  if (!existsSync(nftPath)) return [];
  const parsed = JSON.parse(readFileSync(nftPath, "utf8")) as { files?: string[] };
  return parsed.files ?? [];
}

export function evaluateServerlessBuiltArtifactRuntimeDependencyQc(input: {
  cwd?: string;
  nextRoot?: string;
  nextConfigRelativePath?: string;
}): {
  SERVERLESS_BUILT_ARTIFACT_RUNTIME_DEPENDENCY_QC: "PASS" | "FAIL";
  SOURCE_TRACE_QC: "PASS" | "FAIL" | "SKIPPED";
  rows: BuiltArtifactRouteResult[];
  missing: string[];
} {
  const cwd = input.cwd ?? process.cwd();
  const nextRoot = input.nextRoot ?? cwd;
  const doc = loadRuntimeFileDependencyManifest(cwd);
  const nextSource = existsSync(join(cwd, input.nextConfigRelativePath ?? "next.config.ts"))
    ? readFileSync(join(cwd, input.nextConfigRelativePath ?? "next.config.ts"), "utf8")
    : "";
  const sourceIncludes = parseOutputFileTracingIncludes(nextSource);
  const rows: BuiltArtifactRouteResult[] = [];
  const missing: string[] = [];

  for (const [route, row] of Object.entries(doc.routes)) {
    if (!route.startsWith("/api/runtime/")) continue;
    const deps: RuntimeDependencySpec[] = row.runtime_dependencies ?? [];
    const nftPaths = readRouteNftPaths(nextRoot, route.endsWith("/route") ? route.replace(/\/route$/, "") : route);
    const hasNft = nftPaths.length > 0;

    for (const dep of deps) {
      if (dep.dependency_type === "BUNDLED_MODULE") {
        rows.push({
          route,
          dependency_type: "BUNDLED_MODULE",
          present_in_nft: "not_applicable",
          listed_in_source_trace_config: "not_applicable",
        });
        continue;
      }
      const rel = dep.repo_relative_path ?? "";
      const glob = `./${rel.replace(/\\/g, "/")}`;
      const listed = (sourceIncludes[route] ?? []).some((e) => e === glob || e.endsWith(rel));
      const present = hasNft && nftPaths.some((p) => String(p).replace(/\\/g, "/").includes(rel.replace(/\\/g, "/")));
      rows.push({
        route,
        dependency_type: "RUNTIME_DISK_FILE",
        repo_relative_path: rel,
        present_in_nft: present,
        listed_in_source_trace_config: listed,
      });
      if (!present) missing.push(`${route}:${rel}:missing_from_nft`);
    }
  }

  const diskRows = rows.filter((r) => r.dependency_type === "RUNTIME_DISK_FILE");
  const sourceTraceFail = diskRows.some((r) => r.listed_in_source_trace_config === true && r.present_in_nft === false);
  const artifactFail = missing.length > 0;

  return {
    SERVERLESS_BUILT_ARTIFACT_RUNTIME_DEPENDENCY_QC: artifactFail ? "FAIL" : "PASS",
    SOURCE_TRACE_QC: nextSource ? (sourceTraceFail ? "FAIL" : "PASS") : "SKIPPED",
    rows,
    missing,
  };
}
