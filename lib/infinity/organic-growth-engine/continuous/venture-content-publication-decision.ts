import type { OrganicDraft } from "./quality";
import type { QuestionClusterPlan, SearchDemandEvidence } from "./search-demand-evidence";
import { evaluateAuthorityBlogPublicationGate } from "./blog-authority-gates";
import { CLUB_THROTTLE_SHIRT_HEADING_BODY_EXPECTATIONS } from "./blog-heading-body-alignment";
import {
  evaluateConsumerEditorialPublishStack,
  runBoundedConsumerEditorialRepair,
  MAX_CONSUMER_EDITORIAL_REPAIR_ATTEMPTS,
} from "./consumer-editorial-publish-loop";
import { evaluateArticleSchemaQc } from "./club-throttle-journal-publication-metadata";
import { evaluateBlogVisualAssetQc } from "./blog-visual-asset-gates";
import { OCCUPANCYNPV_BLOG_EDITORIAL_CSS } from "./blog-ux";
import type { ResponsiveBrowserEvidenceV1 } from "./render-browser-evidence-v1";
import { evaluateRenderedPageQualityQc } from "./rendered-page-quality-v1";
import type { VentureImageAssetRecord } from "./venture-image-creative-v2";
import type { OrganicNamedGate } from "./types";
import type { VentureAssetPreflightResult } from "./venture-asset-preflight-qc";

export const VENTURE_CONTENT_PUBLICATION_DECISION = "VentureContentPublicationDecision" as const;
export const MAX_CONTENT_SELF_HEAL_ATTEMPTS = MAX_CONSUMER_EDITORIAL_REPAIR_ATTEMPTS;

export type VentureContentPublicationResult = {
  gate: typeof VENTURE_CONTENT_PUBLICATION_DECISION;
  publication_qc: "PASS" | "FAIL";
  publish_allowed: boolean;
  authority_gate: ReturnType<typeof evaluateAuthorityBlogPublicationGate>;
  consumer_stack: ReturnType<typeof evaluateConsumerEditorialPublishStack>;
  preflight?: VentureAssetPreflightResult;
  schema_qc?: OrganicNamedGate;
  visual_asset?: OrganicNamedGate;
  rendered_visual?: OrganicNamedGate;
  repair?: ReturnType<typeof runBoundedConsumerEditorialRepair>;
};

export function evaluateVentureContentPublicationDecision(input: {
  draft: OrganicDraft;
  demand: SearchDemandEvidence;
  cluster: QuestionClusterPlan;
  internal_link_paths?: string[];
  rendered_html?: string;
  heading_body_expectations?: typeof CLUB_THROTTLE_SHIRT_HEADING_BODY_EXPECTATIONS;
  shell_html?: string;
  main_html?: string;
  editorial_css?: string;
  featured_image_path?: string;
  deploy_asset_paths?: string[];
  image_record?: VentureImageAssetRecord;
  require_blog_visual_stack?: boolean;
  preflight?: VentureAssetPreflightResult;
  browser_responsive_evidence?: ResponsiveBrowserEvidenceV1 | null;
}): VentureContentPublicationResult {
  const isShirt =
    input.draft.canonical?.includes("how-riders-choose-a-shirt") ?? false;
  const isClubArticle =
    isShirt || (input.draft.origin?.includes("clubthrottle") ?? false);
  const authority = evaluateAuthorityBlogPublicationGate({
    draft: input.draft,
    demand: input.demand,
    cluster: input.cluster,
    internal_link_paths: input.internal_link_paths,
    heading_body_expectations:
      input.heading_body_expectations ??
      (isShirt ? [...CLUB_THROTTLE_SHIRT_HEADING_BODY_EXPECTATIONS] : undefined),
  });
  const consumer = evaluateConsumerEditorialPublishStack({
    draft: input.draft,
    rendered_html: input.rendered_html ?? input.shell_html,
  });

  const requireVisual = input.require_blog_visual_stack ?? isClubArticle;
  let schema_qc: OrganicNamedGate | undefined;
  let visual_asset: OrganicNamedGate | undefined;
  let rendered_visual: OrganicNamedGate | undefined;

  if (requireVisual && input.shell_html) {
    schema_qc = evaluateArticleSchemaQc(input.draft, input.shell_html, input.featured_image_path);
    if (input.featured_image_path && input.deploy_asset_paths) {
      visual_asset = evaluateBlogVisualAssetQc({
        shell_html: input.shell_html,
        featured_image_path: input.featured_image_path,
        deploy_asset_paths: input.deploy_asset_paths,
        image_record: input.image_record,
      });
    }
    if (input.main_html) {
      const renderQc = evaluateRenderedPageQualityQc({
        profile: "ARTICLE",
        shell_html: input.shell_html,
        main_html: input.main_html,
        editorial_css: input.editorial_css ?? OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
        boundary: "AUTONOMOUS_PUBLICATION_APPROVAL",
        browser_evidence: input.browser_responsive_evidence ?? null,
        functional_pass: true,
      });
      rendered_visual = {
        gate: "RenderedArticleVisualQc",
        result: renderQc.RENDERED_PAGE_QUALITY_QC === "PASS" ? "PASS" : "FAIL",
        reasons: renderQc.reasons,
      };
    }
  }

  const preflightOk = !input.preflight || (input.preflight.result === "PASS" && input.preflight.generation_allowed);
  const stacksPass =
    authority.result === "PASS"
    && consumer.result === "PASS"
    && preflightOk
    && (!schema_qc || schema_qc.result === "PASS")
    && (!visual_asset || visual_asset.result === "PASS")
    && (!rendered_visual || rendered_visual.result === "PASS");

  const publication_qc = stacksPass ? "PASS" : "FAIL";
  return {
    gate: VENTURE_CONTENT_PUBLICATION_DECISION,
    publication_qc,
    publish_allowed: publication_qc === "PASS",
    authority_gate: authority,
    consumer_stack: consumer,
    preflight: input.preflight,
    schema_qc,
    visual_asset,
    rendered_visual,
  };
}

export function runContentSelfHealPublicationLoop(input: {
  draft: OrganicDraft;
  demand: SearchDemandEvidence;
  cluster: QuestionClusterPlan;
  internal_link_paths?: string[];
  rendered_html?: string;
  shell_html?: string;
  main_html?: string;
  featured_image_path?: string;
  deploy_asset_paths?: string[];
  image_record?: VentureImageAssetRecord;
  repair?: Parameters<typeof runBoundedConsumerEditorialRepair>[0]["repair"];
}): VentureContentPublicationResult & { repair: ReturnType<typeof runBoundedConsumerEditorialRepair> } {
  const repair = runBoundedConsumerEditorialRepair({
    draft: input.draft,
    rendered_html: input.rendered_html,
    repair: input.repair,
  });
  const decision = evaluateVentureContentPublicationDecision({
    draft: repair.final_draft,
    demand: input.demand,
    cluster: input.cluster,
    internal_link_paths: input.internal_link_paths,
    rendered_html: input.rendered_html,
    shell_html: input.shell_html,
    main_html: input.main_html,
    featured_image_path: input.featured_image_path,
    deploy_asset_paths: input.deploy_asset_paths,
    image_record: input.image_record,
  });
  return { ...decision, repair };
}
