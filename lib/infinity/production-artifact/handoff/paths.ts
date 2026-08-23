import { isProhibitedProductionPath, normalizeRelativePath } from "@/lib/infinity/production-artifact/types";
import { normalizePath } from "@/lib/infinity/product-asset-builder/v2.1/coding/code-change-schema";

const ABSOLUTE_PATH = /^(?:[a-zA-Z]:[\\/]|\\\\|\/)/;

export function validateHandoffArtifactPath(path: string | null | undefined): {
  ok: boolean;
  normalized: string | null;
  reason: string | null;
} {
  if (path == null || path === "") {
    return { ok: true, normalized: null, reason: null };
  }
  if (ABSOLUTE_PATH.test(path) || path.includes("\0")) {
    return { ok: false, normalized: null, reason: "absolute_or_null_path" };
  }
  try {
    const normalized = normalizeRelativePath(normalizePath(path));
    if (normalized.includes("..") || path.includes("..")) {
      return { ok: false, normalized: null, reason: "path_traversal" };
    }
    if (isProhibitedProductionPath(normalized)) {
      return { ok: false, normalized: null, reason: "prohibited_path" };
    }
    return { ok: true, normalized, reason: null };
  } catch {
    return { ok: false, normalized: null, reason: "path_traversal" };
  }
}
