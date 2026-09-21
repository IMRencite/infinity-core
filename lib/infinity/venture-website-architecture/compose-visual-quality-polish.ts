import { applyVisualQualityPolishCss } from "./visual-quality-polish-css";
import { evaluateVisibleFooterGutter } from "./visual-quality-gates";

export type ArtifactFile = { path: string; content: string; encoding?: "utf8" | "base64" };

function upsert(files: ArtifactFile[], path: string, content: string, encoding?: "utf8" | "base64"): ArtifactFile[] {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push(encoding ? { path, content, encoding } : { path, content });
  return next;
}

export function composeVisualQualityPolishFiles(input: { files: ArtifactFile[] }): {
  files: ArtifactFile[];
  footer: ReturnType<typeof evaluateVisibleFooterGutter>;
} {
  let files = input.files.map((item) => ({ ...item }));
  const cssPath = files.find((item) => item.path.replace(/\\/g, "/").endsWith("globals.css"))?.path ?? "styles/globals.css";
  files = upsert(files, cssPath, applyVisualQualityPolishCss(files.find((item) => item.path === cssPath)?.content ?? ""));
  const home = files.find((item) => item.path.replace(/\\/g, "/") === "app/page.tsx");
  if (home && !home.content.includes("pv-hero-photo--compact")) {
    files = upsert(
      files,
      home.path,
      home.content.replace(/className="([^"]*pv-hero[^"]*)"/, `className="$1 pv-hero-photo--compact"`),
    );
  }
  const css = files.find((item) => item.path === cssPath)?.content ?? "";
  return { files, footer: evaluateVisibleFooterGutter(css) };
}
