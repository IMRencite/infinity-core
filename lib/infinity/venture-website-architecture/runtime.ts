import { creDesignContext, inspectCreativeImageGenerateCapability, planCreativeAssets, planPublicVentureComposition, produceVentureDesignTokens } from "@/lib/infinity/public-venture-design";
import { AUTONOMOUS_VENTURE_WEBSITE_BUILD_RUNTIME, WEB_SEARCH_CAPABILITY } from "./constants";
import { composePremiumAuthoritySiteArtifact } from "./compose-authority-artifact";
import { creSiteArchitectureInput } from "./cre-context";
import { creAuthoritySources } from "./geo-seo-architecture";
import { emitAuthoritySiteMissionActivity } from "./mission";
import { planVentureSiteArchitecture } from "./site-architecture-planner";
import { planSiteExpansion } from "./site-expansion-planner";
import { buildSiteKnowledgeGraph } from "./site-knowledge-graph";
import { siteAiRoleContracts } from "./content-roles";
import type { ComposeAuthorityInput } from "./types";

export function autonomousVentureWebsiteBuildRuntime() {
  return {
    runtime: AUTONOMOUS_VENTURE_WEBSITE_BUILD_RUNTIME,
    replacesExistingSystems: false,
    searchCapability: WEB_SEARCH_CAPABILITY,
    searchProviderImplementationHidden: true,
    roles: siteAiRoleContracts(),
  };
}

export function planAndComposeAuthoritySite(input: {
  files: Array<{ path: string; content: string }>;
  artifactId: string;
  experimentId: string;
  ventureId: string;
  candidateId: string;
  predecessorArtifactId: string;
  predecessorDigest?: string | null;
  observedAt: string;
}): {
  architecture: ReturnType<typeof planVentureSiteArchitecture>;
  graph: ReturnType<typeof buildSiteKnowledgeGraph>;
  expansion: ReturnType<typeof planSiteExpansion>;
  composed: ReturnType<typeof composePremiumAuthoritySiteArtifact>;
  command: ReturnType<typeof emitAuthoritySiteMissionActivity>;
  creative: ReturnType<typeof planCreativeAssets>;
} {
  const context = creSiteArchitectureInput(input.ventureId);
  const architecture = planVentureSiteArchitecture(context);
  const graph = buildSiteKnowledgeGraph(architecture);
  const expansion = planSiteExpansion(architecture);
  const designContext = creDesignContext();
  const tokens = produceVentureDesignTokens(designContext);
  const composition = planPublicVentureComposition(designContext);
  const creative = planCreativeAssets({ context: designContext, composition });
  const evidence = creAuthoritySources(input.observedAt);
  const composeInput: ComposeAuthorityInput = {
    context,
    files: input.files,
    artifactId: input.artifactId,
    experimentId: input.experimentId,
    ventureId: input.ventureId,
    candidateId: input.candidateId,
    predecessorArtifactId: input.predecessorArtifactId,
    predecessorDigest: input.predecessorDigest,
    architecture,
    graph,
    evidence,
    tokens,
    creative,
  };
  const composed = composePremiumAuthoritySiteArtifact(composeInput);
  const command = emitAuthoritySiteMissionActivity({
    candidateId: input.candidateId,
    experimentId: input.experimentId,
    missionId: "msn_premium_authority_site_v1",
    artifactId: input.artifactId,
    creativeUsed: creative.creativeMediaInvoked || inspectCreativeImageGenerateCapability().available,
    pagesCompleted: architecture.pages.length,
    pagesPlanned: architecture.pages.length,
  });
  void expansion;
  return { architecture, graph, expansion, composed, command, creative };
}
