import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { sitemapSource } from "@/lib/infinity/public-venture-template";
import { CRE_VERCEL_PROJECT_LIVE_NAME, OCCUPANCYNPV_DOMAIN } from "@/lib/infinity/venture-operating-scale/constants";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import type { OrganicAsset, OrganicPublisherAdapter } from "./types";
import {
  blogSitemapUrls,
  occupancynpvTagDescription,
  sanitizeBlogSitemap,
} from "./blog-taxonomy";
import {
  occupancynpvBlogArticleSchema,
  occupancynpvBlogArticleSource,
  occupancynpvBlogCategoryArchiveSchema,
  occupancynpvBlogCategoryArchiveSource,
  occupancynpvBlogIndexSchema,
  occupancynpvBlogIndexSource,
  occupancynpvBlogTagArchiveSchema,
  occupancynpvBlogTagArchiveSource,
  occupancynpvBlogTagHubSchema,
  occupancynpvBlogTagHubSource,
  OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH,
  OCCUPANCYNPV_BLOG_ARTICLE_PATH,
  OCCUPANCYNPV_BLOG_INDEX_PATH,
  OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY,
} from "./occupancynpv-blog";
import { occupancynpvActiveTags, occupancynpvPublishedBlogPosts } from "./occupancynpv-blog-catalog";
import { occupancynpvLiveCapRatePageSource, occupancynpvLiveCapRateSchema } from "./occupancynpv-live-page";
import { occupancynpvLeaseInputsPageSource, occupancynpvLeaseInputsSchema } from "./occupancynpv-lease-inputs-page";
import { OCCUPANCYNPV_BLOG_EDITORIAL_CSS } from "./blog-ux";
import { occupancynpvUniqueCreativeSvg } from "./occupancynpv-blog-creative";
import { OCCUPANCYNPV_LIVE_CAP_RATE_PATH } from "./urls";
import { FIRST_LEASE_INPUTS_ROUTE } from "../obligation/opportunity";

type ArtifactFile = { path: string; content: string; encoding?: "utf8" | "base64" };

export const OCCUPANCYNPV_LIVE_PUBLISHER_ID = "occupancynpv_vercel_source_bundle" as const;

function upsert(files: ArtifactFile[], path: string, content: string): ArtifactFile[] {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push({ path, content });
  return next;
}

function filePathForRoute(route: string): string {
  const clean = route.replace(/\/+$/, "") || "/";
  return clean === "/" ? "app/page.tsx" : `app${clean}/page.tsx`;
}

