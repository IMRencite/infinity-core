import { beforeEach, describe, expect, it } from "vitest";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import { translateFilesToVercelSourceBundle } from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { workerRoleForStep } from "@/lib/infinity/mission-activity/worker-roles";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import {
  inspectBundleInputContract,
  inspectGeneratedSourceIntegrity,
} from "@/lib/infinity/venture-build-orchestration/generated-source-integrity";
import {
  evaluateHandoffParity,
  evaluateProviderEquivalentDeploymentEligibility,
  invalidateProviderEquivalentEligibilityIfMutated,
  ProviderEquivalentArtifactBuildGate,
  resetProviderEquivalentArtifactBuildGate,
  runProviderEquivalentArtifactBuildGate,
} from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import { runIsolatedArtifactInstallAndBuild } from "@/lib/infinity/venture-build-orchestration/isolated-artifact-build";
import { resetExperimentRuntime } from "@/lib/infinity/market-validation-experiment/execute";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import {
  CRE_CANDIDATE_ID,
  FAILED_LINEAGE_REPAIR_DEPLOYMENT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  TECHNICAL_DEPLOYMENT_ARTIFACT_FAILURE,
} from "@/lib/infinity/market-validation-experiment/constants";
import { rememberFinalRepairSuccessorIsolatedEvidence } from "@/lib/infinity/market-validation-experiment/cre-final-repair-successor-isolated";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { EXPECTED_DR_PUBLIC_ROUTES } from "@/lib/infinity/market-validation-experiment/cre-dr-successor-authorization";
import { PREMIUM_AUTHORITY_VALIDATION_READY, PROVIDER_EQUIVALENT_COMPILE_REPAIR_REASON } from "../constants";
import { reconstructCrePublicLineageQuestionIdRepairSuccessor } from "../cre-lineage-question-id-successor";
import { reconstructCreProviderEquivalentCompileRepairSuccessor } from "../cre-provider-equivalent-compile-repair-successor";
import { inspectRenderedLineageAndQuestionIdentity } from "../public-lineage-question-id";
import { runCreProviderEquivalentCompileRepairMission } from "../answer-authority/provider-equivalent-compile-repair-mission";
import { auditSuccessorAuthorityArtifact } from "../answer-authority/successor-audit";
import {
  auditRenderedLayoutQualityGate,
  renderedLayoutPassesPremiumAuthority,
} from "@/lib/infinity/public-venture-design/rendered-layout";
import { isCreValidationArtifactId } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import {
  activatePremiumAuthoritySuccessorPublicArtifact,
  getActivePublicValidationArtifactId,
} from "@/lib/infinity/market-validation-experiment/active-public-artifact";

function fileOf(files: Array<{ path: string; content: string }>, path: string): string {
  return files.find((file) => file.path.replace(/\\/g, "/") === path)?.content ?? "";
}

