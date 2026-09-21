import { createHash } from "node:crypto";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { VERCEL_ADAPTER_SUPPORTED_ACTIONS } from "@/lib/infinity/provider-capabilities/vercel-adapter-actions";
import { evaluateSecretSafety } from "./secret-safety";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
} from "./constants";

export const DEPLOYABLE_SOURCE_PACKAGE_SCHEMA = "deployable_source_package_v1" as const;
export const HOSTING_DEPLOY_CONTRACT = "git_integrated_commit_sha" as const;

export type DeployableSourceFile = {
  path: string;
  sha256: string;
  bytes: number;
};

export type DeployableSourcePackage = {
  schemaVersion: typeof DEPLOYABLE_SOURCE_PACKAGE_SCHEMA;
  artifactId: string;
  ventureId: string;
  experimentId: string;
  candidateId: string;
  sourceType: "GENERATED_FILE_TREE";
  sourceDigest: string;
  filesManifest: DeployableSourceFile[];
  buildCommand: "next build";
  framework: "nextjs";
  runtime: "node";
  entrypoint: "app/page.tsx";
  version: number;
  provenance: {
    createdFrom: "venture_build_artifact";
    artifactType: "nextjs_web_product";
    validationLanding: true;
    gitRepository: null;
    commitSha: null;
  };
  secretScan: "PASS" | "FAIL";
  providerHints: Record<string, never>;
};

export type VercelDeployPackageCompatibility = {
  result: "SUPPORTED" | "UNSUPPORTED_CAPABILITY";
  hostingDeployContract: typeof HOSTING_DEPLOY_CONTRACT;
  generatedPackageCompatible: boolean;
  gitShaRequired: boolean;
  gitDeployCompatible: false;
  adapterImplemented: boolean;
  newCapabilityRequired: true;
  newCapability: typeof SOURCE_BUNDLE_CAPABILITY;
  newCapabilityVerified: boolean;
  reason: string;
};

export function buildDeployableSourcePackage(input: {
  artifactId: string;
  ventureId: string;
  experimentId?: string;
  candidateId?: string;
  artifactVersion?: number;
  files: Array<{ path: string; content: string }>;
}): DeployableSourcePackage {
  const filesManifest = input.files
    .map((file) => ({
      path: file.path,
      sha256: createHash("sha256").update(file.content).digest("hex"),
      bytes: Buffer.byteLength(file.content, "utf8"),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const sourceDigest = createHash("sha256")
    .update(filesManifest.map((file) => `${file.path}:${file.sha256}`).join("|"))
    .digest("hex");
  return {
    schemaVersion: DEPLOYABLE_SOURCE_PACKAGE_SCHEMA,
    artifactId: input.artifactId,
    ventureId: input.ventureId,
    experimentId: input.experimentId ?? LOCKED_CRE_EXPERIMENT_ID,
    candidateId: input.candidateId ?? CRE_CANDIDATE_ID,
    sourceType: "GENERATED_FILE_TREE",
    sourceDigest,
    filesManifest,
    buildCommand: "next build",
    framework: "nextjs",
    runtime: "node",
    entrypoint: "app/page.tsx",
    version: input.artifactVersion ?? 1,
    provenance: {
      createdFrom: "venture_build_artifact",
      artifactType: "nextjs_web_product",
      validationLanding: true,
      gitRepository: null,
      commitSha: null,
    },
    secretScan: evaluateSecretSafety(input.files).status,
    providerHints: {},
  };
}

export function evaluateVercelSourcePackageSupport(pkg: DeployableSourcePackage): VercelDeployPackageCompatibility {
  void pkg;
  const adapterImplemented = (VERCEL_ADAPTER_SUPPORTED_ACTIONS as readonly string[]).includes(SOURCE_BUNDLE_CAPABILITY);
  return {
    result: adapterImplemented ? "SUPPORTED" : "UNSUPPORTED_CAPABILITY",
    hostingDeployContract: HOSTING_DEPLOY_CONTRACT,
    generatedPackageCompatible: adapterImplemented,
    gitShaRequired: true,
    gitDeployCompatible: false,
    adapterImplemented,
    newCapabilityRequired: true,
    newCapability: SOURCE_BUNDLE_CAPABILITY,
    newCapabilityVerified: false,
    reason: adapterImplemented
      ? "Vercel adapter can translate GENERATED_FILE_TREE to /v2/files + /v13/deployments files[]. hosting.deploy remains git-SHA-only. hosting.deploy_source_bundle is implemented and not LIVE_WRITE_VERIFIED."
      : "hosting.deploy means git-integrated deploy of a verified GitHub commit SHA. A generated file tree requires hosting.deploy_source_bundle.",
  };
}

export function lockedCrePackageIds(): { artifactId: string; experimentId: string; candidateId: string } {
  return {
    artifactId: LOCKED_CRE_ARTIFACT_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    candidateId: CRE_CANDIDATE_ID,
  };
}
