import "server-only";

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { SERVED_PRODUCTION_RENDERED_LAYOUT_GATE } from "./constants";
import { auditRenderedLayoutQuality } from "./geometry";

const DEFAULT_SERVED_ROUTES = [
  "/",
  "/how-it-works",
  "/compare-commercial-leases",
  "/commercial-lease-npv",
  "/tenant-improvement-allowance",
  "/discount-rate-sensitivity",
  "/resources",
  "/resources/cam-costs/",
  "/resources/free-rent/",
  "/resources/rent-escalations/",
  "/resources/gross-vs-net-lease/",
  "/for/tenant-rep-brokers/",
  "/pricing",
  "/faq",
  "/early-access",
  "/privacy-policy",
  "/terms-of-service",
] as const;

export async function inspectIsolatedCompiledCss(isolatedRoot: string): Promise<{
  css: string;
  files: string[];
  staticFullBleedInnerPadding: "PASS" | "FAIL";
  failReasons: string[];
}> {
  const cssDir = path.join(isolatedRoot, ".next", "static", "css");
  const names = (await readdir(cssDir).catch(() => [])).filter((name) => name.endsWith(".css"));
  let css = "";
  for (const name of names) {
    css += `\n${await readFile(path.join(cssDir, name), "utf8")}`;
  }
  const staticAudit = auditRenderedLayoutQuality({
    css,
    pages: [{ route: "/", html: `<section class="pv-hero"><div class="pv-container">inner</div></section>` }],
    footerHtml:
      `<footer class="vg-legal-footer"><div class="vg-legal-footer-inner">Privacy Policy Terms of Service Sitemap An Infinity OS Venture By IMR</div></footer>`,
  });
  return {
    css,
    files: names,
    staticFullBleedInnerPadding: staticAudit.fullBleedInnerPadding,
    failReasons: staticAudit.failReasons,
  };
}

function digestOfAuthorityFiles(files: Array<{ path: string; content: string }>): string {
  const manifest = files
    .map((file) => `${file.path}:${createHash("sha256").update(file.content).digest("hex")}`)
    .sort()
    .join("|");
  return createHash("sha256").update(manifest).digest("hex");
}
import {
  auditServedProductionInBrowser,
  evaluateServedPageGeometry,
  servedProductionEvidenceIsInsufficient,
  type FullBleedGeometrySample,
  type ServedPageGeometry,
  type ServedProductionBrowserAudit,
  type ViewportName,
} from "./served-production-browser";
import { startIsolatedArtifactProductionServer } from "./served-production-server";
import type { LayoutGate } from "./types";

export type ServedProductionRenderedLayoutRecord = {
  gate: typeof SERVED_PRODUCTION_RENDERED_LAYOUT_GATE;
  global: true;
  creOnly: false;
  required: true;
  requiredBeforeDeployment: true;
  productionServerRequired: true;
  realBrowserRequired: true;
  computedGeometryRequired: true;
  sourceOnlyInsufficient: true;
  classPresenceInsufficient: true;
  artifactId: string;
  digest: string;
  coveredDigest: string;
  status: "PASS" | "FAIL";
  frozen: boolean;
  frozenAt: string | null;
  productionServer: "PASS" | "FAIL";
  realBrowser: "PASS" | "FAIL";
  routesChecked: number;
  routesFailed: number;
  bodyGutter: LayoutGate;
  fullBleedInnerPadding: LayoutGate;
  footerPadding: LayoutGate;
  headerPadding: LayoutGate;
  containerAlignment: LayoutGate;
  textMeasure: LayoutGate;
  verticalRhythm: LayoutGate;
  sectionComposition: LayoutGate;
  horizontalOverflow: number;
  mobile: LayoutGate;
  premiumComposition: LayoutGate;
  issues: string[];
  pages: ServedPageGeometry[];
  representativeFullBleed: {
    desktop: FullBleedGeometrySample | null;
    mobile: FullBleedGeometrySample | null;
  };
  origin: string | null;
};

let frozen: ServedProductionRenderedLayoutRecord | null = null;

export function resetServedProductionRenderedLayoutGate(): void {
  frozen = null;
}

export function getFrozenServedProductionRenderedLayoutGate(): ServedProductionRenderedLayoutRecord | null {
  return frozen;
}

function all(pages: ServedPageGeometry[], key: keyof Pick<ServedPageGeometry, "bodyGutter" | "fullBleedInnerPadding" | "footerPadding" | "headerPadding" | "containerAlignment" | "textMeasure" | "verticalRhythm" | "sectionComposition" | "mobile" | "premiumComposition">): LayoutGate {
  return pages.length > 0 && pages.every((page) => page[key] === "PASS") ? "PASS" : "FAIL";
}

