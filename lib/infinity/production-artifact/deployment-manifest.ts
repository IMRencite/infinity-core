import type { ProductionArtifactFile, ProductionArtifactRecord } from "./types";
import { inferPackageManager } from "./package-json-validation";

export type DeploymentOutputMode = "nextjs_serverless" | "static_export" | "unknown";

export type DeploymentManifestV1 = {
  schemaVersion: "deployment_manifest_v1";
  framework: string;
  packageManager: "npm" | "pnpm" | "yarn" | "unknown";
  installCommand: string;
  buildCommand: string;
  rootDirectory: string;
  outputMode: DeploymentOutputMode;
  requiredEnvironmentKeys: string[];
  optionalEnvironmentKeys: string[];
  providerHints: {
    vercel?: {
      framework: string;
      deploymentMode: string;
    };
  };
};

export function buildDeploymentManifest(input: {
  record: Pick<ProductionArtifactRecord, "framework" | "rootDirectory">;
  files: ProductionArtifactFile[];
}): DeploymentManifestV1 {
  const rootDirectory = input.record.rootDirectory || ".";
  const pkgFile = input.files.find((f) => f.relativePath === "package.json");
  const pkgManager = pkgFile
    ? inferPackageManager(input.files.map((f) => f.relativePath))
    : "unknown";

  let installCommand = "npm install";
  if (pkgManager === "npm") installCommand = "npm ci";
  if (pkgManager === "pnpm") installCommand = "pnpm install --frozen-lockfile";
  if (pkgManager === "yarn") installCommand = "yarn install --immutable";

  const buildCommand = "npm run build";
  const framework = input.record.framework;

  let outputMode: DeploymentOutputMode = "unknown";
  if (framework === "nextjs") outputMode = "nextjs_serverless";
  if (framework === "static_html") outputMode = "static_export";

  return {
    schemaVersion: "deployment_manifest_v1",
    framework,
    packageManager: pkgManager,
    installCommand,
    buildCommand,
    rootDirectory,
    outputMode,
    requiredEnvironmentKeys: [],
    optionalEnvironmentKeys: [],
    providerHints: {
      vercel: {
        framework: framework === "nextjs" ? "nextjs" : "other",
        deploymentMode: "git_integrated",
      },
    },
  };
}

export function validateDeploymentManifest(manifest: DeploymentManifestV1): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (manifest.schemaVersion !== "deployment_manifest_v1") {
    issues.push("invalid_schema_version");
  }
  if (!manifest.framework) issues.push("missing_framework");
  if (!manifest.installCommand) issues.push("missing_install_command");
  if (!manifest.buildCommand) issues.push("missing_build_command");
  if (manifest.framework === "nextjs" && manifest.packageManager === "unknown") {
    issues.push("package_manager_unknown");
  }
  if (manifest.framework === "nextjs" && manifest.outputMode !== "nextjs_serverless") {
    issues.push("nextjs_output_mode_invalid");
  }
  return { valid: issues.length === 0, issues };
}
