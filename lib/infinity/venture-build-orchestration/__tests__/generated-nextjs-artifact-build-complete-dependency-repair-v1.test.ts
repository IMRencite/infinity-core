import { createHash } from "node:crypto";
import { describe, expect, it, beforeEach } from "vitest";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  buildVercelSourceBundleDeploymentBody,
  sha1Hex,
  translateFilesToVercelSourceBundle,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import {
  ARTIFACT_REPAIR_EXTERNAL_BUILD_DEPENDENCY_INCOMPLETE,
  CRE_CANDIDATE_ID,
  FAILED_CRE_VALIDATION_DEPLOYMENT_ID,
  FAILED_CRE_VALIDATION_PROJECT,
  LOCKED_CRE_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  LOCKED_SUCCESS_CRITERIA,
  MARKET_VALIDATION_PURPOSE,
  NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED,
  SUCCESSOR_CRE_ARTIFACT_ID,
  VALIDATION_GRADE_REPAIR_REASON,
} from "@/lib/infinity/market-validation-experiment/constants";
import { currentCreValidationArtifactId, resetCurrentCreValidationArtifactIdCache } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import {
  buildDeployableSourcePackage,
  evaluateVercelSourcePackageSupport,
} from "@/lib/infinity/market-validation-experiment/deployable-package";
import {
  evaluateFounderAuthorization,
  lockedCreFounderScope,
  persistFounderAuthorization,
  predecessorConsumedFounderAuthorization,
  resetFounderAuthorization,
} from "@/lib/infinity/market-validation-experiment/founder-authorization";
import {
  CRE_VALIDATION_ALLOWLIST,
  evaluateAnalyticsBackendReadiness,
  evaluateFormBackendReadiness,
  PUBLIC_INGEST_ROUTE_FILE,
} from "@/lib/infinity/market-validation-experiment/ingest";
import {
  evaluateGeneratedArtifactTechnicalReadiness,
  persistIsolatedArtifactVerification,
} from "@/lib/infinity/market-validation-experiment/isolated-artifact-verification";
import { evaluateRuntimeAuthorizationState } from "@/lib/infinity/market-validation-experiment/runtime-authorization-state";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { LOCKED_CRE_SOURCE_DIGEST, SUCCESSOR_CRE_SOURCE_DIGEST } from "@/lib/infinity/market-validation-experiment/source-bundle-request";
import {
  persistSourceBundleVerification,
  resetSourceBundleVerification,
  sourceBundleEndToEndVerified,
  sourceBundleTransportProven,
} from "@/lib/infinity/market-validation-experiment/source-bundle-verification";
import { evaluateValidationArtifactDeploymentAuthorization } from "@/lib/infinity/market-validation-experiment/artifact-authorization";
import {
  executeMarketValidationExperiment,
  resetExperimentRuntime,
} from "@/lib/infinity/market-validation-experiment/execute";
import { CANONICAL_FOOTER_COPY, CANONICAL_IMR_URL, CANONICAL_INFINITY_OS_URL } from "../constants";
import { validateBuildCompleteDependencySet } from "../build-complete-dependencies";
import {
  GENERATED_INSTALL_COMMAND,
  GENERATED_NEXTJS_ARTIFACT_CONTRACT,
  GENERATED_NEXTJS_RUNTIME_DEPENDENCIES,
  GENERATED_NEXTJS_TYPESCRIPT_DEV_DEPENDENCIES,
  artifactContainsTypeScript,
  buildGeneratedNextJsPackageJson,
} from "../generated-nextjs-package";
import { lockfileDeclaresDependency } from "../generated-lockfile";
import { runIsolatedArtifactInstallAndBuild } from "../isolated-artifact-build";
import { resetExecutableBuildRuntime } from "../execute";
import { validateVentureArtifact } from "../validate";

function digestOf(files: Array<{ path: string; content: string }>): string {
  const manifest = files
    .map((file) => `${file.path}:${createHash("sha256").update(file.content).digest("hex")}`)
    .sort()
    .join("|");
  return createHash("sha256").update(manifest).digest("hex");
}

