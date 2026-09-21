export const ENVIRONMENT_ASSUMPTION_IS_NOT_EXECUTION_READINESS =
  "ENVIRONMENT ASSUMPTION IS NOT EXECUTION READINESS." as const;
export const WRONG_DIRECTORY_SUCCESS_IS_NOT_QC =
  "A SUCCESSFUL COMMAND RUN FROM THE WRONG DIRECTORY IS NOT VALID QC EVIDENCE." as const;

export const REPOSITORY_ROOT_VERIFICATION_GATE = "RepositoryRootVerificationGate" as const;
export const EXECUTION_CONTEXT_READINESS_GATE = "ExecutionContextReadinessGate" as const;
export const WORKING_TREE_EVIDENCE_VALIDITY_GATE = "WorkingTreeEvidenceValidityGate" as const;

export const CANONICAL_INFINITY_REPO = "C:\\Users\\Antivist\\Desktop\\Infinity\\infinity-core" as const;
export const CANONICAL_PACKAGE_NAME = "infinity-core" as const;

export const INVALID_EVIDENCE = "INVALID_EVIDENCE" as const;
export const EXECUTION_CONTEXT_INVALID = "EXECUTION_CONTEXT_INVALID" as const;
export const BUILD_CONTEXT_INVALID = "BUILD_CONTEXT_INVALID" as const;
export const DATABASE_CONTEXT_INVALID = "DATABASE_CONTEXT_INVALID" as const;
export const PROVIDER_CONTEXT_INVALID = "PROVIDER_CONTEXT_INVALID" as const;
export const DEPLOYMENT_CONTEXT_INVALID = "DEPLOYMENT_CONTEXT_INVALID" as const;

export type NamedGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type MutationClass =
  | "GIT_STATUS"
  | "GIT_DIFF"
  | "TYPECHECK"
  | "TEST"
  | "BUILD"
  | "DATABASE_MIGRATION"
  | "DATABASE_MUTATION"
  | "PROVIDER_MUTATION"
  | "DEPLOYMENT"
  | "STAGE"
  | "COMMIT"
  | "PUSH";

export type RepositoryRootEvidence = {
  cwd: string;
  gitRevParse: string | null;
  intendedRoot: string;
  packageJsonExists: boolean;
  packageName: string | null;
  tsconfigExists: boolean;
  nextConfigDiscoverable: boolean;
};

export type BuildContextEvidence = {
  cwd: string;
  repoRoot: string;
  packageJsonExists: boolean;
  packageManagerContext: string | null;
  tsconfigExists: boolean;
  nextConfigDiscoverable: boolean;
};

export type DatabaseContextEvidence = {
  repoRootValid: boolean;
  projectIdentityMatch: boolean;
  environment: string | null;
  migrationSource: string | null;
  targetDatabaseIdentity: string | null;
};

export type ProviderContextEvidence = {
  venture: string | null;
  provider: string | null;
  account: string | null;
  environment: string | null;
  credentialMode: string | null;
  operationScope: string | null;
  expected: {
    venture?: string;
    provider?: string;
    account?: string;
    environment?: string;
    credentialMode?: string;
    operationScope?: string;
  };
};

export type DeploymentContextEvidence = {
  repoRootValid: boolean;
  venture: string | null;
  deploymentProject: string | null;
  environment: string | null;
  target: string | null;
  artifactSource: string | null;
};
