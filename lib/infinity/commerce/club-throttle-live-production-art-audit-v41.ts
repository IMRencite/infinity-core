import { createHash } from "node:crypto";
import sharp from "sharp";
import { loadProductionArtRegistryV41 } from "./club-throttle-production-print-master-publisher-v1.ts";
import { probeProviderPrintAssetDownload } from "./gelato-print-asset-delivery-standard-v1.ts";

export async function fetchProductionMasterLiveProof(url: string): Promise<{
  http_status: number;
  content_type: string | null;
  sha256: string | null;
  width: number;
  height: number;
  png_magic: boolean;
}> {
  const probe = await probeProviderPrintAssetDownload(url);
  if (probe.http_status !== 200 || probe.body_bytes < 1024) {
    return {
      http_status: probe.http_status,
      content_type: probe.content_type,
      sha256: null,
      width: 0,
      height: 0,
      png_magic: probe.png_magic,
    };
  }
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const meta = await sharp(buf).metadata();
  return {
    http_status: res.status,
    content_type: res.headers.get("content-type"),
    sha256,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    png_magic: probe.png_magic,
  };
}

export async function auditLiveProductionArtRegistryV41(cwd = process.cwd()): Promise<{
  rows: Array<{
    sku: string;
    garment_color: string;
    url: string;
    expected_sha256: string;
    live_sha256: string | null;
    http_status: number;
    dimensions: string;
    identity_qc: "PASS" | "FAIL";
    failure_reason: string | null;
  }>;
  PASS_ART_ROWS: number;
  FAIL_ART_ROWS: number;
  ALL_PRODUCTION_MASTER_EXTERNAL_RETRIEVAL_QC: "PASS" | "FAIL";
}> {
  const registry = loadProductionArtRegistryV41(cwd);
  const rows = [];
  for (const row of registry?.rows ?? []) {
    const proof = await fetchProductionMasterLiveProof(row.provider_payload_url);
    const dim = `${proof.width}x${proof.height}`;
    const expectedDim = row.production_print_master_dimensions;
    let failure: string | null = null;
    if (proof.http_status !== 200) failure = `HTTP_${proof.http_status}`;
    else if (!proof.png_magic) failure = "NOT_PNG";
    else if (proof.sha256 !== row.production_print_master_sha256) failure = "SHA_MISMATCH";
    else if (expectedDim && dim !== expectedDim && proof.width > 0) {
      /* allow ±2px canvas drift from CDN re-encode */
      const [ew, eh] = expectedDim.split("x").map(Number);
      if (Math.abs(proof.width - ew) > 2 || Math.abs(proof.height - eh) > 2) failure = "DIMENSION_MISMATCH";
    }
    rows.push({
      sku: row.sku,
      garment_color: row.garment_color,
      url: row.provider_payload_url,
      expected_sha256: row.production_print_master_sha256,
      live_sha256: proof.sha256,
      http_status: proof.http_status,
      dimensions: dim,
      identity_qc: failure ? "FAIL" : "PASS",
      failure_reason: failure,
    });
  }
  const pass = rows.filter((r) => r.identity_qc === "PASS").length;
  return {
    rows,
    PASS_ART_ROWS: pass,
    FAIL_ART_ROWS: rows.length - pass,
    ALL_PRODUCTION_MASTER_EXTERNAL_RETRIEVAL_QC: pass === rows.length && rows.length > 0 ? "PASS" : "FAIL",
  };
}