describe("PROVIDER-EQUIVALENT SOURCE BUNDLE BUILD INTEGRITY + CRE COMPILE REPAIR V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetExecutableBuildRuntime();
    resetExperimentRuntime();
    resetProviderEquivalentArtifactBuildGate();
    activatePremiumAuthoritySuccessorPublicArtifact();
  });

  it("reconstructs the exact failed art_3f bundle and proves the candidate-id compile defect", async () => {
    const failed = await reconstructCrePublicLineageQuestionIdRepairSuccessor();
    expect(failed.artifactId).toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(failed.digest).toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(failed.immutable).toBe(true);
    const ingest = fileOf(failed.files, "app/ingest-client.ts");
    const form = fileOf(failed.files, "app/early-access/page.tsx");
    expect(ingest).toContain("export const VALIDATION_CANDIDATE_ID = ");
    expect(form).toContain("data-candidate-id={VALIDATION_CANDIDATE_ID}");
    expect(form).toMatch(/import \{ submitPilotForm \} from ["']\.\.\/ingest-client["']/);
    expect(form).not.toMatch(/import \{[^}]*VALIDATION_CANDIDATE_ID/);
    const integrity = inspectGeneratedSourceIntegrity(failed.files);
    expect(integrity.status).toBe("FAIL");
    expect(integrity.undefinedSymbolsCount).toBeGreaterThan(0);
    expect(integrity.missingImports.some((item) => item.symbol === "VALIDATION_CANDIDATE_ID")).toBe(true);
    const remembered = rememberFinalRepairSuccessorIsolatedEvidence();
    expect(remembered.isolatedBuild).toBe("PASS");
    const staticGate = await runProviderEquivalentArtifactBuildGate({
      artifactId: failed.artifactId,
      files: failed.files,
      mode: "static",
    });
    expect(staticGate.gate).toBe(ProviderEquivalentArtifactBuildGate);
    expect(staticGate.global).toBe(true);
    expect(staticGate.creOnly).toBe(false);
    expect(staticGate.status).toBe("FAIL");
    expect(evaluateProviderEquivalentDeploymentEligibility({
      artifactId: failed.artifactId,
      digest: failed.digest,
      files: failed.files,
    }).status).toBe("FAIL");
  }, 180000);

  it("reproduces the original provider next build failure from the exact reconstructed bundle", async () => {
    const failed = await reconstructCrePublicLineageQuestionIdRepairSuccessor();
    const isolated = await runIsolatedArtifactInstallAndBuild({
      files: failed.files,
      keepRoot: false,
      infinityCoreRoot: process.cwd(),
    });
    expect(isolated.installResult).toBe("PASS");
    expect(isolated.buildResult).toBe("FAIL");
    expect(isolated.nextProductionBuild).toBe("FAIL");
    expect(`${isolated.build.stdout}\n${isolated.build.stderr}`).toMatch(/Cannot find name 'VALIDATION_CANDIDATE_ID'/);
    expect(isolated.rootNodeModulesLeakage).toBe(false);
  }, 300000);

  it("creates one unpublished compile-repair successor without removing public lineage", async () => {
    const successor = await reconstructCreProviderEquivalentCompileRepairSuccessor();
    expect(successor.predecessorArtifactId).toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.predecessorDigest).toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.repairReason).toBe(PROVIDER_EQUIVALENT_COMPILE_REPAIR_REASON);
    expect(successor.artifactId).toBe(PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.artifactId).not.toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).not.toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.immutable).toBe(true);
    expect(successor.deployed).toBe(false);
    expect(successor.liveArtifactMutated).toBe(false);
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    expect(getActivePublicValidationArtifactId()).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    const ingest = fileOf(successor.files, "app/ingest-client.ts");
    const form = fileOf(successor.files, "app/early-access/page.tsx");
    const homepage = fileOf(successor.files, "app/page.tsx");
    expect(ingest).toContain(`export const VALIDATION_CANDIDATE_ID = ${JSON.stringify(CRE_CANDIDATE_ID)}`);
    expect(form).toMatch(/import \{[^}]*VALIDATION_CANDIDATE_ID[^}]*\} from ["'][^"']*ingest-client["']/);
    expect(homepage).toContain(`data-candidate-id="${CRE_CANDIDATE_ID}"`);
    expect(homepage).toContain(`data-experiment-id="${LOCKED_CRE_EXPERIMENT_ID}"`);
    expect(homepage).toContain(`data-artifact-id="${successor.artifactId}"`);
    const integrity = inspectGeneratedSourceIntegrity(successor.files);
    expect(integrity.status).toBe("PASS");
    expect(integrity.missingImportsCount).toBe(0);
    expect(integrity.undefinedSymbolsCount).toBe(0);
    const inspect = inspectRenderedLineageAndQuestionIdentity({
      files: successor.files,
      artifactId: successor.artifactId,
    });
    expect(inspect.candidate.source).toBe("PASS");
    expect(inspect.candidate.form).toBe("PASS");
    expect(inspect.candidate.ingest).toBe("PASS");
    expect(inspect.experiment.renderedDerivable).toBe("PASS");
    expect(inspect.artifact.renderedDerivable).toBe("PASS");
    expect(inspect.questions.missing).toBe(0);
    expect(inspect.questions.dataQuestionId).toBe("PASS");
    expect(inspect.chunks.questionLinkage).toBe("PASS");
    const layout = auditRenderedLayoutQualityGate(successor.files);
    expect(layout.bodyGutter).toBe("PASS");
    expect(layout.fullBleedInnerPadding).toBe("PASS");
    expect(layout.footerPadding).toBe("PASS");
    expect(layout.headerPadding).toBe("PASS");
    expect(layout.containerAlignment).toBe("PASS");
    expect(layout.sectionComposition).toBe("PASS");
    expect(layout.horizontalOverflow).toBe(0);
    expect(layout.mobile).toBe("PASS");
    expect(layout.premiumComposition).toBe("PASS");
    expect(renderedLayoutPassesPremiumAuthority(layout)).toBe(true);
    const audit = await auditSuccessorAuthorityArtifact({
      files: successor.files,
      architecture: successor.architecture,
      graph: successor.graph,
      artifactId: successor.artifactId,
      digest: successor.digest,
      predecessorArtifactId: successor.predecessorArtifactId,
      repairReason: successor.repairReason,
    });
    expect(audit.newClassification).toBe(PREMIUM_AUTHORITY_VALIDATION_READY);
    expect(evaluateSecretSafety(successor.files).status).toBe("PASS");
    const contract = inspectBundleInputContract(successor.files);
    expect(contract.status).toBe("PASS");
    expect(contract.packageJson).toBe(true);
    expect(contract.lockfile).toBe(true);
    expect(contract.tsconfig).toBe(true);
    expect(contract.buildCommand).toBe(true);
    const pageRoutes = successor.files
      .map((file) => file.path.replace(/\\/g, "/"))
      .filter((path) => path === "app/page.tsx" || /app\/.+\/page\.tsx$/.test(path));
    expect(pageRoutes.length).toBe(EXPECTED_DR_PUBLIC_ROUTES.length);
    const evidence = inspectRealMarketEvidence();
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.clock.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(evidence.clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(evidence.clock.restarted).toBe(false);
    expect(evidence.counts.qualifiedVisitors).toBe(0);
    expect(evidence.decision.buildReady).toBe(false);
  }, 180000);

  it("fails when the candidate declaration or import is stripped, and cannot resolve undeclared repo files", async () => {
    const successor = await reconstructCreProviderEquivalentCompileRepairSuccessor();
    const missingDeclaration = successor.files.map((file) =>
      file.path.replace(/\\/g, "/") === "app/ingest-client.ts"
        ? { ...file, content: file.content.replace(/export const VALIDATION_CANDIDATE_ID = "[^"]+";?\n?/, "") }
        : file,
    );
    expect(inspectGeneratedSourceIntegrity(missingDeclaration).missingDeclarations.length).toBeGreaterThan(0);
    const missingImport = successor.files.map((file) =>
      file.path.replace(/\\/g, "/") === "app/early-access/page.tsx"
        ? {
            ...file,
            content: file.content.replace(", VALIDATION_CANDIDATE_ID, VALIDATION_EXPERIMENT_ID, VALIDATION_ARTIFACT_ID", ""),
          }
        : file,
    );
    expect(inspectGeneratedSourceIntegrity(missingImport).missingImportsCount).toBeGreaterThan(0);
    const withoutIngest = successor.files.filter((file) => file.path.replace(/\\/g, "/") !== "app/ingest-client.ts");
    const contract = inspectBundleInputContract(withoutIngest);
    expect(contract.status).toBe("FAIL");
    expect(contract.missing).toContain("app/ingest-client.ts");
    const isolated = await runIsolatedArtifactInstallAndBuild({
      files: withoutIngest,
      keepRoot: false,
      infinityCoreRoot: process.cwd(),
    });
    expect(isolated.buildResult).toBe("FAIL");
    expect(isolated.rootNodeModulesLeakage).toBe(false);
  }, 300000);

  it("builds the exact successor bundle in clean-room isolation and freezes handoff parity", async () => {
    const successor = await reconstructCreProviderEquivalentCompileRepairSuccessor();
    const gate = await runProviderEquivalentArtifactBuildGate({
      artifactId: successor.artifactId,
      files: successor.files,
      mode: "full",
      keepRoot: false,
      infinityCoreRoot: process.cwd(),
      freeze: true,
    });
    expect(gate.gate).toBe(ProviderEquivalentArtifactBuildGate);
    expect(gate.global).toBe(true);
    expect(gate.creOnly).toBe(false);
    expect(gate.required).toBe(true);
    expect(gate.cleanRoomIsolation).toBe("PASS");
    expect(gate.repoFallback).toBe(false);
    expect(gate.repoFallbackProhibited).toBe("PASS");
    expect(gate.typescript).toBe("PASS");
    expect(gate.nextBuild).toBe("PASS");
    expect(gate.missingImports).toBe(0);
    expect(gate.undefinedSymbols).toBe(0);
    expect(gate.routesGenerated).toBeGreaterThanOrEqual(EXPECTED_DR_PUBLIC_ROUTES.length);
    expect(gate.sitemap).toBe("PASS");
    expect(gate.robots).toBe("PASS");
    expect(gate.candidateLineage).toBe("PASS");
    expect(gate.experimentLineage).toBe("PASS");
    expect(gate.artifactLineage).toBe("PASS");
    expect(gate.handoffParity).toBe("PASS");
    expect(gate.frozen).toBe(true);
    expect(gate.status).toBe("PASS");
    const upload = translateFilesToVercelSourceBundle(successor.files);
    expect(upload.length).toBe(successor.files.length);
    const parity = evaluateHandoffParity({
      artifactId: successor.artifactId,
      digest: successor.digest,
      files: successor.files,
      uploadFiles: successor.files,
    });
    expect(parity.artifactIdIdentical).toBe(true);
    expect(parity.digestIdentical).toBe(true);
    expect(parity.fileInventoryIdentical).toBe(true);
    expect(parity.fileHashesIdentical).toBe(true);
    expect(parity.packageManifestIdentical).toBe(true);
    expect(parity.lockfileIdentical).toBe(true);
    expect(parity.buildCommandIdentical).toBe(true);
    expect(evaluateProviderEquivalentDeploymentEligibility({
      artifactId: successor.artifactId,
      digest: successor.digest,
      files: successor.files,
    }).issues).toContain("SERVED_PRODUCTION_RENDERED_LAYOUT_GATE_REQUIRED");
    expect(evaluateProviderEquivalentDeploymentEligibility({
      artifactId: successor.artifactId,
      digest: successor.digest,
      files: successor.files,
    }).status).toBe("FAIL");
    const mutated = successor.files.map((file, index) =>
      index === 0 ? { ...file, content: `${file.content}\n` } : file,
    );
    expect(invalidateProviderEquivalentEligibilityIfMutated(mutated).status).toBe("FAIL");
    expect(evaluateProviderEquivalentDeploymentEligibility({
      artifactId: successor.artifactId,
      digest: successor.digest,
      files: mutated,
    }).status).toBe("FAIL");
    await expect(
      vercelAdapter.execute({
        organizationId: "org",
        actionType: "hosting.deploy_source_bundle",
        target: "blocked",
        payload: {
          production_artifact_id: successor.artifactId,
          source_digest: successor.digest,
          files: mutated,
        },
        correlationId: null,
      }),
    ).rejects.toThrow(/PROVIDER_EQUIVALENT|POST_PREFLIGHT_MUTATION|HANDOFF/);
  }, 300000);

  it("runs HQ with truthful rooms, preserves the failed deployment, and does not write the provider", async () => {
    expect(workerRoleForStep("SITE_ARCHITECTURE", "venture_systems_architecture")).toBe("Site Architect");
    expect(workerRoleForStep("ARTIFACT_GENERATION", "product_asset_builder")).toBe("Frontend Implementer");
    expect(workerRoleForStep("VALIDATE_TECHNICAL", "market_validation")).toBe("Reviewer");
    const run = await runCreProviderEquivalentCompileRepairMission();
    expect(run.commandLiveProof.missionId).toBe("msn_cre_provider_equivalent_compile_repair_v1");
    expect(run.commandLiveProof.command).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.systemsArchitect).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.creationLab).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.validationStation).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.deploymentDepot).toBe("PRESENT_IDLE");
    expect(run.commandLiveProof.workerProjection).toBe("PASS");
    expect(run.deployed).toBe(false);
    expect(run.liveArtifactMutated).toBe(false);
    expect(run.providerWrites).toBe(0);
    expect(FAILED_LINEAGE_REPAIR_DEPLOYMENT_ID).toBe("dpl_CVsp18qH7JS5RgegJwCEX5Yznb5q");
    expect(TECHNICAL_DEPLOYMENT_ARTIFACT_FAILURE).toBe("TECHNICAL_DEPLOYMENT_ARTIFACT_FAILURE");
    const evidence = inspectRealMarketEvidence({ now: new Date("2026-08-30T17:39:00.000Z") });
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.clock.restarted).toBe(false);
    expect(getActivePublicValidationArtifactId()).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
  }, 180000);
});
