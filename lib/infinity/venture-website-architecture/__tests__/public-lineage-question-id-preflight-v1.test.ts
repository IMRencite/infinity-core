import { beforeEach, describe, expect, it } from "vitest";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { workerRoleForStep } from "@/lib/infinity/mission-activity/worker-roles";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { resetExperimentRuntime } from "@/lib/infinity/market-validation-experiment/execute";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID,
  RENDERED_LAYOUT_REPAIR_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { PUBLIC_LINEAGE_QUESTION_ID_REPAIR_REASON } from "../constants";
import { reconstructCreRenderedLayoutRepairSuccessor } from "../cre-rendered-layout-successor";
import { reconstructCrePublicLineageQuestionIdRepairSuccessor } from "../cre-lineage-question-id-successor";
import { inspectRenderedLineageAndQuestionIdentity } from "../public-lineage-question-id";
import { runCrePublicLineageQuestionIdPreflightMission } from "../answer-authority/lineage-question-id-mission";
import { auditSuccessorAuthorityArtifact } from "../answer-authority/successor-audit";
import {
  auditRenderedLayoutQualityGate,
  renderedLayoutPassesPremiumAuthority,
} from "@/lib/infinity/public-venture-design/rendered-layout";
import { PREMIUM_AUTHORITY_VALIDATION_READY } from "../constants";

