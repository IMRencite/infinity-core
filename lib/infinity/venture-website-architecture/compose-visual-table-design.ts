import { applyVisualTableDesignCss } from "./visual-table-design-css";
import { evaluateRenderedTableQuality, evaluateVisibleFooterGutter } from "./visual-quality-gates";
import { pageContent } from "./answer-authority/page-inspect";
import { SEO_GEO_QUESTION_PAGES } from "./digital-real-estate-catalog";

export type ArtifactFile = { path: string; content: string; encoding?: "utf8" | "base64" };

function upsert(files: ArtifactFile[], path: string, content: string, encoding?: "utf8" | "base64"): ArtifactFile[] {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push(encoding ? { path, content, encoding } : { path, content });
  return next;
}

function designTableMarkup(source: string): string {
  let next = source;
  if (!next.includes("pv-table-designed")) {
    next = next.replace(/<div className="pv-data-panel"/g, `<div className="pv-data-panel pv-table-shell pv-table-designed"`);
  }
  next = next.replace(/<table className="pv-compare"/g, `<table className="pv-compare pv-fin-table"`);
  next = next.replace(
    /\$32,400 after free rent and TI/g,
    `$32,400<span className="pv-cell-note">after free rent and TI</span>`,
  );
  next = next.replace(
    /<div className="pv-data-panel pv-table-shell pv-table-designed" data-visualization="NPV_COMPARISON">/g,
    `<div className="pv-decision-takeaway" data-visualization="NPV_COMPARISON">`,
  );
  if (!next.includes("pv-worked-ledger") && next.includes("Lease A versus Lease B — worked example")) {
    next = next.replace(
      /(<h2>Lease A versus Lease B — worked example<\/h2>[\s\S]*?<div className="pv-bar"[\s\S]*?<\/div>)/,
      `<div className="pv-worked-ledger">$1</div>`,
    );
  }
  return next;
}

export function composeVisualTableDesignFiles(input: { files: ArtifactFile[] }): {
  files: ArtifactFile[];
  footer: ReturnType<typeof evaluateVisibleFooterGutter>;
  tables: ReturnType<typeof evaluateRenderedTableQuality>;
} {
  let files = input.files.map((item) => ({ ...item }));
  const cssPath = files.find((item) => item.path.replace(/\\/g, "/").endsWith("globals.css"))?.path ?? "styles/globals.css";
  files = upsert(files, cssPath, applyVisualTableDesignCss(files.find((item) => item.path === cssPath)?.content ?? ""));
  for (const file of [...files]) {
    const path = file.path.replace(/\\/g, "/");
    if (!path.endsWith("page.tsx") || file.encoding === "base64") continue;
    const designed = designTableMarkup(file.content);
    if (designed !== file.content) files = upsert(files, file.path, designed);
  }
  const css = files.find((item) => item.path === cssPath)?.content ?? "";
  const sample = pageContent(files, SEO_GEO_QUESTION_PAGES[0]?.route ?? "/commercial-lease-npv/what-is-npv-in-a-commercial-lease");
  return {
    files,
    footer: evaluateVisibleFooterGutter(css),
    tables: evaluateRenderedTableQuality(sample),
  };
}
