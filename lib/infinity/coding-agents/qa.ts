import { isForbiddenPath, defaultForbiddenPaths } from "./policy";
import type { CanonicalCodingTask, CodingAgentProviderResult, InfinityQaResult } from "./types";

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{20,}/,
  /xai-[a-zA-Z0-9_-]{20,}/,
  /CURSOR_API_KEY\s*=/,
  /STRIPE_SECRET_KEY\s*=/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=/,
];

export function scanForSecrets(texts: string[]): string[] {
  const hits: string[] = [];
  for (const text of texts) {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(text)) hits.push(pattern.source);
    }
  }
  return [...new Set(hits)];
}

export function runInfinityQa(input: {
  task: CanonicalCodingTask;
  providerResult: CodingAgentProviderResult;
}): InfinityQaResult {
  const failures: string[] = [];
  const secretHits = scanForSecrets([
    input.providerResult.diff,
    ...input.providerResult.changeSet?.changes.map((c) => c.content ?? "") ?? [],
  ]);
  if (secretHits.length > 0) failures.push("secret_scan");

  const forbidden = defaultForbiddenPaths(input.task);
  if (input.providerResult.files.some((file) => isForbiddenPath(file.path, forbidden) && file.operation !== "read")) {
    failures.push("workspace_isolation");
  }

  const typecheck = input.providerResult.commandsRun.filter((c) => /tsc/.test(c.command)).every((c) => c.exitStatus === 0);
  const tests = input.providerResult.testsRun.length === 0 || input.providerResult.testsRun.every((t) => t.passed);
  const build = typecheck && tests;
  if (!typecheck) failures.push("typecheck");
  if (!tests) failures.push("tests");
  if (!build) failures.push("build");

  const security = secretHits.length === 0 && !failures.includes("workspace_isolation");
  if (!security && !failures.includes("secret_scan") && !failures.includes("workspace_isolation")) failures.push("security");

  const featureContract = input.task.acceptanceCriteria.length === 0 || Boolean(input.providerResult.changeSet?.changes.length);
  if (!featureContract) failures.push("feature_contract");

  const placeholderScan = !(input.providerResult.diff.includes("TODO_IMPLEMENT") || input.providerResult.diff.includes("FIXME_SECRET"));
  if (!placeholderScan) failures.push("placeholder_scan");

  return {
    typecheck,
    tests,
    build,
    security,
    featureContract,
    secretScan: secretHits.length === 0,
    placeholderScan,
    workspaceIsolation: !failures.includes("workspace_isolation"),
    passed: failures.length === 0 && input.providerResult.status === "COMPLETED",
    failures,
  };
}
