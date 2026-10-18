import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import manifest from "./runtime-file-dependency-manifest.v1.json";

export type RuntimeFileReadTiming = "MODULE_LOAD" | "REQUEST_TIME" | "BUILD_ONLY" | "TEST_ONLY";

export type RuntimeFileReadTarget = {
  repo_relative_path: string;
  reader: string;
  timing: RuntimeFileReadTiming;
};

export type RuntimeRouteFileDependencyManifest = {
  originating_modules: string[];
  module_load_read_targets: RuntimeFileReadTarget[];
};

export type RuntimeFileDependencyManifestDoc = {
  schema: "RUNTIME_FILE_DEPENDENCY_MANIFEST_V1";
  routes: Record<string, RuntimeRouteFileDependencyManifest>;
  shared_portfolio_commerce_trace_globs: string[];
};

export const RUNTIME_FILE_DEPENDENCY_MANIFEST_V1 = manifest as RuntimeFileDependencyManifestDoc;

export function loadRuntimeFileDependencyManifest(cwd = process.cwd()): RuntimeFileDependencyManifestDoc {
  const local = join(cwd, "lib/infinity/runtime-operations/runtime-file-dependency-manifest.v1.json");
  if (existsSync(local)) {
    return JSON.parse(readFileSync(local, "utf8")) as RuntimeFileDependencyManifestDoc;
  }
  return RUNTIME_FILE_DEPENDENCY_MANIFEST_V1;
}

export function moduleLoadPathsForRoute(route: string, cwd = process.cwd()): string[] {
  const doc = loadRuntimeFileDependencyManifest(cwd);
  const row = doc.routes[route];
  if (!row) return [];
  return row.module_load_read_targets
    .filter((t) => t.timing === "MODULE_LOAD")
    .map((t) => t.repo_relative_path);
}

export function sharedPortfolioCommerceTraceGlobs(cwd = process.cwd()): string[] {
  return [...loadRuntimeFileDependencyManifest(cwd).shared_portfolio_commerce_trace_globs];
}
