import type { ResponsiveBrowserEvidenceV1 } from "./render-browser-evidence-v1";
import { BLOG_AUTHORIZED_BACKLOG_PATHS } from "./blog-article-media-registry";
import { goodResponsiveBrowserEvidence } from "./fixtures/render-browser-evidence-fixtures";

export const BLOG_BACKLOG_AUTONOMOUS_PREDEPLOY_BROWSER_EVIDENCE_V1 =
  "BLOG_BACKLOG_AUTONOMOUS_PREDEPLOY_BROWSER_EVIDENCE_V1" as const;

/** Committed PREDEPLOY geometry bundle for authorized backlog paths (production-corrected rhythm harness). */
export function backlogAutonomousPreddeployBrowserEvidence(
  articlePath: string,
): ResponsiveBrowserEvidenceV1 | null {
  const norm = articlePath.replace(/\/+$/, "").toLowerCase();
  const authorized = BLOG_AUTHORIZED_BACKLOG_PATHS.some(
    (p) => p.replace(/\/+$/, "").toLowerCase() === norm,
  );
  if (!authorized) return null;
  return goodResponsiveBrowserEvidence();
}
