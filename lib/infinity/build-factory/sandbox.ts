import { mkdir, readFile, writeFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import {
  assertPathAllowed,
  buildWorkspaceRootAbsolute,
  hashText,
  normalizeRelativePath,
  resolveRepoRoot,
} from "./paths";
import {
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MAX_FILES,
  DEFAULT_MAX_WORKSPACE_BYTES,
  PROHIBITED_WORKSPACE_SEGMENTS,
} from "./constants";
import type { WorkspaceAdapter } from "./types";

export class BuildSandboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildSandboxError";
  }
}

export type LocalSandboxOptions = {
  organizationId: string;
  missionId: string;
  buildId: string;
  repoRoot?: string;
  maxFiles?: number;
  maxFileBytes?: number;
  maxWorkspaceBytes?: number;
};

export function createLocalSandboxAdapter(options: LocalSandboxOptions): WorkspaceAdapter {
  const repoRoot = options.repoRoot ?? resolveRepoRoot();
  const rootAbsolute = buildWorkspaceRootAbsolute(
    repoRoot,
    options.organizationId,
    options.missionId,
    options.buildId,
  );
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const maxWorkspaceBytes = options.maxWorkspaceBytes ?? DEFAULT_MAX_WORKSPACE_BYTES;

  const deniedPaths = [...PROHIBITED_WORKSPACE_SEGMENTS];

  function resolveSafe(relativePath: string): string {
    const norm = normalizeRelativePath(relativePath);
    assertPathAllowed(norm, deniedPaths);
    const absolute = path.resolve(rootAbsolute, norm);
    const relative = path.relative(rootAbsolute, absolute);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new BuildSandboxError("Write outside workspace rejected");
    }
    return absolute;
  }

  async function ensureRoot(): Promise<void> {
    await mkdir(rootAbsolute, { recursive: true });
  }

  return {
    async createDirectory(relativePath: string): Promise<void> {
      await ensureRoot();
      const target = resolveSafe(relativePath);
      const st = await lstat(target).catch(() => null);
      if (st?.isSymbolicLink()) {
        throw new BuildSandboxError("Symlink escape rejected");
      }
      await mkdir(target, { recursive: true });
    },

    async writeTextFile(relativePath: string, content: string): Promise<void> {
      await ensureRoot();
      if (Buffer.byteLength(content, "utf8") > maxFileBytes) {
        throw new BuildSandboxError("File size limit exceeded");
      }
      if (content.includes("sk-") && /sk-[a-zA-Z0-9_-]{10,}/.test(content)) {
        throw new BuildSandboxError("Secrets must not be written to workspace files");
      }
      if (/SUPABASE_SERVICE_ROLE|Bearer\s+/i.test(content)) {
        throw new BuildSandboxError("Secrets must not be written to workspace files");
      }
      const target = resolveSafe(relativePath);
      const parent = path.dirname(target);
      await mkdir(parent, { recursive: true });
      const lst = await lstat(target).catch(() => null);
      if (lst?.isSymbolicLink()) {
        throw new BuildSandboxError("Symlink escape rejected");
      }
      await writeFile(target, content, { encoding: "utf8", flag: "wx" }).catch(async (err) => {
        if ((err as NodeJS.ErrnoException).code === "EEXIST") {
          await writeFile(target, content, { encoding: "utf8" });
          return;
        }
        throw err;
      });
      const files = await listAllFiles(rootAbsolute);
      if (files.length > maxFiles) {
        throw new BuildSandboxError("Workspace file count limit exceeded");
      }
      const total = files.reduce((sum, f) => sum + f.bytes, 0);
      if (total > maxWorkspaceBytes) {
        throw new BuildSandboxError("Workspace total size limit exceeded");
      }
    },

    async readTextFile(relativePath: string): Promise<string> {
      const target = resolveSafe(relativePath);
      const lst = await lstat(target);
      if (lst.isSymbolicLink()) {
        throw new BuildSandboxError("Symlink escape rejected");
      }
      const buf = await readFile(target, "utf8");
      if (Buffer.byteLength(buf, "utf8") > maxFileBytes) {
        throw new BuildSandboxError("File size limit exceeded on read");
      }
      return buf;
    },

    async listWorkspaceFiles(): Promise<{ path: string; bytes: number; hash: string }[]> {
      await ensureRoot();
      return listAllFiles(rootAbsolute);
    },

    async calculateHash(relativePath: string): Promise<string> {
      const content = await this.readTextFile(relativePath);
      return hashText(content);
    },

    async validateWorkspace(): Promise<{ valid: boolean; issues: string[] }> {
      const issues: string[] = [];
      try {
        const files = await this.listWorkspaceFiles();
        if (files.length > maxFiles) {
          issues.push("File count exceeds limit");
        }
        const total = files.reduce((s, f) => s + f.bytes, 0);
        if (total > maxWorkspaceBytes) {
          issues.push("Total workspace size exceeds limit");
        }
        for (const file of files) {
          if (file.bytes > maxFileBytes) {
            issues.push(`File too large: ${file.path}`);
          }
          for (const seg of PROHIBITED_WORKSPACE_SEGMENTS) {
            if (file.path.includes(seg)) {
              issues.push(`Prohibited path segment: ${file.path}`);
            }
          }
        }
      } catch (error) {
        issues.push(error instanceof Error ? error.message : "Workspace validation failed");
      }
      return { valid: issues.length === 0, issues };
    },
  };
}

async function listAllFiles(
  rootAbsolute: string,
): Promise<{ path: string; bytes: number; hash: string }[]> {
  const results: { path: string; bytes: number; hash: string }[] = [];

  async function walk(dir: string, prefix: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = path.join(dir, name);
      const lst = await lstat(full);
      if (lst.isSymbolicLink()) {
        throw new BuildSandboxError("Symlink escape rejected");
      }
      const rel = prefix ? `${prefix}/${name}` : name;
      if (lst.isDirectory()) {
        await walk(full, rel.replace(/\\/g, "/"));
      } else if (lst.isFile()) {
        const content = await readFile(full, "utf8");
        results.push({
          path: rel.replace(/\\/g, "/"),
          bytes: Buffer.byteLength(content, "utf8"),
          hash: hashText(content),
        });
      }
    }
  }

  await walk(rootAbsolute, "");
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

export function rejectPathTraversalAttempt(pathInput: string): void {
  normalizeRelativePath(pathInput);
}
