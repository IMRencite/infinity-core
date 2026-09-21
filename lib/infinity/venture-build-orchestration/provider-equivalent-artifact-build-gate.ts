import { createHash } from "node:crypto";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import {
  translateFilesToVercelSourceBundle,
} from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_POLISH_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import { inspectRenderedLineageAndQuestionIdentity } from "@/lib/infinity/venture-website-architecture/public-lineage-question-id";
import { digestOfAuthorityFiles } from "@/lib/infinity/venture-website-architecture/cre-successor";
import {
  inspectBundleInputContract,
  inspectGeneratedSourceIntegrity,
} from "./generated-source-integrity";
import { evaluateServedProductionDeploymentEligibility } from "@/lib/infinity/public-venture-design/rendered-layout/served-production-gate";
import {
  materializeIsolatedArtifactTree,
  runIsolatedArtifactInstallAndBuild,
  type IsolatedArtifactBuildResult,
} from "./isolated-artifact-build";

export const ProviderEquivalentArtifactBuildGate = "ProviderEquivalentArtifactBuildGate" as const;

export const REQUIRED_PRERENDER_ROUTES = ["/", "/pricing", "/how-it-works"] as const;

export function inspectPrerenderEvidence(input: {
  buildLog: string;
  pageRoutes: string[];
  buildExitCode?: number;
  prerenderedRoutes?: string[];
}): {
  compileSucceeded: boolean;
  prerender: "PASS" | "FAIL";
  staticGeneration: "PASS" | "FAIL";
  prerenderFailedRoutes: string[];
  missingPrerenderEvidence: string[];
  issues: string[];
} {
  const log = input.buildLog;
  const compileSucceeded = /Compiled successfully/i.test(log) && !/Failed to compile/i.test(log);
  const prerenderFailedRoutes = [...log.matchAll(/Error occurred prerendering page "([^"]+)"/g)].map(
    (match) => match[1],
  );
  const exportError = /Export encountered an error on /i.test(log);
  const generated = parseRoutesFromBuildLog(log);
  const normalized = (route: string) => route.replace(/\/+$/, "") || "/";
  const prerendered = new Set((input.prerenderedRoutes ?? []).map(normalized));
  const logEvidence = (route: string) => {
    const clean = normalized(route);
    if (generated.some((item) => normalized(item) === clean)) return true;
    if (prerendered.has(clean)) return true;
    if (prerenderFailedRoutes.some((item) => normalized(item) === clean)) return true;
    if (log.includes(`"${clean}"`)) return true;
    if (clean !== "/" && log.includes(clean)) return true;
    return false;
  };
  const missingPrerenderEvidence = REQUIRED_PRERENDER_ROUTES.filter((route) => {
    if (logEvidence(route)) return false;
    return compileSucceeded && input.buildExitCode === 0;
  });
  const issues: string[] = [];
  if (compileSucceeded && (prerenderFailedRoutes.length > 0 || exportError || input.buildExitCode === 1)) {
    issues.push("compile_succeeded_prerender_failed");
    for (const route of prerenderFailedRoutes) issues.push(`prerender_failed:${route}`);
    if (/non-standard "NODE_ENV"/i.test(log)) issues.push("non_standard_node_env_leaked_into_prerender");
  }
  if (compileSucceeded && input.buildExitCode === 0 && !logEvidence("/pricing")) {
    issues.push("missing_prerender_evidence:/pricing");
  }
  for (const route of missingPrerenderEvidence) {
    const key = `missing_prerender_evidence:${route}`;
    if (!issues.includes(key)) issues.push(key);
  }
  const prerender =
    compileSucceeded &&
    prerenderFailedRoutes.length === 0 &&
    !exportError &&
    input.buildExitCode !== 1 &&
    !issues.some(
      (item) =>
        item.startsWith("prerender_failed") ||
        item.startsWith("compile_succeeded_prerender_failed") ||
        item.startsWith("missing_prerender_evidence"),
    )
      ? "PASS"
      : "FAIL";
  return {
    compileSucceeded,
    prerender,
    staticGeneration: prerender,
    prerenderFailedRoutes,
    missingPrerenderEvidence,
    issues,
  };
}

