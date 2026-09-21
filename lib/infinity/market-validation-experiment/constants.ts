import { createHash } from "node:crypto";

export const CRE_CANDIDATE_ID = "7e7e924e-0741-4155-a729-8d529da77ea9";
export const LIVE_ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
export const EXPERIMENT_SCHEMA = "market_validation_experiment_v1" as const;
export const EXPERIMENT_VERSION = 1;
export const LOCKED_CRE_EXPERIMENT_ID = "exp_e72beb7b6d35e7b20acf";
export const LOCKED_CRE_ARTIFACT_ID = "art_6b94977e164c8bdeea3f";
export const SUCCESSOR_CRE_ARTIFACT_ID = "art_850f8be949fabef62674";
/** Live public CRE artifact. Immutable. Do not mutate in place. */
export const LIVE_PUBLIC_CRE_ARTIFACT_ID = SUCCESSOR_CRE_ARTIFACT_ID;
export const VALIDATION_GRADE_REPAIR_REASON =
  "VALIDATION_GRADE_PUBLIC_TEMPLATE_AND_CANONICAL_FOOTER_UPDATE" as const;
/** Filled after successor generation. Do not invent. */
export const VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID = "art_5a5e3b166a2f9ee03f1f";
export const PREMIUM_PUBLIC_VENTURE_REPAIR_REASON =
  "PREMIUM_PUBLIC_VENTURE_DESIGN_AND_CREATIVE_MEDIA_UPGRADE" as const;
export const NEW_FOUNDER_PREMIUM_SUCCESSOR_DEPLOYMENT_AUTHORIZATION_REQUIRED =
  "NEW_FOUNDER_PREMIUM_SUCCESSOR_DEPLOYMENT_AUTHORIZATION_REQUIRED" as const;
export const PREMIUM_VALIDATION_ARTIFACT_CONTRACT = "nextjs_ts_premium_validation_v1" as const;
/** Computed from premium generation. Do not treat as the live public artifact. */
export const PREMIUM_VALIDATION_SUCCESSOR_ARTIFACT_ID = "art_b3285ee356fde4271b41";
export const PREMIUM_VALIDATION_SUCCESSOR_SOURCE_DIGEST =
  "fd75955ac781971ba15590b3ce0ee51af4ee9a7f8eed626ff23a02af7a306e76";
export const PREMIUM_AUTHORITY_SITE_REPAIR_REASON =
  "PREMIUM_AUTHORITY_MULTI_PAGE_GEO_SEO_CREATIVE_SITE_UPGRADE" as const;
export const NEW_FOUNDER_PREMIUM_AUTHORITY_SITE_DEPLOYMENT_AUTHORIZATION_REQUIRED =
  "NEW_FOUNDER_PREMIUM_AUTHORITY_SITE_DEPLOYMENT_AUTHORIZATION_REQUIRED" as const;
export const PREMIUM_AUTHORITY_SITE_ARTIFACT_CONTRACT = "nextjs_ts_premium_authority_site_v1" as const;
export const VENTURE_SITE_ARCHITECTURE_VERSION = "venture_site_architecture_v1" as const;
export const GEO_SEO_CONTENT_ARCHITECTURE_V1 = "GEO_SEO_CONTENT_ARCHITECTURE_V1" as const;
/** Computed from authority-site generation. Do not treat as the live public artifact. */
export const PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID = "art_d20f8a53a3ef1de20ebe";
export const PREMIUM_AUTHORITY_SITE_SUCCESSOR_SOURCE_DIGEST =
  "f99bfe5f1342fcff3d16ea7417d60a9a1005651adc29a1a67cb3b9037329c895";
export const DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_ARTIFACT_ID = "art_b50a3f6ea9bebb9c6f59";
export const DIRECT_RESPONSE_AUTHORITY_SUCCESSOR_SOURCE_DIGEST =
  "67159d68c81c1057e70c415a4dbc165f29d4cbccea64e0db1c8c76378ccb58a8";
export const RENDERED_LAYOUT_REPAIR_SUCCESSOR_ARTIFACT_ID = "art_2b7308e842681634e8c8";
export const RENDERED_LAYOUT_REPAIR_SUCCESSOR_SOURCE_DIGEST =
  "1ef6fc358eadf51cd2c1b13ec8caa16c2362b530ab0fec801e98d4641a88599c";
export const PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID = "art_3f619b664ab7740751a0";
export const PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_SOURCE_DIGEST =
  "8fa3ffe8d4c75f378439dbfff4a57306368e7f86902b306fbfbfa221d8c095fc";
export const PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID = "art_c62f12bc59759bdbf3d1";
export const PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST =
  "8cb29c1804b158825202c04d5ab4a187246fcb4d8e32f1ca1e9e0c2ff5073da9";
