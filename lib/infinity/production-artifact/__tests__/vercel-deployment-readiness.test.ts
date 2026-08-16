import { describe, it, expect } from "vitest";
import { computeProductionContentHash } from "../types";
import {
  validateNextJsPackageJson,
  validateArtifactDependencyIntegrity,
  inferPackageManager,
} from "../package-json-validation";
import { buildDeploymentManifest, validateDeploymentManifest } from "../deployment-manifest";
import { translateDeploymentManifestToVercel, buildVercelGitDeploymentBody } from "../vercel-translation";
import {
  classifyVercelDeploymentFailure,
  sanitizeVercelError,
} from "../failure-classification";
import {
  evaluateVercelDeploymentReadiness,
  deploymentPayloadMateriallyChanged,
  computeDeploymentSourceFingerprint,
} from "../vercel-deployment-readiness";
import { loadFixtureProductionArtifact, fixtureRecord } from "../fixtures/load-fixture-artifact";
import { VERCEL_V1_DEPLOYMENT_MODE } from "../constants";
import { isProhibitedProductionPath } from "../types";

const minimalNextFiles = () => loadFixtureProductionArtifact("minimal-nextjs-app");

describe("Vercel deployment readiness", () => {
  it("classifies NEXT_NO_VERSION as framework_detection_failed", () => {
    const reason = classifyVercelDeploymentFailure({
      errorCode: "NEXT_NO_VERSION",
      errorMessage: 'No Next.js version detected. Make sure your package.json has "next"',
      readyState: "ERROR",
    });
    expect(reason).toBe("framework_detection_failed");
  });

  it("sanitizes provider diagnostics", () => {
    const d = sanitizeVercelError({
      errorMessage: "failed ghp_1234567890123456789012345678901234567890",
    });
    expect(d.errorMessage).toContain("[REDACTED]");
  });

  it("validates package.json for nextjs", () => {
    const files = minimalNextFiles();
    const pkg = files.find((f) => f.relativePath === "package.json")!.contentText;
    const r = validateNextJsPackageJson({
      packageJsonContent: pkg,
      relativePaths: files.map((f) => f.relativePath),
      framework: "nextjs",
    });
    expect(r.valid).toBe(true);
    expect(inferPackageManager(files.map((f) => f.relativePath))).toBe("npm");
  });

  it("blocks vulnerable Next.js 15.1.0", () => {
    const r = validateNextJsPackageJson({
      packageJsonContent: JSON.stringify({
        scripts: { build: "next build" },
        dependencies: { next: "15.1.0", react: "19.0.0", "react-dom": "19.0.0" },
      }),
      relativePaths: ["package.json", "package-lock.json"],
      framework: "nextjs",
    });
    expect(r.valid).toBe(false);
    expect(r.issues).toContain("vulnerable_nextjs_version");
  });

  it("accepts deployable Next.js 16.2.11 fixture", () => {
    const files = minimalNextFiles();
    const pkg = files.find((f) => f.relativePath === "package.json")!.contentText;
    const parsed = JSON.parse(pkg) as { dependencies?: { next?: string } };
    expect(parsed.dependencies?.next).toBe("16.2.11");
    const r = validateNextJsPackageJson({
      packageJsonContent: pkg,
      relativePaths: files.map((f) => f.relativePath),
      framework: "nextjs",
    });
    expect(r.valid).toBe(true);
    expect(r.issues).not.toContain("vulnerable_nextjs_version");
  });

  it("blocks missing next dependency", () => {
    const r = validateNextJsPackageJson({
      packageJsonContent: JSON.stringify({ scripts: { build: "next build" } }),
      relativePaths: ["package.json", "package-lock.json"],
      framework: "nextjs",
    });
    expect(r.valid).toBe(false);
    expect(r.issues).toContain("missing_next_dependency");
  });

  it("translates deployment manifest to git_integrated vercel config", () => {
    const files = minimalNextFiles();
    const manifest = buildDeploymentManifest({
      record: { framework: "nextjs", rootDirectory: "." },
      files,
    });
    manifest.providerHints.vercel!.deploymentMode = VERCEL_V1_DEPLOYMENT_MODE;
    const t = translateDeploymentManifestToVercel(manifest);
    expect(t.valid).toBe(true);
    expect(t.translation?.gitSourceRequired).toBe(true);
    expect(t.translation?.deploymentMode).toBe("git_integrated");
  });

  it("builds git deployment body", () => {
    const body = buildVercelGitDeploymentBody({
      projectName: "demo",
      projectId: "prj_1",
      repositoryFullName: "org/repo",
      repositoryId: 12345,
      commitSha: "abc123",
    });
    expect(body.gitSource.type).toBe("github");
    expect(body.gitSource.repoId).toBe(12345);
    expect(body.gitSource.sha).toBe("abc123");
  });

  it("detects prohibited secret paths in artifact", () => {
    expect(isProhibitedProductionPath(".env.local")).toBe(true);
  });

  it("detects bad local imports", () => {
    const files = [
      {
        relativePath: "app/page.tsx",
        contentHash: "x",
        byteSize: 1,
        fileMode: "100644",
        contentText: 'import x from "./missing"',
      },
    ];
    const r = validateArtifactDependencyIntegrity(files);
    expect(r.valid).toBe(false);
  });

  it("requires new authorization when deployment mode changes", () => {
    expect(
      deploymentPayloadMateriallyChanged({
        previousDeploymentMode: "direct_artifact_files",
        nextDeploymentMode: "git_integrated",
        nextArtifactHash: "a",
      }),
    ).toBe(true);
  });

  it("evaluates readiness without clean room for static fixtures", async () => {
    const files = minimalNextFiles();
    const manifestEntries = files.map((f) => ({
      relative_path: f.relativePath,
      content_hash: f.contentHash,
      byte_size: f.byteSize,
      file_mode: f.fileMode,
    }));
    const hash = computeProductionContentHash(manifestEntries);
    const record = fixtureRecord({ artifactId: "art-1", files, contentHash: hash });
    const evaluation = await evaluateVercelDeploymentReadiness({
      record,
      files,
      options: { runCleanRoom: false, deploymentMode: VERCEL_V1_DEPLOYMENT_MODE },
    });
    expect(evaluation.deploymentManifest).toBe(true);
    expect(evaluation.vercelTranslation).toBe(true);
    expect(evaluation.packageJson).toBe(true);
    expect(evaluation.sourceIdentity?.sourceFingerprint).toBe(
      computeDeploymentSourceFingerprint({
        artifactHash: hash,
        fileCount: files.length,
        deploymentMode: VERCEL_V1_DEPLOYMENT_MODE,
      }),
    );
  });

  it("validates deployment manifest schema", () => {
    const m = buildDeploymentManifest({
      record: { framework: "nextjs", rootDirectory: "." },
      files: minimalNextFiles(),
    });
    expect(validateDeploymentManifest(m).valid).toBe(true);
  });
});

describe("Vercel deployment readiness precheck (clean room)", () => {
  it.skipIf(process.env.RUN_VERCEL_CLEAN_ROOM !== "true")(
    "passes clean-room install and next build for minimal fixture",
    async () => {
      if (!process.env.VERCEL_TOKEN) {
        process.env.VERCEL_TOKEN = "vercel_readiness_precheck_token";
      }
      const files = minimalNextFiles();
      const hash = computeProductionContentHash(
        files.map((f) => ({
          relative_path: f.relativePath,
          content_hash: f.contentHash,
          byte_size: f.byteSize,
          file_mode: f.fileMode,
        })),
      );
      const record = fixtureRecord({ artifactId: "art-precheck", files, contentHash: hash });
      const evaluation = await evaluateVercelDeploymentReadiness({
        record,
        files,
        options: { runCleanRoom: true, deploymentMode: VERCEL_V1_DEPLOYMENT_MODE },
      });
      expect(evaluation.cleanRoomInstall).toBe(true);
      expect(evaluation.cleanRoomBuild).toBe(true);
      expect(evaluation.ready).toBe(true);
    },
    300_000,
  );
});