describe("GENERATED NEXT.JS ARTIFACT BUILD-COMPLETE DEPENDENCY REPAIR V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
    resetFounderAuthorization();
    resetSourceBundleVerification();
    resetCurrentCreValidationArtifactIdCache();
  });

  it("requires TypeScript toolchain only for generated TS/TSX artifacts", () => {
    const tsx = buildGeneratedNextJsPackageJson({
      name: "tsx-app",
      relativePaths: ["package.json", "app/page.tsx", "app/layout.tsx"],
    });
    const js = buildGeneratedNextJsPackageJson({
      name: "js-app",
      relativePaths: ["package.json", "app/page.js", "app/layout.js"],
    });
    const tsxPkg = JSON.parse(tsx) as {
      dependencies: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const jsPkg = JSON.parse(js) as { devDependencies?: Record<string, string> };
    expect(tsxPkg.dependencies).toMatchObject(GENERATED_NEXTJS_RUNTIME_DEPENDENCIES);
    expect(tsxPkg.devDependencies).toMatchObject(GENERATED_NEXTJS_TYPESCRIPT_DEV_DEPENDENCIES);
    expect(jsPkg.devDependencies).toBeUndefined();
    expect(artifactContainsTypeScript(["app/page.js"])).toBe(false);
    expect(artifactContainsTypeScript(["app/page.tsx"])).toBe(true);
  });

  it("fails artifact validation when a TSX tree is missing TypeScript build dependencies", () => {
    const files = [
      {
        path: "package.json",
        content: JSON.stringify({
          name: "broken",
          private: true,
          scripts: { build: "next build" },
          dependencies: { ...GENERATED_NEXTJS_RUNTIME_DEPENDENCIES },
        }),
      },
      {
        path: "package-lock.json",
        content: JSON.stringify({ name: "broken", lockfileVersion: 3, requires: true, packages: {} }),
      },
      { path: "app/page.tsx", content: "export default function Page(){return null}" },
      { path: "app/layout.tsx", content: "export default function Root({children}){return children}" },
    ];
    const complete = validateBuildCompleteDependencySet({ files });
    expect(complete.status).toBe("FAIL");
    expect(complete.issues).toContain("missing_typescript");
    expect(complete.issues).toContain("missing_types_node");
    expect(complete.issues).toContain("missing_types_react");
    expect(complete.issues).toContain("missing_types_react_dom");
    expect(complete.issues).toContain("BUILD_COMPLETE_DEPENDENCY_SET");
    expect(complete.issues).toContain("ARTIFACT_VALIDATION_FAIL");
  });

  it("does not require TypeScript dependencies for a JS-only artifact", () => {
    const files = [
      {
        path: "package.json",
        content: buildGeneratedNextJsPackageJson({
          name: "js-only",
          relativePaths: ["package.json", "app/page.js"],
        }),
      },
      {
        path: "package-lock.json",
        content: JSON.stringify({
          name: "js-only",
          lockfileVersion: 3,
          requires: true,
          packages: {
            "": {
              dependencies: { ...GENERATED_NEXTJS_RUNTIME_DEPENDENCIES },
            },
            "node_modules/next": { version: GENERATED_NEXTJS_RUNTIME_DEPENDENCIES.next },
            "node_modules/react": { version: GENERATED_NEXTJS_RUNTIME_DEPENDENCIES.react },
            "node_modules/react-dom": { version: GENERATED_NEXTJS_RUNTIME_DEPENDENCIES["react-dom"] },
          },
        }),
      },
      { path: "app/page.js", content: "export default function Page(){return null}" },
    ];
    const complete = validateBuildCompleteDependencySet({ files });
    expect(complete.typescriptRequired).toBe(false);
    expect(complete.issues).not.toContain("missing_typescript");
    expect(complete.status).toBe("PASS");
  });

  it("regenerates a successor CRE artifact with new identity, lineage, and complete dependencies", async () => {
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const artifact = result.artifact!;
    const pkgJson = JSON.parse(artifact.files.find((file) => file.path === "package.json")!.content) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const lock = artifact.files.find((file) => file.path === "package-lock.json")!.content;
    const digest = digestOf(artifact.files);

    expect(artifact.artifactId).toBe(currentCreValidationArtifactId());
    expect(artifact.artifactId).not.toBe("art_850f8be949fabef62674");
    expect(digest).not.toBe("7f2244e19bda7bfab5a42d4443bb942c139851dc21bfedad4ab8d16efe9030a8");
    expect(artifact.artifactId).not.toBe(LOCKED_CRE_ARTIFACT_ID);
    expect(digest).not.toBe(LOCKED_CRE_SOURCE_DIGEST);
    expect(LOCKED_CRE_ARTIFACT_ID).toBe("art_6b94977e164c8bdeea3f");
    expect(SUCCESSOR_CRE_ARTIFACT_ID).toBe("art_850f8be949fabef62674");
    expect(LOCKED_CRE_SOURCE_DIGEST).toBe(
      "5d60bac77fb032bd4daaf9046eb7ecdb1588f6d36c703ea91a90fe568b51b608",
    );
    expect(SUCCESSOR_CRE_SOURCE_DIGEST).toBe(
      "7f2244e19bda7bfab5a42d4443bb942c139851dc21bfedad4ab8d16efe9030a8",
    );
    expect(artifact.lineage?.predecessorArtifactId).toBe(SUCCESSOR_CRE_ARTIFACT_ID);
    expect(artifact.lineage?.predecessorDigest).toBe(SUCCESSOR_CRE_SOURCE_DIGEST);
    expect(artifact.lineage?.repairReason).toBe(VALIDATION_GRADE_REPAIR_REASON);
    expect(ARTIFACT_REPAIR_EXTERNAL_BUILD_DEPENDENCY_INCOMPLETE).toBe("EXTERNAL_BUILD_DEPENDENCY_INCOMPLETE");
    expect(artifact.lineage?.failedDeploymentId).toBe(FAILED_CRE_VALIDATION_DEPLOYMENT_ID);
    expect(artifact.lineage?.failedProject).toBe(FAILED_CRE_VALIDATION_PROJECT);
    expect(artifact.lineage?.generationContract).toBe(GENERATED_NEXTJS_ARTIFACT_CONTRACT);
    expect(pkgJson.dependencies.next).toBe("16.2.11");
    expect(pkgJson.dependencies.react).toBe("19.2.4");
    expect(pkgJson.dependencies["react-dom"]).toBe("19.2.4");
    expect(pkgJson.devDependencies.typescript).toBe("5.9.3");
    expect(pkgJson.devDependencies["@types/node"]).toBe("20.19.43");
    expect(pkgJson.devDependencies["@types/react"]).toBe("19.2.17");
    expect(pkgJson.devDependencies["@types/react-dom"]).toBe("19.2.3");
    expect(lockfileDeclaresDependency(lock, "typescript")).toBe(true);
    expect(lockfileDeclaresDependency(lock, "@types/node")).toBe(true);
    expect(lockfileDeclaresDependency(lock, "@types/react")).toBe(true);
    expect(lockfileDeclaresDependency(lock, "@types/react-dom")).toBe(true);
    expect(result.artifactValidation?.buildCompleteDependencySet).toBe("PASS");
    expect(result.artifactValidation?.passed).toBe(true);
    expect(result.state).toBe("EXPERIMENT_READY_BUT_EXTERNAL_ACTION_BLOCKED");
    expect(result.evidenceCollection).toBe("NOT_STARTED");
    expect(result.counts.qualifiedVisitors).toBe(0);
    expect(result.counts.strongIntent).toBe(0);
    expect(result.counts.qualifiedSubmissions).toBe(0);
    expect(result.decision).toBe("VALIDATE");
    expect(result.buildReady).toBe(false);
    expect(result.fullProductBuildExecuted).toBe(false);
    expect(result.experiment.minimumEvidence).toEqual(LOCKED_SUCCESS_CRITERIA);

    const blob = artifact.files.map((file) => file.content).join("\n");
    const ingestClient = artifact.files.find((file) => file.path === "app/ingest-client.ts")?.content ?? "";
    expect(ingestClient).toContain(artifact.artifactId);
    expect(ingestClient).not.toContain(LOCKED_CRE_ARTIFACT_ID);
    expect(blob).toContain(artifact.artifactId);
    expect(artifact.files.some((file) => file.path === PUBLIC_INGEST_ROUTE_FILE)).toBe(true);
    expect(blob).toContain("/api/public/market-validation/");
    expect(blob).toContain(LOCKED_CRE_EXPERIMENT_ID);
    expect(blob).toContain(CANONICAL_FOOTER_COPY);
    expect(blob).toContain(CANONICAL_INFINITY_OS_URL);
    expect(blob).toContain(CANONICAL_IMR_URL);
    expect(blob).not.toMatch(/nofollow/i);
    expect(blob).toMatch(/validation|not generally available|Pilot \/ early access/i);
    expect(blob).toContain("$290 / year");
    expect(blob).toContain("$149 / deal");

    const form = evaluateFormBackendReadiness({
      artifactFiles: artifact.files,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
    });
    const analytics = evaluateAnalyticsBackendReadiness({
      artifactFiles: artifact.files,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
    });
    expect(form.readyForLiveDeploy).toBe(true);
    expect(analytics.readyForLiveDeploy).toBe(true);
    expect(evaluateSecretSafety(artifact.files).status).toBe("PASS");
    expect(CRE_VALIDATION_ALLOWLIST.artifactId).toBe(SUCCESSOR_CRE_ARTIFACT_ID);

    const validation = validateVentureArtifact({
      artifact,
      buildPackage: result.artifactResult!.buildPackage!,
    });
    expect(validation.buildCompleteDependencySet).toBe("PASS");
    expect(validation.passed).toBe(true);

    const pkg = buildDeployableSourcePackage({
      artifactId: artifact.artifactId,
      ventureId: result.experiment.ventureId,
      experimentId: result.experiment.experimentId,
      candidateId: result.experiment.candidateId,
      files: artifact.files,
    });
    expect(pkg.sourceType).toBe("GENERATED_FILE_TREE");
    expect(pkg.sourceDigest).toBe(digest);
    expect(pkg.provenance.commitSha).toBeNull();
    expect(evaluateVercelSourcePackageSupport(pkg).result).toBe("SUPPORTED");

    const translated = translateFilesToVercelSourceBundle(artifact.files);
    expect(translated.every((file) => file.sha === sha1Hex(artifact.files.find((item) => item.path === file.file)!.content))).toBe(true);
    expect(translated[0]?.sha).toHaveLength(40);
    expect(pkg.sourceDigest).toHaveLength(64);
    const body = buildVercelSourceBundleDeploymentBody({
      projectName: FAILED_CRE_VALIDATION_PROJECT,
      files: artifact.files,
    });
    const dry = await vercelAdapter.validate({
      organizationId: "org",
      actionType: "hosting.deploy_source_bundle",
      target: artifact.artifactId,
      payload: {
        production_artifact_id: artifact.artifactId,
        source_digest: pkg.sourceDigest,
        source_type: "GENERATED_FILE_TREE",
        deployment_mode: "files",
        files: artifact.files,
      },
      correlationId: null,
    });
    expect(dry.valid).toBe(true);
    expect(body.files.length).toBe(artifact.files.length);

    const consumed = persistFounderAuthorization(predecessorConsumedFounderAuthorization());
    expect(consumed.executionsConsumed).toBe(1);
    const founder = evaluateFounderAuthorization({
      authorization: consumed,
      requestedScope: {
        ...lockedCreFounderScope(),
        artifactId: artifact.artifactId,
        artifactDigest: pkg.sourceDigest,
      },
    });
    expect(founder.consumed).toBe(true);
    expect(founder.recognized).toBe(false);
    expect(founder.reason).toBe(NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED);
    const runtime = evaluateRuntimeAuthorizationState();
    expect(runtime.activated).toBe(false);
    expect(runtime.transferredToNewArtifact).toBe(false);
    expect(runtime.boundArtifactDigest).toBe(LOCKED_CRE_SOURCE_DIGEST);

    persistSourceBundleVerification({
      status: "FAILED",
      liveWriteAttempted: true,
      deploymentId: FAILED_CRE_VALIDATION_DEPLOYMENT_ID,
      projectId: FAILED_CRE_VALIDATION_PROJECT,
      transportPathProven: true,
    });
    expect(sourceBundleTransportProven()).toBe(true);
    expect(sourceBundleEndToEndVerified()).toBe(false);

    const auth = evaluateValidationArtifactDeploymentAuthorization({
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      artifactId: artifact.artifactId,
      artifactValid: true,
      validationPassed: true,
      fullProduct: false,
      purpose: MARKET_VALIDATION_PURPOSE,
      artifactFiles: artifact.files,
      founderAuthorization: consumed,
    });
    expect(auth.approved).toBe(false);
    expect(auth.eagReason).toBe(NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED);
    expect(auth.founderAuthorizationRecognized).toBe(false);
  }, 180_000);

  it("builds the exact regenerated CRE artifact in an isolated npm ci + next build", async () => {
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const artifact = result.artifact!;
    const isolated = await runIsolatedArtifactInstallAndBuild({
      files: artifact.files,
      keepRoot: false,
      infinityCoreRoot: process.cwd(),
    });
    persistIsolatedArtifactVerification({
      artifactId: artifact.artifactId,
      sourceDigest: digestOf(artifact.files),
      result: isolated,
    });
    expect(isolated.install.command).toContain(GENERATED_INSTALL_COMMAND.replace("npm ", ""));
    if (isolated.installResult !== "PASS") {
      throw new Error(`isolated_install_failed:${isolated.install.stderr}\n${isolated.install.stdout}`);
    }
    expect(isolated.installResult).toBe("PASS");
    if (isolated.buildResult !== "PASS") {
      throw new Error(`isolated_build_failed:${isolated.build.stderr}\n${isolated.build.stdout}`);
    }
    expect(isolated.buildResult).toBe("PASS");
    expect(isolated.typescript).toBe("PASS");
    expect(isolated.nextProductionBuild).toBe("PASS");
    expect(isolated.rootNodeModulesLeakage).toBe(false);
    expect(isolated.isolated).toBe(true);
    const technical = evaluateGeneratedArtifactTechnicalReadiness({
      artifactId: artifact.artifactId,
      artifactValid: Boolean(result.artifactValidation?.passed),
    });
    expect(technical.technicalReadiness).toBe("PASS");
    expect(technical.authorization).toBe("BLOCKED");
  }, 300_000);
});