export const DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID = "dpl_DUsqpm1Td554DmesjZZKsYLcudA3";
export const DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-id9w3e8nb.vercel.app";
export const SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID = "art_ba6e91dc5e569f6c13a9";
export const SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_SOURCE_DIGEST =
  "92fd5d2db09ae15acec22e9f9a9f3353b756b5ee85cc0dcba845a69442f9927d";
export const DEPLOYED_SEO_GEO_SUCCESSOR_DEPLOYMENT_ID = "dpl_9ZHwftxcxH3K6dVM6oYREb4vqrJj";
export const DEPLOYED_SEO_GEO_SUCCESSOR_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-1gk4q1cm7.vercel.app";
export const SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID = "art_6ef4203d174ac97ea748";
export const SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_SOURCE_DIGEST =
  "3c9851a01a0eafb53a61d95c3ac4b9c6e09c8552e42ca65658a7ef37ba0a40f7";
export const DEPLOYED_VISUAL_QUALITY_SUCCESSOR_DEPLOYMENT_ID = "dpl_8ZFTygu8ofyziGYNHkE7b6Uw6DTS";
export const DEPLOYED_VISUAL_QUALITY_SUCCESSOR_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-r8m6k8ne1.vercel.app";
export const SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID = "art_1b4074bc79b101555008";
export const SEO_GEO_VISUAL_POLISH_SUCCESSOR_SOURCE_DIGEST =
  "fe647b3db9b57a8c8f216d7256e103b4b6e8bc960d90b2a4c9d9f86f0272e9a3";
export const DEPLOYED_VISUAL_POLISH_SUCCESSOR_DEPLOYMENT_ID = "dpl_FdPQ3xeVWvzmTRdiaj95vuG4GUxf";
export const DEPLOYED_VISUAL_POLISH_SUCCESSOR_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-r51o3u2eo.vercel.app";
export const SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID = "art_6263c195a686c1d73511";
export const SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_SOURCE_DIGEST =
  "11ef0fe0d6a770feeeab83d8226085089f671b8d25651d93ec97eae986ff9c0d";
export const DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_DEPLOYMENT_ID = "dpl_A5wSKzhESxDc9LsPn488DRfPyzNV";
export const DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-qkhlts7nc.vercel.app";
export const SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID = "art_025be3f61b292cd3c0ef";
export const SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_SOURCE_DIGEST =
  "3c1840108487827233e48c2f12011f0fa7b3922a606f1e5191119cff28a1275c";
export const DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_DEPLOYMENT_ID = "dpl_5TCnCweZNfTp3ZDAQoEcoyZv6Npg";
export const DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-ekunq3zvj.vercel.app";
export const SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID = "art_00cd1821c5a178bf2487";
export const SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST =
  "09857789812df6bcba9f18a70ab35e03965373855bb3fa849e22e43d363f4823";
export const DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID = "dpl_EppQ8GVJfZ6uQpyXxWiukXP52kKz";
export const DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-onjerun3q.vercel.app";
/** Filled after immutable polish successor compose. Do not invent. */
export const SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID = "art_3b428a17dfca6e047550";
export const SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST =
  "d35578c714c2556998e4f548c214aad045ca2cefc157496c4ead2334f2d0f953";
export const DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_DEPLOYMENT_ID = "dpl_5cFWWuPZYkJcUfmwSqGCMG8zS8hY";
export const DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-3mxvegjtz.vercel.app";
/** Filled after immutable founder visual QC successor compose. Do not invent. */
export const SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID = "art_89ea8156769a0286a700";
export const SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST =
  "0ac50a86b86140f197de6fff90477944de22eba6fa89496fcadf070210b3a7ec";
export const DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_DEPLOYMENT_ID = "dpl_A8G5ewhPBnefUySdwWUdnnvzGWN5";
export const DEPLOYED_FOUNDER_VISUAL_QC_SUCCESSOR_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-2lzo42ur9.vercel.app";
/** Filled after immutable authority-width successor compose. Do not invent. */
export const SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID = "art_b0b778956b7d29327dab";
export const SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST =
  "15c8dd5bd24e7af20eb694edde9e3c45a5d414847310fa680ab2072543a030db";
export const DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_DEPLOYMENT_ID = "dpl_2qx97rjBqkHMnFEiwyRWM9EA4ohe";
export const DEPLOYED_AUTHORITY_WIDTH_SUCCESSOR_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-nnkal6y65.vercel.app";
/** Filled after immutable search-depth successor compose. Do not invent. */
export const SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID = "art_e6d2a3a1f46d117d61c9";
export const SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST =
  "6f6393a8a9a9cb7b1c713fe396017b0da58903b70c842856a5cfd2bf2e55113f";
