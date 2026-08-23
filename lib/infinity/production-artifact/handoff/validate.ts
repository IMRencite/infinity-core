import { LIVE_PROVISIONING_POLICY_CODES } from "./constants";
import type {
  ProductionArtifactHandoff,
  ProductionHandoffFailure,
  ProductionHandoffValidation,
} from "./types";
import { scanHandoffObjectForSecrets } from "./secrets";
import { validateHandoffArtifactPath } from "./paths";

function fail(
  failures: ProductionHandoffFailure[],
  failure: ProductionHandoffFailure,
): void {
  failures.push(failure);
}

function isRegulatedComplianceBlocker(handoff: ProductionArtifactHandoff): boolean {
  const planPolicies = handoff.knownUnresolvedItems
    .map((item) => item.identifier)
    .filter((item): item is string => Boolean(item));
  return (
    handoff.architectureCoverage.blockedFamilies.some((family) => family === "LEGAL_AND_COMPLIANCE" || family === "SECURITY_AND_RISK") &&
    (planPolicies.includes("REGULATED_INDUSTRY_COMPLIANCE") ||
      handoff.knownUnresolvedItems.some((item) => item.identifier === "REGULATED_INDUSTRY_COMPLIANCE"))
  );
}

export function validateProductionArtifactHandoff(handoff: ProductionArtifactHandoff): ProductionHandoffValidation {
  const failures: ProductionHandoffFailure[] = [];

  if (!handoff.architectureCoverage.present) {
    fail(failures, {
      code: "PRODUCTION_HANDOFF_ARCHITECTURE_COVERAGE_MISSING",
      message: "Architecture coverage result is required on the production handoff.",
    });
  } else if (!handoff.architectureCoverage.requiredSystemsAccounted) {
    fail(failures, {
      code: "PRODUCTION_HANDOFF_ARCHITECTURE_BLOCKED",
      message: "Required architecture systems are not fully accounted (satisfied + external + deferred + blocked).",
    });
  }

  if (handoff.completeness.accounted !== handoff.completeness.required) {
    fail(failures, {
      code: "PRODUCTION_HANDOFF_ARCHITECTURE_BLOCKED",
      message: `Completeness invariant failed: accounted ${handoff.completeness.accounted} vs required ${handoff.completeness.required}.`,
    });
  }

  const requiredKinds = new Set(
    handoff.artifactInventory.filter((item) => item.status === "MISSING").map((item) => item.kind),
  );
  for (const kind of requiredKinds) {
    if (kind === "DATABASE_MIGRATION") {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_MIGRATION_MISSING",
        message: "Required database migration artifact is missing.",
        artifactKind: kind,
      });
    } else if (kind === "ENV_REQUIREMENT") {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_ENV_REQUIREMENT_MISSING",
        message: "Required environment declaration is missing.",
        artifactKind: kind,
      });
    } else if (kind !== "PROVIDER_DEPENDENCY") {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_ARTIFACT_MISSING",
        message: `Required production artifact ${kind} is missing.`,
        artifactKind: kind,
      });
    }
  }

  if (handoff.databaseRequirements.schemaRequired && handoff.databaseRequirements.verificationStatus === "MISSING") {
    if (!failures.some((item) => item.code === "PRODUCTION_HANDOFF_MIGRATION_MISSING")) {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_MIGRATION_MISSING",
        message: "Database schema is required but no migration or schema artifact was collected.",
        artifactKind: "DATABASE_MIGRATION",
      });
    }
  }

  const declaredEnvKeys = new Set(handoff.environmentRequirements.filter((item) => item.key.trim()).map((item) => item.key));
  const envDeclarationMissing =
    handoff.environmentRequirements.length === 0 ||
    handoff.environmentRequirements.some((item) => item.required && !item.key.trim()) ||
    handoff.artifactInventory.some((item) => item.kind === "ENV_REQUIREMENT" && item.status === "MISSING");
  if (envDeclarationMissing && declaredEnvKeys.size === 0) {
    fail(failures, {
      code: "PRODUCTION_HANDOFF_ENV_REQUIREMENT_MISSING",
      message: "Required environment declarations are missing.",
      artifactKind: "ENV_REQUIREMENT",
    });
  }

  if (handoff.buildVerification.status === "FAIL") {
    fail(failures, {
      code: "PRODUCTION_HANDOFF_BUILD_INCOMPLETE",
      message: handoff.buildVerification.summary || "Build verification failed.",
      artifactKind: "BUILD_EVIDENCE",
    });
  }
  if (handoff.buildVerification.status === "UNKNOWN" || handoff.buildVerification.status === "NOT_RUN") {
    fail(failures, {
      code: "PRODUCTION_HANDOFF_BUILD_INCOMPLETE",
      message: "Build verification evidence is incomplete.",
      artifactKind: "BUILD_EVIDENCE",
    });
  }
  if (handoff.testVerification.status === "FAIL") {
    fail(failures, {
      code: "PRODUCTION_HANDOFF_TESTS_FAILED",
      message: handoff.testVerification.summary || "Test verification failed.",
      artifactKind: "TEST_EVIDENCE",
    });
  }
  if (handoff.testVerification.status === "UNKNOWN" || handoff.testVerification.status === "NOT_RUN") {
    fail(failures, {
      code: "PRODUCTION_HANDOFF_TESTS_FAILED",
      message: "Test verification evidence is incomplete.",
      artifactKind: "TEST_EVIDENCE",
    });
  }

  if (handoff.traceability.ventureId !== handoff.ventureId) {
    fail(failures, {
      code: "PRODUCTION_HANDOFF_LINEAGE_MISMATCH",
      message: "Traceability ventureId does not match the handoff ventureId.",
    });
  }

  const codingTaskIds = new Set(handoff.traceability.codingTaskIds);
  for (const ref of handoff.codeChangeSets) {
    if (ref.ventureId !== handoff.ventureId) {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_LINEAGE_MISMATCH",
        message: "CodeChangeSet ventureId does not match the handoff venture.",
        identifier: ref.codeChangeSetId,
      });
    }
    if (handoff.buildContractId && ref.buildContractId && ref.buildContractId !== handoff.buildContractId) {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_LINEAGE_MISMATCH",
        message: "CodeChangeSet buildContractId does not match the handoff build contract.",
        identifier: ref.codeChangeSetId,
      });
    }
    if (
      handoff.ventureSystemsBuildContractId &&
      ref.ventureSystemsBuildContractId &&
      ref.ventureSystemsBuildContractId !== handoff.ventureSystemsBuildContractId
    ) {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_LINEAGE_MISMATCH",
        message: "CodeChangeSet ventureSystemsBuildContractId does not match the architecture contract.",
        identifier: ref.codeChangeSetId,
      });
    }
    if (!codingTaskIds.has(ref.codingTaskId)) {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_ORPHAN_CHANGESET",
        message: "CodeChangeSet is not attached to a known coding task.",
        identifier: ref.codeChangeSetId,
      });
    }
  }

  for (const artifact of handoff.artifactInventory) {
    if (artifact.ventureId !== handoff.ventureId) {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_LINEAGE_MISMATCH",
        message: `Artifact ${artifact.artifactId} venture lineage does not match the handoff.`,
        artifactKind: artifact.kind,
        identifier: artifact.artifactId,
      });
    }
    if (handoff.buildContractId && artifact.buildContractId && artifact.buildContractId !== handoff.buildContractId) {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_LINEAGE_MISMATCH",
        message: `Artifact ${artifact.artifactId} build-contract lineage does not match the handoff.`,
        artifactKind: artifact.kind,
        identifier: artifact.artifactId,
      });
    }
    const pathCheck = validateHandoffArtifactPath(artifact.path);
    if (!pathCheck.ok) {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_PATH_UNSAFE",
        message: pathCheck.reason ?? "Artifact path is unsafe.",
        artifactKind: artifact.kind,
        path: artifact.path,
        identifier: artifact.artifactId,
      });
    }
  }

  for (const ref of handoff.codeChangeSets) {
    for (const file of ref.affectedFiles) {
      const pathCheck = validateHandoffArtifactPath(file);
      if (!pathCheck.ok) {
        fail(failures, {
          code: "PRODUCTION_HANDOFF_PATH_UNSAFE",
          message: pathCheck.reason ?? "CodeChangeSet path is unsafe.",
          artifactKind: "CODE_CHANGE_SET",
          path: file,
          identifier: ref.codeChangeSetId,
        });
      }
    }
  }

  for (const dep of handoff.externalDependencies) {
    if (dep.providerSelectionState === "UNRESOLVED" || dep.blockingStatus === "UNKNOWN_COST" || dep.blockingStatus === "POLICY") {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_PROVIDER_DEPENDENCY_BLOCKED",
        message: `Required external dependency ${dep.capability} is unresolved or blocked.`,
        systemFamily: dep.capability,
      });
    }
    if (!dep.costKnown && dep.cost.actuality === "UNKNOWN" && dep.cost.value === 0) {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_UNKNOWN_COST",
        message: `Unknown paid cost for ${dep.capability} was treated as $0.`,
        systemFamily: dep.capability,
      });
    }
    if (dep.writeAuthorized || dep.writeAuthorityRequired) {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_PROVIDER_DEPENDENCY_BLOCKED",
        message: `External dependency ${dep.capability} incorrectly claims write authority.`,
        systemFamily: dep.capability,
      });
    }
    if (dep.providerVerificationState === "READ_ONLY_VERIFIED" && dep.writeAuthorized) {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_PROVIDER_DEPENDENCY_BLOCKED",
        message: "READ_ONLY_VERIFIED was interpreted as write authority.",
        systemFamily: dep.capability,
      });
    }
  }

  const requiredRuntimeMissing = handoff.runtimeRequirements.filter(
    (item) => item.required && (item.status === "MISSING" || item.status === "DEFERRED" && item.key === "runtimeVersion"),
  );
  for (const req of requiredRuntimeMissing) {
    if (req.status === "MISSING") {
      fail(failures, {
        code: "PRODUCTION_HANDOFF_RUNTIME_UNRESOLVED",
        message: `Required runtime requirement ${req.key} is unresolved.`,
        identifier: req.key,
      });
    }
  }

  const regulated = handoff.knownUnresolvedItems.some((item) => item.identifier === "REGULATED_INDUSTRY_COMPLIANCE") || isRegulatedComplianceBlocker(handoff);
  if (regulated) {
    fail(failures, {
      code: "PRODUCTION_HANDOFF_ARCHITECTURE_BLOCKED",
      message: "Unresolved regulated compliance or security requirement blocks production handoff.",
      systemFamily: "LEGAL_AND_COMPLIANCE",
    });
  }

  const nonLiveArchitectureBlock = handoff.architectureCoverage.blockedFamilies.filter((family) => {
    if (family === "LEGAL_AND_COMPLIANCE" || family === "SECURITY_AND_RISK") {
      return regulated;
    }
    return true;
  });
  if (nonLiveArchitectureBlock.length > 0 && !failures.some((item) => item.code === "PRODUCTION_HANDOFF_ARCHITECTURE_BLOCKED" && item.systemFamily && nonLiveArchitectureBlock.includes(item.systemFamily))) {
    for (const family of nonLiveArchitectureBlock) {
      if (family === "LEGAL_AND_COMPLIANCE" || family === "SECURITY_AND_RISK") continue;
      fail(failures, {
        code: "PRODUCTION_HANDOFF_ARCHITECTURE_BLOCKED",
        message: `Blocked architecture requirement ${family} is visible and unresolved.`,
        systemFamily: family,
      });
    }
  }

  const secretHits = scanHandoffObjectForSecrets({
    artifacts: handoff.artifactInventory,
    changeSets: handoff.codeChangeSets,
    runtime: handoff.runtimeRequirements,
    environment: handoff.environmentRequirements,
    database: handoff.databaseRequirements,
    deployment: handoff.deploymentRequirements,
    unresolved: handoff.knownUnresolvedItems,
    blockers: handoff.knownBlockers,
  });
  for (const hit of secretHits) {
    fail(failures, {
      code: "PRODUCTION_HANDOFF_SECRET_LEAKAGE",
      message: hit,
    });
  }

  const unique = new Map<string, ProductionHandoffFailure>();
  for (const failure of [...handoff.knownBlockers, ...failures]) {
    unique.set(`${failure.code}:${failure.identifier ?? ""}:${failure.path ?? ""}:${failure.systemFamily ?? ""}`, failure);
  }
  const merged = [...unique.values()];
  const blocking = merged.filter((item) => {
    if (item.code === "PRODUCTION_HANDOFF_ARCHITECTURE_BLOCKED" && item.identifier && (LIVE_PROVISIONING_POLICY_CODES as readonly string[]).includes(item.identifier)) {
      return false;
    }
    return true;
  });

  const ok = blocking.length === 0;
  const readiness = ok
    ? "READY_FOR_COMMERCIALIZATION_REVIEW"
    : blocking.some((item) =>
          item.code === "PRODUCTION_HANDOFF_BUILD_INCOMPLETE" ||
          item.code === "PRODUCTION_HANDOFF_TESTS_FAILED" ||
          item.code === "PRODUCTION_HANDOFF_ARTIFACT_MISSING" ||
          item.code === "PRODUCTION_HANDOFF_MIGRATION_MISSING" ||
          item.code === "PRODUCTION_HANDOFF_ENV_REQUIREMENT_MISSING" ||
          item.code === "PRODUCTION_HANDOFF_PROVIDER_DEPENDENCY_BLOCKED" ||
          item.code === "PRODUCTION_HANDOFF_ARCHITECTURE_BLOCKED" ||
          item.code === "PRODUCTION_HANDOFF_RUNTIME_UNRESOLVED" ||
          item.code === "PRODUCTION_HANDOFF_UNKNOWN_COST" ||
          item.code === "PRODUCTION_HANDOFF_ORPHAN_CHANGESET" ||
          item.code === "PRODUCTION_HANDOFF_LINEAGE_MISMATCH" ||
          item.code === "PRODUCTION_HANDOFF_SECRET_LEAKAGE" ||
          item.code === "PRODUCTION_HANDOFF_PATH_UNSAFE" ||
          item.code === "PRODUCTION_HANDOFF_ARCHITECTURE_COVERAGE_MISSING",
        )
      ? "BLOCKED"
      : "BUILD_COMPLETE";

  return {
    ok,
    readiness,
    failures: blocking,
    handoff: {
      ...handoff,
      knownBlockers: blocking,
      readiness,
      deploymentAuthority: "NONE",
    },
  };
}
