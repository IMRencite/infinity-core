import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
} from "../constants";
import {
  GOVERNED_CRE_SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOYMENT_V1,
  GOVERNED_CRE_SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOYMENT_V1_MISSION_ID,
  GOVERNED_CRE_SEMANTIC_NAV_WIDTH_REPAIR_DEPLOYMENT_REQUIRED,
  SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_BINDING,
} from "../cre-semantic-nav-width-muted-text-deploy";
import { SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_FOUNDER_AUTHORIZATION_ID } from "../cre-semantic-nav-width-muted-text-deploy-authorization";
import {
  SEMANTIC_NAV_WIDTH_MUTED_TEXT_FORBIDDEN_PREDECESSOR_ARTIFACT_IDS,
  resolveFrozenSemanticNavWidthMutedTextDeploymentBundle,
} from "../resolve-frozen-semantic-nav-width-muted-text-bundle";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { isCreValidationArtifactId } from "../current-cre-artifact";

describe("GOVERNED CRE SEMANTIC NAV WIDTH MUTED TEXT DEPLOYMENT V1", () => {
  it("binds the first-class deploy function to the exact frozen artifact", () => {
    const source = readFileSync("lib/infinity/market-validation-experiment/cre-semantic-nav-width-muted-text-deploy.ts", "utf8");
    expect(GOVERNED_CRE_SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOYMENT_V1).toBe(
      "GOVERNED_CRE_SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOYMENT_V1",
    );
    expect(GOVERNED_CRE_SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOYMENT_V1_MISSION_ID).toBe(
      "msn_cre_semantic_nav_width_muted_text_deploy_v1",
    );
    expect(GOVERNED_CRE_SEMANTIC_NAV_WIDTH_REPAIR_DEPLOYMENT_REQUIRED).toBe(
      "GOVERNED_CRE_SEMANTIC_NAV_WIDTH_REPAIR_DEPLOYMENT_REQUIRED",
    );
    expect(SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_BINDING.functionName).toBe(
      "executeSemanticNavWidthMutedTextAuthorizedDeploy",
    );
    expect(SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_BINDING.artifactId).toBe(
      CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    );
    expect(SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_BINDING.digest).toBe(
      CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
    );
    expect(SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_BINDING.maximumDeployments).toBe(1);
    expect(SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_BINDING.maximumActivations).toBe(1);
    expect(SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOY_FOUNDER_AUTHORIZATION_ID).not.toMatch(/WAVE_2|OUTREACH|DNS|DOMAIN/);
    expect(SEMANTIC_NAV_WIDTH_MUTED_TEXT_FORBIDDEN_PREDECESSOR_ARTIFACT_IDS).toContain(
      CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
    );
    expect(source).not.toContain("reconstructCreSemanticNavWidthAndMutedTextSuccessor");
    expect(source).not.toContain("composeSemanticNavWidthAndMutedTextRepair");
    expect(source).not.toContain("runProviderEquivalentArtifactBuildGate");
    expect(isCreValidationArtifactId(CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID)).toBe(true);
    expect(instrumentedRuntimeRegistry().runtimes.CreSemanticNavWidthMutedTextDeployRuntime.usesMissionWrapper).toBe(true);
    const frozen = resolveFrozenSemanticNavWidthMutedTextDeploymentBundle();
    expect(frozen.ok).toBe(true);
    expect(frozen.composed).toBe(false);
    expect(frozen.composeInvoked).toBe(false);
    expect(frozen.artifactExactMatch).toBe("PASS");
    expect(frozen.digestExactMatch).toBe("PASS");
    expect(frozen.hqFiles).toBe(0);
    expect(frozen.scopeSeparation).toBe("PASS");
    expect(frozen.fullFrozenBundleAvailable).toBe(true);
    expect(frozen.routes).toBe(93);
  });
});
