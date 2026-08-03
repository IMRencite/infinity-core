import type { PersistedBuild } from "@/lib/infinity/build-factory/types";
import type { WorkspaceAdapter } from "@/lib/infinity/build-factory/types";
import { PROHIBITED_WORKSPACE_SEGMENTS } from "@/lib/infinity/build-factory/constants";
import { parseWebsiteExtension } from "./specifications";
import { CONTENT_MARKERS, INTERNAL_CANONICAL_ORIGIN, PROHIBITED_FAKE_PATTERNS } from "./constants";
import type { WebsiteBuildState } from "./types";
import {
  loadWebsiteBuildState,
  markStepCompleted,
  stepCompleted,
} from "./state";

export type ValidationOutcome = {
  valid: boolean;
  issues: string[];
};

export async function validateWebsiteStructure(
  build: PersistedBuild,
  workspace: WorkspaceAdapter,
  state: WebsiteBuildState,
): Promise<ValidationOutcome> {
  const issues: string[] = [];
  const website = parseWebsiteExtension(build.specification);
  if (!website) {
    return { valid: false, issues: ["Missing website specification extension"] };
  }

  const files = await workspace.listWorkspaceFiles();
  const paths = new Set(files.map((f) => f.path));

  for (const seg of PROHIBITED_WORKSPACE_SEGMENTS) {
    if ([...paths].some((p) => p.includes(seg))) {
      issues.push(`Prohibited path segment: ${seg}`);
    }
  }

  if (!paths.has("site-structure.json")) {
    issues.push("site-structure.json missing");
  }
  if (!paths.has("metadata-manifest.json")) {
    issues.push("metadata-manifest.json missing");
  }
  if (!paths.has("sitemap.xml")) {
    issues.push("sitemap.xml missing");
  }
  if (!paths.has("robots.txt")) {
    issues.push("robots.txt missing");
  }

  if (website.framework === "nextjs") {
    if (!paths.has("app/layout.tsx") || !paths.has("app/page.tsx")) {
      issues.push("Next.js app routes missing");
    }
  } else if (!paths.has("index.html") && !paths.has("src/index.html")) {
    issues.push("index.html missing for static site");
  }

  for (const route of state.routeManifest) {
    if (website.framework === "nextjs") {
      if (route.slug && !paths.has(`app/${route.slug}/page.tsx`)) {
        issues.push(`Next route missing: app/${route.slug}/page.tsx`);
      }
      if (!route.slug && !paths.has("app/page.tsx")) {
        issues.push("Next home route missing");
      }
    } else if (route.pageType === "home") {
      if (!paths.has("index.html")) {
        issues.push("index.html missing for home route");
      }
    } else if (route.slug && !paths.has(`${route.slug}.html`)) {
      issues.push(`Static page missing: ${route.slug}.html`);
    }
  }

  for (const file of files) {
    if (file.path.endsWith(".json")) {
      try {
        JSON.parse(await workspace.readTextFile(file.path));
      } catch {
        issues.push(`Invalid JSON: ${file.path}`);
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

export async function validateWebsiteAccessibility(
  workspace: WorkspaceAdapter,
  state: WebsiteBuildState,
): Promise<ValidationOutcome> {
  const issues: string[] = [];
  const htmlFiles = state.fileManifest
    .map((f) => f.path)
    .filter(
      (p) =>
        (p.endsWith(".html") && !p.startsWith("components/")) ||
        p === "index.html",
    );

  for (const path of htmlFiles) {
    let html: string;
    try {
      html = await workspace.readTextFile(path);
    } catch {
      continue;
    }
    if (!/<html[^>]*lang=/i.test(html)) {
      issues.push(`${path}: missing document language`);
    }
    const h1Count = (html.match(/<h1\b/gi) ?? []).length;
    if (h1Count !== 1) {
      issues.push(`${path}: expected one primary h1, found ${h1Count}`);
    }
    if (/<input\b(?![^>]*\bid=)/i.test(html) && !/<label\b/i.test(html)) {
      issues.push(`${path}: form control missing label`);
    }
    if (/<button\b[^>]*>\s*<\/button>/i.test(html)) {
      issues.push(`${path}: empty button`);
    }
  }

  return {
    valid: issues.length === 0,
    issues: issues.length ? issues : [],
    ...(issues.length === 0 ? {} : {}),
  };
}

export async function validateWebsiteSeo(
  workspace: WorkspaceAdapter,
  state: WebsiteBuildState,
): Promise<ValidationOutcome> {
  const issues: string[] = [];
  const titles = new Set<string>();

  for (const path of state.fileManifest.map((f) => f.path).filter((p) => p.endsWith(".html"))) {
    const html = await workspace.readTextFile(path).catch(() => "");
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    if (titleMatch) {
      const t = titleMatch[1]!.trim();
      if (titles.has(t)) {
        issues.push(`Duplicate title: ${t}`);
      }
      titles.add(t);
    }
  }

  const robots = await workspace.readTextFile("robots.txt").catch(() => "");
  if (!robots.includes(INTERNAL_CANONICAL_ORIGIN) && !robots.includes("example.invalid")) {
    issues.push("robots.txt should reference internal origin placeholder");
  }

  for (const url of state.sitemapManifest.urls ?? []) {
    if (!url.startsWith(INTERNAL_CANONICAL_ORIGIN)) {
      issues.push(`Sitemap URL outside internal origin: ${url}`);
    }
  }

  return { valid: issues.length === 0, issues };
}

export async function validateWebsiteSecurity(
  workspace: WorkspaceAdapter,
): Promise<ValidationOutcome> {
  const issues: string[] = [];
  const files = await workspace.listWorkspaceFiles();

  for (const file of files) {
    const content = await workspace.readTextFile(file.path).catch(() => "");
    if (/\beval\s*\(/i.test(content)) {
      issues.push(`${file.path}: eval detected`);
    }
    if (/<script[^>]+src=["']https?:\/\//i.test(content)) {
      issues.push(`${file.path}: external script URL`);
    }
    if (/<form[^>]+action=["']https?:\/\//i.test(content)) {
      issues.push(`${file.path}: external form target`);
    }
    if (/sk-[a-zA-Z0-9]{20,}/.test(content)) {
      issues.push(`${file.path}: possible secret`);
    }
    if (/postinstall/i.test(content) && file.path.endsWith("package.json")) {
      issues.push("package.json postinstall hook");
    }
  }

  return { valid: issues.length === 0, issues };
}

export async function runWebsiteValidationCapability(
  capabilityKey: string,
  build: PersistedBuild,
  workspace: WorkspaceAdapter,
): Promise<{ outcome: ValidationOutcome; state: WebsiteBuildState; skipped: boolean }> {
  let state = await loadWebsiteBuildState(workspace);
  if (stepCompleted(state, capabilityKey)) {
    const prev = state.validationReports[capabilityKey];
    return {
      skipped: true,
      state,
      outcome: { valid: prev?.valid ?? true, issues: prev?.issues ?? [] },
    };
  }

  let outcome: ValidationOutcome;
  switch (capabilityKey) {
    case "website.validate_structure":
      outcome = await validateWebsiteStructure(build, workspace, state);
      break;
    case "website.validate_accessibility":
      outcome = await validateWebsiteAccessibility(workspace, state);
      break;
    case "website.validate_seo":
      outcome = await validateWebsiteSeo(workspace, state);
      break;
    case "website.validate_security":
      outcome = await validateWebsiteSecurity(workspace);
      break;
    default:
      throw new Error(`Unknown validation capability ${capabilityKey}`);
  }

  state.validationReports[capabilityKey] = { valid: outcome.valid, issues: outcome.issues };
  state = await markStepCompleted(workspace, state, capabilityKey);

  return { outcome, state, skipped: false };
}

export function scanContentHonesty(text: string): string[] {
  const issues: string[] = [];
  for (const pattern of PROHIBITED_FAKE_PATTERNS) {
    if (pattern.test(text)) {
      issues.push(`Prohibited claim pattern: ${pattern.source}`);
    }
  }
  if (!text.includes(CONTENT_MARKERS.contentRequired) && text.includes("Our clients love us")) {
    issues.push("Possible fake testimonial without marker");
  }
  return issues;
}
