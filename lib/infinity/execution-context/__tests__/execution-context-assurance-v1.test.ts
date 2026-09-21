import { describe, expect, it } from "vitest";
import {
  BUILD_CONTEXT_INVALID,
  CANONICAL_INFINITY_REPO,
  DATABASE_CONTEXT_INVALID,
  DEPLOYMENT_CONTEXT_INVALID,
  evaluateBuildContext,
  evaluateDatabaseContext,
  evaluateDeploymentContext,
  evaluateExecutionContextReadinessGate,
  evaluateProviderContext,
  evaluateRepositoryRootVerificationGate,
  evaluateWorkingTreeEvidenceValidityGate,
  executionContextReady,
  inspectRepositoryRoot,
  INVALID_EVIDENCE,
  mutationPermitted,
  PROVIDER_CONTEXT_INVALID,
  verifiedInfinityCoreFixture,
  wrongParentInfinityDirectoryFixture,
} from "../index";

describe("execution context", () => {
  it("rejects the parent Infinity directory as an invalid repo root", () => {
    const wrong = wrongParentInfinityDirectoryFixture();
    const root = evaluateRepositoryRootVerificationGate(wrong);
    const ready = evaluateExecutionContextReadinessGate({ root, mutation: "BUILD" });
    const evidence = evaluateWorkingTreeEvidenceValidityGate({
      gatheredBeforeVerification: true,
      root,
    });
    expect(wrong.cwd).toBe("C:\\Users\\Antivist\\Desktop\\Infinity");
    expect(wrong.intendedRoot).toBe(CANONICAL_INFINITY_REPO);
    expect(wrong.gitRevParse).toBeNull();
    expect(root.result).toBe("FAIL");
    expect(ready.result).toBe("FAIL");
    expect(evidence.result).toBe("FAIL");
    expect(evidence.reasons).toContain(INVALID_EVIDENCE);
    expect(ready.reasons).toContain("BLOCKED_BUILD");
    expect(mutationPermitted(root)).toBe(false);
  });

  it("permits work only after the canonical infinity-core root is verified", () => {
    const verified = verifiedInfinityCoreFixture();
    const root = evaluateRepositoryRootVerificationGate(verified);
    const ready = evaluateExecutionContextReadinessGate({ root, mutation: "TEST" });
    const evidence = evaluateWorkingTreeEvidenceValidityGate({
      gatheredBeforeVerification: false,
      root,
    });
    expect(root.result).toBe("PASS");
    expect(ready.result).toBe("PASS");
    expect(evidence.result).toBe("PASS");
    expect(mutationPermitted(root)).toBe(true);
  });

  it("inspects the live parent directory as EXECUTION_CONTEXT_INVALID", () => {
    const liveWrong = inspectRepositoryRoot({
      cwd: "C:\\Users\\Antivist\\Desktop\\Infinity",
      intendedRoot: CANONICAL_INFINITY_REPO,
    });
    const root = evaluateRepositoryRootVerificationGate(liveWrong);
    expect(liveWrong.gitRevParse).toBeNull();
    expect(root.result).toBe("FAIL");
    expect(executionContextReady({
      cwd: "C:\\Users\\Antivist\\Desktop\\Infinity",
      intendedRoot: CANONICAL_INFINITY_REPO,
    }).code).toBe("EXECUTION_CONTEXT_INVALID");
  });

  it("accepts the live infinity-core working directory as ready", () => {
    const live = inspectRepositoryRoot({
      cwd: CANONICAL_INFINITY_REPO,
      intendedRoot: CANONICAL_INFINITY_REPO,
    });
    const root = evaluateRepositoryRootVerificationGate(live);
    expect(live.gitRevParse).toBeTruthy();
    expect(root.result).toBe("PASS");
    expect(executionContextReady({
      cwd: CANONICAL_INFINITY_REPO,
      intendedRoot: CANONICAL_INFINITY_REPO,
    }).ready).toBe(true);
  });

  it("invalidates build, database, provider, and deployment mismatches", () => {
    expect(evaluateBuildContext({
      cwd: "C:\\Users\\Antivist\\Desktop\\Infinity",
      repoRoot: CANONICAL_INFINITY_REPO,
      packageJsonExists: false,
      packageManagerContext: null,
      tsconfigExists: false,
      nextConfigDiscoverable: false,
    }).reasons).toContain(BUILD_CONTEXT_INVALID);
    expect(evaluateDatabaseContext({
      repoRootValid: false,
      projectIdentityMatch: false,
      environment: null,
      migrationSource: null,
      targetDatabaseIdentity: null,
    }).reasons).toContain(DATABASE_CONTEXT_INVALID);
    expect(evaluateProviderContext({
      venture: "AskReview",
      provider: "stripe",
      account: "acct_wrong",
      environment: "test",
      credentialMode: "restricted",
      operationScope: "write",
      expected: { venture: "OccupancyNPV", environment: "live" },
    }).reasons).toContain(PROVIDER_CONTEXT_INVALID);
    expect(evaluateDeploymentContext({
      repoRootValid: false,
      venture: null,
      deploymentProject: null,
      environment: null,
      target: null,
      artifactSource: null,
    }).reasons).toContain(DEPLOYMENT_CONTEXT_INVALID);
  });
});
