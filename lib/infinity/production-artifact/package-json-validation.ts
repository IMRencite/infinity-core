import type { ProductionArtifactFile } from "./types";
import {
  DEPLOYABLE_NEXTJS_VERSION,
  extractNextVersionFromPackageJson,
  validateNextJsVersionForVercel,
} from "./nextjs-version-policy";

export type PackageManager = "npm" | "pnpm" | "yarn" | "unknown";

export type PackageJsonValidationResult = {
  valid: boolean;
  issues: string[];
  packageManager: PackageManager;
  parsed: Record<string, unknown> | null;
};

export function inferPackageManager(relativePaths: string[]): PackageManager {
  const set = new Set(relativePaths.map((p) => p.replace(/\\/g, "/")));
  if (set.has("pnpm-lock.yaml")) return "pnpm";
  if (set.has("yarn.lock")) return "yarn";
  if (set.has("package-lock.json")) return "npm";
  if (set.has("npm-shrinkwrap.json")) return "npm";
  return "unknown";
}

function collectLocalFileDeps(deps: Record<string, unknown> | undefined): string[] {
  if (!deps || typeof deps !== "object") return [];
  const bad: string[] = [];
  for (const [name, version] of Object.entries(deps)) {
    if (typeof version !== "string") continue;
    if (version.startsWith("file:") || version.startsWith("link:") || version.startsWith("workspace:")) {
      bad.push(name);
    }
  }
  return bad;
}

export function validateNextJsPackageJson(input: {
  packageJsonContent: string | null;
  relativePaths: string[];
  framework: string;
}): PackageJsonValidationResult {
  const issues: string[] = [];
  const packageManager = inferPackageManager(input.relativePaths);

  if (input.framework !== "nextjs") {
    return { valid: true, issues: [], packageManager, parsed: null };
  }

  if (!input.packageJsonContent) {
    return {
      valid: false,
      issues: ["missing_package_json"],
      packageManager,
      parsed: null,
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(input.packageJsonContent) as Record<string, unknown>;
  } catch {
    return { valid: false, issues: ["invalid_package_json"], packageManager, parsed: null };
  }

  const deps = (parsed.dependencies ?? {}) as Record<string, unknown>;
  const devDeps = (parsed.devDependencies ?? {}) as Record<string, unknown>;
  const allDeps = { ...deps, ...devDeps };

  if (!allDeps.next) issues.push("missing_next_dependency");
  if (!allDeps.react) issues.push("missing_react_dependency");
  if (!allDeps["react-dom"]) issues.push("missing_react_dom_dependency");

  const scripts = parsed.scripts;
  if (!scripts || typeof scripts !== "object") {
    issues.push("missing_scripts");
  } else {
    const build = String((scripts as Record<string, unknown>).build ?? "");
    if (!build.trim()) issues.push("missing_build_script");
    else if (!build.includes("next") && !build.includes("build")) {
      issues.push("invalid_build_script");
    }
  }

  if (packageManager === "npm" && !input.relativePaths.includes("package-lock.json")) {
    issues.push("missing_package_lock_for_npm");
  }
  if (packageManager === "pnpm" && !input.relativePaths.includes("pnpm-lock.yaml")) {
    issues.push("missing_pnpm_lock");
  }
  if (packageManager === "yarn" && !input.relativePaths.includes("yarn.lock")) {
    issues.push("missing_yarn_lock");
  }

  const localDeps = [
    ...collectLocalFileDeps(deps),
    ...collectLocalFileDeps(devDeps),
  ];
  if (localDeps.length > 0) {
    issues.push(`unsupported_local_dependencies:${localDeps.join(",")}`);
  }

  const nextVersion = extractNextVersionFromPackageJson(parsed);
  const versionCheck = validateNextJsVersionForVercel(nextVersion);
  if (!versionCheck.acceptable && versionCheck.issue) {
    issues.push(versionCheck.issue);
  }

  return {
    valid: issues.length === 0,
    issues,
    packageManager,
    parsed,
  };
}

export function validateArtifactDependencyIntegrity(files: ProductionArtifactFile[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const paths = new Set(files.map((f) => f.relativePath));
  for (const f of files) {
    if (
      f.relativePath.startsWith("node_modules/") ||
      f.relativePath.startsWith(".next/")
    ) {
      continue;
    }
    if (!f.relativePath.match(/\.(tsx?|jsx?|mjs|cjs)$/)) continue;
    const importRe = /(?:import|from)\s+['"](\.[^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(f.contentText)) !== null) {
      const spec = m[1];
      if (!spec.startsWith(".")) continue;
      const base = f.relativePath.split("/").slice(0, -1);
      const parts = spec.split("/");
      for (const part of parts) {
        if (part === ".") continue;
        if (part === "..") base.pop();
        else base.push(part);
      }
      const candidates = [
        base.join("/"),
        `${base.join("/")}.ts`,
        `${base.join("/")}.tsx`,
        `${base.join("/")}.js`,
        `${base.join("/")}.jsx`,
        `${base.join("/")}/index.ts`,
        `${base.join("/")}/index.tsx`,
      ].filter(Boolean);
      const found = candidates.some((c) => paths.has(c.replace(/^\.\//, "")));
      if (!found) {
        issues.push(`missing_local_import:${f.relativePath}:${spec}`);
      }
    }
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}
