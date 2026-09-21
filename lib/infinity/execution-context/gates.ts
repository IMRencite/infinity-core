import { repoPathsEqual } from "./normalize";
import {
  BUILD_CONTEXT_INVALID,
  CANONICAL_PACKAGE_NAME,
  DATABASE_CONTEXT_INVALID,
  DEPLOYMENT_CONTEXT_INVALID,
  EXECUTION_CONTEXT_READINESS_GATE,
  INVALID_EVIDENCE,
  PROVIDER_CONTEXT_INVALID,
  REPOSITORY_ROOT_VERIFICATION_GATE,
  WORKING_TREE_EVIDENCE_VALIDITY_GATE,
  type BuildContextEvidence,
  type DatabaseContextEvidence,
  type DeploymentContextEvidence,
  type MutationClass,
  type NamedGateResult,
  type ProviderContextEvidence,
  type RepositoryRootEvidence,
} from "./types";

function fail(gate: string, reasons: string[]): NamedGateResult {
  return { gate, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateRepositoryRootVerificationGate(input: RepositoryRootEvidence): NamedGateResult {
  const reasons: string[] = [];
  if (!input.cwd) reasons.push("CWD_MISSING");
  if (!input.gitRevParse) reasons.push("GIT_REV_PARSE_FAIL");
  if (!repoPathsEqual(input.gitRevParse, input.intendedRoot)) reasons.push("REPO_ROOT_MISMATCH");
  if (!repoPathsEqual(input.cwd, input.intendedRoot) && !repoPathsEqual(input.gitRevParse, input.intendedRoot)) {
    reasons.push("CWD_NOT_INTENDED_REPO");
  }
  if (!input.packageJsonExists) reasons.push("PACKAGE_JSON_MISSING");
  if (input.packageName !== CANONICAL_PACKAGE_NAME) reasons.push("PROJECT_IDENTITY_MISMATCH");
  if (!input.tsconfigExists) reasons.push("TSCONFIG_MISSING");
  if (!input.nextConfigDiscoverable) reasons.push("NEXT_CONFIG_UNDISCOVERABLE");
  return fail(REPOSITORY_ROOT_VERIFICATION_GATE, reasons);
}

export function evaluateExecutionContextReadinessGate(input: {
  root: NamedGateResult;
  mutation?: MutationClass;
}): NamedGateResult {
  const reasons = input.root.result === "FAIL" ? [...input.root.reasons, "MUTATION_BLOCKED"] : [];
  if (input.mutation && input.root.result === "FAIL") {
    reasons.push(`BLOCKED_${input.mutation}`);
  }
  return fail(EXECUTION_CONTEXT_READINESS_GATE, reasons);
}

export function evaluateWorkingTreeEvidenceValidityGate(input: {
  gatheredBeforeVerification: boolean;
  root: NamedGateResult;
}): NamedGateResult {
  const reasons: string[] = [];
  if (input.gatheredBeforeVerification) reasons.push(INVALID_EVIDENCE);
  if (input.root.result === "FAIL") reasons.push(INVALID_EVIDENCE, "UNVERIFIED_WORKING_TREE");
  return fail(WORKING_TREE_EVIDENCE_VALIDITY_GATE, reasons);
}

export function evaluateBuildContext(input: BuildContextEvidence): NamedGateResult {
  const reasons: string[] = [];
  if (!repoPathsEqual(input.cwd, input.repoRoot)) reasons.push(BUILD_CONTEXT_INVALID, "CWD_REPO_MISMATCH");
  if (!input.packageJsonExists) reasons.push(BUILD_CONTEXT_INVALID, "PACKAGE_JSON_MISSING");
  if (!input.packageManagerContext) reasons.push(BUILD_CONTEXT_INVALID, "PACKAGE_MANAGER_CONTEXT_MISSING");
  if (!input.tsconfigExists) reasons.push(BUILD_CONTEXT_INVALID, "TSCONFIG_MISSING");
  if (!input.nextConfigDiscoverable) reasons.push(BUILD_CONTEXT_INVALID, "NEXT_CONFIG_UNDISCOVERABLE");
  return fail("BuildContextVerification", reasons);
}

export function evaluateDatabaseContext(input: DatabaseContextEvidence): NamedGateResult {
  const reasons: string[] = [];
  if (!input.repoRootValid || !input.projectIdentityMatch || !input.environment || !input.migrationSource || !input.targetDatabaseIdentity) {
    reasons.push(DATABASE_CONTEXT_INVALID);
  }
  return fail("DatabaseContextVerification", reasons);
}

export function evaluateProviderContext(input: ProviderContextEvidence): NamedGateResult {
  const reasons: string[] = [];
  const pairs: Array<[string | null | undefined, string | undefined, string]> = [
    [input.venture, input.expected.venture, "VENTURE"],
    [input.provider, input.expected.provider, "PROVIDER"],
    [input.account, input.expected.account, "ACCOUNT"],
    [input.environment, input.expected.environment, "ENVIRONMENT"],
    [input.credentialMode, input.expected.credentialMode, "CREDENTIAL_MODE"],
    [input.operationScope, input.expected.operationScope, "OPERATION_SCOPE"],
  ];
  for (const [actual, expected, label] of pairs) {
    if (!actual || (expected && actual !== expected)) reasons.push(PROVIDER_CONTEXT_INVALID, `${label}_MISMATCH`);
  }
  return fail("ProviderContextVerification", reasons);
}

export function evaluateDeploymentContext(input: DeploymentContextEvidence): NamedGateResult {
  const reasons: string[] = [];
  if (
    !input.repoRootValid
    || !input.venture
    || !input.deploymentProject
    || !input.environment
    || !input.target
    || !input.artifactSource
  ) {
    reasons.push(DEPLOYMENT_CONTEXT_INVALID);
  }
  return fail("DeploymentContextVerification", reasons);
}

export function mutationPermitted(root: NamedGateResult): boolean {
  return root.result === "PASS";
}