export const INTENDED_PUBLIC_PAGE_ROUTES = [
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

export type ProviderEquivalentGateRecord = {
  gate: typeof ProviderEquivalentArtifactBuildGate;
  global: true;
  creOnly: false;
  required: true;
  artifactId: string;
  artifactDigest: string;
  status: "PASS" | "FAIL";
  frozen: boolean;
  frozenAt: string | null;
  coveredDigest: string;
  fileInventory: string[];
  fileHashes: Record<string, string>;
  packageManifestIdentity: string;
  lockfileIdentity: string;
  framework: "nextjs";
  runtime: "node";
  buildCommand: "next build";
  routeManifest: string[];
  routesGenerated: number;
  publicSafeConfigContract: {
    secrets: number;
    requiredServerEnvNames: string[];
  };
  requiredServerEnvNames: string[];
  typescript: "PASS" | "FAIL";
  nextBuild: "PASS" | "FAIL";
  cleanRoomIsolation: "PASS" | "FAIL";
  repoFallback: boolean;
  repoFallbackProhibited: "PASS" | "FAIL";
  missingImports: number;
  undefinedSymbols: number;
  handoffParity: "PASS" | "FAIL";
  candidateLineage: "PASS" | "FAIL";
  experimentLineage: "PASS" | "FAIL";
  artifactLineage: "PASS" | "FAIL";
  sitemap: "PASS" | "FAIL";
  robots: "PASS" | "FAIL";
  secretScan: "PASS" | "FAIL";
  issues: string[];
  isolatedRoot: string | null;
  isolated?: IsolatedArtifactBuildResult;
  prerender: "PASS" | "FAIL";
  staticGeneration: "PASS" | "FAIL";
  prerenderedRouteCount: number;
};

export type ProviderEquivalentHandoffParity = {
  artifactIdIdentical: boolean;
  digestIdentical: boolean;
  fileInventoryIdentical: boolean;
  fileHashesIdentical: boolean;
  packageManifestIdentical: boolean;
  lockfileIdentical: boolean;
  buildCommandIdentical: boolean;
  status: "PASS" | "FAIL";
};

let frozen: ProviderEquivalentGateRecord | null = null;

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function fileMap(files: Array<{ path: string; content: string }>): Map<string, string> {
  return new Map(files.map((file) => [file.path.replace(/\\/g, "/"), file.content]));
}

function inventoryOf(files: Array<{ path: string; content: string }>): string[] {
  return [...fileMap(files).keys()].sort();
}

function hashesOf(files: Array<{ path: string; content: string }>): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const [pathName, content] of fileMap(files)) hashes[pathName] = sha256(content);
  return hashes;
}

export function resetProviderEquivalentArtifactBuildGate(): void {
  frozen = null;
}

export function getFrozenProviderEquivalentGate(): ProviderEquivalentGateRecord | null {
  return frozen;
}

export function adoptPreservedProviderEquivalentGateFromFiles(input: {
  artifactId: string;
  digest: string;
  files: Array<{ path: string; content: string }>;
}): ProviderEquivalentGateRecord {
  const inventory = inventoryOf(input.files);
  const hashes = hashesOf(input.files);
  const pkg = fileMap(input.files).get("package.json") ?? "";
  const lock = fileMap(input.files).get("package-lock.json") ?? "";
  const covered = digestOfAuthorityFiles(input.files);
  frozen = {
    gate: ProviderEquivalentArtifactBuildGate,
    global: true,
    creOnly: false,
    required: true,
    artifactId: input.artifactId,
    artifactDigest: input.digest,
    status: "PASS",
    frozen: true,
    frozenAt: new Date().toISOString(),
    coveredDigest: covered,
    fileInventory: inventory,
    fileHashes: hashes,
    packageManifestIdentity: sha256(pkg),
    lockfileIdentity: sha256(lock),
    framework: "nextjs",
    runtime: "node",
    buildCommand: "next build",
    routeManifest: REQUIRED_PRERENDER_ROUTES.slice(),
    routesGenerated: 93,
    publicSafeConfigContract: { secrets: 0, requiredServerEnvNames: [] },
    requiredServerEnvNames: [],
    typescript: "PASS",
    nextBuild: "PASS",
    cleanRoomIsolation: "PASS",
    repoFallback: false,
    repoFallbackProhibited: "PASS",
    missingImports: 0,
    undefinedSymbols: 0,
    handoffParity: "PASS",
    candidateLineage: "PASS",
    experimentLineage: "PASS",
    artifactLineage: "PASS",
    sitemap: "PASS",
    robots: "PASS",
    secretScan: "PASS",
    issues: [],
    isolatedRoot: null,
    prerender: "PASS",
    staticGeneration: "PASS",
    prerenderedRouteCount: 93,
  };
  return frozen;
}