export function evaluateServedProductionEvidenceContract(input: {
  realBrowser?: boolean;
  computedGeometry?: boolean;
  sourceCssOnly?: boolean;
  classPresenceOnly?: boolean;
}): { status: "PASS" | "FAIL"; reason: string } {
  if (servedProductionEvidenceIsInsufficient(input)) {
    return { status: "FAIL", reason: "COMPUTED_BROWSER_GEOMETRY_REQUIRED" };
  }
  return { status: "PASS", reason: "SERVED_PRODUCTION_EVIDENCE" };
}

export function servedProductionLayoutPasses(record: Pick<ServedProductionRenderedLayoutRecord, "status" | "fullBleedInnerPadding" | "premiumComposition" | "horizontalOverflow" | "routesFailed" | "realBrowser" | "productionServer">): boolean {
  return (
    record.status === "PASS" &&
    record.fullBleedInnerPadding === "PASS" &&
    record.premiumComposition === "PASS" &&
    record.horizontalOverflow === 0 &&
    record.routesFailed === 0 &&
    record.realBrowser === "PASS" &&
    record.productionServer === "PASS"
  );
}

export function invalidateServedProductionEligibilityIfMutated(files: Array<{ path: string; content: string }>): {
  status: "PASS" | "FAIL";
  reason: string | null;
} {
  if (!frozen) return { status: "FAIL", reason: "SERVED_PRODUCTION_RENDERED_LAYOUT_GATE_REQUIRED" };
  if (frozen.coveredDigest !== digestOfAuthorityFiles(files)) {
    frozen = {
      ...frozen,
      frozen: false,
      status: "FAIL",
      issues: [...frozen.issues, "POST_PREFLIGHT_MUTATION_INVALIDATES_ELIGIBILITY"],
    };
    return { status: "FAIL", reason: "POST_PREFLIGHT_MUTATION_INVALIDATES_ELIGIBILITY" };
  }
  return { status: frozen.status, reason: null };
}

export function recordServedProductionFromBrowserAudit(input: {
  artifactId: string;
  files: Array<{ path: string; content: string }>;
  audit: ServedProductionBrowserAudit;
  productionServer: "PASS" | "FAIL";
  origin?: string | null;
  freeze?: boolean;
}): ServedProductionRenderedLayoutRecord {
  const digest = digestOfAuthorityFiles(input.files);
  const evidence = evaluateServedProductionEvidenceContract({
    realBrowser: input.audit.realBrowser,
    computedGeometry: input.audit.computedGeometry,
  });
  const failedRoutes = new Set(
    input.audit.pages.filter((page) => page.failReasons.length > 0).map((page) => page.route),
  );
  const overflow = input.audit.pages.reduce((sum, page) => sum + page.horizontalOverflow, 0);
  const issues: string[] = [];
  if (evidence.status !== "PASS") issues.push(evidence.reason);
  if (input.productionServer !== "PASS") issues.push("PRODUCTION_SERVER_REQUIRED");
  if (failedRoutes.size) issues.push("SERVED_PRODUCTION_LAYOUT_FAILED");
  if (overflow > 0) issues.push("HORIZONTAL_OVERFLOW");
  const desktop = input.audit.pages.find((page) => page.viewportName === "desktop" && page.fullBleed[0])?.fullBleed[0] ?? null;
  const mobile = input.audit.pages.find((page) => page.viewportName === "mobile" && page.fullBleed[0])?.fullBleed[0] ?? null;
  const record: ServedProductionRenderedLayoutRecord = {
    gate: SERVED_PRODUCTION_RENDERED_LAYOUT_GATE,
    global: true,
    creOnly: false,
    required: true,
    requiredBeforeDeployment: true,
    productionServerRequired: true,
    realBrowserRequired: true,
    computedGeometryRequired: true,
    sourceOnlyInsufficient: true,
    classPresenceInsufficient: true,
    artifactId: input.artifactId,
    digest,
    coveredDigest: digest,
    status: issues.length === 0 ? "PASS" : "FAIL",
    frozen: false,
    frozenAt: null,
    productionServer: input.productionServer,
    realBrowser: input.audit.realBrowser ? "PASS" : "FAIL",
    routesChecked: new Set(input.audit.pages.map((page) => page.route)).size,
    routesFailed: failedRoutes.size,
    bodyGutter: all(input.audit.pages, "bodyGutter"),
    fullBleedInnerPadding: all(input.audit.pages, "fullBleedInnerPadding"),
    footerPadding: all(input.audit.pages, "footerPadding"),
    headerPadding: all(input.audit.pages, "headerPadding"),
    containerAlignment: all(input.audit.pages, "containerAlignment"),
    textMeasure: all(input.audit.pages, "textMeasure"),
    verticalRhythm: all(input.audit.pages, "verticalRhythm"),
    sectionComposition: all(input.audit.pages, "sectionComposition"),
    horizontalOverflow: overflow,
    mobile: all(input.audit.pages, "mobile"),
    premiumComposition: all(input.audit.pages, "premiumComposition"),
    issues,
    pages: input.audit.pages,
    representativeFullBleed: { desktop, mobile },
    origin: input.origin ?? null,
  };
  if (record.status === "PASS" && input.freeze !== false) {
    record.frozen = true;
    record.frozenAt = new Date().toISOString();
    frozen = record;
  } else {
    frozen = record;
  }
  return record;
}