export function injectOccupancyNpvOrganicPage(files: ArtifactFile[], input: {
  route: string;
  source: string;
  schema: Record<string, unknown>;
}): ArtifactFile[] {
  let next = upsert(files, filePathForRoute(input.route), input.source);
  const sitemap = next.find((file) => file.path.replace(/\\/g, "/") === "app/sitemap.ts");
  if (sitemap) {
    const found = [...sitemap.content.matchAll(/url:\s*"([^"]+)"/g)].map((item) => item[1]);
    next = upsert(next, "app/sitemap.ts", sitemapSource([...found, input.route]));
  }
  const schemaFile = next.find((file) => file.path.replace(/\\/g, "/") === "lib/site-schema.ts");
  if (schemaFile) {
    const routeKey = input.route.replace(/\/+$/, "") || "/";
    next = upsert(
      next,
      "lib/site-schema.ts",
      schemaFile.content.replace(
        /export const SITE_SCHEMA: Record<string, unknown> = \{/,
        `export const SITE_SCHEMA: Record<string, unknown> = {\n  ${JSON.stringify(routeKey)}: ${JSON.stringify(input.schema)},\n  ${JSON.stringify(input.route)}: ${JSON.stringify(input.schema)},`,
      ),
    );
  }
  const hubPath = input.route.includes("lease-comparison")
    ? "app/lease-comparison/how-do-you-compare-two-commercial-lease-options/page.tsx"
    : "app/commercial-lease-npv/page.tsx";
  const hub = next.find((file) => file.path.replace(/\\/g, "/") === hubPath)
    ?? next.find((file) => file.path.replace(/\\/g, "/") === "app/commercial-lease-npv/page.tsx");
  if (hub && !hub.content.includes(input.route)) {
    const label = input.route.includes("what-numbers")
      ? "What numbers do you need to compare two commercial leases?"
      : "How is cap rate calculated?";
    const link = `<p className="pv-surface"><a href="${input.route}">${label}</a></p>`;
    const patched = hub.content.includes("className=\"pv-related\"")
      ? hub.content.replace(/className="pv-related">/, `className="pv-related">\n            ${link}`)
      : hub.content.replace("<VentureFooter />", `${link}\n        <VentureFooter />`);
    next = upsert(next, hub.path, patched);
  }
  return next;
}

export function composeOccupancyNpvOrganicLiveFiles(): { files: ArtifactFile[]; pagePath: string } {
  const composed = composeOccupancynpvPaymentReactivationFiles();
  let files = injectOccupancyNpvOrganicPage(composed.files, {
    route: OCCUPANCYNPV_LIVE_CAP_RATE_PATH,
    source: occupancynpvLiveCapRatePageSource(),
    schema: occupancynpvLiveCapRateSchema(),
  });
  files = injectOccupancyNpvOrganicPage(files, {
    route: FIRST_LEASE_INPUTS_ROUTE,
    source: occupancynpvLeaseInputsPageSource(),
    schema: occupancynpvLeaseInputsSchema(),
  });
  files = injectOccupancyNpvOrganicPage(files, {
    route: OCCUPANCYNPV_BLOG_INDEX_PATH,
    source: occupancynpvBlogIndexSource(),
    schema: occupancynpvBlogIndexSchema(),
  });
  files = injectOccupancyNpvOrganicPage(files, {
    route: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
    source: occupancynpvBlogArticleSource(),
    schema: occupancynpvBlogArticleSchema(),
  });
  files = injectOccupancyNpvOrganicPage(files, {
    route: `/blog/category/${OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY.toLowerCase()}/`,
    source: occupancynpvBlogCategoryArchiveSource(OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY),
    schema: occupancynpvBlogCategoryArchiveSchema(OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY),
  });
  files = injectOccupancyNpvOrganicPage(files, {
    route: "/blog/tag/",
    source: occupancynpvBlogTagHubSource(),
    schema: occupancynpvBlogTagHubSchema(),
  });
  for (const row of occupancynpvActiveTags()) {
    files = injectOccupancyNpvOrganicPage(files, {
      route: `/blog/tag/${row.tag.toLowerCase().replace(/\s+/g, "-")}/`,
      source: occupancynpvBlogTagArchiveSource(row.tag),
      schema: occupancynpvBlogTagArchiveSchema(row.tag),
    });
  }
  files = upsert(
    files,
    "next.config.mjs",
    `/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  async redirects() {
    return [
      { source: "/blog/how-interest-rates-affect-commercial-property-values", destination: "/blog/valuation/how-interest-rates-affect-commercial-property-values/", statusCode: 301 },
      { source: "/blog/how-interest-rates-affect-commercial-property-values/", destination: "/blog/valuation/how-interest-rates-affect-commercial-property-values/", statusCode: 301 },
    ];
  },
};
export default nextConfig;
`,
  );
  const sitemap = files.find((file) => file.path.replace(/\\/g, "/") === "app/sitemap.ts");
  if (sitemap) {
    const keep = blogSitemapUrls({
      index: OCCUPANCYNPV_BLOG_INDEX_PATH,
      articles: occupancynpvPublishedBlogPosts(),
      categories: [OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY],
      tags: occupancynpvActiveTags().map((row) => ({ tag: row.tag, count: row.count, intro: occupancynpvTagDescription(row.tag) })),
      legacy_paths: [OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH],
    });
    files = upsert(files, "app/sitemap.ts", sanitizeBlogSitemap(sitemap.content, keep, [OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH, "/blog/tag/"]));
  }
  const chrome = files.find((file) => file.path.replace(/\\/g, "/").endsWith("components/site-chrome.tsx"));
  if (chrome) {
    let content = chrome.content;
    if (!content.includes('href: "/blog"')) {
      content = content.replace(
        '{ href: "/resources", label: "Resources" },',
        '{ href: "/resources", label: "Resources" },\n  { href: "/blog", label: "Blog" },',
      );
    }
    content = content.replace(
      "<p className=\"pv-eyebrow\">{question}</p>",
      "<p className=\"pv-answer-label\">{question}</p>",
    );
    files = upsert(files, chrome.path, content);
  }
  const globals = files.find((file) => file.path.replace(/\\/g, "/") === "styles/globals.css");
  if (globals) {
    const stripped = globals.content
      .replace(/\/\* OCCUPANCYNPV_BLOG_EDITORIAL_CSS_START \*\/[\s\S]*?\/\* OCCUPANCYNPV_BLOG_EDITORIAL_CSS_END \*\//g, "")
      .replace(/\n\.onpv-blog-layout\[data-blog-layout="editorial"\][\s\S]*?prefers-reduced-motion:reduce\)\{\.onpv-blog-carousel__scroller\{scroll-behavior:auto\}\}/g, "");
    files = upsert(files, globals.path, `${stripped.trimEnd()}\n${OCCUPANCYNPV_BLOG_EDITORIAL_CSS}`);
  }
  files = upsert(files, "public/media/blog/valuation-category.svg", occupancynpvUniqueCreativeSvg("valuation"));
  files = upsert(files, "public/media/blog/interest-rates.svg", occupancynpvUniqueCreativeSvg("interest-rates"));
  files = upsert(files, "public/media/blog/cap-rates.svg", occupancynpvUniqueCreativeSvg("cap-rates"));
  files = upsert(files, "public/media/blog/commercial-real-estate.svg", occupancynpvUniqueCreativeSvg("commercial-real-estate"));
  files = upsert(files, "public/media/blog/topic-hub.svg", occupancynpvUniqueCreativeSvg("topic-hub"));
  files = files.map((file) => ({
    ...file,
    content: file.content
      .replace(/Request Pilot Access/g, "Start Free Trial")
      .replace(/href="\/early-access"/g, 'href="/pricing"')
      .replace(/href: "\/early-access"/g, 'href: "/pricing"'),
  }));
  return { files, pagePath: filePathForRoute(OCCUPANCYNPV_LIVE_CAP_RATE_PATH) };
}

export function createOccupancyNpvLivePublisher(): OrganicPublisherAdapter & {
  last_files: ArtifactFile[];
} {
  const drafts = new Map<string, OrganicAsset>();
  const published = new Map<string, OrganicAsset>();
  return {
    id: "nextjs_repository",
    last_files: [],
    async createDraft(asset) {
      drafts.set(asset.asset_id, { ...asset, status: "DRAFT" });
      return { ok: true, draft_id: asset.asset_id };
    },
    async updateDraft(draft_id, asset) {
      drafts.set(draft_id, asset);
      return { ok: true };
    },
    async publish(draft_id) {
      const draft = drafts.get(draft_id);
      if (!draft) return { ok: false, url: "" };
      const composed = composeOccupancyNpvOrganicLiveFiles();
      this.last_files = composed.files;
      const live = { ...draft, status: "PUBLISHED" as const, published_at: new Date().toISOString(), url: OCCUPANCYNPV_LIVE_CAP_RATE_PATH };
      published.set(live.url, live);
      drafts.delete(draft_id);
      return { ok: composed.files.some((file) => file.path.replace(/\\/g, "/") === composed.pagePath), url: live.url };
    },
    async updatePublishedContent(url, asset) {
      published.set(url, { ...asset, status: "REFRESHED" });
      return { ok: true };
    },
    async addInternalLinks() {
      return { ok: true };
    },
    async setTaxonomy() {
      return { ok: true };
    },
    async setMetadata() {
      return { ok: true };
    },
    async setSchema() {
      return { ok: true };
    },
    async getPublicationState(url) {
      if (published.has(url)) return "PUBLISHED";
      return "UNKNOWN";
    },
  };
}

export async function fetchPublicRedirect(url: string): Promise<{ status: number; location: string | null; hops: number; final_status: number }> {
  try {
    const first = await fetch(url, { redirect: "manual" });
    const location = first.headers.get("location");
    if ((first.status === 301 || first.status === 308) && location) {
      const absolute = new URL(location, url).toString();
      const second = await fetch(absolute, { redirect: "manual" });
      const chained = second.status === 301 || second.status === 308;
      return {
        status: first.status,
        location: absolute,
        hops: chained ? 2 : 1,
        final_status: chained ? second.status : second.status,
      };
    }
    return { status: first.status, location, hops: 0, final_status: first.status };
  } catch {
    return { status: 0, location: null, hops: 0, final_status: 0 };
  }
}

export async function fetchPublicHtml(url: string): Promise<{ ok: boolean; status: number; body: string; final_url: string }> {
  try {
    const response = await fetch(url, { redirect: "follow" });
    return { ok: response.ok, status: response.status, body: await response.text(), final_url: response.url };
  } catch {
    return { ok: false, status: 0, body: "", final_url: url };
  }
}

export async function deployOccupancyNpvOrganicLivePage(input: {
  deploy?: boolean;
  pollAttempts?: number;
  pollDelayMs?: number;
} = {}) {
  if (input.deploy !== false) {
    loadServerEnvFromLocalFile();
    reloadVercelFromLocalFile();
  }
  const composed = composeOccupancyNpvOrganicLiveFiles();
  const pageReady = composed.files.some((file) => file.path.replace(/\\/g, "/") === composed.pagePath)
    && composed.files.some((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx");
  let deploymentId: string | null = null;
  let previewUrl: string | null = null;
  let deployed = false;
  let aliased = false;
  let safeError: string | null = pageReady ? null : "ORGANIC_LIVE_PAGE_NOT_IN_BUNDLE";

  if (!safeError && input.deploy !== false) {
    const vercel = new VercelDomainBindingAdapter();
    if (!vercel.tokenPresent()) {
      safeError = "VERCEL_TOKEN_MISSING";
    } else {
      for (const file of composed.files) {
        const uploaded = await vercel.uploadSourceFile(file);
        if (!uploaded.ok) {
          safeError = uploaded.safeError ?? "VERCEL_FILE_UPLOAD_FAILED";
          break;
        }
      }
      if (!safeError) {
        const created = await vercel.createSourceBundleDeployment({
          projectName: CRE_VERCEL_PROJECT_LIVE_NAME,
          files: composed.files,
        });
        if (!created.ok || created.id === "UNKNOWN") {
          safeError = created.safeError ?? "VERCEL_DEPLOYMENT_CREATE_FAILED";
        } else {
          deploymentId = created.id;
          previewUrl = created.url && created.url !== "UNKNOWN" ? `https://${created.url}` : null;
          for (let attempt = 0; attempt < (input.pollAttempts ?? 50); attempt += 1) {
            const status = await vercel.getDeployment(created.id);
            if (status.url && status.url !== "UNKNOWN") previewUrl = `https://${status.url}`;
            if (status.readyState === "READY") {
              const alias = await vercel.assignDeploymentAlias(created.id, OCCUPANCYNPV_DOMAIN);
              aliased = alias.ok;
              deployed = alias.ok;
              if (!alias.ok) safeError = alias.safeError ?? "VERCEL_ALIAS_FAILED";
              break;
            }
            if (status.readyState === "ERROR" || status.readyState === "CANCELED") {
              safeError = status.safeError ?? "VERCEL_DEPLOYMENT_FAILED";
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, input.pollDelayMs ?? 8000));
          }
          if (!deployed && !safeError) safeError = "VERCEL_DEPLOYMENT_NOT_READY";
        }
      }
    }
  }

  const liveUrl = `https://occupancynpv.com${OCCUPANCYNPV_LIVE_CAP_RATE_PATH.replace(/\/+$/, "")}`;
  let live = { ok: false, status: 0, body: "", final_url: liveUrl };
  if (deployed) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      live = await fetchPublicHtml(liveUrl);
      if (live.ok) break;
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }
    if (!live.ok) safeError = safeError ?? "LIVE_URL_NOT_200";
  }

  return {
    adapter: OCCUPANCYNPV_LIVE_PUBLISHER_ID,
    domain: OCCUPANCYNPV_DOMAIN,
    project: CRE_VERCEL_PROJECT_LIVE_NAME,
    page_path: composed.pagePath,
    file_count: composed.files.length,
    deployment_id: deploymentId,
    preview_url: previewUrl,
    deployed,
    aliased,
    live_url: liveUrl,
    live_status: live.status,
    live_html: live.body,
    safe_error: safeError,
  };
}