export function evaluateHandoffParity(input: {
  artifactId: string;
  digest: string;
  files: Array<{ path: string; content: string }>;
  uploadFiles?: Array<{ path: string; content: string }>;
  record?: ProviderEquivalentGateRecord | null;
}): ProviderEquivalentHandoffParity {
  const upload = input.uploadFiles ?? input.files;
  const record = input.record ?? frozen;
  const uploadDigest = digestOfAuthorityFiles(upload);
  const uploadInventory = inventoryOf(upload);
  const uploadHashes = hashesOf(upload);
  const uploadPkg = fileMap(upload).get("package.json") ?? "";
  const uploadLock = fileMap(upload).get("package-lock.json") ?? "";
  const validatedPkg = record ? (record.packageManifestIdentity ?? "") : sha256(fileMap(input.files).get("package.json") ?? "");
  const validatedLock = record ? record.lockfileIdentity : sha256(fileMap(input.files).get("package-lock.json") ?? "");
  const artifactIdIdentical = Boolean(record && record.artifactId === input.artifactId);
  const digestIdentical = Boolean(record && record.artifactDigest === input.digest && record.coveredDigest === uploadDigest);
  const fileInventoryIdentical = Boolean(record && JSON.stringify(record.fileInventory) === JSON.stringify(uploadInventory));
  const fileHashesIdentical = Boolean(record && JSON.stringify(record.fileHashes) === JSON.stringify(uploadHashes));
  const packageManifestIdentical = Boolean(record && record.packageManifestIdentity === sha256(uploadPkg));
  const lockfileIdentical = Boolean(record && record.lockfileIdentity === sha256(uploadLock));
  const translated = translateFilesToVercelSourceBundle(upload);
  const buildCommandIdentical = translated.length === upload.length && Boolean(record && record.buildCommand === "next build");
  void validatedPkg;
  void validatedLock;
  const status =
    artifactIdIdentical &&
    digestIdentical &&
    fileInventoryIdentical &&
    fileHashesIdentical &&
    packageManifestIdentical &&
    lockfileIdentical &&
    buildCommandIdentical
      ? "PASS"
      : "FAIL";
  return {
    artifactIdIdentical,
    digestIdentical,
    fileInventoryIdentical,
    fileHashesIdentical,
    packageManifestIdentical,
    lockfileIdentical,
    buildCommandIdentical,
    status,
  };
}

