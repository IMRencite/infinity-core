import {
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
  DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
  DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEO_GEO_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEO_GEO_SUCCESSOR_URL,
  DEPLOYED_VISUAL_QUALITY_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_VISUAL_QUALITY_SUCCESSOR_URL,
  DEPLOYED_VISUAL_POLISH_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_VISUAL_POLISH_SUCCESSOR_URL,
  DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_URL,
  SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_POLISH_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_URL,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL,
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_URL,
  SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_URL,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_URL,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEARCH_DEPTH_SUCCESSOR_URL,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_DEPLOYMENT_ID,
  PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_ARTIFACT_ID,
  SUCCESSOR_CRE_ARTIFACT_ID,
  VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
} from "./constants";
import { SUCCESSOR_CRE_SOURCE_DIGEST, VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST } from "./source-bundle-request";

let activeArtifactId: string = SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID;
let activeDigest: string = SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST;
let activeDeploymentId: string | null = DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID;
let activeUrl: string | null = DEPLOYED_SEARCH_DEPTH_SUCCESSOR_URL;
let successorActivated = false;
let authoritySuccessorActivated = false;
let drSuccessorActivated = false;
let finalRepairSuccessorActivated = false;
let compileRepairSuccessorActivated = false;
let compileRepairActivationMutations = 1;
let seoGeoSuccessorActivated = false;
let seoGeoActivationMutations = 1;
let seoGeoDeploymentId: string | null = DEPLOYED_SEO_GEO_SUCCESSOR_DEPLOYMENT_ID;
let seoGeoUrl: string | null = DEPLOYED_SEO_GEO_SUCCESSOR_URL;
let visualSuccessorActivated = false;
let visualActivationMutations = 1;
let visualDeploymentId: string | null = DEPLOYED_VISUAL_QUALITY_SUCCESSOR_DEPLOYMENT_ID;
let visualUrl: string | null = DEPLOYED_VISUAL_QUALITY_SUCCESSOR_URL;
let polishSuccessorActivated = false;
let polishActivationMutations = 1;
let polishDeploymentId: string | null = DEPLOYED_VISUAL_POLISH_SUCCESSOR_DEPLOYMENT_ID;
let polishUrl: string | null = DEPLOYED_VISUAL_POLISH_SUCCESSOR_URL;
let tableDesignSuccessorActivated = false;
let tableDesignActivationMutations = 1;
let tableDesignDeploymentId: string | null = DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_DEPLOYMENT_ID;
let tableDesignUrl: string | null = DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_URL;
let homepageFoldSuccessorActivated = false;
let homepageFoldActivationMutations = 1;
let homepageFoldDeploymentId: string | null = DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_DEPLOYMENT_ID;
let homepageFoldUrl: string | null = DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_URL;
let authorityExpansionSuccessorActivated = false;
let authorityExpansionActivationMutations = 1;
let authorityExpansionDeploymentId: string | null = DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID;
let authorityExpansionUrl: string | null = DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL;
let finalAuthorityPolishSuccessorActivated = false;
let finalAuthorityPolishActivationMutations = 1;
let finalAuthorityPolishDeploymentId: string | null = DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_DEPLOYMENT_ID;
let finalAuthorityPolishUrl: string | null = DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_URL;
let founderVisualQcSuccessorActivated = false;
let founderVisualQcActivationMutations = 1;
let founderVisualQcDeploymentId: string | null = DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_DEPLOYMENT_ID;
let founderVisualQcUrl: string | null = DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_URL;
let authorityWidthSuccessorActivated = false;
let authorityWidthActivationMutations = 1;
let authorityWidthDeploymentId: string | null = DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_DEPLOYMENT_ID;
let authorityWidthUrl: string | null = DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_URL;
let searchDepthSuccessorActivated = true;
let searchDepthActivationMutations = 1;
let searchDepthDeploymentId: string | null = DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID;
let searchDepthUrl: string | null = DEPLOYED_SEARCH_DEPTH_SUCCESSOR_URL;
let humanFirstContrastRepairActivated = false;
let humanFirstContrastRepairActivationMutations = 0;
let humanFirstContrastRepairDeploymentId: string | null = null;
let humanFirstContrastRepairUrl: string | null = null;
let trustedSourcesContrastRepairActivated = false;
let trustedSourcesContrastRepairActivationMutations = 0;
let trustedSourcesContrastRepairDeploymentId: string | null = null;
let trustedSourcesContrastRepairUrl: string | null = null;
let fullPageAutorepairActivated = false;
let fullPageAutorepairActivationMutations = 0;
let fullPageAutorepairDeploymentId: string | null = null;
let fullPageAutorepairUrl: string | null = null;
let pricingPrerenderRepairActivated = false;
let pricingPrerenderRepairActivationMutations = 0;
let pricingPrerenderRepairDeploymentId: string | null = null;
let pricingPrerenderRepairUrl: string | null = null;
let hubLayoutRepairActivated = false;
let hubLayoutRepairActivationMutations = 0;
let hubLayoutRepairDeploymentId: string | null = null;
let hubLayoutRepairUrl: string | null = null;
let siteChromeLinkContrastRepairActivated = false;
let siteChromeLinkContrastRepairActivationMutations = 0;
let siteChromeLinkContrastRepairDeploymentId: string | null = null;
let siteChromeLinkContrastRepairUrl: string | null = null;
let homepageHeroLinkContrastRepairActivated = false;
let homepageHeroLinkContrastRepairActivationMutations = 0;
let homepageHeroLinkContrastRepairDeploymentId: string | null = null;
let homepageHeroLinkContrastRepairUrl: string | null = null;
let semanticNavWidthMutedTextRepairActivated = false;
let semanticNavWidthMutedTextRepairActivationMutations = 0;
let semanticNavWidthMutedTextRepairDeploymentId: string | null = null;
let semanticNavWidthMutedTextRepairUrl: string | null = null;

