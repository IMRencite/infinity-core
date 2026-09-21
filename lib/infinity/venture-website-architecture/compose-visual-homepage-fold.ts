import { applyVisualHomepageFoldCss } from "./visual-homepage-fold-css";
import { evaluateVisibleFooterGutter } from "./visual-quality-gates";

export type ArtifactFile = { path: string; content: string; encoding?: "utf8" | "base64" };

function upsert(files: ArtifactFile[], path: string, content: string, encoding?: "utf8" | "base64"): ArtifactFile[] {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push(encoding ? { path, content, encoding } : { path, content });
  return next;
}

function containHeroPhoto(source: string): string {
  return source.replace(/className="([^"]*pv-hero[^"]*)"/, (_match, classes: string) => {
    const next = new Set(classes.split(/\s+/).filter(Boolean));
    next.add("pv-hero-photo");
    next.add("pv-hero-photo--compact");
    return `className="${[...next].join(" ")}"`;
  });
}

function addHeroActions(source: string): string {
  if (source.includes("pv-hero-actions-row")) return source;
  const actions = `<div className="pv-hero-actions-row"><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA><a className="pv-hero-secondary" href="/lease-comparison">Compare two leases</a><a className="pv-hero-secondary" href="/how-it-works">See the workflow</a></div>`;
  return source
    .replace(
      `<span className="pv-cta-panel"><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></span>`,
      actions,
    )
    .replace(`<p><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></p>`, actions);
}

function wrapCommercialClose(source: string): string {
  if (source.includes("pv-close-well")) return source;
  return source.replace(
    /(<h2>Who is this not for<\/h2>\s*<p>who is this not for:[\s\S]*?<section className="pv-section pv-cta-band"[\s\S]*?<\/section>)/,
    `<div className="vg-container pv-close-well">$1</div>`,
  );
}

export function composeVisualHomepageFoldFiles(input: { files: ArtifactFile[] }): {
  files: ArtifactFile[];
  footer: ReturnType<typeof evaluateVisibleFooterGutter>;
} {
  let files = input.files.map((item) => ({ ...item }));
  const cssPath = files.find((item) => item.path.replace(/\\/g, "/").endsWith("globals.css"))?.path ?? "styles/globals.css";
  files = upsert(files, cssPath, applyVisualHomepageFoldCss(files.find((item) => item.path === cssPath)?.content ?? ""));
  for (const file of [...files]) {
    const path = file.path.replace(/\\/g, "/");
    if (!path.endsWith("page.tsx") || file.encoding === "base64") continue;
    let next = wrapCommercialClose(file.content);
    if (path === "app/page.tsx") {
      next = addHeroActions(containHeroPhoto(next));
    }
    if (next !== file.content) files = upsert(files, file.path, next);
  }
  const css = files.find((item) => item.path === cssPath)?.content ?? "";
  return { files, footer: evaluateVisibleFooterGutter(css) };
}