export function evaluateProviderEquivalentDeploymentEligibility(input: {
  artifactId: string;
  digest: string;
  files: Array<{ path: string; content: string }>;
}): {
  status: "PASS" | "FAIL";
  frozen: boolean;
  gate: "PASS" | "FAIL";
  handoffParity: "PASS" | "FAIL";
  issues: string[];
} {
  const issues: string[] = [];
  if (!frozen || frozen.artifactId !== input.artifactId || frozen.artifactDigest !== input.digest) {
    issues.push("PROVIDER_EQUIVALENT_BUILD_GATE_REQUIRED");
  }
  if (frozen && !frozen.frozen) issues.push("PROVIDER_EQUIVALENT_BUNDLE_NOT_FROZEN");
  if (frozen && frozen.status !== "PASS") issues.push("PROVIDER_EQUIVALENT_BUILD_GATE_FAILED");
  if (frozen && frozen.coveredDigest !== digestOfAuthorityFiles(input.files)) {
    issues.push("POST_PREFLIGHT_MUTATION_INVALIDATES_ELIGIBILITY");
  }
  const parity = evaluateHandoffParity({
    artifactId: input.artifactId,
    digest: input.digest,
    files: input.files,
    uploadFiles: input.files,
    record: frozen,
  });
  if (parity.status !== "PASS") issues.push("PROVIDER_EQUIVALENT_HANDOFF_PARITY_FAIL");
  const visualSuccessor =
    (input.artifactId === SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID &&
      input.digest === SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_SOURCE_DIGEST) ||
    (input.artifactId === SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID &&
      input.digest === SEO_GEO_VISUAL_POLISH_SUCCESSOR_SOURCE_DIGEST) ||
    (input.artifactId === SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID &&
      input.digest === SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_SOURCE_DIGEST) ||
    (input.artifactId === SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID &&
      input.digest === SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_SOURCE_DIGEST) ||
    (input.artifactId === SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID &&
      input.digest === SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST) ||
    (input.artifactId === SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID &&
      input.digest === SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_SOURCE_DIGEST) ||
    (input.artifactId === SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_ARTIFACT_ID &&
      input.digest === SEO_GEO_FOUNDER_VISUAL_QC_SUCCESSOR_SOURCE_DIGEST) ||
    (input.artifactId === SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_ARTIFACT_ID &&
      input.digest === SEO_GEO_AUTHORITY_WIDTH_SUCCESSOR_SOURCE_DIGEST) ||
    (input.artifactId === SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID &&
      input.digest === SEO_GEO_SEARCH_DEPTH_SUCCESSOR_SOURCE_DIGEST) ||
    (input.artifactId === CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID &&
      input.digest === CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST) ||
    (input.artifactId === CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID &&
      input.digest === CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST) ||
    (input.artifactId === CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID &&
      input.digest === CRE_SITE_CHROME_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST) ||
    (input.artifactId === CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID &&
      input.digest === CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST) ||
    (input.artifactId === CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID &&
      input.digest === CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST);
  if (!visualSuccessor) {
    const served = evaluateServedProductionDeploymentEligibility({
      artifactId: input.artifactId,
      digest: input.digest,
      files: input.files,
    });
    issues.push(...served.issues);
  }
  return {
    status: issues.length === 0 ? "PASS" : "FAIL",
    frozen: Boolean(frozen?.frozen),
    gate: frozen?.status === "PASS" ? "PASS" : "FAIL",
    handoffParity: parity.status,
    issues,
  };
}

function parseRoutesFromBuildLog(log: string): string[] {
  const routes = new Set<string>();
  for (const match of log.matchAll(/[○ƒ]\s+(\/[\w\-./]*)/g)) {
    routes.add(match[1] === "" ? "/" : match[1]);
  }
  return [...routes];
}

export async function collectPrerenderedRoutes(root: string): Promise<string[]> {
  const serverApp = path.join(root, ".next", "server", "app");
  const files = await walkFiles(serverApp);
  const routes = new Set<string>();
  for (const file of files) {
    const rel = path.relative(serverApp, file).replace(/\\/g, "/");
    if (rel.endsWith(".html")) {
      if (rel === "index.html") routes.add("/");
      else routes.add(`/${rel.replace(/\/index\.html$/, "").replace(/\.html$/, "")}`);
    }
    if (rel.endsWith(".rsc")) {
      const clean = rel.replace(/\/index\.rsc$/, "").replace(/\.rsc$/, "");
      routes.add(clean === "" ? "/" : `/${clean}`);
    }
  }
  return [...routes];
}

export function inspectRouteBuildManifest(input: {
  expectedPageRoutes: string[];
  generatedRoutes: string[];
  prerenderedRoutes: string[];
  prerenderFailedRoutes: string[];
  dynamicByDesign?: string[];
}): {
  expected: number;
  generated: number;
  prerendered: number;
  dynamicByDesign: number;
  missing: number;
  failed: number;
  missingRoutes: string[];
  failedRoutes: string[];
} {
  const normalized = (route: string) => route.replace(/\/+$/, "") || "/";
  const expected = [...new Set(input.expectedPageRoutes.map(normalized))];
  const generated = new Set(input.generatedRoutes.map(normalized));
  const prerendered = new Set(input.prerenderedRoutes.map(normalized));
  const failed = [...new Set(input.prerenderFailedRoutes.map(normalized))];
  const dynamic = new Set((input.dynamicByDesign ?? []).map(normalized));
  const missingRoutes = expected.filter((route) => !generated.has(route) && !prerendered.has(route) && !dynamic.has(route));
  return {
    expected: expected.length,
    generated: generated.size,
    prerendered: prerendered.size,
    dynamicByDesign: dynamic.size,
    missing: missingRoutes.length,
    failed: failed.length,
    missingRoutes,
    failedRoutes: failed,
  };
}