function clearCompileRepairActivationBinding(): void {
  compileRepairSuccessorActivated = false;
  activeDeploymentId = null;
  activeUrl = null;
}

export function getActivePublicValidationArtifactId(): string {
  return activeArtifactId;
}

export function getActivePublicValidationDigest(): string {
  return activeDigest;
}

export function getActivePublicValidationDeploymentId(): string | null {
  return activeDeploymentId;
}

export function getActivePublicValidationUrl(): string | null {
  return activeUrl;
}

export function getCanonicalActivePublicValidationState(): {
  activeArtifactId: string;
  activeDigest: string;
  activeDeploymentId: string | null;
  activeUrl: string | null;
} {
  return {
    activeArtifactId,
    activeDigest,
    activeDeploymentId,
    activeUrl,
  };
}

export function compileRepairActivationMutationsConsumed(): number {
  return compileRepairActivationMutations;
}

export function isValidationGradeSuccessorPublicActive(): boolean {
  return successorActivated && activeArtifactId === VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID;
}

export function activateValidationGradeSuccessorPublicArtifact(): {
  activeArtifact: typeof VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID;
  predecessorLineage: "PASS";
  predecessor: typeof SUCCESSOR_CRE_ARTIFACT_ID;
} {
  activeArtifactId = VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID;
  activeDigest = VALIDATION_GRADE_SUCCESSOR_SOURCE_DIGEST;
  successorActivated = true;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  clearCompileRepairActivationBinding();
  return {
    activeArtifact: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    predecessorLineage: "PASS",
    predecessor: SUCCESSOR_CRE_ARTIFACT_ID,
  };
}

export function isPremiumAuthoritySuccessorPublicActive(): boolean {
  return authoritySuccessorActivated && activeArtifactId === PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID;
}

export function activatePremiumAuthoritySuccessorPublicArtifact(): {
  activeArtifact: typeof PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID;
  predecessorLineage: "PASS";
  predecessor: typeof VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID;
} {
  activeArtifactId = PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID;
  activeDigest = PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST;
  successorActivated = false;
  authoritySuccessorActivated = true;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  clearCompileRepairActivationBinding();
  return {
    activeArtifact: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    predecessorLineage: "PASS",
    predecessor: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
  };
}

export function isDirectResponseSuccessorPublicActive(): boolean {
  return drSuccessorActivated && activeArtifactId === DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID;
}

export function activateDirectResponseSuccessorPublicArtifact(): {
  activeArtifact: typeof DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID;
  predecessorLineage: "PASS";
  predecessor: typeof PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID;
} {
  activeArtifactId = DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID;
  activeDigest = DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = true;
  finalRepairSuccessorActivated = false;
  clearCompileRepairActivationBinding();
  return {
    activeArtifact: DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID,
    predecessorLineage: "PASS",
    predecessor: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  };
}

