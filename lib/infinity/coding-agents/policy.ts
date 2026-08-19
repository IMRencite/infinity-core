import { BLOCKED_COMMAND_PATTERNS, BLOCKED_MUTATION_COMMANDS, DEFAULT_FORBIDDEN_PATHS } from "./constants";
import type { CanonicalCodingTask } from "./types";

function normalize(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
}

export function defaultForbiddenPaths(task: CanonicalCodingTask): string[] {
  const extra: string[] = [...DEFAULT_FORBIDDEN_PATHS];
  if (task.securityLevel !== "maintenance") {
    extra.push("infinity-core/", "lib/infinity/treasury/", "lib/supabase/");
  }
  if (task.ventureId) {
    extra.push("ventures/");
  }
  return [...new Set([...extra, ...task.forbiddenPaths])];
}

export function isForbiddenPath(path: string, forbidden: string[]): boolean {
  const normalized = normalize(path);
  if (normalized.includes("..")) return true;
  if (normalized.startsWith("/") && !normalized.startsWith("/tmp/")) return true;
  return forbidden.some((rule) => {
    const needle = normalize(rule);
    if (needle.endsWith("/")) return normalized.startsWith(needle) || normalized.includes(`/${needle}`);
    return normalized === needle || normalized.endsWith(`/${needle}`) || normalized.startsWith(`${needle}.`);
  });
}

export function envAccessPermittedByDefault(path: string): boolean {
  return !/(^|\/)\.env($|\.|\/)/i.test(normalize(path));
}

export function evaluatePathMutation(
  path: string,
  task: CanonicalCodingTask,
): { allowed: boolean; code: "WORKSPACE_VIOLATION" | null } {
  const forbidden = defaultForbiddenPaths(task);
  if (isForbiddenPath(path, forbidden) || !envAccessPermittedByDefault(path)) {
    return { allowed: false, code: "WORKSPACE_VIOLATION" };
  }
  if (task.allowedPaths.length > 0) {
    const allowed = task.allowedPaths.some((rule) => {
      const needle = normalize(rule);
      const candidate = normalize(path);
      if (needle === "*" || needle === ".") return true;
      return candidate === needle || candidate.startsWith(`${needle.replace(/\/$/, "")}/`);
    });
    if (!allowed) return { allowed: false, code: "WORKSPACE_VIOLATION" };
  }
  return { allowed: true, code: null };
}

export function evaluateCommand(command: string): { allowed: boolean; code: "COMMAND_POLICY_VIOLATION" | null } {
  const blocked = [...BLOCKED_COMMAND_PATTERNS, ...BLOCKED_MUTATION_COMMANDS].some((pattern) => pattern.test(command));
  if (blocked) return { allowed: false, code: "COMMAND_POLICY_VIOLATION" };
  return { allowed: true, code: null };
}

export function commandLooksLikeExternalMutation(command: string): boolean {
  return evaluateCommand(command).code === "COMMAND_POLICY_VIOLATION";
}
