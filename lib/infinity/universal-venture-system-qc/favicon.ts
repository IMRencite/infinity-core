export const VENTURE_FAVICON_GATE = "VentureFaviconGate" as const;

export const VENTURE_FAVICON_PRINCIPLE =
  "EVERY PUBLIC VENTURE MUST HAVE A VALID VENTURE-SPECIFIC FAVICON / BROWSER-TAB ICON BEFORE FINAL PRODUCTION-QUALITY PASS. SOURCE ASSET EXISTS != BROWSER TAB ICON WORKS. FRAMEWORK DEFAULT ICON != VENTURE-SPECIFIC ICON. BROKEN ICON REQUEST != PASS. MISSING FAVICON, 404 FAVICON, AND FRAMEWORK DEFAULT ICONS ARE PRODUCTION-QUALITY FAILURES." as const;

export const FRAMEWORK_DEFAULT_ICON = /(?:^|[/"'\s])(?:next|vercel)\.svg|create next app|framework default icon/i;

export type VentureFaviconFile = {
  path: string;
  content: string;
  encoding?: "utf8" | "base64";
};

export type VentureFaviconLiveEvidence = {
  favicon_http?: number | null;
  icon_http?: number | null;
  apple_http?: number | null;
  html?: string | null;
  content_type?: string | null;
  bytes?: number | null;
  rendered_in_tab?: boolean | null;
  looks_framework_default?: boolean | null;
};

export type VentureFaviconGateResult = {
  gate: typeof VENTURE_FAVICON_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  venture_specific: boolean;
  metadata_configured: boolean;
  asset_returns_200: boolean | null;
  valid_file: boolean;
  framework_default: boolean;
  live_renderable: boolean | null;
};

function normalized(path: string): string {
  return path.replace(/\\/g, "/");
}

function textOf(files: VentureFaviconFile[]): string {
  return files
    .filter((file) => file.encoding !== "base64")
    .map((file) => file.content)
    .join("\n");
}

export function factoryRequiresVentureFavicon(): true {
  return true;
}

export function factoryMissingFaviconAllowsProductionPass(): false {
  return false;
}

export function factoryFrameworkDefaultIconAllowed(): false {
  return false;
}

export function evaluateVentureFaviconGate(input: {
  venture_id: string;
  files: VentureFaviconFile[];
  live?: VentureFaviconLiveEvidence | null;
  founder_observes_missing?: boolean;
  founder_observes_framework_default?: boolean;
}): VentureFaviconGateResult {
  const reasons: string[] = [];
  const files = input.files;
  const paths = files.map((file) => normalized(file.path));
  const blob = textOf(files.filter((file) => /layout\.tsx$|icon\.(tsx|png|ico|svg)$|favicon/i.test(normalized(file.path))));
  const hasIco = paths.some((path) => path === "public/favicon.ico" || path === "app/favicon.ico" || path === "app/favicon.ico/route.ts");
  const hasPngIcon = paths.some((path) => path === "app/icon.png" || path === "app/icon.tsx" || path === "app/icon/route.ts" || path === "public/icon.png");
  const hasMetadata = /icons\s*:|rel=["']icon["']|apple-touch-icon|favicon\.ico\?v=/.test(blob) || /icons\s*:|favicon\.ico\?v=/.test(textOf(files.filter((file) => /layout\.tsx$/.test(normalized(file.path)))));
  const hasAsset = hasIco || hasPngIcon;
  const ico = files.find((file) => /favicon\.ico$/.test(normalized(file.path)));
  const png = files.find((file) => /(?:^|\/)icon\.png$/.test(normalized(file.path)));
  const icoRoute = files.find((file) => normalized(file.path) === "app/favicon.ico/route.ts");
  const iconRoute = files.find((file) => normalized(file.path) === "app/icon/route.ts");
  const icoBytes = ico?.encoding === "base64" ? Buffer.from(ico.content, "base64") : null;
  const pngBytes = png?.encoding === "base64" ? Buffer.from(png.content, "base64") : null;
  const validIco = Boolean(icoBytes && icoBytes.length >= 16 && icoBytes[0] === 0 && icoBytes[2] === 1);
  const validPng = Boolean(pngBytes && pngBytes.length >= 24 && pngBytes[0] === 0x89 && pngBytes[1] === 0x50);
  const validRoute = Boolean(
    (icoRoute && /image\/x-icon/.test(icoRoute.content) && /Buffer\.from\(/.test(icoRoute.content) && /base64/.test(icoRoute.content))
    || (iconRoute && /image\/png/.test(iconRoute.content) && /Buffer\.from\(/.test(iconRoute.content) && /base64/.test(iconRoute.content)),
  );
  const validFile = validIco || validPng || validRoute;
  const frameworkDefault = FRAMEWORK_DEFAULT_ICON.test(blob)
    || FRAMEWORK_DEFAULT_ICON.test(paths.join("\n"))
    || input.founder_observes_framework_default === true
    || input.live?.looks_framework_default === true;
  const ventureSpecific = hasAsset && validFile && !frameworkDefault && Boolean(input.venture_id);
  if (!hasAsset) reasons.push("VENTURE_ICON_MISSING");
  if (!hasMetadata) reasons.push("FAVICON_METADATA_MISSING");
  if (!validFile) reasons.push("FAVICON_FILE_INVALID");
  if (frameworkDefault) reasons.push("FRAMEWORK_DEFAULT_ICON");
  if (input.founder_observes_missing) reasons.push("FOUNDER_PHYSICAL_FAVICON_MISSING");
  const live = input.live;
  let asset200: boolean | null = null;
  if (live) {
    asset200 = live.favicon_http === 200 || live.icon_http === 200;
    if (live.favicon_http != null && live.favicon_http !== 200) reasons.push(`FAVICON_HTTP_${live.favicon_http}`);
    if (live.icon_http != null && live.icon_http !== 200 && live.favicon_http !== 200) reasons.push(`ICON_HTTP_${live.icon_http}`);
    if (live.content_type && !/image\/(x-icon|vnd.microsoft.icon|png|svg\+xml|ico)/i.test(live.content_type)) {
      reasons.push("FAVICON_MIME_INVALID");
    }
    if (live.bytes != null && live.bytes < 16) reasons.push("FAVICON_BYTES_TOO_SMALL");
    if (live.html && FRAMEWORK_DEFAULT_ICON.test(live.html) && !/favicon\.ico\?v=onpv/.test(live.html)) {
      reasons.push("LIVE_HTML_FRAMEWORK_ICON");
    }
    if (live.rendered_in_tab === false) reasons.push("TAB_ICON_NOT_RENDERED");
    if (live.looks_framework_default) reasons.push("LIVE_FRAMEWORK_DEFAULT");
  }
  if (!ventureSpecific && !reasons.includes("VENTURE_ICON_MISSING") && !reasons.includes("FRAMEWORK_DEFAULT_ICON")) {
    reasons.push("ICON_NOT_VENTURE_SPECIFIC");
  }
  return {
    gate: VENTURE_FAVICON_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons: [...new Set(reasons)],
    venture_specific: ventureSpecific,
    metadata_configured: hasMetadata,
    asset_returns_200: asset200,
    valid_file: validFile,
    framework_default: frameworkDefault,
    live_renderable: live?.rendered_in_tab ?? null,
  };
}

export function evaluateOccupancynpvComposedFaviconGate(
  files: VentureFaviconFile[],
  live?: VentureFaviconLiveEvidence | null,
) {
  return evaluateVentureFaviconGate({
    venture_id: "occupancynpv",
    files,
    live,
  });
}