export function isFinalRepairSuccessorPublicActive(): boolean {
  return finalRepairSuccessorActivated && activeArtifactId === PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID;
}

export function activateFinalRepairSuccessorPublicArtifact(): {
  activeArtifact: typeof PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID;
  predecessorLineage: "PASS";
  predecessor: typeof PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID;
} {
  activeArtifactId = PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID;
  activeDigest = PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = true;
  clearCompileRepairActivationBinding();
  return {
    activeArtifact: PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID,
    predecessorLineage: "PASS",
    predecessor: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  };
}

export function isCompileRepairSuccessorPublicActive(): boolean {
  return (
    compileRepairSuccessorActivated &&
    activeArtifactId === PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID
  );
}

export function activateCompileRepairSuccessorPublicArtifact(input?: {
  artifactId?: string;
  digest?: string;
  deploymentId?: string;
  url?: string;
}): {
  activeArtifact: typeof PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: typeof DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID;
  activeUrl: typeof DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL;
  predecessorLineage: "PASS";
  predecessor: typeof PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID;
} {
  const artifactId = input?.artifactId ?? PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID;
  const digest = input?.digest ?? PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST;
  const deploymentId = input?.deploymentId ?? DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID;
  const url = input?.url ?? DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL;
  if (artifactId === SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_ARTIFACT_ID) {
    throw new Error("unpublished_hardening_successor_not_authorized");
  }
  if (
    artifactId !== PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID ||
    digest !== PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST ||
    deploymentId !== DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID ||
    url !== DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (compileRepairActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  compileRepairActivationMutations += 1;
  activeArtifactId = PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID;
  activeDigest = PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID;
  activeUrl = DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = true;
  return {
    activeArtifact: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
    activeUrl: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
    predecessorLineage: "PASS",
    predecessor: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  };
}

export function seoGeoActivationMutationsConsumed(): number {
  return seoGeoActivationMutations;
}

export function visualSuccessorActivationMutationsConsumed(): number {
  return visualActivationMutations;
}

export function polishSuccessorActivationMutationsConsumed(): number {
  return polishActivationMutations;
}

export function isVisualPolishSuccessorPublicActive(): boolean {
  return (
    polishSuccessorActivated &&
    activeArtifactId === SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === polishDeploymentId
  );
}

export function tableDesignSuccessorActivationMutationsConsumed(): number {
  return tableDesignActivationMutations;
}

export function isVisualTableDesignSuccessorPublicActive(): boolean {
  return (
    tableDesignSuccessorActivated &&
    activeArtifactId === SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === tableDesignDeploymentId
  );
}

export function homepageFoldSuccessorActivationMutationsConsumed(): number {
  return homepageFoldActivationMutations;
}

export function isVisualHomepageFoldSuccessorPublicActive(): boolean {
  return (
    homepageFoldSuccessorActivated &&
    activeArtifactId === SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === homepageFoldDeploymentId
  );
}

export function authorityExpansionSuccessorActivationMutationsConsumed(): number {
  return authorityExpansionActivationMutations;
}

export function isAuthorityExpansionSuccessorPublicActive(): boolean {
  return (
    authorityExpansionSuccessorActivated &&
    activeArtifactId === SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === authorityExpansionDeploymentId
  );
}

export function authorityFinalPolishSuccessorActivationMutationsConsumed(): number {
  return finalAuthorityPolishActivationMutations;
}

export function isAuthorityFinalPolishSuccessorPublicActive(): boolean {
  return (
    finalAuthorityPolishSuccessorActivated &&
    activeArtifactId === SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === finalAuthorityPolishDeploymentId
  );
}

export function founderVisualQcSuccessorActivationMutationsConsumed(): number {
  return founderVisualQcActivationMutations;
}

export function isFounderVisualQcSuccessorPublicActive(): boolean {
  return (
    founderVisualQcSuccessorActivated &&
    activeArtifactId === SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === founderVisualQcDeploymentId
  );
}

export function isSeoGeoSuccessorPublicActive(): boolean {
  return (
    seoGeoSuccessorActivated &&
    activeArtifactId === SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === seoGeoDeploymentId
  );
}

export function activateSeoGeoDigitalRealEstateSuccessorPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url)
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (seoGeoActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  seoGeoActivationMutations += 1;
  seoGeoSuccessorActivated = true;
  seoGeoDeploymentId = input.deploymentId;
  seoGeoUrl = input.url;
  activeArtifactId = SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID;
  activeDigest = SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  visualSuccessorActivated = false;
  return {
    activeArtifact: SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function isVisualQualitySuccessorPublicActive(): boolean {
  return (
    visualSuccessorActivated &&
    activeArtifactId === SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === visualDeploymentId
  );
}

export function activateVisualQualitySuccessorPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_SEO_GEO_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url)
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (visualActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  visualActivationMutations += 1;
  visualSuccessorActivated = true;
  visualDeploymentId = input.deploymentId;
  visualUrl = input.url;
  activeArtifactId = SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID;
  activeDigest = SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  polishSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  return {
    activeArtifact: SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_SEO_GEO_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function activateVisualPolishSuccessorPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_VISUAL_QUALITY_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== SEO_GEO_VISUAL_POLISH_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url)
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (polishActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  polishActivationMutations += 1;
  polishSuccessorActivated = true;
  polishDeploymentId = input.deploymentId;
  polishUrl = input.url;
  activeArtifactId = SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID;
  activeDigest = SEO_GEO_VISUAL_POLISH_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  homepageFoldSuccessorActivated = false;
  return {
    activeArtifact: SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_VISUAL_QUALITY_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function activateVisualTableDesignSuccessorPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_VISUAL_POLISH_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url)
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (tableDesignActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  tableDesignActivationMutations += 1;
  tableDesignSuccessorActivated = true;
  tableDesignDeploymentId = input.deploymentId;
  tableDesignUrl = input.url;
  activeArtifactId = SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID;
  activeDigest = SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  polishSuccessorActivated = false;
  homepageFoldSuccessorActivated = false;
  return {
    activeArtifact: SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_VISUAL_POLISH_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function activateVisualHomepageFoldSuccessorPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url)
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (homepageFoldActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  homepageFoldActivationMutations += 1;
  homepageFoldSuccessorActivated = true;
  homepageFoldDeploymentId = input.deploymentId;
  homepageFoldUrl = input.url;
  activeArtifactId = SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID;
  activeDigest = SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  polishSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  authorityExpansionSuccessorActivated = false;
  return {
    activeArtifact: SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function activateAuthorityExpansionSuccessorPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url)
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (authorityExpansionActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  authorityExpansionActivationMutations += 1;
  authorityExpansionSuccessorActivated = true;
  authorityExpansionDeploymentId = input.deploymentId;
  authorityExpansionUrl = input.url;
  activeArtifactId = SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID;
  activeDigest = SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  polishSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  homepageFoldSuccessorActivated = false;
  finalAuthorityPolishSuccessorActivated = false;
  return {
    activeArtifact: SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function activateAuthorityFinalPolishSuccessorPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url)
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (finalAuthorityPolishActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  finalAuthorityPolishActivationMutations += 1;
  finalAuthorityPolishSuccessorActivated = true;
  finalAuthorityPolishDeploymentId = input.deploymentId;
  finalAuthorityPolishUrl = input.url;
  activeArtifactId = SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID;
  activeDigest = SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  polishSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  homepageFoldSuccessorActivated = false;
  authorityExpansionSuccessorActivated = false;
  founderVisualQcSuccessorActivated = false;
  return {
    activeArtifact: SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function activateFounderVisualQcSuccessorPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url)
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (founderVisualQcActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  founderVisualQcActivationMutations += 1;
  founderVisualQcSuccessorActivated = true;
  founderVisualQcDeploymentId = input.deploymentId;
  founderVisualQcUrl = input.url;
  activeArtifactId = SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID;
  activeDigest = SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  polishSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  homepageFoldSuccessorActivated = false;
  authorityExpansionSuccessorActivated = false;
  finalAuthorityPolishSuccessorActivated = false;
  authorityWidthSuccessorActivated = false;
  return {
    activeArtifact: SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function authorityWidthSuccessorActivationMutationsConsumed(): number {
  return authorityWidthActivationMutations;
}

export function isAuthorityWidthSuccessorPublicActive(): boolean {
  return (
    authorityWidthSuccessorActivated &&
    activeArtifactId === SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === authorityWidthDeploymentId
  );
}

export function activateAuthorityWidthSuccessorPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url)
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (authorityWidthActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  authorityWidthActivationMutations += 1;
  authorityWidthSuccessorActivated = true;
  authorityWidthDeploymentId = input.deploymentId;
  authorityWidthUrl = input.url;
  activeArtifactId = SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID;
  activeDigest = SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  polishSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  homepageFoldSuccessorActivated = false;
  authorityExpansionSuccessorActivated = false;
  finalAuthorityPolishSuccessorActivated = false;
  founderVisualQcSuccessorActivated = false;
  searchDepthSuccessorActivated = false;
  return {
    activeArtifact: SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function searchDepthSuccessorActivationMutationsConsumed(): number {
  return searchDepthActivationMutations;
}

export function humanFirstContrastRepairActivationMutationsConsumed(): number {
  return humanFirstContrastRepairActivationMutations;
}

export function isHumanFirstContrastRepairPublicActive(): boolean {
  return (
    humanFirstContrastRepairActivated &&
    activeArtifactId === SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === humanFirstContrastRepairDeploymentId
  );
}

export function activateHumanFirstContrastRepairPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url) ||
    input.deploymentId === DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (humanFirstContrastRepairActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  humanFirstContrastRepairActivationMutations += 1;
  humanFirstContrastRepairActivated = true;
  humanFirstContrastRepairDeploymentId = input.deploymentId;
  humanFirstContrastRepairUrl = input.url;
  activeArtifactId = SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID;
  activeDigest = SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  polishSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  homepageFoldSuccessorActivated = false;
  authorityExpansionSuccessorActivated = false;
  finalAuthorityPolishSuccessorActivated = false;
  founderVisualQcSuccessorActivated = false;
  authorityWidthSuccessorActivated = false;
  searchDepthSuccessorActivated = false;
  trustedSourcesContrastRepairActivated = false;
  return {
    activeArtifact: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function trustedSourcesContrastRepairActivationMutationsConsumed(): number {
  return trustedSourcesContrastRepairActivationMutations;
}

export function isTrustedSourcesContrastRepairPublicActive(): boolean {
  return (
    trustedSourcesContrastRepairActivated &&
    activeArtifactId === SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === trustedSourcesContrastRepairDeploymentId
  );
}

export function activateTrustedSourcesContrastRepairPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url) ||
    input.deploymentId === DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (trustedSourcesContrastRepairActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  trustedSourcesContrastRepairActivationMutations += 1;
  trustedSourcesContrastRepairActivated = true;
  trustedSourcesContrastRepairDeploymentId = input.deploymentId;
  trustedSourcesContrastRepairUrl = input.url;
  activeArtifactId = SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID;
  activeDigest = SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  polishSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  homepageFoldSuccessorActivated = false;
  authorityExpansionSuccessorActivated = false;
  finalAuthorityPolishSuccessorActivated = false;
  founderVisualQcSuccessorActivated = false;
  authorityWidthSuccessorActivated = false;
  searchDepthSuccessorActivated = false;
  humanFirstContrastRepairActivated = false;
  fullPageAutorepairActivated = false;
  return {
    activeArtifact: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function fullPageAutorepairActivationMutationsConsumed(): number {
  return fullPageAutorepairActivationMutations;
}

export function pricingPrerenderRepairActivationMutationsConsumed(): number {
  return pricingPrerenderRepairActivationMutations;
}

export function isFullPageAutorepairPublicActive(): boolean {
  return (
    fullPageAutorepairActivated &&
    activeArtifactId === SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === fullPageAutorepairDeploymentId
  );
}

export function activateFullPageAutorepairPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url) ||
    input.deploymentId === DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (fullPageAutorepairActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  fullPageAutorepairActivationMutations += 1;
  fullPageAutorepairActivated = true;
  fullPageAutorepairDeploymentId = input.deploymentId;
  fullPageAutorepairUrl = input.url;
  activeArtifactId = SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID;
  activeDigest = SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  polishSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  homepageFoldSuccessorActivated = false;
  authorityExpansionSuccessorActivated = false;
  finalAuthorityPolishSuccessorActivated = false;
  founderVisualQcSuccessorActivated = false;
  authorityWidthSuccessorActivated = false;
  searchDepthSuccessorActivated = false;
  humanFirstContrastRepairActivated = false;
  trustedSourcesContrastRepairActivated = false;
  return {
    activeArtifact: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function hubLayoutRepairActivationMutationsConsumed(): number {
  return hubLayoutRepairActivationMutations;
}

export function isHubQuestionBoardLayoutPublicActive(): boolean {
  return (
    hubLayoutRepairActivated &&
    activeArtifactId === CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === hubLayoutRepairDeploymentId
  );
}

export function activateHubQuestionBoardLayoutPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url) ||
    input.deploymentId === DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (hubLayoutRepairActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  hubLayoutRepairActivationMutations += 1;
  hubLayoutRepairActivated = true;
  hubLayoutRepairDeploymentId = input.deploymentId;
  hubLayoutRepairUrl = input.url;
  activeArtifactId = CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID;
  activeDigest = CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  polishSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  homepageFoldSuccessorActivated = false;
  authorityExpansionSuccessorActivated = false;
  finalAuthorityPolishSuccessorActivated = false;
  founderVisualQcSuccessorActivated = false;
  authorityWidthSuccessorActivated = false;
  searchDepthSuccessorActivated = false;
  humanFirstContrastRepairActivated = false;
  trustedSourcesContrastRepairActivated = false;
  fullPageAutorepairActivated = false;
  pricingPrerenderRepairActivated = false;
  siteChromeLinkContrastRepairActivated = false;
  return {
    activeArtifact: CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function isSiteChromeLinkContrastPublicActive(): boolean {
  return (
    siteChromeLinkContrastRepairActivated &&
    activeArtifactId === CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === siteChromeLinkContrastRepairDeploymentId
  );
}

export function activateSiteChromeLinkContrastPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url) ||
    input.deploymentId === DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (siteChromeLinkContrastRepairActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  siteChromeLinkContrastRepairActivationMutations += 1;
  siteChromeLinkContrastRepairActivated = true;
  siteChromeLinkContrastRepairDeploymentId = input.deploymentId;
  siteChromeLinkContrastRepairUrl = input.url;
  activeArtifactId = CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID;
  activeDigest = CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  polishSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  homepageFoldSuccessorActivated = false;
  authorityExpansionSuccessorActivated = false;
  finalAuthorityPolishSuccessorActivated = false;
  founderVisualQcSuccessorActivated = false;
  authorityWidthSuccessorActivated = false;
  searchDepthSuccessorActivated = false;
  humanFirstContrastRepairActivated = false;
  trustedSourcesContrastRepairActivated = false;
  fullPageAutorepairActivated = false;
  pricingPrerenderRepairActivated = false;
  hubLayoutRepairActivated = false;
  homepageHeroLinkContrastRepairActivated = false;
  return {
    activeArtifact: CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function isHomepageHeroLinkContrastPublicActive(): boolean {
  return (
    homepageHeroLinkContrastRepairActivated &&
    activeArtifactId === CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === homepageHeroLinkContrastRepairDeploymentId
  );
}

export function activateHomepageHeroLinkContrastPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url) ||
    input.deploymentId === DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (homepageHeroLinkContrastRepairActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  homepageHeroLinkContrastRepairActivationMutations += 1;
  homepageHeroLinkContrastRepairActivated = true;
  homepageHeroLinkContrastRepairDeploymentId = input.deploymentId;
  homepageHeroLinkContrastRepairUrl = input.url;
  activeArtifactId = CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID;
  activeDigest = CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  polishSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  homepageFoldSuccessorActivated = false;
  authorityExpansionSuccessorActivated = false;
  finalAuthorityPolishSuccessorActivated = false;
  founderVisualQcSuccessorActivated = false;
  authorityWidthSuccessorActivated = false;
  searchDepthSuccessorActivated = false;
  humanFirstContrastRepairActivated = false;
  trustedSourcesContrastRepairActivated = false;
  fullPageAutorepairActivated = false;
  pricingPrerenderRepairActivated = false;
  hubLayoutRepairActivated = false;
  siteChromeLinkContrastRepairActivated = false;
  semanticNavWidthMutedTextRepairActivated = false;
  return {
    activeArtifact: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function isSemanticNavWidthMutedTextPublicActive(): boolean {
  return (
    semanticNavWidthMutedTextRepairActivated &&
    activeArtifactId === CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === semanticNavWidthMutedTextRepairDeploymentId
  );
}

export function activateSemanticNavWidthMutedTextPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url) ||
    input.deploymentId === DEPLOYED_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_DEPLOYMENT_ID
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (semanticNavWidthMutedTextRepairActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  semanticNavWidthMutedTextRepairActivationMutations += 1;
  semanticNavWidthMutedTextRepairActivated = true;
  semanticNavWidthMutedTextRepairDeploymentId = input.deploymentId;
  semanticNavWidthMutedTextRepairUrl = input.url;
  activeArtifactId = CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID;
  activeDigest = CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  polishSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  homepageFoldSuccessorActivated = false;
  authorityExpansionSuccessorActivated = false;
  finalAuthorityPolishSuccessorActivated = false;
  founderVisualQcSuccessorActivated = false;
  authorityWidthSuccessorActivated = false;
  searchDepthSuccessorActivated = false;
  humanFirstContrastRepairActivated = false;
  trustedSourcesContrastRepairActivated = false;
  fullPageAutorepairActivated = false;
  pricingPrerenderRepairActivated = false;
  hubLayoutRepairActivated = false;
  siteChromeLinkContrastRepairActivated = false;
  homepageHeroLinkContrastRepairActivated = false;
  return {
    activeArtifact: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function isPricingPrerenderRepairPublicActive(): boolean {
  return (
    pricingPrerenderRepairActivated &&
    activeArtifactId === CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === pricingPrerenderRepairDeploymentId
  );
}

export function activatePricingPrerenderRepairPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url) ||
    input.deploymentId === DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (pricingPrerenderRepairActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  pricingPrerenderRepairActivationMutations += 1;
  pricingPrerenderRepairActivated = true;
  pricingPrerenderRepairDeploymentId = input.deploymentId;
  pricingPrerenderRepairUrl = input.url;
  activeArtifactId = CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID;
  activeDigest = CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  polishSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  homepageFoldSuccessorActivated = false;
  authorityExpansionSuccessorActivated = false;
  finalAuthorityPolishSuccessorActivated = false;
  founderVisualQcSuccessorActivated = false;
  authorityWidthSuccessorActivated = false;
  searchDepthSuccessorActivated = false;
  humanFirstContrastRepairActivated = false;
  trustedSourcesContrastRepairActivated = false;
  fullPageAutorepairActivated = false;
  return {
    activeArtifact: CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function isSearchDepthSuccessorPublicActive(): boolean {
  return (
    searchDepthSuccessorActivated &&
    activeArtifactId === SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID &&
    activeDeploymentId === searchDepthDeploymentId
  );
}

export function activateSearchDepthSuccessorPublicArtifact(input: {
  artifactId: string;
  digest: string;
  deploymentId: string;
  url: string;
}): {
  activeArtifact: typeof SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID;
  activeDeploymentId: string;
  activeUrl: string;
  predecessorLineage: "PASS";
  predecessorArtifact: typeof SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID;
  predecessorDeployment: typeof DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_DEPLOYMENT_ID;
} {
  if (
    input.artifactId !== SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID ||
    input.digest !== SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST ||
    !input.deploymentId.startsWith("dpl_") ||
    !/^https:\/\//.test(input.url)
  ) {
    throw new Error("activation_identity_mismatch");
  }
  if (searchDepthActivationMutations >= 1) {
    throw new Error("activation_authorization_already_consumed");
  }
  searchDepthActivationMutations += 1;
  searchDepthSuccessorActivated = true;
  searchDepthDeploymentId = input.deploymentId;
  searchDepthUrl = input.url;
  activeArtifactId = SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID;
  activeDigest = SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST;
  activeDeploymentId = input.deploymentId;
  activeUrl = input.url;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  seoGeoSuccessorActivated = false;
  visualSuccessorActivated = false;
  polishSuccessorActivated = false;
  tableDesignSuccessorActivated = false;
  homepageFoldSuccessorActivated = false;
  authorityExpansionSuccessorActivated = false;
  finalAuthorityPolishSuccessorActivated = false;
  founderVisualQcSuccessorActivated = false;
  authorityWidthSuccessorActivated = false;
  return {
    activeArtifact: SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
    activeDeploymentId: input.deploymentId,
    activeUrl: input.url,
    predecessorLineage: "PASS",
    predecessorArtifact: SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
    predecessorDeployment: DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_DEPLOYMENT_ID,
  };
}

export function resetActivePublicValidationArtifact(): void {
  activeArtifactId = SUCCESSOR_CRE_ARTIFACT_ID;
  activeDigest = SUCCESSOR_CRE_SOURCE_DIGEST;
  successorActivated = false;
  authoritySuccessorActivated = false;
  drSuccessorActivated = false;
  finalRepairSuccessorActivated = false;
  compileRepairSuccessorActivated = false;
  compileRepairActivationMutations = 0;
  seoGeoSuccessorActivated = false;
  seoGeoActivationMutations = 0;
  seoGeoDeploymentId = null;
  seoGeoUrl = null;
  visualSuccessorActivated = false;
  visualActivationMutations = 0;
  visualDeploymentId = null;
  visualUrl = null;
  polishSuccessorActivated = false;
  polishActivationMutations = 0;
  polishDeploymentId = null;
  polishUrl = null;
  tableDesignSuccessorActivated = false;
  tableDesignActivationMutations = 0;
  tableDesignDeploymentId = null;
  tableDesignUrl = null;
  homepageFoldSuccessorActivated = false;
  homepageFoldActivationMutations = 0;
  homepageFoldDeploymentId = null;
  homepageFoldUrl = null;
  authorityExpansionSuccessorActivated = false;
  authorityExpansionActivationMutations = 0;
  authorityExpansionDeploymentId = null;
  authorityExpansionUrl = null;
  finalAuthorityPolishSuccessorActivated = false;
  finalAuthorityPolishActivationMutations = 0;
  finalAuthorityPolishDeploymentId = null;
  finalAuthorityPolishUrl = null;
  founderVisualQcSuccessorActivated = false;
  founderVisualQcActivationMutations = 0;
  founderVisualQcDeploymentId = null;
  founderVisualQcUrl = null;
  authorityWidthSuccessorActivated = false;
  authorityWidthActivationMutations = 0;
  authorityWidthDeploymentId = null;
  authorityWidthUrl = null;
  searchDepthSuccessorActivated = false;
  searchDepthActivationMutations = 0;
  searchDepthDeploymentId = null;
  searchDepthUrl = null;
  humanFirstContrastRepairActivated = false;
  humanFirstContrastRepairActivationMutations = 0;
  humanFirstContrastRepairDeploymentId = null;
  humanFirstContrastRepairUrl = null;
  trustedSourcesContrastRepairActivated = false;
  trustedSourcesContrastRepairActivationMutations = 0;
  trustedSourcesContrastRepairDeploymentId = null;
  trustedSourcesContrastRepairUrl = null;
  fullPageAutorepairActivated = false;
  fullPageAutorepairActivationMutations = 0;
  fullPageAutorepairDeploymentId = null;
  fullPageAutorepairUrl = null;
  pricingPrerenderRepairActivated = false;
  pricingPrerenderRepairActivationMutations = 0;
  pricingPrerenderRepairDeploymentId = null;
  pricingPrerenderRepairUrl = null;
  hubLayoutRepairActivated = false;
  hubLayoutRepairActivationMutations = 0;
  hubLayoutRepairDeploymentId = null;
  hubLayoutRepairUrl = null;
  siteChromeLinkContrastRepairActivated = false;
  siteChromeLinkContrastRepairActivationMutations = 0;
  siteChromeLinkContrastRepairDeploymentId = null;
  siteChromeLinkContrastRepairUrl = null;
  homepageHeroLinkContrastRepairActivated = false;
  homepageHeroLinkContrastRepairActivationMutations = 0;
  homepageHeroLinkContrastRepairDeploymentId = null;
  homepageHeroLinkContrastRepairUrl = null;
  semanticNavWidthMutedTextRepairActivated = false;
  semanticNavWidthMutedTextRepairActivationMutations = 0;
  semanticNavWidthMutedTextRepairDeploymentId = null;
  semanticNavWidthMutedTextRepairUrl = null;
  activeDeploymentId = null;
  activeUrl = null;
}
