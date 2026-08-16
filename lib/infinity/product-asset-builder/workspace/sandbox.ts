import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, lstat, rm, rename } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MAX_FILES,
  DEFAULT_MAX_WORKSPACE_BYTES,
  PROHIBITED_WORKSPACE_SEGMENTS,
} from "../constants";
import { WorkspaceIsolationError } from "../failures";
import {
  assertPathAllowed,
  buildVentureWorkspaceReference,
  buildVentureWorkspaceRootAbsolute,
  isInfinityCorePath,
  normalizeRelativePath,
  resolveRepoRoot,
} from "../paths";

export class VentureSandbox {
  readonly rootAbsolute: string;
  readonly workspaceReference: string;
  private fileCount = 0;
  private totalBytes = 0;

  constructor(
    readonly organizationId: string,
    readonly buildPackageId: string,
    readonly buildRunId: string,
    repoRoot?: string,
  ) {
    const root = repoRoot ?? resolveRepoRoot();
    this.rootAbsolute = buildVentureWorkspaceRootAbsolute(root, organizationId, buildPackageId, buildRunId);
    this.workspaceReference = buildVentureWorkspaceReference(organizationId, buildPackageId, buildRunId);
  }

  private resolveSafe(relativePath: string): string {
    const norm = normalizeRelativePath(relativePath);
    if (isInfinityCorePath(norm)) {
      throw new WorkspaceIsolationError(`Infinity core path modification rejected: ${relativePath}`);
    }
    assertPathAllowed(norm, [...PROHIBITED_WORKSPACE_SEGMENTS]);
    const absolute = path.resolve(this.rootAbsolute, norm);
    const rel = path.relative(this.rootAbsolute, absolute);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new WorkspaceIsolationError("Write outside venture workspace rejected");
    }
    return absolute;
  }

  async ensureRoot(): Promise<void> {
    await mkdir(this.rootAbsolute, { recursive: true });
  }

  async createDirectory(relativePath: string): Promise<void> {
    await this.ensureRoot();
    const target = this.resolveSafe(relativePath);
    const st = await lstat(target).catch(() => null);
    if (st?.isSymbolicLink()) {
      throw new WorkspaceIsolationError("Symlink escape rejected");
    }
    await mkdir(target, { recursive: true });
  }

  async writeTextFile(relativePath: string, content: string): Promise<{ contentHash: string; byteSize: number }> {
    await this.ensureRoot();
    if (Buffer.byteLength(content, "utf8") > DEFAULT_MAX_FILE_BYTES) {
      throw new WorkspaceIsolationError("File size limit exceeded");
    }
    if (/sk-[a-zA-Z0-9_-]{10,}/.test(content)) {
      throw new WorkspaceIsolationError("Secret-like content rejected");
    }
    const target = this.resolveSafe(relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
    this.fileCount += 1;
    const byteSize = Buffer.byteLength(content, "utf8");
    this.totalBytes += byteSize;
    if (this.fileCount > DEFAULT_MAX_FILES) {
      throw new WorkspaceIsolationError("Workspace file count limit exceeded");
    }
    if (this.totalBytes > DEFAULT_MAX_WORKSPACE_BYTES) {
      throw new WorkspaceIsolationError("Workspace byte limit exceeded");
    }
    const contentHash = createHash("sha256").update(content, "utf8").digest("hex");
    return { contentHash, byteSize };
  }

  async readTextFile(relativePath: string): Promise<string> {
    const target = this.resolveSafe(relativePath);
    return readFile(target, "utf8");
  }

  async patchTextFile(
    relativePath: string,
    patch: (content: string) => string,
  ): Promise<{ contentHash: string; byteSize: number }> {
    const existing = await this.readTextFile(relativePath).catch(() => "");
    return this.writeTextFile(relativePath, patch(existing));
  }

  async deleteFile(relativePath: string): Promise<void> {
    const target = this.resolveSafe(relativePath);
    await rm(target, { force: true });
  }

  async moveFile(fromPath: string, toPath: string): Promise<void> {
    const from = this.resolveSafe(fromPath);
    const to = this.resolveSafe(toPath);
    await mkdir(path.dirname(to), { recursive: true });
    await rename(from, to);
  }

  async listFiles(relativeDir = "."): Promise<string[]> {
    const dir = this.resolveSafe(relativeDir);
    const results: string[] = [];
    async function walk(current: string, prefix: string) {
      const entries = await readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".next") continue;
          await walk(path.join(current, entry.name), rel);
        } else {
          results.push(rel.replace(/\\/g, "/"));
        }
      }
    }
    await walk(dir, relativeDir === "." ? "" : normalizeRelativePath(relativeDir));
    return results.sort();
  }

  getStats() {
    return { fileCount: this.fileCount, totalBytes: this.totalBytes };
  }
}
