import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  NEW_FOUNDER_PREMIUM_AUTHORITY_SITE_DEPLOYMENT_AUTHORIZATION_REQUIRED,
  PREMIUM_AUTHORITY_SITE_REPAIR_REASON,
  VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { compileCreValidationArtifactInput } from "@/lib/infinity/market-validation-experiment/compile";
import { VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST } from "@/lib/infinity/market-validation-experiment/source-bundle-request";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { compileExecutableVenturePlan, executeGovernedVentureBuild, runIsolatedArtifactInstallAndBuild } from "@/lib/infinity/venture-build-orchestration";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import {
  creDesignContext,
  inspectCreativeImageGenerateCapability,
  planCreativeAssets,
  planPublicVentureComposition,
  produceVentureDesignTokens,
} from "@/lib/infinity/public-venture-design";
import { composePremiumAuthoritySiteArtifact, premiumAuthorityArtifactIdFor } from "./compose-authority-artifact";
import { creAuthoritySources } from "./geo-seo-architecture";
import { emitAuthoritySiteMissionActivity } from "./mission";
import { auditPremiumAuthoritySite } from "./quality-gates";
import { planVentureSiteArchitecture } from "./site-architecture-planner";
import { planSiteExpansion } from "./site-expansion-planner";
import { creSiteArchitectureInput } from "./cre-context";
import { buildSiteKnowledgeGraph } from "./site-knowledge-graph";
import { pinHistoricalLockedFooter } from "./locked-predecessor-footer";

export function digestOfAuthorityFiles(files: Array<{ path: string; content: string }>): string {
  const manifest = files
    .map((file) => `${file.path}:${createHash("sha256").update(file.content).digest("hex")}`)
    .sort()
    .join("|");
  return createHash("sha256").update(manifest).digest("hex");
}

export async function reconstructCreAuthoritySiteSuccessor(): Promise<{
  artifactId: string;
  digest: string;
  predecessorArtifactId: string;
  files: Array<{ path: string; content: string }>;
  oldArtifact: {
    artifactId: string;
    premiumAuthorityReady: "PASS" | "FAIL";
    mutated: false;
  };
  architecture: ReturnType<typeof planVentureSiteArchitecture>;
  graph: ReturnType<typeof buildSiteKnowledgeGraph>;
  quality: ReturnType<typeof auditPremiumAuthoritySite>;
  contentReport: ReturnType<typeof composePremiumAuthoritySiteArtifact>["contentReport"];
  secretScan: "PASS" | "FAIL";
  creative: ReturnType<typeof planCreativeAssets>;
  expansion: ReturnType<typeof planSiteExpansion>;
}> {
  const compile = compileCreValidationArtifactInput({
    candidateId: CRE_CANDIDATE_ID,
    ventureId: `candidate:${CRE_CANDIDATE_ID}`,
  });
  const compiled = compileExecutableVenturePlan(compile);
  if (!compiled.buildPackage) throw new Error("cre_validation_package_missing");
  const built = await executeGovernedVentureBuild({ compile });
  const predecessorFiles = pinHistoricalLockedFooter(built.artifact?.files ?? []);
  const oldArchitecture = planVentureSiteArchitecture(creSiteArchitectureInput(compiled.plan.ventureId));
  const oldGraph = buildSiteKnowledgeGraph(oldArchitecture);
  const oldQuality = auditPremiumAuthoritySite({ files: predecessorFiles, pages: oldArchitecture.pages, graph: oldGraph });
  const artifactId = premiumAuthorityArtifactIdFor({
    planId: compiled.plan.planId,
    packageId: compiled.buildPackage.packageId,
    packageVersion: compiled.buildPackage.packageVersion,
  });
  const context = creSiteArchitectureInput(compiled.plan.ventureId);
  const architecture = planVentureSiteArchitecture(context);
  const graph = buildSiteKnowledgeGraph(architecture);
  const designContext = creDesignContext();
  const tokens = produceVentureDesignTokens(designContext);
  const composition = planPublicVentureComposition(designContext);
  const creative = planCreativeAssets({ context: designContext, composition });
  const evidence = creAuthoritySources(CANONICAL_EVIDENCE_START);
  const composed = composePremiumAuthoritySiteArtifact({
    context,
    files: predecessorFiles,
    artifactId,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    ventureId: compiled.plan.ventureId,
    candidateId: CRE_CANDIDATE_ID,
    predecessorArtifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    predecessorDigest: VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST,
    architecture,
    graph,
    evidence,
    tokens,
    creative,
  });
  return {
    artifactId,
    digest: digestOfAuthorityFiles(composed.files),
    predecessorArtifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    files: composed.files,
    oldArtifact: {
      artifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
      premiumAuthorityReady: oldQuality.premiumAuthorityOverall,
      mutated: false,
    },
    architecture,
    graph,
    quality: composed.quality,
    contentReport: composed.contentReport,
    secretScan: evaluateSecretSafety(composed.files).status,
    creative,
    expansion: planSiteExpansion(architecture),
  };
}

