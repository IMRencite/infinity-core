import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import type { VentureFaviconLiveEvidence } from "@/lib/infinity/universal-venture-system-qc/favicon";
import { evaluatePublicVentureBrandBundle, type BrandSurfaceEvidence } from "./gates";
import { occupancynpvBrandIdentityContract } from "./occupancynpv";

function fileOf(
  files: Array<{ path: string; content: string; encoding?: string }>,
  path: string,
): string {
  return files.find((file) => file.path.replace(/\\/g, "/") === path && file.encoding !== "base64")?.content ?? "";
}

export function occupancynpvComposedBrandEvidence(
  live?: VentureFaviconLiveEvidence | null,
): BrandSurfaceEvidence {
  const composed = (() => {
    try {
      return composeOccupancynpvPaymentReactivationFiles();
    } catch {
      return { files: [] as Array<{ path: string; content: string; encoding?: "utf8" | "base64" }> };
    }
  })();
  const identity = occupancynpvBrandIdentityContract();
  const layout = fileOf(composed.files, "app/layout.tsx");
  const titleMatch = layout.match(/default:\s*"([^"]+)"/);
  return {
    files: composed.files,
    publicHeaderHtml: fileOf(composed.files, "components/site-chrome.tsx"),
    appHeaderHtml: fileOf(composed.files, "app/occupancynpv/app/layout.tsx"),
    loginHtml: fileOf(composed.files, "app/occupancynpv/app/login/page.tsx"),
    metadataTitle: titleMatch?.[1] ?? identity.metadata_title,
    metadataDescription: identity.metadata_description,
    live,
  };
}

export function evaluateOccupancynpvBrandIdentityQc(live?: VentureFaviconLiveEvidence | null) {
  return evaluatePublicVentureBrandBundle({
    identity: occupancynpvBrandIdentityContract(),
    evidence: occupancynpvComposedBrandEvidence(live),
  });
}
