import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadRuntimeFileDependencyManifest,
  moduleLoadPathsForRoute,
  sharedPortfolioCommerceTraceGlobs,
} from "./runtime-file-dependency-manifest-v1";

export const SERVERLESS_RUNTIME_FILE_TRACE_CLOSURE_QC =
  "SERVERLESS_RUNTIME_FILE_TRACE_CLOSURE_QC" as const;

export type TraceClosureRow = {
  route: string;
  repo_relative_path: string;
  exists_on_disk: boolean;
  listed_in_output_file_tracing_includes: boolean;
};

function parseQuotedTracePathsFromArray(source: string, openBracketIndex: number): string[] {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = openBracketIndex; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        const inner = source.slice(openBracketIndex + 1, i);
        return [...inner.matchAll(/"(\.\/[^"]+)"/g)].map((x) => x[1]);
      }
    }
  }
  return [];
}

export function parseOutputFileTracingIncludes(nextConfigSource: string): Record<string, string[]> {
  const blockMatch = nextConfigSource.match(/outputFileTracingIncludes:\s*\{([\s\S]*?)\}\s*,?\s*(?:\/\*|$)/);
  const block = blockMatch?.[1] ?? "";
  if (!block.trim()) return {};
  const routes: Record<string, string[]> = {};
  const routeRe = /"(\/api\/runtime\/[^"]+)":\s*\[/g;
  let m: RegExpExecArray | null;
  while ((m = routeRe.exec(block)) !== null) {
    const openBracketIndex = m.index + m[0].length - 1;
    routes[m[1]] = parseQuotedTracePathsFromArray(block, openBracketIndex);
  }
  return routes;
}

export function evaluateServerlessRuntimeFileTraceClosureQc(input: {
  cwd?: string;
  nextConfigRelativePath?: string;
}): {
  SERVERLESS_RUNTIME_FILE_TRACE_CLOSURE_QC: "PASS" | "FAIL";
  rows: TraceClosureRow[];
  missing_on_disk: string[];
  missing_from_trace_includes: string[];
  routes_audited: string[];
} {
  const cwd = input.cwd ?? process.cwd();
  const nextPath = join(cwd, input.nextConfigRelativePath ?? "next.config.ts");
  const nextSource = existsSync(nextPath) ? readFileSync(nextPath, "utf8") : "";
  const includes = parseOutputFileTracingIncludes(nextSource);

  const manifestDoc = loadRuntimeFileDependencyManifest(cwd);
  const rows: TraceClosureRow[] = [];
  const missing_on_disk: string[] = [];
  const missing_from_trace_includes: string[] = [];
  const routes_audited = Object.keys(manifestDoc.routes);

  for (const route of routes_audited) {
    for (const rel of moduleLoadPathsForRoute(route, cwd)) {
      const abs = join(cwd, rel);
      const exists_on_disk = existsSync(abs);
      const traceEntries = includes[route] ?? [];
      const glob = `./${rel.replace(/\\/g, "/")}`;
      const listed = traceEntries.some((entry) => entry === glob || entry.endsWith(rel));
      rows.push({ route, repo_relative_path: rel, exists_on_disk, listed_in_output_file_tracing_includes: listed });
      if (!exists_on_disk) missing_on_disk.push(`${route}:${rel}`);
      if (!listed) missing_from_trace_includes.push(`${route}:${rel}`);
    }
  }

  const shared = sharedPortfolioCommerceTraceGlobs(cwd);
  for (const route of ["/api/runtime/portfolio-operating-tick", "/api/runtime/portfolio-job-worker"] as const) {
    for (const glob of shared) {
      const rel = glob.replace(/^\.\//, "");
      if (rows.some((r) => r.route === route && r.repo_relative_path === rel)) continue;
      const listed = (includes[route] ?? []).includes(glob);
      if (!listed) missing_from_trace_includes.push(`${route}:${rel}`);
    }
  }

  const fail = missing_on_disk.length > 0 || missing_from_trace_includes.length > 0;
  return {
    SERVERLESS_RUNTIME_FILE_TRACE_CLOSURE_QC: fail ? "FAIL" : "PASS",
    rows,
    missing_on_disk,
    missing_from_trace_includes,
    routes_audited,
  };
}

export function evaluatePortfolioServerlessModuleInitQc(): {
  PORTFOLIO_SERVERLESS_MODULE_INIT_QC: "PASS" | "FAIL";
  reason: string | null;
} {
  try {
    const trace = evaluateServerlessRuntimeFileTraceClosureQc({});
    if (trace.SERVERLESS_RUNTIME_FILE_TRACE_CLOSURE_QC !== "PASS") {
      return {
        PORTFOLIO_SERVERLESS_MODULE_INIT_QC: "FAIL",
        reason: "TRACE_CLOSURE_NOT_PASS",
      };
    }
    return { PORTFOLIO_SERVERLESS_MODULE_INIT_QC: "PASS", reason: null };
  } catch (error) {
    return {
      PORTFOLIO_SERVERLESS_MODULE_INIT_QC: "FAIL",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
