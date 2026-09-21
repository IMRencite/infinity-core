import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  NEW_FOUNDER_PREMIUM_SUCCESSOR_DEPLOYMENT_AUTHORIZATION_REQUIRED,
  PREMIUM_PUBLIC_VENTURE_REPAIR_REASON,
  VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST } from "@/lib/infinity/market-validation-experiment/source-bundle-request";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan, executeGovernedVentureBuild, runIsolatedArtifactInstallAndBuild } from "@/lib/infinity/venture-build-orchestration";
import { auditValidationGrade } from "@/lib/infinity/public-venture-template";
import { composePremiumValidationArtifact, premiumArtifactIdFor } from "./compose-premium-artifact";
import { creDesignContext } from "./design-intelligence";
import { emitPremiumDesignMissionActivity } from "./mission";
import { auditPremiumValidation } from "./quality-gate";

export function digestOfPremiumFiles(files: Array<{ path: string; content: string }>): string {
  const manifest = files
    .map((file) => `${file.path}:${createHash("sha256").update(file.content).digest("hex")}`)
    .sort()
    .join("|");
  return createHash("sha256").update(manifest).digest("hex");
}

export async function generateCrePremiumSuccessor(): Promise<{
  required: true;
  artifactId: string;
  digest: string;
  predecessorArtifactId: string;
  repairReason: typeof PREMIUM_PUBLIC_VENTURE_REPAIR_REASON;
  immutable: true;
  files: Array<{ path: string; content: string }>;
    oldArtifact: {
      artifactId: string;
    validationGrade: "PASS" | "FAIL";
    premiumValidation: "PASS" | "FAIL";
    mutated: false;
  };
  quality: ReturnType<typeof auditPremiumValidation>;
  secretScan: "PASS" | "FAIL";
  creative: ReturnType<typeof composePremiumValidationArtifact>["provenance"]["creativeAssetPlan"];
  command: ReturnType<typeof emitPremiumDesignMissionActivity>;
  nextExternalRequirement: typeof NEW_FOUNDER_PREMIUM_SUCCESSOR_DEPLOYMENT_AUTHORIZATION_REQUIRED;
  deployed: false;
}> {
  const compile = compileCreValidationArtifactInput({
    candidateId: CRE_CANDIDATE_ID,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
  });
  const compiled = compileExecutableVenturePlan(compile);
  if (!compiled.buildPackage) throw new Error("cre_validation_package_missing");
  const built = await executeGovernedVentureBuild({ compile });
  const predecessorFiles = built.artifact?.files ?? [];
  const oldGrade = auditValidationGrade(predecessorFiles);
  const oldPremium = auditPremiumValidation(predecessorFiles);
  const artifactId = premiumArtifactIdFor({
    planId: compiled.plan.planId,
    packageId: compiled.buildPackage.packageId,
    packageVersion: compiled.buildPackage.packageVersion,
  });
  const composed = composePremiumValidationArtifact({
    context: creDesignContext(),
    files: predecessorFiles,
    artifactId,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    ventureId: compiled.plan.ventureId,
    candidateId: CRE_CANDIDATE_ID,
    predecessorArtifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST,
  });
  const command = emitPremiumDesignMissionActivity({
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    missionId: "msn_premium_cre_design_v1",
    artifactId,
    creativeUsed: composed.provenance.creativeAssetPlan.creativeMediaInvoked,
  });
  const result = {
    required: true as const,
    artifactId,
    digest: digestOfPremiumFiles(composed.files),
    predecessorArtifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    repairReason: PREMIUM_PUBLIC_VENTURE_REPAIR_REASON,
    immutable: true as const,
    files: composed.files,
    oldArtifact: {
      artifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
      validationGrade: oldGrade.validationGradeOverall,
      premiumValidation: oldPremium.premiumOverall,
      mutated: false as const,
    },
    quality: composed.quality,
    secretScan: evaluateSecretSafety(composed.files).status,
    creative: composed.provenance.creativeAssetPlan,
    command,
    nextExternalRequirement: NEW_FOUNDER_PREMIUM_SUCCESSOR_DEPLOYMENT_AUTHORIZATION_REQUIRED,
    deployed: false as const,
  };
  const reportDir = join(process.cwd(), ".infinity", "mission-activity");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(
    join(reportDir, "premium-cre-successor-report.json"),
    `${JSON.stringify(
      {
        artifactId: result.artifactId,
        digest: result.digest,
        predecessorArtifactId: result.predecessorArtifactId,
        repairReason: result.repairReason,
        quality: result.quality.classification,
        premiumOverall: result.quality.premiumOverall,
        secretScan: result.secretScan,
        creativeBlocker: result.creative.blocker,
        visualNecessity: result.creative.visualNecessity,
        assetsGenerated: result.creative.assetsGenerated,
        nextExternalRequirement: result.nextExternalRequirement,
      },
      null,
      2,
    )}\n`,
  );
  return result;
}

export function auditExistingCreValidationGradeSuccessor(files: Array<{ path: string; content: string }>): {
  artifactId: typeof VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID;
  validationGrade: "PASS" | "FAIL";
  premiumValidation: "PASS" | "FAIL";
} {
  return {
    artifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    validationGrade: auditValidationGrade(files).validationGradeOverall,
    premiumValidation: auditPremiumValidation(files).premiumOverall,
  };
}

export async function validateCrePremiumSuccessorIsolated(): Promise<{
  successor: Awaited<ReturnType<typeof generateCrePremiumSuccessor>>;
  npmCi: "PASS" | "FAIL";
  typescript: "PASS" | "FAIL" | "NOT_APPLICABLE";
  productionBuild: "PASS" | "FAIL";
}> {
  const successor = await generateCrePremiumSuccessor();
  const isolated = await runIsolatedArtifactInstallAndBuild({ files: successor.files });
  return {
    successor,
    npmCi: isolated.installResult,
    typescript: isolated.typescript,
    productionBuild: isolated.nextProductionBuild,
  };
}
