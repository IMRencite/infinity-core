import {
  GENERATED_INSTALL_COMMAND,
  GENERATED_LOCKFILE_NAME,
  GENERATED_PACKAGE_MANAGER,
  declaredDependencyVersions,
  parsePackageJson,
  requiredTypescriptDevDependencies,
  typescriptToolchainRequired,
} from "./generated-nextjs-package";
import { lockfileDeclaresDependency } from "./generated-lockfile";

export const BUILD_COMPLETE_DEPENDENCY_SET = "BUILD_COMPLETE_DEPENDENCY_SET" as const;
export const ARTIFACT_VALIDATION_FAIL = "ARTIFACT_VALIDATION_FAIL" as const;

export type BuildCompleteDependencyValidation = {
  rule: typeof BUILD_COMPLETE_DEPENDENCY_SET;
  status: "PASS" | "FAIL";
  packageManager: typeof GENERATED_PACKAGE_MANAGER | "unknown";
  installCommand: typeof GENERATED_INSTALL_COMMAND | null;
  typescriptRequired: boolean;
  issues: string[];
};

function packageHas(declared: Record<string, string>, name: string): boolean {
  return Boolean(declared[name]?.trim());
}

export function validateBuildCompleteDependencySet(input: {
  files: Array<{ path: string; content: string }>;
}): BuildCompleteDependencyValidation {
  const issues: string[] = [];
  const paths = input.files.map((file) => file.path.replace(/\\/g, "/"));
  const packageJson = input.files.find((file) => file.path.replace(/\\/g, "/") === "package.json")?.content ?? "";
  const lockfile = input.files.find((file) => file.path.replace(/\\/g, "/") === GENERATED_LOCKFILE_NAME)?.content ?? "";
  const parsed = parsePackageJson(packageJson);
  const declared = declaredDependencyVersions(parsed);
  const typescriptRequired = typescriptToolchainRequired({ relativePaths: paths, packageJson: parsed });
  const required = requiredTypescriptDevDependencies({ relativePaths: paths, packageJson: parsed });

  if (!parsed) issues.push("missing_or_invalid_package_json");
  if (!paths.includes(GENERATED_LOCKFILE_NAME)) issues.push("missing_package_lock");

  if (typescriptRequired) {
    if (!packageHas(declared, "typescript")) issues.push("missing_typescript");
    if (!packageHas(declared, "@types/node")) issues.push("missing_types_node");
    if (!packageHas(declared, "@types/react")) issues.push("missing_types_react");
    if (required["@types/react-dom"] && !packageHas(declared, "@types/react-dom")) {
      issues.push("missing_types_react_dom");
    }
  }

  if (lockfile) {
    let lockParsed: { packages?: Record<string, unknown> } | null = null;
    try {
      lockParsed = JSON.parse(lockfile) as { packages?: Record<string, unknown> };
    } catch {
      issues.push("invalid_package_lock");
    }
    const packages = lockParsed?.packages ?? {};
    if (!Object.keys(packages).length) issues.push("package_lock_incomplete");
    if (typescriptRequired) {
      for (const name of Object.keys(required)) {
        if (!lockfileDeclaresDependency(lockfile, name)) {
          issues.push(`lockfile_missing_dependency:${name}`);
        }
      }
    }
    for (const name of Object.keys(declared)) {
      if (!lockfileDeclaresDependency(lockfile, name) && Object.keys(packages).length) {
        issues.push(`lockfile_drift:${name}`);
      }
    }
  }

  if (issues.length) issues.unshift(BUILD_COMPLETE_DEPENDENCY_SET, ARTIFACT_VALIDATION_FAIL);

  return {
    rule: BUILD_COMPLETE_DEPENDENCY_SET,
    status: issues.length === 0 ? "PASS" : "FAIL",
    packageManager: paths.includes(GENERATED_LOCKFILE_NAME) ? GENERATED_PACKAGE_MANAGER : "unknown",
    installCommand: paths.includes(GENERATED_LOCKFILE_NAME) ? GENERATED_INSTALL_COMMAND : null,
    typescriptRequired,
    issues,
  };
}