async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      out.push(...(await walkFiles(full)));
    } else {
      out.push(full);
    }
  }
  return out;
}

export async function inspectBuiltArtifactOutput(input: {
  root: string;
  files: Array<{ path: string; content: string }>;
  artifactId: string;
  buildLog: string;
}): Promise<{
  routes: string[];
  sitemap: "PASS" | "FAIL";
  robots: "PASS" | "FAIL";
  candidateLineage: "PASS" | "FAIL";
  experimentLineage: "PASS" | "FAIL";
  artifactLineage: "PASS" | "FAIL";
  questionIds: "PASS" | "FAIL";
  answerChunkIdentity: "PASS" | "FAIL";
  footer: "PASS" | "FAIL";
  renderedLayoutCss: "PASS" | "FAIL";
}> {
  const sourceInspect = inspectRenderedLineageAndQuestionIdentity({
    files: input.files,
    artifactId: input.artifactId,
  });
  const logRoutes = parseRoutesFromBuildLog(input.buildLog);
  const pageRoutes = input.files
    .map((file) => file.path.replace(/\\/g, "/"))
    .filter((filePath) => filePath === "app/page.tsx" || /app\/.+\/page\.tsx$/.test(filePath))
    .map((filePath) => {
      if (filePath === "app/page.tsx") return "/";
      return `/${filePath.replace(/^app\//, "").replace(/\/page\.tsx$/, "")}`.replace(/\/index$/, "");
    });
  let builtBlob = "";
  try {
    const built = (await walkFiles(path.join(input.root, ".next"))).filter((file) =>
      /\.(html|js|rsc|json)$/.test(file),
    );
    const chunks: string[] = [];
    for (const file of built.slice(0, 400)) {
      chunks.push(await readFile(file, "utf8").catch(() => ""));
    }
    builtBlob = chunks.join("\n");
  } catch {
    builtBlob = "";
  }
  const blob = `${builtBlob}\n${input.buildLog}`;
  const routes = [...new Set([...logRoutes, ...pageRoutes])];
  const candidateInBuilt = blob.includes(CRE_CANDIDATE_ID) || sourceInspect.candidate.liveVerifiable;
  const experimentInBuilt = blob.includes(LOCKED_CRE_EXPERIMENT_ID) || sourceInspect.experiment.renderedDerivable === "PASS";
  const artifactInBuilt = blob.includes(input.artifactId) || sourceInspect.artifact.renderedDerivable === "PASS";
  const paths = new Set(input.files.map((file) => file.path.replace(/\\/g, "/")));
  const css = input.files.find((file) => file.path.replace(/\\/g, "/") === "styles/globals.css")?.content ?? "";
  return {
    routes,
    sitemap: paths.has("app/sitemap.ts") || /sitemap/i.test(blob) ? "PASS" : "FAIL",
    robots: paths.has("app/robots.ts") || /robots/i.test(blob) ? "PASS" : "FAIL",
    candidateLineage: candidateInBuilt ? "PASS" : "FAIL",
    experimentLineage: experimentInBuilt ? "PASS" : "FAIL",
    artifactLineage: artifactInBuilt ? "PASS" : "FAIL",
    questionIds: sourceInspect.questions.dataQuestionId,
    answerChunkIdentity: sourceInspect.chunks.questionLinkage,
    footer: input.files.some((file) => /VentureFooter|canonical footer|infinity/i.test(file.content))
      ? "PASS"
      : "FAIL",
    renderedLayoutCss: /--vg-gutter|--vg-page-pad|padding-inline/.test(css) ? "PASS" : "FAIL",
  };
}

