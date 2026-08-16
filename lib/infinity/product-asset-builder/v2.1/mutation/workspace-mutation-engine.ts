import { createHash } from "node:crypto";
import type { VentureSandbox } from "../../workspace/sandbox";
import { applyFileOperation } from "../../workspace/file-ops";
import type { CodeChange, CodeChangeSet, WorkspaceMutationRecord } from "../types";
import { hashContent, normalizePath, validateCodeChangeSet } from "../coding/code-change-schema";
import { FORBIDDEN_MUTATION_PATHS } from "../constants";

export type MutationApplyResult = {
  applied: WorkspaceMutationRecord[];
  rejected: Array<{ path: string; reason: string }>;
  changeSetId: string;
};

export class WorkspaceMutationEngine {
  private snapshots = new Map<string, string>();

  constructor(
    private readonly sandbox: VentureSandbox,
    private readonly changeSetId: string,
  ) {}

  async snapshot(paths: string[]): Promise<void> {
    for (const p of paths) {
      const norm = normalizePath(p);
      try {
        this.snapshots.set(norm, await this.sandbox.readTextFile(norm));
      } catch {
        this.snapshots.set(norm, "");
      }
    }
  }

  async applyChangeSet(
    changeSet: CodeChangeSet,
    input: {
      codingTaskId: string;
      featureContractIds: string[];
      allowedPaths: string[];
      allowDelete?: boolean;
      maxChanges?: number;
    },
  ): Promise<MutationApplyResult> {
    const validation = validateCodeChangeSet(changeSet, {
      allowedPaths: input.allowedPaths.length ? input.allowedPaths : ["*"],
      forbiddenPaths: [...FORBIDDEN_MUTATION_PATHS],
      allowDelete: input.allowDelete ?? false,
      maxChanges: input.maxChanges ?? 20,
      maxContentBytes: 512_000,
    });

    if (!validation.valid) {
      return {
        applied: [],
        rejected: validation.errors.map((reason) => ({ path: "*", reason })),
        changeSetId: this.changeSetId,
      };
    }

    await this.snapshot(changeSet.changes.map((c) => c.path));

    const applied: WorkspaceMutationRecord[] = [];
    const rejected: Array<{ path: string; reason: string }> = [];

    for (const change of changeSet.changes) {
      try {
        const record = await this.applySingleChange(change, {
          codingTaskId: input.codingTaskId,
          featureContractIds: input.featureContractIds,
          provider: changeSet.provider,
          model: changeSet.model,
        });
        applied.push(record);
      } catch (err) {
        rejected.push({
          path: change.path,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { applied, rejected, changeSetId: this.changeSetId };
  }

  private async applySingleChange(
    change: CodeChange,
    meta: {
      codingTaskId: string;
      featureContractIds: string[];
      provider: string;
      model: string;
    },
  ): Promise<WorkspaceMutationRecord> {
    const path = normalizePath(change.path);
    const before = this.snapshots.get(path) ?? "";
    const hashBefore = before ? hashContent(before) : undefined;
    const byteBefore = before ? Buffer.byteLength(before, "utf8") : 0;

    let operation = change.operation;
    if (operation === "create" || operation === "replace") {
      const exists = before.length > 0;
      const fileOp = exists ? "PATCH" : "CREATE";
      await applyFileOperation(this.sandbox, fileOp, path, change.content ?? "");
      operation = exists ? "replace" : "create";
    } else if (operation === "patch") {
      const next = applyUnifiedPatch(before, change.patch ?? change.content ?? "");
      await applyFileOperation(this.sandbox, "PATCH", path, next);
    } else if (operation === "delete") {
      await applyFileOperation(this.sandbox, "DELETE", path);
    } else {
      throw new Error(`Unsupported operation: ${operation}`);
    }

    let after = "";
    try {
      after = await this.sandbox.readTextFile(path);
    } catch {
      after = "";
    }

    return {
      id: createHash("sha256").update(`${this.changeSetId}:${path}:${Date.now()}`).digest("hex").slice(0, 16),
      codingTaskId: meta.codingTaskId,
      codeChangeSetId: this.changeSetId,
      featureContractIds: meta.featureContractIds,
      provider: meta.provider,
      model: meta.model,
      relativePath: path,
      operation,
      contentHashBefore: hashBefore,
      contentHashAfter: after ? hashContent(after) : undefined,
      byteSizeBefore: byteBefore,
      byteSizeAfter: after ? Buffer.byteLength(after, "utf8") : 0,
      rolledBack: false,
    };
  }

  async rollback(records: WorkspaceMutationRecord[]): Promise<number> {
    let count = 0;
    for (const record of [...records].reverse()) {
      const snapshot = this.snapshots.get(record.relativePath);
      if (snapshot === undefined) continue;
      if (snapshot === "") {
        await this.sandbox.deleteFile(record.relativePath).catch(() => undefined);
      } else {
        await applyFileOperation(this.sandbox, "PATCH", record.relativePath, snapshot);
      }
      record.rolledBack = true;
      count += 1;
    }
    return count;
  }
}

function applyUnifiedPatch(original: string, patch: string): string {
  if (!patch.includes("@@")) {
    return patch;
  }
  const lines = original.split("\n");
  const patchLines = patch.split("\n");
  let i = 0;
  let output: string[] = [];
  while (i < patchLines.length) {
    const line = patchLines[i]!;
    if (line.startsWith("@@")) {
      i += 1;
      continue;
    }
    if (line.startsWith("-")) {
      const remove = line.slice(1);
      const idx = output.findIndex((l) => l === remove);
      if (idx >= 0) output.splice(idx, 1);
      i += 1;
      continue;
    }
    if (line.startsWith("+")) {
      output.push(line.slice(1));
      i += 1;
      continue;
    }
    i += 1;
  }
  if (output.length === 0 && lines.length > 0) return original + "\n" + patch;
  return output.join("\n");
}