describe("FINAL CRE REPAIR SUCCESSOR LINEAGE + QUESTION ID PREFLIGHT V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetExecutableBuildRuntime();
    resetExperimentRuntime();
  });

  it("finds missing question IDs and unconsumed candidate lineage on the rendered-layout successor", async () => {
    const current = await reconstructCreRenderedLayoutRepairSuccessor();
    expect(current.artifactId).toBe(RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(current.digest).toBe(RENDERED_LAYOUT_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    const pages = current.files.filter((file) => /page\.tsx$/.test(file.path.replace(/\\/g, "/")));
    expect(pages.some((file) => file.content.includes("data-question-id"))).toBe(false);
    const inspect = inspectRenderedLineageAndQuestionIdentity({
      files: current.files,
      artifactId: current.artifactId,
    });
    expect(inspect.candidate.source).toBe("PASS");
    expect(inspect.candidate.renderedSerialized).toBe("FAIL");
    expect(inspect.candidate.form).toBe("FAIL");
    expect(inspect.questions.missing).toBeGreaterThan(0);
    expect(inspect.questions.dataQuestionId).toBe("FAIL");
    expect(inspect.repairRequired).toBe(true);
    expect(inspect.sourceObjectsUsedAsSoleProof).toBe(false);
  }, 180000);

  it("creates one unpublished lineage and question-id repair successor without regressing layout or authority", async () => {
    const successor = await reconstructCrePublicLineageQuestionIdRepairSuccessor();
    expect(successor.predecessorArtifactId).toBe(RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.predecessorDigest).toBe(RENDERED_LAYOUT_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.repairReason).toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_REASON);
    expect(successor.artifactId).not.toBe(RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).not.toBe(RENDERED_LAYOUT_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.immutable).toBe(true);
    expect(successor.deployed).toBe(false);
    expect(successor.liveArtifactMutated).toBe(false);
    expect(successor.artifactId).toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.secretScan).toBe("PASS");
    const inspect = inspectRenderedLineageAndQuestionIdentity({
      files: successor.files,
      artifactId: successor.artifactId,
    });
    expect(inspect.candidate.source).toBe("PASS");
    expect(inspect.candidate.renderedSerialized).toBe("PASS");
    expect(inspect.candidate.form).toBe("PASS");
    expect(inspect.candidate.ingest).toBe("PASS");
    expect(inspect.candidate.liveVerifiable).toBe(true);
    expect(inspect.experiment.renderedDerivable).toBe("PASS");
    expect(inspect.experiment.form).toBe("PASS");
    expect(inspect.experiment.ingest).toBe("PASS");
    expect(inspect.artifact.renderedDerivable).toBe("PASS");
    expect(inspect.artifact.formRuntime).toBe("PASS");
    expect(inspect.questions.missing).toBe(0);
    expect(inspect.questions.duplicateUnstable).toBe(0);
    expect(inspect.questions.dataQuestionId).toBe("PASS");
    expect(inspect.questions.stableIds).toBe("PASS");
    expect(inspect.chunks.questionLinkage).toBe("PASS");
    expect(inspect.chunks.pageLinkage).toBe("PASS");
    expect(inspect.chunks.sectionLinkage).toBe("PASS");
    expect(inspect.chunks.artifactLinkage).toBe("PASS");
    expect(inspect.form.candidate).toBe("PASS");
    expect(inspect.form.experiment).toBe("PASS");
    expect(inspect.form.artifact).toBe("PASS");
    expect(inspect.form.sameOrigin).toBe("PASS");
    expect(inspect.form.realPostPerformed).toBe(false);
    expect(inspect.repairRequired).toBe(false);
    expect(inspect.questions.intended).toBe(36);
    expect(inspect.questions.rendered).toBe(39);
    const homepage = successor.files.find((file) => file.path.replace(/\\/g, "/") === "app/page.tsx")?.content ?? "";
    const ingest = successor.files.find((file) => file.path.replace(/\\/g, "/") === "app/ingest-client.ts")?.content ?? "";
    const form = successor.files.find((file) => file.path.replace(/\\/g, "/") === "app/early-access/page.tsx")?.content ?? "";
    expect(homepage).toContain(`data-candidate-id="${CRE_CANDIDATE_ID}"`);
    expect(homepage).toContain(`data-experiment-id="${LOCKED_CRE_EXPERIMENT_ID}"`);
    expect(homepage).toContain(`data-artifact-id="${successor.artifactId}"`);
    expect(ingest).toContain("candidateId: VALIDATION_CANDIDATE_ID");
    expect(form).toContain("VALIDATION_CANDIDATE_ID");
    expect(form).not.toContain("sk_live_");
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
    expect(audit.highConfidenceQuestions).toBe(38);
    expect(audit.coverage.answeredQuestions).toBe(36);
    expect(audit.citationReadyChunks).toBeGreaterThanOrEqual(13);
    const viz =
      successor.files
        .map((item) => item.content)
        .join("\n")
        .match(/data-visualization/g)?.length ?? 0;
    expect(viz).toBeGreaterThanOrEqual(56);
  }, 180000);

  it("runs HQ with truthful rooms and does not restart the experiment clock", async () => {
    expect(workerRoleForStep("LINEAGE_INSTRUMENTATION_AUDIT", "venture_systems_architecture")).toBe("Site Architect");
    expect(workerRoleForStep("RENDERED_OUTPUT_VERIFICATION", "market_validation")).toBe("Reviewer");
    expect(workerRoleForStep("ARTIFACT_GENERATION", "product_asset_builder")).toBe("Frontend Implementer");
    const run = await runCrePublicLineageQuestionIdPreflightMission();
    expect(run.commandLiveProof.missionId).toBe("msn_cre_lineage_qid_preflight_v1");
    expect(run.commandLiveProof.command).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.systemsArchitect).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.creationLab).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.validationStation).toBe("ACTIVE_WORK");
    expect(run.commandLiveProof.designCore).toBe("PRESENT_IDLE");
    expect(run.commandLiveProof.researchGrid).toBe("PRESENT_IDLE");
    expect(run.commandLiveProof.deploymentDepot).toBe("PRESENT_IDLE");
    expect(run.commandLiveProof.workerProjection).toBe("PASS");
    expect(run.deployed).toBe(false);
    expect(run.liveArtifactMutated).toBe(false);
    const evidence = inspectRealMarketEvidence({ now: new Date("2026-08-30T17:39:00.000Z") });
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.clock.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(evidence.clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(evidence.clock.restarted).toBe(false);
    expect(evidence.counts.qualifiedVisitors).toBe(0);
    expect(evidence.decision.buildReady).toBe(false);
  }, 180000);
});
