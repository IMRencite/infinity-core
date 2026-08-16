import type { DeploymentManifestV1 } from "./deployment-manifest";
import { VERCEL_V1_DEPLOYMENT_MODE } from "./constants";

export type VercelDeploymentTranslation = {
  deploymentMode: typeof VERCEL_V1_DEPLOYMENT_MODE;
  framework: string | null;
  rootDirectory: string;
  installCommand: string;
  buildCommand: string;
  gitSourceRequired: boolean;
  projectSettings: {
    framework: string | null;
    installCommand?: string;
    buildCommand?: string;
    rootDirectory?: string;
  };
};

export function translateDeploymentManifestToVercel(
  manifest: DeploymentManifestV1,
): { valid: boolean; issues: string[]; translation: VercelDeploymentTranslation | null } {
  const issues: string[] = [];
  if (manifest.framework !== "nextjs") {
    issues.push("vercel_v1_nextjs_only");
  }
  if (manifest.providerHints.vercel?.deploymentMode !== VERCEL_V1_DEPLOYMENT_MODE) {
    issues.push("deployment_mode_mismatch");
  }
  if (issues.length > 0) {
    return { valid: false, issues, translation: null };
  }

  const framework = manifest.providerHints.vercel?.framework ?? "nextjs";
  const translation: VercelDeploymentTranslation = {
    deploymentMode: VERCEL_V1_DEPLOYMENT_MODE,
    framework,
    rootDirectory: manifest.rootDirectory === "." ? "" : manifest.rootDirectory,
    installCommand: manifest.installCommand,
    buildCommand: manifest.buildCommand,
    gitSourceRequired: true,
    projectSettings: {
      framework,
      installCommand: manifest.installCommand,
      buildCommand: manifest.buildCommand,
      rootDirectory: manifest.rootDirectory === "." ? undefined : manifest.rootDirectory,
    },
  };
  return { valid: true, issues: [], translation };
}

export type VercelGitDeployPayload = {
  name: string;
  project: string;
  target: string;
  gitSource: {
    type: "github";
    repo: string;
    repoId: number;
    ref: string;
    sha?: string;
  };
};

export function buildVercelGitDeploymentBody(input: {
  projectName: string;
  projectId: string;
  repositoryFullName: string;
  repositoryId: number;
  commitSha: string;
  branch?: string;
  target?: string;
}): VercelGitDeployPayload {
  return {
    name: input.projectName,
    project: input.projectId || input.projectName,
    target: input.target ?? "production",
    gitSource: {
      type: "github",
      repo: input.repositoryFullName,
      repoId: input.repositoryId,
      ref: input.branch ?? "main",
      sha: input.commitSha,
    },
  };
}
