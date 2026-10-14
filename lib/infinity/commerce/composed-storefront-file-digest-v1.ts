import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { ComposedStorefrontFile } from "./club-throttle-storefront-compose.ts";
import { fileUploadBytes } from "@/lib/infinity/launch-gateway/adapters/vercel-source-bundle";

/** Incremental digest — never concatenates all file payloads into one string. */
export function digestComposedStorefrontFiles(files: ComposedStorefrontFile[]): string {
  const hash = createHash("sha256");
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(file.path);
    hash.update("\0");
    const bytes = fileUploadBytes(file);
    hash.update(createHash("sha256").update(bytes).digest());
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function composedFileInlineStringBytes(file: ComposedStorefrontFile): number {
  if (file.sourceAbs) return readFileSync(file.sourceAbs).length;
  if (file.encoding === "base64" && file.content) return Buffer.from(file.content, "base64").length;
  return Buffer.byteLength(file.content ?? "", "utf8");
}
