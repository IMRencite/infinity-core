import { createHash } from "node:crypto";
import type { ChangeOperation } from "../constants";
import type { CodeChange, CodeChangeSet } from "../types";

export const CODE_CHANGE_SET_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reasoningSummary: { type: "string" },
    changes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          operation: { type: "string", enum: ["create", "replace", "patch", "delete"] },
          path: { type: "string" },
          content: { type: "string" },
          patch: { type: "string" },
          justification: { type: "string" },
        },
        required: ["operation", "path", "justification"],
      },
    },
    dependencyChanges: { type: "array", items: { type: "string" } },
    migrationChanges: { type: "array", items: { type: "string" } },
    testsAdded: { type: "array", items: { type: "string" } },
    expectedBehavior: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
  },
  required: ["reasoningSummary", "changes"],
} as const;

const SUSPICIOUS_PATTERNS = [
  /eval\s*\(/,
  /child_process/,
  /exec\s*\(/,
  /spawn\s*\(/,
  /rm\s+-rf/,
  /\.\.\/\.\./,
  /process\.env\./,
];

export function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function validateCodeChange(change: CodeChange, input: {
  allowedPaths: string[];
  forbiddenPaths: string[];
  allowDelete: boolean;
  maxContentBytes: number;
}): string[] {
  const errors: string[] = [];
  const path = normalizePath(change.path);

  if (!path || path.includes("..") || path.startsWith("/")) {
    errors.push(`Invalid path: ${change.path}`);
  }
  if (path.includes("node_modules/") || path.includes(".git/")) {
    errors.push(`Forbidden segment in path: ${path}`);
  }
  for (const forbidden of input.forbiddenPaths) {
    if (path === forbidden || path.startsWith(`${forbidden}/`)) {
      errors.push(`Path forbidden: ${path}`);
    }
  }
  if (input.allowedPaths.length > 0) {
    const allowed = input.allowedPaths.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`) || prefix === "*",
    );
    if (!allowed) errors.push(`Path outside allowed scope: ${path}`);
  }
  if (change.operation === "delete" && !input.allowDelete) {
    errors.push(`Delete not allowed: ${path}`);
  }
  if ((change.operation === "create" || change.operation === "replace" || change.operation === "patch") && !change.content) {
    errors.push(`Content required for ${change.operation}: ${path}`);
  }
  if (change.content && Buffer.byteLength(change.content, "utf8") > input.maxContentBytes) {
    errors.push(`Content too large: ${path}`);
  }
  const inspect = `${change.content ?? ""}${change.patch ?? ""}${change.justification}`;
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(inspect)) errors.push(`Suspicious payload in ${path}`);
  }
  if (/sk-[a-zA-Z0-9_-]{10,}/.test(inspect)) {
    errors.push(`Secret-like content in ${path}`);
  }
  return errors;
}

export function validateCodeChangeSet(
  changeSet: Omit<CodeChangeSet, "taskId" | "provider" | "model">,
  input: {
    allowedPaths: string[];
    forbiddenPaths: string[];
    allowDelete: boolean;
    maxChanges: number;
    maxContentBytes: number;
  },
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(changeSet.changes) || changeSet.changes.length === 0) {
    errors.push("CodeChangeSet must include at least one change");
  }
  if (changeSet.changes.length > input.maxChanges) {
    errors.push(`Too many changes: ${changeSet.changes.length} > ${input.maxChanges}`);
  }
  const paths = new Set<string>();
  for (const change of changeSet.changes) {
    const path = normalizePath(change.path);
    if (paths.has(path)) errors.push(`Duplicate path in change set: ${path}`);
    paths.add(path);
    errors.push(...validateCodeChange(change, input));
  }
  return { valid: errors.length === 0, errors };
}

export function parseCodeChangeSetFromCodingOutput(
  taskId: string,
  provider: string,
  model: string,
  raw: {
    files?: Array<{ path: string; operation: string; content: string }>;
    summary?: string;
    tests?: string[];
  },
): CodeChangeSet {
  const changes: CodeChange[] = (raw.files ?? []).map((file) => ({
    operation: (file.operation === "CREATE" ? "create" : "replace") as ChangeOperation,
    path: normalizePath(file.path),
    content: file.content,
    justification: raw.summary ?? "AI coding output",
  }));
  return {
    taskId,
    provider,
    model,
    reasoningSummary: raw.summary ?? "",
    changes,
    dependencyChanges: [],
    migrationChanges: [],
    testsAdded: raw.tests ?? [],
    expectedBehavior: [],
    assumptions: [],
  };
}

export function parseExtendedCodeChangeSet(
  taskId: string,
  provider: string,
  model: string,
  rawText: string,
): CodeChangeSet {
  const parsed = JSON.parse(rawText) as Omit<CodeChangeSet, "taskId" | "provider" | "model"> & {
    changes: CodeChange[];
  };
  return {
    taskId,
    provider,
    model,
    reasoningSummary: parsed.reasoningSummary ?? "",
    changes: (parsed.changes ?? []).map((c) => ({ ...c, path: normalizePath(c.path) })),
    dependencyChanges: parsed.dependencyChanges ?? [],
    migrationChanges: parsed.migrationChanges ?? [],
    testsAdded: parsed.testsAdded ?? [],
    expectedBehavior: parsed.expectedBehavior ?? [],
    assumptions: parsed.assumptions ?? [],
  };
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