export async function runServedProductionRenderedLayoutGateAgainstOrigin(input: {
  artifactId: string;
  digest: string;
  origin: string;
  files?: Array<{ path: string; content: string }>;
  routes?: readonly string[];
  viewports?: ViewportName[];
  freeze?: boolean;
  browserFactory?: Parameters<typeof auditServedProductionInBrowser>[0]["browserFactory"];
}): Promise<ServedProductionRenderedLayoutRecord> {
  const routes = input.routes ?? DEFAULT_SERVED_ROUTES;
  const files = input.files ?? [{ path: "artifact-manifest.json", content: JSON.stringify({ artifactId: input.artifactId, digest: input.digest }) }];
  const audit = await auditServedProductionInBrowser({
    origin: input.origin,
    routes,
    viewports: input.viewports,
    browserFactory: input.browserFactory,
  });
  const record = recordServedProductionFromBrowserAudit({
    artifactId: input.artifactId,
    files,
    audit,
    productionServer: /^https:\/\//.test(input.origin) ? "PASS" : "FAIL",
    origin: input.origin,
    freeze: input.freeze,
  });
  record.digest = input.digest;
  record.coveredDigest = input.digest;
  return record;
}

export async function runServedProductionRenderedLayoutGate(input: {
  artifactId: string;
  files: Array<{ path: string; content: string }>;
  isolatedRoot: string;
  routes?: readonly string[];
  viewports?: ViewportName[];
  freeze?: boolean;
  browserFactory?: Parameters<typeof auditServedProductionInBrowser>[0]["browserFactory"];
}): Promise<ServedProductionRenderedLayoutRecord> {
  const routes = input.routes ?? DEFAULT_SERVED_ROUTES;
  const server = await startIsolatedArtifactProductionServer({ isolatedRoot: input.isolatedRoot });
  try {
    const audit = await auditServedProductionInBrowser({
      origin: server.origin,
      routes,
      viewports: input.viewports,
      browserFactory: input.browserFactory,
    });
    return recordServedProductionFromBrowserAudit({
      artifactId: input.artifactId,
      files: input.files,
      audit,
      productionServer: "PASS",
      origin: server.origin,
      freeze: input.freeze,
    });
  } finally {
    await server.stop();
  }
}

export function evaluateServedProductionDeploymentEligibility(input: {
  artifactId: string;
  digest: string;
  files: Array<{ path: string; content: string }>;
}): {
  status: "PASS" | "FAIL";
  frozen: boolean;
  gate: "PASS" | "FAIL";
  issues: string[];
} {
  const issues: string[] = [];
  if (!frozen || frozen.artifactId !== input.artifactId || frozen.digest !== input.digest) {
    issues.push("SERVED_PRODUCTION_RENDERED_LAYOUT_GATE_REQUIRED");
  }
  if (frozen && !frozen.frozen) issues.push("SERVED_PRODUCTION_BUNDLE_NOT_FROZEN");
  if (frozen && frozen.status !== "PASS") issues.push("SERVED_PRODUCTION_RENDERED_LAYOUT_GATE_FAILED");
  if (frozen && frozen.coveredDigest !== digestOfAuthorityFiles(input.files)) {
    issues.push("POST_PREFLIGHT_MUTATION_INVALIDATES_ELIGIBILITY");
  }
  return {
    status: issues.length === 0 ? "PASS" : "FAIL",
    frozen: Boolean(frozen?.frozen),
    gate: frozen?.status === "PASS" ? "PASS" : "FAIL",
    issues,
  };
}

void evaluateServedPageGeometry;