export async function generateCreAuthoritySiteSuccessor(): Promise<{
  required: true;
  artifactId: string;
  digest: string;
  predecessorArtifactId: string;
  repairReason: typeof PREMIUM_AUTHORITY_SITE_REPAIR_REASON;
  immutable: true;
  files: Array<{ path: string; content: string }>;
  oldArtifact: {
    artifactId: string;
    premiumAuthorityReady: "PASS" | "FAIL";
    mutated: false;
  };
  architecture: ReturnType<typeof planVentureSiteArchitecture>;
  graph: ReturnType<typeof buildSiteKnowledgeGraph>;
  quality: ReturnType<typeof auditPremiumAuthoritySite>;
  contentReport: ReturnType<typeof composePremiumAuthoritySiteArtifact>["contentReport"];
  secretScan: "PASS" | "FAIL";
  creative: ReturnType<typeof planCreativeAssets>;
  command: ReturnType<typeof emitAuthoritySiteMissionActivity>;
  expansion: ReturnType<typeof planSiteExpansion>;
  nextExternalRequirement: typeof NEW_FOUNDER_PREMIUM_AUTHORITY_SITE_DEPLOYMENT_AUTHORIZATION_REQUIRED;
  deployed: false;
}> {
  const reconstructed = await reconstructCreAuthoritySiteSuccessor();
  const command = emitAuthoritySiteMissionActivity({
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    missionId: "msn_premium_authority_site_v1",
    artifactId: reconstructed.artifactId,
    creativeUsed: reconstructed.creative.creativeMediaInvoked || inspectCreativeImageGenerateCapability().available,
    pagesCompleted: reconstructed.architecture.pages.length,
    pagesPlanned: reconstructed.architecture.pages.length,
  });
  const result = {
    required: true as const,
    artifactId: reconstructed.artifactId,
    digest: reconstructed.digest,
    predecessorArtifactId: reconstructed.predecessorArtifactId,
    repairReason: PREMIUM_AUTHORITY_SITE_REPAIR_REASON,
    immutable: true as const,
    files: reconstructed.files,
    oldArtifact: reconstructed.oldArtifact,
    architecture: reconstructed.architecture,
    graph: reconstructed.graph,
    quality: reconstructed.quality,
    contentReport: reconstructed.contentReport,
    secretScan: reconstructed.secretScan,
    creative: reconstructed.creative,
    command,
    expansion: reconstructed.expansion,
    nextExternalRequirement: NEW_FOUNDER_PREMIUM_AUTHORITY_SITE_DEPLOYMENT_AUTHORIZATION_REQUIRED,
    deployed: false as const,
  };
  const reportDir = join(process.cwd(), ".infinity", "mission-activity");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(
    join(reportDir, "premium-authority-cre-successor-report.json"),
    `${JSON.stringify(
      {
        artifactId: result.artifactId,
        digest: result.digest,
        predecessorArtifactId: result.predecessorArtifactId,
        repairReason: result.repairReason,
        classification: result.quality.classification,
        quality: result.quality,
        premiumAuthorityOverall: result.quality.premiumAuthorityOverall,
        secretScan: result.secretScan,
        routes: result.architecture.pages.map((page) => ({
          route: page.route,
          role: page.role,
          intent: page.primaryIntent,
          parent: page.parentHub,
          schema: page.schemaTypes,
          indexable: page.indexable,
        })),
        contentReport: result.contentReport,
        graph: { nodes: result.graph.nodes.length, edges: result.graph.edges.length, orphans: result.graph.orphans },
        creative: {
          visualNecessity: result.creative.visualNecessity,
          assetsGenerated: result.creative.assetsGenerated,
          costState: result.creative.costState,
          blocker: result.creative.blocker,
        },
        nextExternalRequirement: result.nextExternalRequirement,
      },
      null,
      2,
    )}\n`,
  );
  return result;
}

export async function validateCreAuthoritySiteSuccessorIsolated(): Promise<{
  successor: Awaited<ReturnType<typeof generateCreAuthoritySiteSuccessor>>;
  npmCi: "PASS" | "FAIL";
  typescript: "PASS" | "FAIL" | "NOT_APPLICABLE";
  productionBuild: "PASS" | "FAIL";
}> {
  const successor = await generateCreAuthoritySiteSuccessor();
  const isolated = await runIsolatedArtifactInstallAndBuild({ files: successor.files });
  return {
    successor,
    npmCi: isolated.installResult,
    typescript: isolated.typescript,
    productionBuild: isolated.nextProductionBuild,
  };
}