export const CRE_FULL_PAGE_AUTOREPAIR_SUCCESSOR_SOURCE_DIGEST =
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST;
export const DEPLOYED_SEARCH_DEPTH_SUCCESSOR_DEPLOYMENT_ID = "dpl_5zWCLA1rQLVLXed4Wi2ypvk9tfFj";
export const DEPLOYED_SEARCH_DEPTH_SUCCESSOR_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-kd9ktl3qy.vercel.app";
/** Filled after immutable pricing-prerender repair successor compose. Do not invent. */
export const CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID = "art_e9e0356a261866b6d534";
export const CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST =
  "d3d72fedf9593050911d0d7c261fc000c66f0184015f3cc7cb85c27041ecf94f";
/** Filled after immutable hub-layout repair successor compose. Do not invent. */
export const CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID = "art_868fc6cf5d72f97cc19a";
export const CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST =
  "663e1de7cadb772080435f9d93f1ed0007cdaf0a9c6d07ab20c034f868d1b000";
/** Filled after immutable site-chrome link-contrast repair successor compose. Do not invent. */
export const CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID = "art_7f275fe3c845fb42203c";
export const CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST =
  "2600f3fbea296ef2f3c7b52805ecd1b3259133bf2c86952170099fe93c726e1c";
/** Filled after immutable homepage hero-link contrast repair successor compose. Do not invent. */
export const CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID = "art_dbf624e41599420891e2";
export const CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST =
  "a8ca8bfa544da21a96c11bab4d0abb0e3926271ab989d2f1924c68c7deba1f97";
export const DEPLOYED_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_DEPLOYMENT_ID = "dpl_Ehsc274qjUrZTfyCkQ4n3NCBXZV8";
export const DEPLOYED_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-ofqh1savv.vercel.app";
/** Filled after immutable semantic-nav width + muted-text successor compose. Do not invent. */
export const CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID = "art_11bd5b74a925257a7319";
export const CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST =
  "e86b02b7f4371535a94d7dfe1ca051e7e875bba95d7bea4f66629fe0c02fc51e";
export const DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID = "dpl_4gmigcyVLKS1X6HxZDCupdd3Ti7H";
export const DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-br9xupk59.vercel.app";
/** Legal-only successor of the accepted semantic-nav artifact. Do not invent. */
export const CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_ARTIFACT_ID = "art_ece7047b3a1e771ca187";
export const CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_SOURCE_DIGEST =
  "d779d6796b12b2c4349bdd8f98cd2b9cfa99b9bc382051b21917b83749654aae";
export const DEPLOYED_TRUSTED_SOURCES_CONTRAST_REPAIR_DEPLOYMENT_ID = "dpl_8DfVyBPCWwPHsFFk1s3kxctM6Fxw";
export const DEPLOYED_TRUSTED_SOURCES_CONTRAST_REPAIR_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-pieapww42.vercel.app";
export const DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD =
  "DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD" as const;
export const LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE = "LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE" as const;
export const VERIFICATION_ENGINE_FALSE_NEGATIVE = "VERIFICATION_ENGINE_FALSE_NEGATIVE" as const;
export const RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY =
  "RE_ADJUDICATED_WITH_SERVED_PRODUCTION_BROWSER_GEOMETRY" as const;
export const OPTIONAL_DEFENSIVE_HARDENING = "OPTIONAL_DEFENSIVE_HARDENING" as const;
export const REQUIRED_FOR_CORRECTNESS = "REQUIRED_FOR_CORRECTNESS" as const;
/** Filled after immutable successor compose. Do not invent. */
export const SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_ARTIFACT_ID = "art_8783bf0fff7279b52d62";
export const SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_SOURCE_DIGEST =
  "c309796b58c511176e73d6efd662695b521d5b3af045f84a507e0f07e9a27da7";
export const TECHNICAL_DEPLOYMENT_ARTIFACT_FAILURE = "TECHNICAL_DEPLOYMENT_ARTIFACT_FAILURE" as const;
export const FAILED_LINEAGE_REPAIR_DEPLOYMENT_ID = "dpl_CVsp18qH7JS5RgegJwCEX5Yznb5q";
export const FAILED_LINEAGE_REPAIR_ARTIFACT_ID = PUBLIC_LINEAGE_QUESTION_ID_REPAIR_SUCCESSOR_ARTIFACT_ID;
export const AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH = "AUTHORIZED_ARTIFACT_IDENTITY_MISMATCH" as const;
export const FAILED_CRE_VALIDATION_DEPLOYMENT_ID = "dpl_4yVgtVZ1LU8HqrgJa4oyMCasVWK7";
export const FAILED_CRE_VALIDATION_PROJECT = "infinity-validation-cre-lease-npv-e72beb7b";
export const FAILED_CRE_VALIDATION_ERROR_CODE = "lint_or_type_error";
export const ARTIFACT_REPAIR_EXTERNAL_BUILD_DEPENDENCY_INCOMPLETE =
  "EXTERNAL_BUILD_DEPENDENCY_INCOMPLETE" as const;
