import { describe, expect, it } from "vitest";
import {
  evaluateBlogArticlePreDeployQc,
  evaluateBlogBacklogDeployGuard,
} from "../blog-backlog-deploy-guard";
import { buildBacklogRenderedEvidence } from "../blog-backlog-compose-evidence";
import { clubThrottleShirtV5Body } from "../club-throttle-v5-body-shirt";
import { clubThrottleAfterDarkV5Body } from "../club-throttle-v5-body-after-dark";
import type { BlogBacklogArticle } from "../blog-backlog-inventory";
import type { OrganicDraft } from "../quality";

function shirtArticle(): BlogBacklogArticle {
  const shirt = clubThrottleShirtV5Body();
  const draft: OrganicDraft = {
    title: "How riders choose a shirt that survives the ride home",
    meta_description: shirt.answer,
    h1: "How riders choose a shirt that survives the ride home",
    headings: shirt.headings,
    body: shirt.body,
    direct_answer: shirt.answer,
    citations: [],
    schema: [],
    canonical: "/journal/apparel/how-riders-choose-a-shirt/",
    breadcrumbs: [],
    internal_links: [],
    word_count: shirt.body.split(/\s+/).length,
    visible_faqs: shirt.faqs,
    origin: "https://clubthrottle.com",
    page_kind: "BLOG_ARTICLE",
    date_published: "2026-09-25",
    date_modified: "2026-09-25",
  };
  return {
    venture: "club-throttle",
    title: draft.h1,
    slug: "how-riders-choose-a-shirt",
    path: "/journal/apparel/how-riders-choose-a-shirt/",
    canonical_url: "https://clubthrottle.com/journal/apparel/how-riders-choose-a-shirt/",
    source_files: [],
    registry_state: "PUBLISHED",
    asset_id: "journal-how-riders-choose-a-shirt",
    draft,
    backlog_scope: "AUTHORIZED_BACKLOG",
  };
}

describe("BlogBacklogDeployGuard", () => {
  it("blocks deploy when source QC fails", () => {
    const article = shirtArticle();
    const badDraft = { ...article.draft!, body: "Still, the point is simple. ".repeat(200) };
    const row = evaluateBlogArticlePreDeployQc({
      article: { ...article, draft: badDraft },
      rendered: null,
    });
    expect(row.source_qc).toBe("FAIL");
    expect(row.deploy_allowed).toBe(false);
    expect(row.reasons).toContain("SOURCE_QC_FAIL");
  });

  it("blocks deploy when rendered QC was not run", () => {
    const article = shirtArticle();
    const row = evaluateBlogArticlePreDeployQc({ article, rendered: null });
    expect(row.rendered_qc).toBe("NOT_RUN");
    expect(row.deploy_allowed).toBe(false);
    expect(row.reasons).toContain("RENDERED_QC_NOT_RUN");
  });

  it("allows deploy when source, media, and composed rendered evidence pass for shirt fixture", () => {
    const article = shirtArticle();
    const rendered = buildBacklogRenderedEvidence(article);
    expect(rendered).not.toBeNull();
    const guard = evaluateBlogBacklogDeployGuard({
      articles: [article],
      rendered_by_path: { [article.path]: rendered },
      scoped_backlog_publication_authorized: true,
    });
    expect(guard.articles[0]?.source_qc).toBe("PASS");
    expect(guard.articles[0]?.media_completeness_qc).toBe("PASS");
    expect(guard.articles[0]?.rendered_qc).toBe("PASS");
    expect(guard.articles[0]?.deploy_allowed).toBe(true);
    expect(guard.bundle_deploy_allowed).toBe(true);
  });

  it("allows bundle deploy when a published row fails editorial QC but a qualified row passes", () => {
    const shirt = shirtArticle();
    const night = clubThrottleAfterDarkV5Body();
    const heldPublished: BlogBacklogArticle = {
      venture: "club-throttle",
      title: "How to ride after dark without turning the night into a stunt",
      slug: "how-to-ride-after-dark",
      path: "/journal/night-riding/how-to-ride-after-dark/",
      canonical_url: "https://clubthrottle.com/journal/night-riding/how-to-ride-after-dark/",
      source_files: [],
      registry_state: "PUBLISHED",
      asset_id: "journal-how-to-ride-after-dark",
      draft: {
        title: "How to ride after dark without turning the night into a stunt",
        meta_description: night.answer,
        h1: "How to ride after dark without turning the night into a stunt",
        headings: night.headings,
        body: night.body,
        direct_answer: night.answer,
        citations: [],
        schema: [],
        canonical: "/journal/night-riding/how-to-ride-after-dark/",
        breadcrumbs: [],
        internal_links: [],
        word_count: night.body.split(/\s+/).length,
        visible_faqs: night.faqs,
        origin: "https://clubthrottle.com",
        page_kind: "BLOG_ARTICLE",
        date_published: "2026-09-25",
        date_modified: "2026-09-25",
      },
      backlog_scope: "AUTHORIZED_BACKLOG",
    };
    const shirtRendered = buildBacklogRenderedEvidence(shirt)!;
    const guard = evaluateBlogBacklogDeployGuard({
      articles: [shirt, heldPublished],
      rendered_by_path: { [shirt.path]: shirtRendered },
      scoped_backlog_publication_authorized: true,
    });
    expect(guard.articles.find((a) => a.slug === "how-riders-choose-a-shirt")?.deploy_allowed).toBe(true);
    expect(guard.bundle_deploy_allowed).toBe(true);
  });

  it("blocks bundle deploy when an unpublished row fails QC", () => {
    const shirt = shirtArticle();
    const badUnpublished: BlogBacklogArticle = {
      ...shirt,
      slug: "net-new-fail",
      path: "/journal/rides/net-new-fail/",
      canonical_url: "https://clubthrottle.com/journal/rides/net-new-fail/",
      registry_state: "COMPOSE_ONLY",
      asset_id: "journal-net-new-fail",
      draft: { ...shirt.draft!, body: "Still, the point is simple. ".repeat(200) },
    };
    const guard = evaluateBlogBacklogDeployGuard({
      articles: [badUnpublished],
      rendered_by_path: {},
      scoped_backlog_publication_authorized: true,
    });
    expect(guard.bundle_deploy_allowed).toBe(false);
    expect(guard.reasons.some((r) => r.includes("net-new-fail"))).toBe(true);
  });
});
