import { createHash } from "node:crypto";

export const GELATO_PRINT_ASSET_DELIVERY_STANDARD_V1 = "GELATO_PRINT_ASSET_DELIVERY_STANDARD_V1" as const;

export const TRANSPARENT_PLACEHOLDER_FOR_UNINTENDED_PROVIDER_PLACEMENT = "PROHIBITED" as const;

export type PrintAssetDownloadProbe = {
  url: string;
  http_status: number;
  content_type: string | null;
  content_length: number | null;
  final_url: string;
  redirect_chain: string[];
  auth_required: boolean;
  file_extension: string | null;
  body_bytes: number;
  sha256_prefix: string | null;
  png_magic: boolean;
  svg_detected: boolean;
  transparent_only: "UNKNOWN" | "LIKELY" | "NO";
};

function extensionFromUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\.([a-z0-9]+)$/i);
    return m ? m[1]!.toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function probeProviderPrintAssetDownload(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PrintAssetDownloadProbe> {
  const redirect_chain: string[] = [];
  let current = url;
  let res = await fetchImpl(current, { method: "GET", redirect: "manual" });
  for (let hop = 0; hop < 8 && res.status >= 300 && res.status < 400; hop++) {
    const loc = res.headers.get("location");
    if (!loc) break;
    redirect_chain.push(loc);
    current = new URL(loc, current).href;
    res = await fetchImpl(current, { method: "GET", redirect: "manual" });
  }
  if (res.status >= 300) {
    res = await fetchImpl(url, { method: "GET", redirect: "follow" });
    current = res.url;
  }
  const buf = res.ok ? Buffer.from(await res.arrayBuffer()) : Buffer.alloc(0);
  const ct = res.headers.get("content-type");
  const ext = extensionFromUrl(current);
  const pngMagic = buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50;
  const textStart = buf.subarray(0, Math.min(256, buf.length)).toString("utf8").trimStart();
  const svgDetected =
    ext === "svg" ||
    (ct?.includes("svg") ?? false) ||
    textStart.startsWith("<svg") ||
    textStart.startsWith("<?xml");
  const sha256_prefix = buf.length ? createHash("sha256").update(buf).digest("hex").slice(0, 16) : null;
  return {
    url,
    http_status: res.status,
    content_type: ct,
    content_length: buf.length || Number(res.headers.get("content-length") ?? 0) || null,
    final_url: current,
    redirect_chain,
    auth_required: res.status === 401 || res.status === 403,
    file_extension: ext,
    body_bytes: buf.length,
    sha256_prefix,
    png_magic: pngMagic,
    svg_detected: svgDetected,
    transparent_only: "UNKNOWN",
  };
}

export function providerPrintAssetDownloadabilityQc(probe: PrintAssetDownloadProbe): "PASS" | "FAIL" {
  if (probe.auth_required) return "FAIL";
  if (probe.http_status !== 200) return "FAIL";
  if (probe.body_bytes < 1024) return "FAIL";
  if (probe.svg_detected) return "FAIL";
  if (!probe.png_magic && !(probe.content_type?.includes("png") ?? false)) return "FAIL";
  return "PASS";
}

export function gelatoPrintFileValidityQc(probe: PrintAssetDownloadProbe): "PASS" | "FAIL" {
  return providerPrintAssetDownloadabilityQc(probe);
}

/** External anonymous retrieval — same bar as provider download (V35). */
export const PROVIDER_PRINT_ASSET_EXTERNAL_RETRIEVAL_QC = "PROVIDER_PRINT_ASSET_EXTERNAL_RETRIEVAL_QC" as const;

export function providerPrintAssetExternalRetrievalQc(probe: PrintAssetDownloadProbe): "PASS" | "FAIL" {
  return providerPrintAssetDownloadabilityQc(probe);
}
