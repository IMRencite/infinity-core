import type { PersistedBuild } from "@/lib/infinity/build-factory/types";
import type { WorkspaceAdapter } from "@/lib/infinity/build-factory/types";
import { parseWebsiteExtension } from "./specifications";
import { buildFoundationDesignSystem, designSystemToCss } from "./design-system";
import {
  CONTENT_MARKERS,
  INTERNAL_CANONICAL_ORIGIN,
  WEBSITE_INTERNAL_SOURCE_LABEL,
} from "./constants";
import type { RouteManifestEntry, WebsiteBuildState, WebsitePageDefinition } from "./types";
import {
  loadWebsiteBuildState,
  markStepCompleted,
  refreshFileManifest,
  stepCompleted,
} from "./state";

function routePath(slug: string): string {
  return slug ? `/${slug}` : "/";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pageHtml(page: WebsitePageDefinition, siteName: string, nav: string): string {
  const h1 = escapeHtml(page.title);
  const desc = escapeHtml(page.description);
  const path = routePath(page.slug);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${h1} | ${escapeHtml(siteName)}</title>
  <meta name="description" content="${desc}"/>
  <link rel="stylesheet" href="/styles.css"/>
</head>
<body>
  <header><strong>${escapeHtml(siteName)}</strong>${nav}</header>
  <main>
    <h1>${h1}</h1>
    <p class="placeholder">${desc}</p>
    <section aria-label="Content section"><p>${CONTENT_MARKERS.contentRequired}</p></section>
  </main>
  <footer><p>${WEBSITE_INTERNAL_SOURCE_LABEL}</p><p><a href="${path}">Canonical path ${path}</a></p></footer>
</body>
</html>
`;
}

function navHtml(pages: WebsitePageDefinition[]): string {
  const items = pages
    .slice(0, 8)
    .map((p) => {
      const href = p.slug ? `/${p.slug}.html` : "index.html";
      return `<li><a href="${href}">${escapeHtml(p.title)}</a></li>`;
    })
    .join("");
  return `<nav aria-label="Primary"><ul>${items}</ul></nav>`;
}

export type WebsiteStepResult = {
  skipped: boolean;
  state: WebsiteBuildState;
  structuredOutput: Record<string, unknown>;
};

export async function runWebsiteCapability(
  capabilityKey: string,
  build: PersistedBuild,
  workspace: WorkspaceAdapter,
): Promise<WebsiteStepResult> {
  const website = parseWebsiteExtension(build.specification);
  if (!website) {
    throw new Error("Website extension missing on build specification");
  }

  let state = await loadWebsiteBuildState(workspace);
  if (stepCompleted(state, capabilityKey)) {
    return {
      skipped: true,
      state,
      structuredOutput: { skipped: true, capability_key: capabilityKey },
    };
  }

  const ds = buildFoundationDesignSystem(build.specificationHash);
  const routes: RouteManifestEntry[] = website.pageDefinitions.map((p) => ({
    slug: p.slug,
    path: routePath(p.slug),
    pageType: p.pageType,
    title: p.title,
  }));

  switch (capabilityKey) {
    case "website.generate_structure": {
      await workspace.createDirectory("src");
      await workspace.createDirectory("components");
      await workspace.writeTextFile(
        "site-structure.json",
        `${JSON.stringify({ framework: website.framework, routes, label: WEBSITE_INTERNAL_SOURCE_LABEL }, null, 2)}\n`,
      );
      state.routeManifest = routes;
      break;
    }
    case "website.generate_components": {
      const components = website.componentDefinitions.map((name) => ({
        name,
        path: `components/${name}.html`,
      }));
      for (const c of components) {
        await workspace.writeTextFile(
          c.path,
          `<!-- ${c.name} — ${WEBSITE_INTERNAL_SOURCE_LABEL} -->\n<section data-component="${c.name}" class="placeholder">${CONTENT_MARKERS.contentRequired}</section>\n`,
        );
      }
      if (website.framework === "nextjs") {
        await workspace.createDirectory("app");
        await workspace.writeTextFile(
          "components/Header.tsx",
          `export function Header() { return <header><p>${WEBSITE_INTERNAL_SOURCE_LABEL}</p></header>; }\n`,
        );
      }
      state.componentManifest = components;
      break;
    }
    case "website.generate_pages": {
      const nav = navHtml(website.pageDefinitions);
      if (website.framework === "nextjs") {
        await workspace.writeTextFile(
          "app/layout.tsx",
          `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}\n`,
        );
        await workspace.writeTextFile(
          "app/page.tsx",
          `export default function HomePage() {
  return (
    <main>
      <h1>${escapeHtml(website.siteName)}</h1>
      <p className="placeholder">${CONTENT_MARKERS.contentRequired}</p>
    </main>
  );
}\n`,
        );
        for (const page of website.pageDefinitions.filter((p) => p.slug)) {
          await workspace.createDirectory(`app/${page.slug}`);
          await workspace.writeTextFile(
            `app/${page.slug}/page.tsx`,
            `export default function Page() {
  return <main><h1>${escapeHtml(page.title)}</h1><p>${CONTENT_MARKERS.contentRequired}</p></main>;
}\n`,
          );
        }
        if (website.projectType === "lead_generation_site") {
          await workspace.writeTextFile(
            "components/ContactFormPlaceholder.tsx",
            `export function ContactFormPlaceholder() {
  return (
    <form action="#" onSubmit={(e) => e.preventDefault()} aria-disabled="true">
      <p>${CONTENT_MARKERS.formNotConfigured}</p>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" disabled readOnly placeholder="${CONTENT_MARKERS.contactRequired}" />
      <button type="submit" disabled>${CONTENT_MARKERS.formNotConfigured}</button>
    </form>
  );
}\n`,
          );
        }
        await workspace.writeTextFile(
          "package.json",
          JSON.stringify(
            {
              name: build.specification.slug,
              private: true,
              scripts: { build: "echo internal-only-no-install" },
            },
            null,
            2,
          ) + "\n",
        );
        await workspace.writeTextFile(
          "tsconfig.json",
          JSON.stringify({ compilerOptions: { jsx: "preserve", strict: true } }, null, 2) + "\n",
        );
        await workspace.writeTextFile("next.config.ts", "export default { output: 'export' };\n");
        await workspace.writeTextFile(
          "app/robots.ts",
          `export default function robots() { return { rules: { userAgent: '*', allow: '/' } }; }\n`,
        );
        await workspace.writeTextFile(
          "app/sitemap.ts",
          `export default function sitemap() { return ${JSON.stringify(
            routes.map((r) => ({ url: `${INTERNAL_CANONICAL_ORIGIN}${r.path}` })),
          )}; }\n`,
        );
      } else {
        await workspace.writeTextFile(
          "index.html",
          pageHtml(
            website.pageDefinitions.find((p) => p.pageType === "home") ?? website.pageDefinitions[0]!,
            website.siteName,
            nav,
          ),
        );
        for (const page of website.pageDefinitions.filter((p) => p.slug)) {
          const file = `${page.slug}.html`;
          await workspace.writeTextFile(file, pageHtml(page, website.siteName, nav));
        }
        if (website.projectType === "lead_generation_site") {
          const contact = website.pageDefinitions.find((p) => p.pageType === "contact");
          if (contact) {
            const form = `\n<form action="#" aria-disabled="true"><p>${CONTENT_MARKERS.formNotConfigured}</p><label for="email">Email</label><input id="email" name="email" type="email" disabled /></form>`;
            await workspace.writeTextFile(
              "contact.html",
              pageHtml({ ...contact, sections: [...contact.sections, "form"] }, website.siteName, nav).replace(
                "</main>",
                `${form}</main>`,
              ),
            );
          }
        }
      }
      break;
    }
    case "website.generate_styles": {
      const css = designSystemToCss(ds);
      if (website.framework === "nextjs") {
        await workspace.writeTextFile("app/globals.css", css);
      } else {
        await workspace.writeTextFile("styles.css", css);
        await workspace.writeTextFile("src/styles.css", css);
      }
      break;
    }
    case "website.generate_metadata": {
      state.metadataManifest = {
        origin: INTERNAL_CANONICAL_ORIGIN,
        pages: routes.map((r) => ({
          path: r.path,
          title: r.title,
          description: CONTENT_MARKERS.contentRequired,
        })),
        openGraphPlaceholder: true,
      };
      await workspace.writeTextFile(
        "metadata-manifest.json",
        `${JSON.stringify(state.metadataManifest, null, 2)}\n`,
      );
      break;
    }
    case "website.generate_sitemap": {
      const urls = routes.map((r) => `${INTERNAL_CANONICAL_ORIGIN}${r.path}`);
      state.sitemapManifest = { urls };
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>\n`;
      await workspace.writeTextFile("sitemap.xml", xml);
      break;
    }
    case "website.generate_robots": {
      await workspace.writeTextFile(
        "robots.txt",
        `User-agent: *\nAllow: /\nSitemap: ${INTERNAL_CANONICAL_ORIGIN}/sitemap.xml\n# ${WEBSITE_INTERNAL_SOURCE_LABEL}\n`,
      );
      break;
    }
    default:
      throw new Error(`runWebsiteCapability does not handle ${capabilityKey}`);
  }

  state = await markStepCompleted(workspace, state, capabilityKey);
  state = await refreshFileManifest(workspace, state);

  return {
    skipped: false,
    state,
    structuredOutput: {
      capability_key: capabilityKey,
      route_count: state.routeManifest.length,
      component_count: state.componentManifest.length,
      file_count: state.fileManifest.length,
    },
  };
}

