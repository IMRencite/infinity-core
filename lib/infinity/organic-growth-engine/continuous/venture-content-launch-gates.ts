import type { OrganicDraft } from "./quality";
import type { QuestionClusterPlan, SearchDemandEvidence } from "./search-demand-evidence";
import { evaluateVentureContentPublicationDecision } from "./venture-content-publication-decision";
import { evaluateArticleSchemaQc } from "./club-throttle-journal-publication-metadata";
import { evaluateBlogVisualAssetQc } from "./blog-visual-asset-gates";
import type { ResponsiveBrowserEvidenceV1 } from "./render-browser-evidence-v1";
import { evaluateRenderedPageQualityQc } from "./rendered-page-quality-v1";
import { evaluateImageAssetQualityGate, IMAGE_ASSET_QUALITY_GATE } from "./image-asset-quality-gate";
import type { VentureImageAssetRecord } from "./venture-image-creative-v2";
import type { OrganicNamedGate } from "./types";

export const VENTURE_CONTENT_QUALITY_LAUNCH_GATE = "VentureContentQualityLaunchGate" as const;
export const VENTURE_SCHEMA_LAUNCH_GATE = "VentureSchemaLaunchGate" as const;
export const VENTURE_VISUAL_QUALITY_LAUNCH_GATE = "VentureVisualQualityLaunchGate" as const;
export const VENTURE_IMAGE_ASSET_LAUNCH_GATE = "VentureImageAssetLaunchGate" as const;

export type VentureBlogLaunchQcInput = {
  draft: OrganicDraft;
  demand: SearchDemandEvidence;
  cluster: QuestionClusterPlan;
  shell_html: string;
  main_html: string;
  editorial_css: string;
  featured_image_path: string;
  deploy_asset_paths: string[];
  image_record?: VentureImageAssetRecord;
  internal_link_paths?: string[];
  browser_responsive_evidence?: ResponsiveBrowserEvidenceV1 | null;
};

export function evaluateVentureBlogLaunchGates(input: VentureBlogLaunchQcInput): {
  content: ReturnType<typeof evaluateVentureContentPublicationDecision>;
  schema: OrganicNamedGate;
  visual: OrganicNamedGate;
  image: OrganicNamedGate;
  venture_launch_ready: boolean;
} {
  const content = evaluateVentureContentPublicationDecision({
    draft: input.draft,
    demand: input.demand,
    cluster: input.cluster,
    internal_link_paths: input.internal_link_paths,
    rendered_html: input.shell_html,
    shell_html: input.shell_html,
    main_html: input.main_html,
    editorial_css: input.editorial_css,
    featured_image_path: input.featured_image_path,
    deploy_asset_paths: input.deploy_asset_paths,
    image_record: input.image_record,
  });
  const schema = evaluateArticleSchemaQc(input.draft, input.shell_html, input.featured_image_path);
  const pageRender = evaluateRenderedPageQualityQc({
    profile: "ARTICLE",
    shell_html: input.shell_html,
    main_html: input.main_html,
    editorial_css: input.editorial_css,
    boundary: "NEW_VENTURE_BLOG_LAUNCH",
    browser_evidence: input.browser_responsive_evidence ?? null,
    functional_pass: true,
  });
  const visual: OrganicNamedGate = {
    gate: VENTURE_VISUAL_QUALITY_LAUNCH_GATE,
    result: pageRender.RENDERED_PAGE_QUALITY_QC === "PASS" ? "PASS" : "FAIL",
    reasons: pageRender.reasons,
  };
  const assetQc = evaluateBlogVisualAssetQc({
    shell_html: input.shell_html,
    featured_image_path: input.featured_image_path,
    deploy_asset_paths: input.deploy_asset_paths,
    image_record: input.image_record,
  });
  const qualityQc = input.image_record
    ? evaluateImageAssetQualityGate({
        record: input.image_record,
        svg_or_binary_present: input.deploy_asset_paths.includes(input.image_record.path),
      })
    : { gate: IMAGE_ASSET_QUALITY_GATE, result: "PASS" as const, reasons: [] };
  const imageLaunch: OrganicNamedGate = {
    gate: VENTURE_IMAGE_ASSET_LAUNCH_GATE,
    result: assetQc.result === "PASS" && qualityQc.result === "PASS" ? "PASS" : "FAIL",
    reasons: [...assetQc.reasons, ...qualityQc.reasons],
  };
  const venture_launch_ready =
    content.publication_qc === "PASS"
    && schema.result === "PASS"
    && visual.result === "PASS"
    && imageLaunch.result === "PASS";
  return { content, schema, visual, image: imageLaunch, venture_launch_ready };
}

export function autonomousAgentMayUseQcBypass(): boolean {
  return false;
}
