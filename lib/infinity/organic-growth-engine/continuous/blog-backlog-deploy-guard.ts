import type { OrganicDraft } from "./quality";
import { evaluateInfinityBlogPublicationGateVNext } from "./infinity-blog-publication-gate-vnext";
import {
  evaluateArticleCanonicalQc,
  evaluateArticleSchemaQc,
} from "./club-throttle-journal-publication-metadata";
import { OCCUPANCYNPV_BLOG_EDITORIAL_CSS } from "./blog-ux";
import type { ResponsiveBrowserEvidenceV1 } from "./render-browser-evidence-v1";
import { evaluateRenderedPageQualityQc } from "./rendered-page-quality-v1";
import type { BlogBacklogArticle } from "./blog-backlog-inventory";
import { evaluateBacklogSourceVNext } from "./blog-backlog-inventory";
import { evaluateBlogMediaCompletenessQc } from "./blog-media-completeness-qc";
import { evaluateBlogMediaDeployArtifactQc } from "./blog-deploy-media-bundle";
import type { OrganicQcResult } from "./types";

function guardTriState(result: OrganicQcResult): "PASS" | "FAIL" | "NOT_RUN" {
  if (result === "PASS" || result === "FAIL") return result;
  return "NOT_RUN";
}

export const BLOG_BACKLOG_DEPLOY_GUARD = "BlogBacklogDeployGuard" as const;

export type BlogArticlePreDeployQc = {
  path: string;
  slug: string;
  source_qc: "PASS" | "FAIL";
  editorial_qc: "PASS" | "FAIL";
  visual_value_qc: "PASS" | "FAIL";
  media_completeness_qc: "PASS" | "FAIL" | "NOT_RUN";
  rendered_qc: "PASS" | "FAIL" | "NOT_RUN";
  article_rendered_qc: "PASS" | "FAIL" | "NOT_RUN";
  canonical_qc: "PASS" | "FAIL" | "NOT_RUN";
  schema_qc: "PASS" | "FAIL" | "NOT_RUN";
  deploy_allowed: boolean;
  reasons: string[];
};

export type BlogBacklogDeployGuardResult = {
  gate: typeof BLOG_BACKLOG_DEPLOY_GUARD;
  deploy_allowed: boolean;
  bundle_deploy_allowed: boolean;
  articles: BlogArticlePreDeployQc[];
  reasons: string[];
  blog_media_deploy_artifact_qc: "PASS" | "FAIL" | "NOT_RUN";
};

export type RenderedBacklogEvidence = {
  shell_html: string;
  main_html: string;
  expected_canonical: string;
  featured_image_path?: string;
  browser_responsive_evidence?: ResponsiveBrowserEvidenceV1 | null;
};

function dimPass(value: "PASS" | "FAIL" | "NOT_RUN"): boolean {
  return value === "PASS";
}

export function evaluateBlogArticlePreDeployQc(input: {
  article: BlogBacklogArticle;
  rendered?: RenderedBacklogEvidence | null;
}): BlogArticlePreDeployQc {
  const reasons: string[] = [];
  const vnext = evaluateBacklogSourceVNext(input.article);
  const source_qc = vnext.result;
  const editorial_qc = vnext.dimensions.HUMAN_FIRST_EDITORIAL_QC ?? "FAIL";
  const visual_value_qc = vnext.dimensions.BLOG_VISUAL_VALUE_GATE ?? "FAIL";

  if (source_qc !== "PASS") reasons.push("SOURCE_QC_FAIL");
  if (editorial_qc !== "PASS") reasons.push("EDITORIAL_QC_FAIL");
  if (visual_value_qc !== "PASS") reasons.push("VISUAL_VALUE_GATE_FAIL");

  const mediaQc = evaluateBlogMediaCompletenessQc({
    article_path: input.article.path,
    shell_html: input.rendered?.shell_html,
  });
  const media_completeness_qc = input.rendered ? mediaQc.result : "NOT_RUN";
  if (media_completeness_qc !== "PASS") reasons.push("BLOG_MEDIA_COMPLETENESS_QC_FAIL", ...mediaQc.reasons);

  let rendered_qc: "PASS" | "FAIL" | "NOT_RUN" = "NOT_RUN";
  let article_rendered_qc: "PASS" | "FAIL" | "NOT_RUN" = "NOT_RUN";
  let canonical_qc: "PASS" | "FAIL" | "NOT_RUN" = "NOT_RUN";
  let schema_qc: "PASS" | "FAIL" | "NOT_RUN" = "NOT_RUN";

  if (!input.rendered) {
    reasons.push("RENDERED_QC_NOT_RUN");
  } else if (input.article.draft) {
    const shell = input.rendered.shell_html;
    const norm = (u: string) => u.replace(/\/+$/, "").toLowerCase();
    if (input.article.venture === "club-throttle") {
      const canonicalGate = evaluateArticleCanonicalQc({
        expected_path: input.article.path,
        declared_canonical: input.rendered.expected_canonical,
      });
      canonical_qc = guardTriState(canonicalGate.result);
      if (canonicalGate.result !== "PASS") reasons.push("CANONICAL_QC_FAIL");
      const schema = evaluateArticleSchemaQc(input.article.draft, shell, input.rendered.featured_image_path);
      schema_qc = guardTriState(schema.result);
      if (schema.result !== "PASS") reasons.push("SCHEMA_QC_FAIL");
    } else {
      const canonMatch = norm(input.rendered.expected_canonical) === norm(input.article.canonical_url);
      canonical_qc = canonMatch ? "PASS" : "FAIL";
      if (!canonMatch) reasons.push("CANONICAL_QC_FAIL");
      schema_qc =
        /BlogPosting/.test(shell) && /BreadcrumbList/.test(shell) && /WebPage/.test(shell) ? "PASS" : "FAIL";
      if (schema_qc !== "PASS") reasons.push("SCHEMA_QC_FAIL");
    }

    const pageRender = evaluateRenderedPageQualityQc({
      profile: "ARTICLE",
      shell_html: shell,
      main_html: input.rendered.main_html,
      editorial_css: OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
      boundary: "AUTONOMOUS_PUBLICATION_APPROVAL",
      browser_evidence: input.rendered.browser_responsive_evidence ?? null,
      functional_pass: true,
    });
    if (pageRender.RENDERED_PAGE_QUALITY_QC === "FAIL_EVIDENCE_MISSING") {
      rendered_qc = "FAIL";
      article_rendered_qc = "FAIL";
      reasons.push("RENDERED_QC_FAIL", ...pageRender.reasons);
    } else {
      rendered_qc = pageRender.RENDERED_PAGE_QUALITY_QC === "PASS" ? "PASS" : "FAIL";
      article_rendered_qc = rendered_qc;
      if (rendered_qc !== "PASS") reasons.push("RENDERED_QC_FAIL", ...pageRender.reasons);
    }
  }

  const deploy_allowed =
    dimPass(source_qc)
    && dimPass(editorial_qc)
    && dimPass(visual_value_qc)
    && dimPass(media_completeness_qc)
    && dimPass(rendered_qc)
    && dimPass(article_rendered_qc)
    && dimPass(canonical_qc)
    && dimPass(schema_qc);

  return {
    path: input.article.path,
    slug: input.article.slug,
    source_qc,
    editorial_qc,
    visual_value_qc,
    media_completeness_qc,
    rendered_qc,
    article_rendered_qc,
    canonical_qc,
    schema_qc,
    deploy_allowed,
    reasons: [...new Set(reasons)],
  };
}

