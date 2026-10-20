import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";
import type { QuestionClusterPlan, SearchDemandEvidence } from "./search-demand-evidence";
import { evaluateAuthorityBlogPublicationGate } from "./blog-authority-gates";
import { evaluateBlogSemanticRepetitionGate } from "./blog-consumer-editorial-quality";
import { evaluateBlogTransitionNaturalnessGate } from "./blog-editorial-discipline-gates";
import { evaluateHeadingBodySemanticAlignmentGate } from "./blog-heading-body-alignment";
import { evaluateHumanFirstEditorialQcV2 } from "./blog-editorial-narrative-gates";
import { evaluateBlogVisualValueGate } from "./blog-visual-value-gate";
import { evaluateBlogVisualAssetQc } from "./blog-visual-asset-gates";
import { evaluateBlogSectionProgressionGate } from "./blog-section-progression-gate";
import { evaluateArticleSchemaQc } from "./club-throttle-journal-publication-metadata";
import type { ResponsiveBrowserEvidenceV1 } from "./render-browser-evidence-v1";
import { evaluateRenderedPageQualityQc } from "./rendered-page-quality-v1";
import { OCCUPANCYNPV_BLOG_EDITORIAL_CSS } from "./blog-ux";
import type { VentureImageAssetRecord } from "./venture-image-creative-v2";

export const INFINITY_BLOG_PUBLICATION_GATE_VNEXT = "InfinityBlogPublicationGateVNext" as const;

export type InfinityBlogPublicationVNextInput = {
  draft: OrganicDraft;
  demand?: SearchDemandEvidence;
  cluster?: QuestionClusterPlan;
  internal_link_paths?: string[];
  heading_body_expectations?: Parameters<typeof evaluateHeadingBodySemanticAlignmentGate>[0]["expectations"];
  shell_html?: string;
  main_html?: string;
  featured_image_path?: string;
  deploy_asset_paths?: string[];
  image_record?: VentureImageAssetRecord;
  has_inline_table?: boolean;
  has_inline_diagram?: boolean;
  browser_responsive_evidence?: ResponsiveBrowserEvidenceV1 | null;
  editorial_css?: string;
};

export type InfinityBlogPublicationVNextResult = {
  gate: typeof INFINITY_BLOG_PUBLICATION_GATE_VNEXT;
  result: "PASS" | "FAIL";
  publish_allowed: boolean;
  visual_required: boolean;
  dimensions: Record<string, "PASS" | "FAIL">;
  reasons: string[];
};

function dim(gate: OrganicNamedGate): "PASS" | "FAIL" {
  return gate.result === "PASS" ? "PASS" : "FAIL";
}

export function evaluateInfinityBlogPublicationGateVNext(
  input: InfinityBlogPublicationVNextInput,
): InfinityBlogPublicationVNextResult {
  const dimensions: Record<string, "PASS" | "FAIL"> = {};
  const reasons: string[] = [];

  const human = evaluateHumanFirstEditorialQcV2(input.draft);
  dimensions.HUMAN_FIRST_EDITORIAL_QC = dim(human);
  dimensions.SEMANTIC_REPETITION_QC = dim(evaluateBlogSemanticRepetitionGate(input.draft));
  dimensions.TRANSITION_NATURALNESS_QC = dim(evaluateBlogTransitionNaturalnessGate(input.draft));
  dimensions.HEADING_BODY_ALIGNMENT_QC = dim(
    evaluateHeadingBodySemanticAlignmentGate({
      draft: input.draft,
      expectations: input.heading_body_expectations,
    }),
  );
  dimensions.SECTION_PROGRESSION_QC = dim(evaluateBlogSectionProgressionGate(input.draft));

  const visualValue = evaluateBlogVisualValueGate({
    draft: input.draft,
    has_inline_table: input.has_inline_table,
    has_inline_diagram: input.has_inline_diagram,
    has_hero_image: Boolean(input.featured_image_path),
  });
  dimensions.BLOG_VISUAL_VALUE_GATE = dim(visualValue);
  if (visualValue.assessment.visual_required === false) {
    dimensions.VISUAL_ASSET_OPTIONAL = "PASS";
  }

  if (input.demand && input.cluster) {
    const authority = evaluateAuthorityBlogPublicationGate({
      draft: input.draft,
      demand: input.demand,
      cluster: input.cluster,
      internal_link_paths: input.internal_link_paths,
      heading_body_expectations: input.heading_body_expectations,
    });
    for (const [key, value] of Object.entries(authority.dimensions)) {
      dimensions[`AUTHORITY_${key}`] = value;
    }
  }

  if (input.shell_html) {
    dimensions.SCHEMA_QC = dim(evaluateArticleSchemaQc(input.draft, input.shell_html, input.featured_image_path));
    if (input.featured_image_path && input.deploy_asset_paths) {
      dimensions.BLOG_VISUAL_ASSET_GATE = dim(
        evaluateBlogVisualAssetQc({
          shell_html: input.shell_html,
          featured_image_path: input.featured_image_path,
          deploy_asset_paths: input.deploy_asset_paths,
          image_record: input.image_record,
        }),
      );
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
      dimensions.RENDERED_ARTICLE_VISUAL_QC =
        renderQc.RENDERED_PAGE_QUALITY_QC === "PASS" ? "PASS" : "FAIL";
      if (renderQc.RENDERED_PAGE_QUALITY_QC !== "PASS") reasons.push(...renderQc.reasons);
    }
  }

  for (const [key, value] of Object.entries(dimensions)) {
    if (value === "FAIL") reasons.push(`${key}_FAIL`);
  }

  const publish_allowed = reasons.length === 0;
  return {
    gate: INFINITY_BLOG_PUBLICATION_GATE_VNEXT,
    result: publish_allowed ? "PASS" : "FAIL",
    publish_allowed,
    visual_required: visualValue.assessment.visual_required,
    dimensions,
    reasons,
  };
}