export const NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED =
  "NEW_FOUNDER_ECONOMIC_AUTHORIZATION_REQUIRED" as const;
export const NEW_FOUNDER_DEPLOYMENT_AUTHORIZATION_REQUIRED =
  "NEW_FOUNDER_DEPLOYMENT_AUTHORIZATION_REQUIRED" as const;

export const DEPLOYMENT_PURPOSES = [
  "MARKET_VALIDATION_EXPERIMENT",
  "PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR",
  "FULL_PRODUCT_PRODUCTION",
  "PUBLIC_COMMERCIAL_LAUNCH",
  "INTERNAL_PREVIEW",
  "PROVIDER_VERIFICATION",
] as const;

export const MARKET_VALIDATION_PURPOSE = "MARKET_VALIDATION_EXPERIMENT" as const;
export const PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE =
  "PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR" as const;

export function isValidationExperimentPurpose(purpose: string): boolean {
  return (
    purpose === MARKET_VALIDATION_PURPOSE ||
    purpose === PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR_PURPOSE
  );
}

export const VERIFIED_HOSTING_CAPABILITIES = [
  "hosting.create_project",
  "hosting.deploy",
  "hosting.verify_deployment",
] as const;

export const UNVERIFIED_HOSTING_CAPABILITIES = [
  "domain.manage",
  "domain.alias",
  "dns.configure",
  "env.mutate",
  "team.manage",
  "billing.manage",
  "billing.read",
  "account.plan.read",
  "project.delete",
  "hosting.deployment_protection.configure",
  "hosting.environment.configure",
  "hosting.custom_domain",
] as const;

export function marketValidationExperimentId(candidateId: string): string {
  return `exp_${createHash("sha256")
    .update([candidateId, String(EXPERIMENT_VERSION), "wtp"].join("|"))
    .digest("hex")
    .slice(0, 20)}`;
}

export function validationProjectName(experimentId: string): string {
  const short = experimentId.replace(/^exp_/, "").slice(0, 8);
  return `infinity-validation-cre-lease-npv-${short}`;
}

export const EXPERIMENT_TYPES = ["PRICING_PURCHASE_INTENT"] as const;

export const EXPERIMENT_STATES = [
  "DRAFT",
  "READY_FOR_ARTIFACT",
  "ARTIFACT_BUILDING",
  "ARTIFACT_VALIDATING",
  "READY_FOR_EXTERNAL_AUTHORIZATION",
  "DEPLOYING",
  "LIVE",
  "COLLECTING",
  "EVIDENCE_THRESHOLD_REACHED",
  "ANALYZING",
  "COMPLETE",
  "BLOCKED",
  "FAILED",
  "EXPERIMENT_READY_BUT_EXTERNAL_ACTION_BLOCKED",
] as const;

export const EXPERIMENT_OUTCOMES = [
  "VALIDATED",
  "PROMISING_BUT_INSUFFICIENT",
  "INCONCLUSIVE",
  "NEGATIVE_SIGNAL",
  "INVALID_EXPERIMENT",
  "ABORTED",
] as const;

export const INTENT_EVENTS = [
  "PAGE_VIEW",
  "PRICING_VIEW",
  "CTA_CLICK",
  "FORM_START",
  "EARLY_ACCESS_REQUEST",
  "PILOT_REQUEST",
  "PRICE_OPTION_SELECTED",
  "QUALIFIED_PILOT_APPLICATION",
  "STRONG_PURCHASE_INTENT",
  "PAID_COMMITMENT",
] as const;

export const INTENT_STRENGTH = ["WEAK", "MODERATE", "STRONG"] as const;

export const WTP_LEVELS = ["NONE", "WEAK", "MODERATE", "STRONG", "OBSERVED_PAYMENT"] as const;

export const LOCKED_SUCCESS_CRITERIA = {
  minQualifiedSample: 15,
  minStrongIntentEvents: 5,
  minPricingSelections: 5,
  maxDurationDays: 14,
  negativeStrongIntentRate: 0.05,
  lockedBeforeLaunch: true as const,
};

export const PRIMARY_CTA = "Request Pilot Access" as const;

export const WRITE_BOUNDARY = {
  validationDeploymentsMax: 1,
  fullProductBuilds: 0,
  domainPurchases: 0,
  dnsWrites: 0,
  stripeWrites: 0,
  treasuryMovement: 0,
  adSpend: 0,
  outboundMarketingSends: 0,
} as const;

export const TRAFFIC_PLAN = [
  "Manual targeted outreach to known CRE brokers (not executed in V1)",
  "Existing network referrals (not executed in V1)",
  "Organic niche CRE communities (not executed in V1)",
  "Partner / referral distribution (not executed in V1)",
  "Small governed paid test later (not executed in V1)",
] as const;
