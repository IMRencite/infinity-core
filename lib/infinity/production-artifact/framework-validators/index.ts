import type { ProductionFileManifestEntry } from "../types";
import {
  validateNextJsPackageJson,
  type PackageJsonValidationResult,
} from "../package-json-validation";

export type FrameworkValidationResult = {
  valid: boolean;
  issues: string[];
};

export type FrameworkValidator = {
  framework: string;
  validate: (manifest: ProductionFileManifestEntry[]) => FrameworkValidationResult;
};

const nextjsValidator: FrameworkValidator = {
  framework: "nextjs",
  validate(manifest) {
    const paths = new Set(manifest.map((f) => f.relative_path));
    const issues: string[] = [];
    if (!paths.has("package.json")) issues.push("missing_package_json");
    const hasAppOrPages = [...paths].some(
      (p) => p.startsWith("app/") || p.startsWith("pages/") || p === "app/page.tsx",
    );
    if (!hasAppOrPages) issues.push("missing_next_app_or_pages");
    const hasLock =
      paths.has("package-lock.json") ||
      paths.has("pnpm-lock.yaml") ||
      paths.has("yarn.lock");
    if (!hasLock) issues.push("missing_lockfile");
    return { valid: issues.length === 0, issues };
  },
};

const staticHtmlValidator: FrameworkValidator = {
  framework: "static_html",
  validate(manifest) {
    const paths = new Set(manifest.map((f) => f.relative_path));
    const hasHtml = [...paths].some((p) => p.endsWith(".html"));
    return { valid: hasHtml, issues: hasHtml ? [] : ["missing_html_file"] };
  },
};

const REGISTRY: Record<string, FrameworkValidator> = {
  nextjs: nextjsValidator,
  static_html: staticHtmlValidator,
};

export function validateFrameworkReadiness(
  framework: string,
  manifest: ProductionFileManifestEntry[],
): FrameworkValidationResult {
  const validator = REGISTRY[framework];
  if (!validator) {
    return { valid: false, issues: ["unsupported_framework"] };
  }
  return validator.validate(manifest);
}

export function validatePackageJsonContent(
  content: string,
  relativePaths: string[] = [],
  framework = "nextjs",
): FrameworkValidationResult {
  const result: PackageJsonValidationResult = validateNextJsPackageJson({
    packageJsonContent: content,
    relativePaths,
    framework,
  });
  return { valid: result.valid, issues: result.issues };
}