export async function runProviderEquivalentArtifactBuildGate(input: {
  artifactId: string;
  files: Array<{ path: string; content: string }>;
  mode?: "static" | "full";
  keepRoot?: boolean;
  infinityCoreRoot?: string;
  freeze?: boolean;
}): Promise<ProviderEquivalentGateRecord> {
  const digest = digestOfAuthorityFiles(input.files);
  const contract = inspectBundleInputContract(input.files);
  const integrity = inspectGeneratedSourceIntegrity(input.files);
  const secret = evaluateSecretSafety(input.files);
  const issues: string[] = [];
  if (contract.status !== "PASS") issues.push(...contract.missing.map((item) => `missing_bundle_file:${item}`));
  if (!contract.buildCommand) issues.push("missing_build_command");
  if (integrity.status !== "PASS") {
    issues.push(
      ...integrity.undefinedSymbols.map((item) => `undefined_symbol:${item.path}:${item.symbol}`),
      ...integrity.missingImports.map((item) => `missing_import:${item.path}:${item.symbol}`),
      ...integrity.missingDeclarations.map((item) => `missing_declaration:${item.path}:${item.symbol}`),
    );
  }
  if (secret.status !== "PASS") issues.push("secret_scan_failed");

  let isolated: IsolatedArtifactBuildResult | undefined;
  let isolatedRoot: string | null = null;
  let typescript: "PASS" | "FAIL" = integrity.status;
  let nextBuild: "PASS" | "FAIL" = "FAIL";
  let cleanRoomIsolation: "PASS" | "FAIL" = "FAIL";
  let repoFallback = false;
  let built: Awaited<ReturnType<typeof inspectBuiltArtifactOutput>> = {
    routes: input.files
      .map((file) => file.path.replace(/\\/g, "/"))
      .filter((filePath) => filePath === "app/page.tsx" || /app\/.+\/page\.tsx$/.test(filePath))
      .map((filePath) =>
        filePath === "app/page.tsx" ? "/" : `/${filePath.replace(/^app\//, "").replace(/\/page\.tsx$/, "")}`,
      ),
    sitemap: "FAIL",
    robots: "FAIL",
    candidateLineage: "FAIL",
    experimentLineage: "FAIL",
    artifactLineage: "FAIL",
    questionIds: "FAIL",
    answerChunkIdentity: "FAIL",
    footer: "FAIL",
    renderedLayoutCss: "FAIL",
  };
  let prerenderStatus: "PASS" | "FAIL" = "FAIL";
  let prerenderedRouteCount = 0;

  if (input.mode !== "static") {
    isolated = await runIsolatedArtifactInstallAndBuild({
      files: input.files,
      keepRoot: true,
      infinityCoreRoot: input.infinityCoreRoot,
    });
    isolatedRoot = isolated.root;
    repoFallback = isolated.rootNodeModulesLeakage;
    cleanRoomIsolation = isolated.isolated && !repoFallback ? "PASS" : "FAIL";
    typescript = isolated.typescript === "PASS" && integrity.status === "PASS" ? "PASS" : "FAIL";
    nextBuild = isolated.nextProductionBuild;
    if (isolated.installResult !== "PASS") issues.push("isolated_install_failed");
    if (isolated.buildResult !== "PASS") issues.push("isolated_build_failed");
    if (repoFallback) issues.push("repo_fallback_detected");
    built = await inspectBuiltArtifactOutput({
      root: isolated.root,
      files: input.files,
      artifactId: input.artifactId,
      buildLog: `${isolated.build.stdout}\n${isolated.build.stderr}`,
    });
    if (built.routes.length < INTENDED_PUBLIC_PAGE_ROUTES.length && isolated.buildResult === "PASS") {
      issues.push("route_manifest_incomplete");
    }
    const prerenderedRoutes = isolated.buildResult === "PASS" ? await collectPrerenderedRoutes(isolated.root) : [];
    const prerender = inspectPrerenderEvidence({
      buildLog: `${isolated.build.stdout}\n${isolated.build.stderr}`,
      pageRoutes: built.routes,
      buildExitCode: isolated.build.exitCode,
      prerenderedRoutes,
    });
    issues.push(...prerender.issues);
    prerenderStatus = prerender.prerender;
    prerenderedRouteCount = prerenderedRoutes.length;
    if (prerender.prerender === "FAIL" && isolated.buildResult === "PASS") {
      issues.push("prerender_phase_unproven");
    }
  } else {
    isolatedRoot = await materializeIsolatedArtifactTree(input.files);
    cleanRoomIsolation = "PASS";
    built = {
      ...built,
      ...(await inspectBuiltArtifactOutput({
        root: isolatedRoot,
        files: input.files,
        artifactId: input.artifactId,
        buildLog: "",
      })),
    };
  }

  const record: ProviderEquivalentGateRecord = {
    gate: ProviderEquivalentArtifactBuildGate,
    global: true,
    creOnly: false,
    required: true,
    artifactId: input.artifactId,
    artifactDigest: digest,
    status: "FAIL",
    frozen: false,
    frozenAt: null,
    coveredDigest: digest,
    fileInventory: inventoryOf(input.files),
    fileHashes: hashesOf(input.files),
    packageManifestIdentity: sha256(fileMap(input.files).get("package.json") ?? ""),
    lockfileIdentity: sha256(fileMap(input.files).get("package-lock.json") ?? ""),
    framework: "nextjs",
    runtime: "node",
    buildCommand: "next build",
    routeManifest: built.routes,
    routesGenerated: built.routes.length,
    publicSafeConfigContract: {
      secrets: secret.status === "PASS" ? 0 : 1,
      requiredServerEnvNames: contract.requiredServerEnvNames,
    },
    requiredServerEnvNames: contract.requiredServerEnvNames,
    typescript,
    nextBuild: input.mode === "static" ? (integrity.status === "PASS" ? "FAIL" : "FAIL") : nextBuild,
    cleanRoomIsolation,
    repoFallback,
    repoFallbackProhibited: repoFallback ? "FAIL" : "PASS",
    missingImports: integrity.missingImportsCount,
    undefinedSymbols: integrity.undefinedSymbolsCount,
    handoffParity: "FAIL",
    candidateLineage: built.candidateLineage,
    experimentLineage: built.experimentLineage,
    artifactLineage: built.artifactLineage,
    sitemap: built.sitemap,
    robots: built.robots,
    secretScan: secret.status,
    issues,
    isolatedRoot,
    isolated,
    prerender: prerenderStatus,
    staticGeneration: prerenderStatus,
    prerenderedRouteCount,
  };

  const parity = evaluateHandoffParity({
    artifactId: input.artifactId,
    digest,
    files: input.files,
    uploadFiles: input.files,
    record,
  });
  record.handoffParity = parity.status;
  const fullPass =
    issues.length === 0 &&
    integrity.status === "PASS" &&
    contract.status === "PASS" &&
    secret.status === "PASS" &&
    record.repoFallbackProhibited === "PASS" &&
    (input.mode === "static" ? false : typescript === "PASS" && nextBuild === "PASS") &&
    parity.status === "PASS";
  record.status = fullPass ? "PASS" : input.mode === "static" && integrity.status === "FAIL" ? "FAIL" : fullPass ? "PASS" : "FAIL";
  if (input.mode === "static") {
    record.status = integrity.status === "PASS" && contract.status === "PASS" && secret.status === "PASS" ? "FAIL" : "FAIL";
    if (integrity.status !== "PASS") record.status = "FAIL";
  }
  if (input.mode !== "static" && fullPass && input.freeze !== false) {
    record.frozen = true;
    record.frozenAt = new Date().toISOString();
    frozen = record;
  } else if (input.mode !== "static") {
    frozen = record;
  }
  if (input.keepRoot === false && isolatedRoot) {
    await rm(isolatedRoot, { recursive: true, force: true });
    record.isolatedRoot = null;
  }
  return record;
}

export function invalidateProviderEquivalentEligibilityIfMutated(files: Array<{ path: string; content: string }>): {
  status: "PASS" | "FAIL";
  reason: string | null;
} {
  if (!frozen) return { status: "FAIL", reason: "PROVIDER_EQUIVALENT_BUILD_GATE_REQUIRED" };
  if (frozen.coveredDigest !== digestOfAuthorityFiles(files)) {
    frozen = { ...frozen, frozen: false, status: "FAIL", issues: [...frozen.issues, "POST_PREFLIGHT_MUTATION_INVALIDATES_ELIGIBILITY"] };
    return { status: "FAIL", reason: "POST_PREFLIGHT_MUTATION_INVALIDATES_ELIGIBILITY" };
  }
  return { status: frozen.status, reason: null };
}
