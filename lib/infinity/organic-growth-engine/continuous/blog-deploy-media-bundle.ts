import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { listAuthorizedBacklogMediaBundles, resolveMediaFileOnDisk } from "./blog-article-media-registry";
import { loadOccupancyFeaturedEditorialFiles } from "./occupancynpv-featured-visuals";

export type BlogDeployMediaFile = {
  path: string;
  content: string;
  encoding: "utf8" | "base64";
};

export const BLOG_MEDIA_DEPLOY_ARTIFACT_QC = "BlogMediaDeployArtifactQc" as const;

function normDeployPath(deployPath: string): string {
  return deployPath.replace(/\\/g, "/");
}

function readBinaryDeployFile(deployPath: string): BlogDeployMediaFile | null {
  const normalized = normDeployPath(deployPath);
  if (normalized.startsWith("lib/")) return null;
  const disk = resolveMediaFileOnDisk(`/${normalized.replace(/^public\//, "")}`);
  const absolute = disk.exists ? disk.absolute : path.join(process.cwd(), normalized);
  if (!existsSync(absolute)) return null;
  return {
    path: normalized,
    content: readFileSync(absolute).toString("base64"),
    encoding: "base64",
  };
}

/** Canonical raster assets for authorized backlog articles — must ship in venture deploy bundles. */
export function materializeAuthorizedBlogMediaDeployFiles(): BlogDeployMediaFile[] {
  const byPath = new Map<string, BlogDeployMediaFile>();

  const add = (file: BlogDeployMediaFile | null) => {
    if (!file) return;
    byPath.set(normDeployPath(file.path), file);
  };

  for (const row of loadOccupancyFeaturedEditorialFiles()) {
    add({ path: normDeployPath(row.path), content: row.content, encoding: "base64" });
  }

  for (const bundle of listAuthorizedBacklogMediaBundles()) {
    for (const deployPath of bundle.deploy_paths) {
      const normalized = normDeployPath(deployPath);
      if (byPath.has(normalized) || normalized.startsWith("lib/")) continue;
      add(readBinaryDeployFile(normalized));
    }
  }

  return [...byPath.values()];
}

export function mergeBlogMediaIntoDeployFiles<T extends { path: string; content: string; encoding?: "utf8" | "base64" }>(
  files: T[],
): T[] {
  const index = new Map(files.map((file, i) => [normDeployPath(file.path), i]));
  let next = [...files];
  for (const media of materializeAuthorizedBlogMediaDeployFiles()) {
    const key = normDeployPath(media.path);
    const existing = index.get(key);
    if (existing != null) {
      next[existing] = { ...next[existing]!, content: media.content, encoding: media.encoding };
    } else {
      index.set(key, next.length);
      next.push({ path: media.path, content: media.content, encoding: media.encoding } as T);
    }
  }
  return next;
}

export function evaluateBlogMediaDeployArtifactQc(input: {
  deploy_files: Array<{ path: string }>;
}): { gate: typeof BLOG_MEDIA_DEPLOY_ARTIFACT_QC; result: "PASS" | "FAIL"; reasons: string[]; missing: string[] } {
  const present = new Set(input.deploy_files.map((file) => normDeployPath(file.path)));
  const required = new Set<string>();
  for (const bundle of listAuthorizedBacklogMediaBundles()) {
    for (const deployPath of bundle.deploy_paths) {
      const normalized = normDeployPath(deployPath);
      if (!normalized.startsWith("public/")) continue;
      required.add(normalized);
    }
  }
  const missing = [...required].filter((path) => !present.has(path));
  return {
    gate: BLOG_MEDIA_DEPLOY_ARTIFACT_QC,
    result: missing.length ? "FAIL" : "PASS",
    reasons: missing.length ? missing.map((row) => `deploy_artifact_missing:${row}`) : [],
    missing,
  };
}
