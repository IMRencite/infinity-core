import { REJECTED_INFINITE_OS_VENTURE_LABEL } from "@/lib/infinity/public-venture-template/constants";
import { CANONICAL_INFINITY_OS_LABEL } from "@/lib/infinity/venture-build-orchestration/constants";

type ArtifactFile = { path: string; content: string; encoding?: "utf8" | "base64" };

/** Restore the deployed predecessor footer so locked reconstruct digests stay byte-stable. */
export function pinHistoricalLockedFooter<T extends ArtifactFile>(files: T[]): T[] {
  return files.map((file) => {
    if (file.encoding === "base64" || typeof file.content !== "string") return file;
    if (!file.content.includes(CANONICAL_INFINITY_OS_LABEL)) return file;
    return { ...file, content: file.content.split(CANONICAL_INFINITY_OS_LABEL).join(REJECTED_INFINITE_OS_VENTURE_LABEL) };
  });
}

export function applyCurrentPublicFooterAttribution<T extends ArtifactFile>(files: T[]): T[] {
  return files.map((file) => {
    if (file.encoding === "base64" || typeof file.content !== "string") return file;
    if (!file.content.includes(REJECTED_INFINITE_OS_VENTURE_LABEL)) return file;
    return { ...file, content: file.content.split(REJECTED_INFINITE_OS_VENTURE_LABEL).join(CANONICAL_INFINITY_OS_LABEL) };
  });
}