export async function runWebsitePackage(
  build: PersistedBuild,
  workspace: WorkspaceAdapter,
): Promise<WebsiteStepResult> {
  const capabilityKey = "website.package_internal_source";
  let state = await loadWebsiteBuildState(workspace);
  if (stepCompleted(state, capabilityKey)) {
    return { skipped: true, state, structuredOutput: { skipped: true } };
  }

  const website = parseWebsiteExtension(build.specification)!;
  const pkg = {
    label: "Internal website source package — not deployed.",
    buildId: build.id,
    snapshotId: build.currentSnapshotId,
    framework: website.framework,
    projectType: website.projectType,
    files: state.fileManifest,
    totalFiles: state.fileManifest.length,
    totalBytes: state.fileManifest.reduce((a, f) => a + f.bytes, 0),
    validationStatuses: state.validationReports,
    qaStatus: "pending",
    reproducibilityStatus: "pending",
  };
  await workspace.writeTextFile("internal-website-package.json", `${JSON.stringify(pkg, null, 2)}\n`);
  state.packageArtifactPath = "internal-website-package.json";
  state = await markStepCompleted(workspace, state, capabilityKey);
  state = await refreshFileManifest(workspace, state);

  return {
    skipped: false,
    state,
    structuredOutput: {
      package_path: state.packageArtifactPath,
      file_count: state.fileManifest.length,
      total_bytes: pkg.totalBytes,
    },
  };
}
