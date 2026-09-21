import { sitemapSource } from "@/lib/infinity/public-venture-template";
import { applyAuthorityVisualCss } from "./digital-real-estate-css";
import {
  allSeoGeoPlannedPages,
  SEO_GEO_LEGAL_ROUTES,
  SEO_GEO_PRODUCT_ROUTES,
  SEO_GEO_REDIRECTS,
} from "./digital-real-estate-catalog";
import { allAuthorityPageSpecs } from "./digital-real-estate-specs";
import { renderAuthorityPage } from "./digital-real-estate-render";
import { buildPageSchema } from "./schema-builder";
import { robotsSource, siteSchemaModule } from "./site-chrome";
import { evaluatePublicAuthorityPublishability } from "./public-authority-publishability-gate";

function upsert(files: Array<{ path: string; content: string }>, path: string, content: string) {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push({ path, content });
  return next;
}

function pageFile(route: string): string {
  const clean = route === "/" ? "/" : route.replace(/\/+$/, "");
  return clean === "/" ? "app/page.tsx" : `app${clean}/page.tsx`;
}

function redirectPage(to: string): string {
  return `import { redirect } from "next/navigation";

export const metadata = { robots: { index: false, follow: true } };

export default function Page() {
  redirect(${JSON.stringify(to)});
}
`;
}

export function composeSeoGeoDigitalRealEstateFiles(input: {
  files: Array<{ path: string; content: string }>;
}): {
  files: Array<{ path: string; content: string }>;
  publishability: ReturnType<typeof evaluatePublicAuthorityPublishability>;
} {
  let files = input.files.map((item) => ({ ...item }));
  for (const spec of allAuthorityPageSpecs()) {
    files = upsert(files, pageFile(spec.route), renderAuthorityPage(spec));
  }
  for (const redirect of SEO_GEO_REDIRECTS) {
    files = upsert(files, pageFile(redirect.from), redirectPage(redirect.to.replace(/\/+$/, "") || "/"));
  }
  const planned = allSeoGeoPlannedPages();
  const indexable = [
    ...SEO_GEO_PRODUCT_ROUTES,
    ...SEO_GEO_LEGAL_ROUTES,
    ...planned.map((page) => page.canonical),
  ];
  files = upsert(files, "app/sitemap.ts", sitemapSource(indexable));
  if (!files.some((item) => item.path.replace(/\\/g, "/") === "app/robots.ts")) {
    files = upsert(files, "app/robots.ts", robotsSource());
  }
  const schema: Record<string, unknown> = {};
  for (const page of planned) {
    schema[page.route] = buildPageSchema(page);
    schema[page.canonical] = buildPageSchema(page);
  }
  const existingSchema = files.find((item) => item.path.replace(/\\/g, "/") === "lib/site-schema.ts")?.content ?? "";
  const priorMatch = existingSchema.match(/export const SITE_SCHEMA[^=]*=\s*(\{[\s\S]*\});?\s*$/);
  let prior: Record<string, unknown> = {};
  try {
    prior = priorMatch ? (JSON.parse(priorMatch[1]) as Record<string, unknown>) : {};
  } catch {
    prior = {};
  }
  files = upsert(files, "lib/site-schema.ts", siteSchemaModule({ ...prior, ...schema }));
  const cssPath = files.find((item) => item.path.replace(/\\/g, "/").endsWith("globals.css"))?.path ?? "styles/globals.css";
  const css = files.find((item) => item.path === cssPath)?.content ?? "";
  files = upsert(files, cssPath, applyAuthorityVisualCss(css));
  const chrome = files.find((item) => item.path.replace(/\\/g, "/") === "components/site-chrome.tsx");
  if (chrome && !chrome.content.includes("/lease-comparison")) {
    files = upsert(
      files,
      chrome.path,
      chrome.content.replace(
        `{ href: "/resources", label: "Resources" }`,
        `{ href: "/resources", label: "Resources" },\n  { href: "/lease-comparison", label: "Compare" }`,
      ),
    );
  }
  const footer = files.find((item) => item.path.replace(/\\/g, "/").includes("venture-footer"));
  if (footer && !footer.content.includes("vg-legal-footer-inner")) {
    files = upsert(
      files,
      footer.path,
      footer.content.replace(`className="vg-container"`, `className="vg-container vg-legal-footer-inner"`),
    );
  }
  return {
    files,
    publishability: evaluatePublicAuthorityPublishability(files),
  };
}