/** Bundle deploy allowed only when every authorized backlog article is deploy-ready. */
export function evaluateBlogBacklogDeployGuard(input: {
  articles: BlogBacklogArticle[];
  rendered_by_path?: Record<string, RenderedBacklogEvidence | null | undefined>;
  scoped_backlog_publication_authorized?: boolean;
  deploy_files?: Array<{ path: string }>;
}): BlogBacklogDeployGuardResult {
  const scoped = input.scoped_backlog_publication_authorized !== false;
  const backlog = input.articles.filter((a) => a.backlog_scope === "AUTHORIZED_BACKLOG" && a.draft);
  const articles = backlog.map((article) =>
    evaluateBlogArticlePreDeployQc({
      article,
      rendered: input.rendered_by_path?.[article.path] ?? null,
    }),
  );
  const reasons: string[] = [];
  if (!scoped) reasons.push("SCOPED_BACKLOG_NOT_AUTHORIZED");
  const publishedRegistry = new Set<BlogBacklogArticle["registry_state"]>(["PUBLISHED", "REFRESHED"]);
  for (let i = 0; i < articles.length; i += 1) {
    const row = articles[i]!;
    const article = backlog[i]!;
    const liveAlreadyPublished = publishedRegistry.has(article.registry_state);
    if (!row.deploy_allowed && !liveAlreadyPublished) reasons.push(`ARTICLE_NOT_READY:${row.slug}`);
  }
  let blog_media_deploy_artifact_qc: "PASS" | "FAIL" | "NOT_RUN" = "NOT_RUN";
  if (input.deploy_files?.length) {
    const artifact = evaluateBlogMediaDeployArtifactQc({ deploy_files: input.deploy_files });
    blog_media_deploy_artifact_qc = artifact.result;
    if (artifact.result !== "PASS") reasons.push("BLOG_MEDIA_DEPLOY_ARTIFACT_QC_FAIL", ...artifact.reasons);
  }
  const bundle_deploy_allowed =
    scoped
    && articles.length > 0
    && blog_media_deploy_artifact_qc !== "FAIL"
    && backlog.every((article, i) => articles[i]!.deploy_allowed || publishedRegistry.has(article.registry_state));
  return {
    gate: BLOG_BACKLOG_DEPLOY_GUARD,
    deploy_allowed: bundle_deploy_allowed,
    bundle_deploy_allowed,
    articles,
    reasons: [...new Set(reasons)],
    blog_media_deploy_artifact_qc,
  };
}

export function assertBlogBacklogDeployAllowed(guard: BlogBacklogDeployGuardResult): void {
  if (!guard.bundle_deploy_allowed) {
    throw new Error(`BLOG_BACKLOG_DEPLOY_BLOCKED:${guard.reasons.join(",")}`);
  }
}

/** Minimal rendered evidence from composed article HTML (preview/compose path). */
export function renderedEvidenceFromCompose(input: {
  article: BlogBacklogArticle;
  shell_html: string;
  main_html: string;
  featured_image_path?: string;
}): RenderedBacklogEvidence {
  return {
    shell_html: input.shell_html,
    main_html: input.main_html,
    expected_canonical: input.article.canonical_url,
    featured_image_path: input.featured_image_path,
  };
}

export function draftOriginForVenture(venture: "club-throttle" | "occupancynpv"): string {
  return venture === "club-throttle" ? "https://clubthrottle.com" : "https://occupancynpv.com";
}

export function withVentureOrigin(draft: OrganicDraft, venture: "club-throttle" | "occupancynpv"): OrganicDraft {
  return { ...draft, origin: draft.origin ?? draftOriginForVenture(venture) };
}
