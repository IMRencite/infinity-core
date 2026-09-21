import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import type { DeployableSourcePackage } from "./deployable-package";

export async function probeVercelGitDeployForSourcePackage(pkg: DeployableSourcePackage): Promise<{
  result: "SUPPORTED" | "UNSUPPORTED_CAPABILITY";
  issues: string[];
}> {
  const validation = await vercelAdapter.validate({
    organizationId: "org",
    actionType: "hosting.deploy",
    target: pkg.artifactId,
    payload: {
      production_artifact_id: pkg.artifactId,
      source_digest: pkg.sourceDigest,
      source_type: pkg.sourceType,
      files_manifest: pkg.filesManifest,
    },
    correlationId: null,
  });
  return {
    result: validation.valid ? "SUPPORTED" : "UNSUPPORTED_CAPABILITY",
    issues: validation.issues,
  };
}

export async function probeVercelAdapterForSourcePackage(pkg: DeployableSourcePackage): Promise<{
  result: "SUPPORTED" | "UNSUPPORTED_CAPABILITY";
  issues: string[];
}> {
  const validation = await vercelAdapter.validate({
    organizationId: "org",
    actionType: SOURCE_BUNDLE_CAPABILITY,
    target: pkg.artifactId,
    payload: {
      production_artifact_id: pkg.artifactId,
      source_digest: pkg.sourceDigest,
      source_type: pkg.sourceType,
      files: [{ path: "app/page.tsx", content: "landing" }],
    },
    correlationId: null,
  });
  return {
    result: validation.valid ? "SUPPORTED" : "UNSUPPORTED_CAPABILITY",
    issues: validation.issues,
  };
}
